import { supabase } from './supabase';
import { VocabularyItem, SharedAsset, TeachingLogEntry, MicroStory, UserProfile } from '../types';

export const dbService = {
  // 1. 訂閱房間狀態 (Room / Anchor State)
  subscribeToRoomState(roomId: string, callback: (state: any) => void) {
    if (!roomId) return () => {};

    // 初始讀取
    supabase
      .from('rooms')
      .select('state')
      .eq('id', roomId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.state) callback(data.state);
      });

    // Realtime 監聽
    const channel = supabase
      .channel(`room_state_${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        if (payload.new && (payload.new as any).state) {
          callback((payload.new as any).state);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // 2. 更新房間狀態
  async updateRoomState(roomId: string, state: any) {
    if (!roomId) return;
    const { error } = await supabase
      .from('rooms')
      .upsert({ id: roomId, state, updated_at: new Date().toISOString() });

    if (error) console.error('Error updating room state:', error);
  },

  // 3. 訂閱伴侶資料 (Partner)
  subscribeToPartner(partnerId: string, callback: (partner: UserProfile | null) => void) {
    if (!partnerId) return () => {};

    supabase
      .from('users')
      .select('*')
      .eq('id', partnerId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          callback({
            uid: data.id,
            id: data.id,
            displayName: data.display_name || 'Partner',
            email: data.email || '',
            photoURL: data.photo_url || '',
            role: data.role || 'user',
            roomId: data.room_id || '',
            partnerId: data.partner_id || '',
          } as UserProfile);
        }
      });

    const channel = supabase
      .channel(`partner_${partnerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${partnerId}` }, (payload) => {
        const data = payload.new as any;
        if (data) {
          callback({
            uid: data.id,
            id: data.id,
            displayName: data.display_name || 'Partner',
            email: data.email || '',
            photoURL: data.photo_url || '',
            role: data.role || 'user',
            roomId: data.room_id || '',
            partnerId: data.partner_id || '',
          } as UserProfile);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // 4. 訂閱單字庫 (Vault / Vocabulary)
  subscribeToVault(roomId: string, callback: (data: VocabularyItem[]) => void) {
    if (!roomId) return () => {};

    supabase
      .from('vocabulary')
      .select('*')
      .eq('room_id', roomId)
      .then(({ data }) => data && callback(data));

    const channel = supabase
      .channel(`vault_${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vocabulary', filter: `room_id=eq.${roomId}` }, () => {
        supabase.from('vocabulary').select('*').eq('room_id', roomId).then(({ data }) => data && callback(data));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // 5. 新增單字到 Vault
  async addToVault(roomId: string, item: Omit<VocabularyItem, 'id'> | VocabularyItem) {
    if (!roomId) return;
    const { data, error } = await supabase
      .from('vocabulary')
      .insert([{ ...item, room_id: roomId }])
      .select()
      .single();

    if (error) console.error('Error adding to vault:', error);
    return data;
  },

  // 6. 訂閱共享資源 (Assets)
  subscribeToAssets(roomId: string, callback: (data: SharedAsset[]) => void) {
    if (!roomId) return () => {};

    supabase
      .from('assets')
      .select('*')
      .eq('room_id', roomId)
      .then(({ data }) => data && callback(data));

    const channel = supabase
      .channel(`assets_${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets', filter: `room_id=eq.${roomId}` }, () => {
        supabase.from('assets').select('*').eq('room_id', roomId).then(({ data }) => data && callback(data));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // 7. 訂閱教學日誌 (Teaching Log)
  subscribeToTeachingLog(roomId: string, callback: (data: TeachingLogEntry[]) => void) {
    if (!roomId) return () => {};

    supabase
      .from('teaching_log')
      .select('*')
      .eq('room_id', roomId)
      .then(({ data }) => data && callback(data));

    const channel = supabase
      .channel(`teaching_${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teaching_log', filter: `room_id=eq.${roomId}` }, () => {
        supabase.from('teaching_log').select('*').eq('room_id', roomId).then(({ data }) => data && callback(data));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // 8. 訂閱 Micro Stories
  subscribeToStories(roomId: string, callback: (data: MicroStory[]) => void) {
    if (!roomId) return () => {};

    supabase
      .from('stories')
      .select('*')
      .eq('room_id', roomId)
      .then(({ data }) => data && callback(data));

    const channel = supabase
      .channel(`stories_${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories', filter: `room_id=eq.${roomId}` }, () => {
        supabase.from('stories').select('*').eq('room_id', roomId).then(({ data }) => data && callback(data));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // 9. 訂閱來電通知 (Calls)
  subscribeToIncomingCalls(roomId: string, userId: string, callback: (call: any) => void) {
    if (!roomId || !userId) return () => {};

    const channel = supabase
      .channel(`calls_${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls', filter: `room_id=eq.${roomId}` }, (payload) => {
        const callData = payload.new as any;
        if (callData && callData.receiver_id === userId && callData.status === 'ringing') {
          callback(callData);
        } else {
          callback(null);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // 10. 結束通話
  async endCall(roomId: string) {
    if (!roomId) return;
    const { error } = await supabase
      .from('calls')
      .update({ status: 'ended' })
      .eq('room_id', roomId);

    if (error) console.error('Error ending call:', error);
  }
};
