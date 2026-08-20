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
      
      // 回傳符合 UserProfile 結構的物件
      return {
        uid: user.id,
        displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        photoURL: user.user_metadata?.avatar_url || '',
        role: 'user',
      } as UserProfile;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  // 更新 User Profile
  async updateProfile(uid: string, data: Partial<UserProfile>) {
    const { error } = await supabase
      .from('users')
      .upsert({ id: uid, ...data });

    if (error) console.error('Error updating profile:', error);
  }
};
