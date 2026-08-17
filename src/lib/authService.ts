import { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  collection, 
  where, 
  getDocs,
  onSnapshot,
  runTransaction
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { UserProfile } from '../types';

export const authService = {
  async login() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if profile exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // Create profile and generate invite code
        const inviteCode = `DW-${user.uid.slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          name: user.displayName || 'Friend',
          avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
          inviteCode,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        await setDoc(doc(db, 'users', user.uid), profile);
        await setDoc(doc(db, 'invites', inviteCode), {
          senderId: user.uid,
          createdAt: new Date(),
          status: 'pending'
        });
        return profile;
      }
      return userDoc.data() as UserProfile;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async updateProfile(uid: string, data: Partial<UserProfile>) {
    await updateDoc(doc(db, 'users', uid), data);
  },

  async logout() {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error('Logout error:', error);
    }
  },

  onAuthUpdate(callback: (user: UserProfile | null) => void) {
    let unsubProfile: (() => void) | null = null;
    
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (user) {
        // Use onSnapshot for the profile to be more resilient and stay in sync
        unsubProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            callback(docSnap.data() as UserProfile);
          } else {
            // Profile might not be created yet during the first login
            console.warn('User profile document does not exist yet');
          }
        }, (error) => {
          console.error('Error listening to user profile:', error);
          // Don't clear user yet, maybe it's just a transient error
        });
      } else {
        callback(null);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  },

  async pairWithCode(currentUser: UserProfile, code: string) {
    if (!currentUser.uid) return { error: 'Not logged in' };
    
    const inviteDoc = await getDoc(doc(db, 'invites', code));
    if (!inviteDoc.exists()) return { error: 'Invalid code' };
    
    const inviteData = inviteDoc.data();
    if (inviteData.status === 'used') return { error: 'Code already used' };
    if (inviteData.senderId === currentUser.uid) return { error: 'Cannot pair with yourself' };

    const partnerId = inviteData.senderId;
    const ids = [currentUser.uid, partnerId].sort();
    const roomId = `room_${ids[0]}_${ids[1]}`;

    try {
      await runTransaction(db, async (transaction) => {
        // Create room
        transaction.set(doc(db, 'rooms', roomId), {
          participants: [currentUser.uid, partnerId],
          createdAt: new Date()
        });

        // Update current user
        transaction.update(doc(db, 'users', currentUser.uid), {
          partnerId,
          roomId
        });

        // Update partner
        transaction.update(doc(db, 'users', partnerId), {
          partnerId: currentUser.uid,
          roomId
        });

        // Mark code as used
        transaction.update(doc(db, 'invites', code), {
          status: 'used'
        });
      });
      return { success: true, roomId, partnerId };
    } catch (e) {
      console.error(e);
      return { error: 'Pairing failed' };
    }
  }
};
