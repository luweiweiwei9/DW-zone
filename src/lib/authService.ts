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

  // 補上這段！讓舊元件呼叫 onAuthUpdate 時不會崩潰
  onAuthUpdate(callback: (user: UserProfile | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser();
        callback(user);
      } else {
        callback(null);
      }
    });

    // 頁面載入時先執行一次 Initial Check
    this.getCurrentUser().then(callback);

    return () => subscription.unsubscribe();
  },

  // 更新 User Profile
  async updateProfile(uid: string, data: Partial<UserProfile>) {
    const { error } = await supabase
      .from('users')
      .upsert({ id: uid, ...data });

    if (error) console.error('Error updating profile:', error);
  }
};
