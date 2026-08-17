import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp,
  doc,
  getDoc,
  setDoc,
  where,
  limit,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { ChatMessage, VocabularyItem, SharedAsset, TeachingLogEntry, MicroStory } from '../types';

export const dbService = {
  // Real-time Chat
  subscribeToMessages(roomId: string, callback: (messages: ChatMessage[]) => void) {
    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const now = Timestamp.now();
      const messages = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(msg => {
          if (msg.expiresAt && msg.expiresAt < now) return false;
          return true;
        })
        .map(msg => ({
          ...msg,
          createdAtMillis: msg.timestamp?.toMillis?.() || Date.now(),
          timestamp: msg.timestamp?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''
        }))
        .reverse();
      callback(messages);
    });
  },

  async sendMessage(roomId: string, message: Partial<ChatMessage>, expirationHours?: number) {
    const msgData: any = {
      ...message,
      timestamp: serverTimestamp(),
      deletedBy: [],
      recalled: false
    };

    if (expirationHours) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expirationHours);
      msgData.expiresAt = Timestamp.fromDate(expiresAt);
    }

    await addDoc(collection(db, 'rooms', roomId, 'messages'), msgData);
  },

  async uploadMedia(file: Blob, path: string) {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  },

  // Vault (Shared per Room)
  subscribeToVault(roomId: string, callback: (items: VocabularyItem[]) => void) {
    const q = query(
      collection(db, 'vault'),
      where('roomId', '==', roomId),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VocabularyItem));
      callback(items);
    });
  },

  async addToVault(roomId: string, item: Partial<VocabularyItem>) {
    const id = `v_${Date.now()}`;
    await setDoc(doc(db, 'vault', id), {
      ...item,
      roomId,
      timestamp: serverTimestamp(),
      srsLevel: item.srsLevel || 1,
      nextReviewDate: item.nextReviewDate || 'Tomorrow'
    });
  },

  // Shared Assets
  subscribeToAssets(roomId: string, callback: (assets: SharedAsset[]) => void) {
    const q = query(
      collection(db, 'rooms', roomId, 'shared_assets'),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const assets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SharedAsset));
      callback(assets);
    });
  },

  async addAsset(roomId: string, asset: Partial<SharedAsset>) {
    await addDoc(collection(db, 'rooms', roomId, 'shared_assets'), {
      ...asset,
      timestamp: serverTimestamp()
    });
  },

  // Teaching Log
  subscribeToTeachingLog(roomId: string, callback: (logs: TeachingLogEntry[]) => void) {
    const q = query(
      collection(db, 'rooms', roomId, 'teaching_log'),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeachingLogEntry));
      callback(logs);
    });
  },

  async addTeachingLog(roomId: string, log: Partial<TeachingLogEntry>) {
    await addDoc(collection(db, 'rooms', roomId, 'teaching_log'), {
      ...log,
      timestamp: serverTimestamp()
    });
  },

  // Room State (Shared Anchors)
  subscribeToRoomState(roomId: string, callback: (state: any) => void) {
    return onSnapshot(doc(db, 'rooms', roomId, 'state', 'anchors'), (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
    });
  },

  async updateRoomState(roomId: string, partialState: any) {
    const docRef = doc(db, 'rooms', roomId, 'state', 'anchors');
    await setDoc(docRef, partialState, { merge: true });
  },

  // Stories
  subscribeToStories(roomId: string, callback: (stories: MicroStory[]) => void) {
    const q = query(
      collection(db, 'rooms', roomId, 'stories'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    return onSnapshot(q, (snapshot) => {
      const now = Timestamp.now();
      const stories = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(story => {
          if (story.expiresAt && story.expiresAt < now) return false;
          return true;
        })
        .map(story => ({
          ...story,
          timestamp: story.timestamp?.toDate()?.toISOString() || new Date().toISOString()
        }));
      callback(stories);
    });
  },

  async addStory(roomId: string, story: Partial<MicroStory>) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    await addDoc(collection(db, 'rooms', roomId, 'stories'), {
      ...story,
      timestamp: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt)
    });
  },

  // User/Partner
  subscribeToPartner(partnerId: string, callback: (partner: any) => void) {
    return onSnapshot(doc(db, 'users', partnerId), (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() });
      } else {
        callback(null);
      }
    });
  },

  // Calls
  async initiateCall(roomId: string, callerId: string, callerName: string) {
    const callRef = doc(collection(db, 'rooms', roomId, 'calls'), 'active_call');
    await setDoc(callRef, {
      callerId,
      callerName,
      status: 'ringing',
      timestamp: serverTimestamp()
    });
  },

  async endCall(roomId: string) {
    const callRef = doc(collection(db, 'rooms', roomId, 'calls'), 'active_call');
    await setDoc(callRef, { status: 'ended', timestamp: serverTimestamp() });
  },

  async deleteMessageForSelf(roomId: string, messageId: string, userId: string) {
    const msgRef = doc(db, 'rooms', roomId, 'messages', messageId);
    await updateDoc(msgRef, {
      deletedBy: arrayUnion(userId)
    });
  },

  async recallMessage(roomId: string, messageId: string, userId: string) {
    const msgRef = doc(db, 'rooms', roomId, 'messages', messageId);
    const snap = await getDoc(msgRef);
    if (snap.exists()) {
      const data = snap.data();
      const msgTimestamp = data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now();
      const now = Date.now();
      const threeHoursInMs = 3 * 60 * 60 * 1000;
      if (now - msgTimestamp > threeHoursInMs) {
        throw new Error('Message is older than 3 hours and cannot be recalled.');
      }
    }
    await updateDoc(msgRef, {
      recalled: true,
      recalledBy: userId
    });
  },

  subscribeToIncomingCalls(roomId: string, currentUserId: string, callback: (call: any) => void) {
    const callRef = doc(collection(db, 'rooms', roomId, 'calls'), 'active_call');
    return onSnapshot(callRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'ringing' && data.callerId !== currentUserId) {
          callback({ id: docSnap.id, ...data });
        } else {
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  }
};
