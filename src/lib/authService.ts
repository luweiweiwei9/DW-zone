import { supabase } from './supabase';
import { UserProfile } from '../types';

export const authService = {
  // 觸發 Google 登入
  async login() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // 登出
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error);
  },

  // 取得當前使用者 Profile
  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      const user = session.user;

      // 嘗試從 Supabase users 資料表抓取額外屬性（如 roomId, partnerId）
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      return {
        uid: user.id,
        id: user.id,
        displayName: profile?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        photoURL: profile?.photo_url || user.user_metadata?.avatar_url || '',
        role: profile?.role || 'user',
        roomId: profile?.room_id || user.user_metadata?.roomId || '',
        partnerId: profile?.partner_id || user.user_metadata?.partnerId || '',
        currentLang: profile?.current_lang || 'en',
      } as UserProfile;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  // Auth 狀態監聽器 (已修正重複觸發問題)
  onAuthUpdate(callback: (user: UserProfile | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser();
        callback(user);
      } else {
        callback(null);
      }
    });

    return () => subscription.unsubscribe();
  },

  // 更新 User Profile
  async updateProfile(uid: string, data: Partial<UserProfile>) {
    try {
      // 轉換欄位格式以符合 Supabase 資料表習慣
      const updateData: Record<string, any> = {
        id: uid,
        updated_at: new Date().toISOString(),
      };

      if (data.displayName !== undefined) updateData.display_name = data.displayName;
      if (data.photoURL !== undefined) updateData.photo_url = data.photoURL;
      if (data.roomId !== undefined) updateData.room_id = data.roomId;
      if (data.partnerId !== undefined) updateData.partner_id = data.partnerId;
      if (data.currentLang !== undefined) updateData.current_lang = data.currentLang;
      if (data.lastActive !== undefined) updateData.last_active = data.lastActive;

      const { error } = await supabase
        .from('users')
        .upsert(updateData);

      if (error) console.error('Error updating profile:', error);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  }
};
