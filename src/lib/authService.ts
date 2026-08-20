import { supabase } from './supabase';
import { UserProfile } from '../types';

export const authService = {
  async login() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
        },
      });
      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async updateProfile(uid: string, data: Partial<UserProfile>) {
    const { error } = await supabase
      .from('users')
      .update(data)
      .eq('uid', uid);
    
    if (error) console.error('Error updating profile:', error);
  },

  async logout() {
    try {
      await supabase.auth.signOut();
    } catch (error: any) {
      console.error('Logout error:', error);
    }
  },

  onAuthUpdate(callback: (user: UserProfile | null) => void) {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user;

      if (user) {
        const { data: userDoc } = await supabase
          .from('users')
          .select('*')
          .eq('uid', user.id)
          .single();

        if (!userDoc) {
          const inviteCode = `DW-${user.id.slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
          const profile: UserProfile = {
            uid: user.id,
            email: user.email || '',
            displayName: user.user_metadata?.full_name || '',
            photoURL: user.user_metadata?.avatar_url || '',
            name: user.user_metadata?.full_name || 'Friend',
            avatar: user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
            inviteCode,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          };

          await supabase.from('users').insert([profile]);
          await supabase.from('invites').insert([{
            code: inviteCode,
            senderId: user.id,
            createdAt: new Date().toISOString(),
            status: 'pending'
          }]);

          callback(profile);
        } else {
          callback(userDoc as UserProfile);
        }
      } else {
        callback(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  },

  async pairWithCode(currentUser: UserProfile, code: string) {
    if (!currentUser.uid) return { error: 'Not logged in' };

    const { data: inviteData } = await supabase
      .from('invites')
      .select('*')
      .eq('code', code)
      .single();

    if (!inviteData) return { error: 'Invalid code' };
    if (inviteData.status === 'used') return { error: 'Code already used' };
    if (inviteData.senderId === currentUser.uid) return { error: 'Cannot pair with yourself' };

    const partnerId = inviteData.senderId;
    const ids = [currentUser.uid, partnerId].sort();
    const roomId = `room_${ids[0]}_${ids[1]}`;

    try {
      await supabase.from('rooms').insert([{
        id: roomId,
        participants: [currentUser.uid, partnerId],
        createdAt: new Date().toISOString()
      }]);

      await supabase.from('users').update({ partnerId, roomId }).eq('uid', currentUser.uid);
      await supabase.from('users').update({ partnerId: currentUser.uid, roomId }).eq('uid', partnerId);
      await supabase.from('invites').update({ status: 'used' }).eq('code', code);

      return { success: true, roomId, partnerId };
    } catch (e) {
      console.error(e);
      return { error: 'Pairing failed' };
    }
  }
};
