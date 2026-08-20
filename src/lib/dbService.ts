import { supabase } from './supabase';
import { VocabularyItem, SharedAsset, TeachingLogEntry, MicroStory } from '../types';

export const dbService = {
  subscribeData(roomId: string, callbacks: {
    onVocabulary: (data: VocabularyItem[]) => void;
    onAssets: (data: SharedAsset[]) => void;
    onTeachingLog: (data: TeachingLogEntry[]) => void;
    onStories: (data: MicroStory[]) => void;
  }) {
    // 1. Initial Fetch
    this.getRoomData(roomId, callbacks);

    // 2. Realtime Subscriptions
    const channel = supabase
      .channel(`room_${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vocabulary', filter: `roomId=eq.${roomId}` }, () => {
        supabase.from('vocabulary').select('*').eq('roomId', roomId).then(({ data }) => data && callbacks.onVocabulary(data));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets', filter: `roomId=eq.${roomId}` }, () => {
        supabase.from('assets').select('*').eq('roomId', roomId).then(({ data }) => data && callbacks.onAssets(data));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories', filter: `roomId=eq.${roomId}` }, () => {
        supabase.from('stories').select('*').eq('roomId', roomId).then(({ data }) => data && callbacks.onStories(data));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async getRoomData(roomId: string, callbacks: any) {
    const { data: vocab } = await supabase.from('vocabulary').select('*').eq('roomId', roomId);
    if (vocab) callbacks.onVocabulary(vocab);

    const { data: assets } = await supabase.from('assets').select('*').eq('roomId', roomId);
    if (assets) callbacks.onAssets(assets);

    const { data: stories } = await supabase.from('stories').select('*').eq('roomId', roomId);
    if (stories) callbacks.onStories(stories);
  },

  async addVocabulary(roomId: string, item: Omit<VocabularyItem, 'id'>) {
    const { data, error } = await supabase.from('vocabulary').insert([{ ...item, roomId }]).select().single();
    if (error) console.error(error);
    return data;
  },

  async addAsset(roomId: string, asset: Omit<SharedAsset, 'id'>) {
    const { data, error } = await supabase.from('assets').insert([{ ...asset, roomId }]).select().single();
    if (error) console.error(error);
    return data;
  },

  async addStory(roomId: string, story: Omit<MicroStory, 'id'>) {
    const { data, error } = await supabase.from('stories').insert([{ ...story, roomId }]).select().single();
    if (error) console.error(error);
    return data;
  }
};
