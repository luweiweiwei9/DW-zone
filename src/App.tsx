import React, { useState, useEffect } from 'react';
import { UserRole, UiTheme, UiLanguage, VocabularyItem, MicroStory, LanguageSyncAnchorState, SharedAsset, TeachingLogEntry, UserProfile } from './types';
import { INITIAL_STORIES, INITIAL_ANCHOR_STATE } from './data/mockData';
import { Navbar } from './components/Navbar';
import { HomeFeed } from './components/HomeFeed';
import { Phone, PhoneOff } from 'lucide-react';
import { SmartChat } from './components/SmartChat';
import { SmartVault } from './components/SmartVault';
import { SrsReviewCenter } from './components/SrsReviewCenter';
import { PrdDocViewer } from './components/PrdDocViewer';
import { NewStoryModal } from './components/NewStoryModal';
import { Onboarding } from './components/Onboarding';
import { authService } from './lib/authService';
import { dbService } from './lib/dbService';
import { supabase } from './lib/supabase';
export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [partner, setPartner] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'vault' | 'srs' | 'prd'>('home');
  const [currentTheme, setCurrentTheme] = useState<UiTheme>('glass');
  const [currentLang, setCurrentLang] = useState<UiLanguage>('en');
  const [incomingCall, setIncomingCall] = useState<{ id: string; callerName: string } | null>(null);
  useEffect(() => {
    // 1. 頁面載入時取得當前 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // 如果原本 App 用 authService 處理 Profile，可在這裡載入
        authService.getCurrentUser().then(setUser);
      } else {
        setUser(null);
      }
    });

    // 2. 監聽 Google 授權跳轉回來的狀態變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        authService.getCurrentUser().then(setUser);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);
  // Real-time Data
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [assets, setAssets] = useState<SharedAsset[]>([]);
  const [teachingLog, setTeachingLog] = useState<TeachingLogEntry[]>([]);
  const [stories, setStories] = useState<MicroStory[]>([]);
  
  const [anchors, setAnchors] = useState<LanguageSyncAnchorState>(INITIAL_ANCHOR_STATE);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);

  // Update activity
  useEffect(() => {
    if (user?.uid) {
      authService.updateProfile(user.uid, { lastActive: new Date() });
      const interval = setInterval(() => {
        authService.updateProfile(user.uid, { lastActive: new Date() });
      }, 2 * 60 * 1000); // Every 2 minutes
      return () => clearInterval(interval);
    }
  }, [user?.uid]);

  // Shared State Listener
  useEffect(() => {
    if (user?.roomId) {
      const unsub = dbService.subscribeToRoomState(user.roomId, (state) => {
        if (state) setAnchors(prev => ({ ...prev, ...state }));
      });
      return () => unsub();
    }
  }, [user?.roomId]);

  // Dynamic Anchor Calculation & Persistence
  useEffect(() => {
    if (user?.roomId && user?.uid && partner?.uid) {
      const vocabCount = vocabulary.length;
      const storyCount = stories.length;
      
      const calculatedStreak = Math.max(1, Math.floor((vocabCount + storyCount) / 3));
      const progress = Math.min(100, Math.floor(((vocabCount + storyCount) / 50) * 100));

      const today = new Date().toLocaleDateString();
      
      // Determine if I am User A or User B (Stable sorting)
      const isUserA = user.uid < partner.uid;
      const field = isUserA ? 'userACompleted' : 'userBCompleted';
      const partnerField = isUserA ? 'userBCompleted' : 'userACompleted';

      // My progress
      const myStoriesToday = stories.filter(s => s.userId === user.uid && new Date(s.timestamp).toLocaleDateString() === today);
      const myVocabToday = vocabulary.filter(v => v.addedBy === user.uid && new Date().toLocaleDateString() === today);
      
      // Partner's progress (Now both are shared!)
      const partnerStoriesToday = stories.filter(s => s.userId === partner.uid && new Date(s.timestamp).toLocaleDateString() === today);
      const partnerVocabToday = vocabulary.filter(v => v.addedBy === partner.uid && new Date(v.timestamp?.toDate?.() || v.timestamp).toLocaleDateString() === today);

      const updatedHabits = anchors.sharedHabits.map(h => {
        let newH = { ...h };
        if (h.id === 'h1') { // Daily Audio Story
          newH[field] = myStoriesToday.length > 0;
          newH[partnerField] = partnerStoriesToday.length > 0;
        }
        if (h.id === 'h2') { // Extracted to Vault
          newH[field] = myVocabToday.length > 0;
          newH[partnerField] = partnerVocabToday.length > 0;
        }
        if (h.id === 'h3') { // Complete SRS
          // Proxy with any activity for now
          newH[field] = myVocabToday.length > 0 || myStoriesToday.length > 0;
        }
        return newH;
      });

      const nextState = {
        streakDays: Math.max(anchors.streakDays, calculatedStreak),
        exchangeProgress: Math.max(anchors.exchangeProgress, progress),
        sharedHabits: updatedHabits
      };

      // Only push to Firestore if something actually changed to avoid loops
      if (JSON.stringify(nextState) !== JSON.stringify({
        streakDays: anchors.streakDays,
        exchangeProgress: anchors.exchangeProgress,
        sharedHabits: anchors.sharedHabits
      })) {
        dbService.updateRoomState(user.roomId, nextState);
      }
    }
  }, [user, partner, vocabulary, stories]);

  useEffect(() => {
    document.body.className = `theme-${currentTheme}`;
  }, [currentTheme]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = authService.onAuthUpdate((userProfile) => {
      setUser(userProfile);
      if (userProfile?.currentLang) setCurrentLang(userProfile.currentLang);
    });
    return () => unsubscribe();
  }, []);

  // Partner Listener
  useEffect(() => {
    if (user?.partnerId) {
      const unsubPartner = dbService.subscribeToPartner(user.partnerId, setPartner);
      return () => unsubPartner();
    } else {
      setPartner(null);
    }
  }, [user?.partnerId]);

  // Data Listeners
  useEffect(() => {
    if (user?.roomId) {
      const unsubVault = dbService.subscribeToVault(user.roomId, setVocabulary);
      return () => unsubVault();
    }
  }, [user?.roomId]);

  useEffect(() => {
    if (user?.roomId) {
      const unsubAssets = dbService.subscribeToAssets(user.roomId, setAssets);
      const unsubTeaching = dbService.subscribeToTeachingLog(user.roomId, setTeachingLog);
      const unsubStories = dbService.subscribeToStories(user.roomId, setStories);
      
      // Call listener
      const unsubCalls = dbService.subscribeToIncomingCalls(user.roomId, user.uid, (call) => {
        if (call) {
          setIncomingCall({ id: call.id, callerName: call.callerName });
        } else {
          setIncomingCall(null);
        }
      });

      return () => {
        unsubAssets();
        unsubTeaching();
        unsubStories();
        unsubCalls();
      };
    }
  }, [user?.roomId, user?.uid]);

  const handleAddVocabularyItem = (item: VocabularyItem) => {
    if (user?.roomId) {
      dbService.addToVault(user.roomId, item);
    }
  };

  const handleAddVocabularyFromChat = (term: string, translation: string, bucket: any) => {
    if (user?.roomId && user?.uid) {
      dbService.addToVault(user.roomId, {
        term,
        translation,
        bucket,
        phonetic: 'Extracted from Chat',
        addedBy: user.uid,
        srsLevel: 1,
        nextReviewDate: 'Tomorrow'
      });
    }
  };

  const handleAddStory = (story: MicroStory) => {
    setStories(prev => [story, ...prev]);
  };

  if (!user || !user.partnerId) {
    return <Onboarding onLogin={setUser} />;
  }

  const currentUserUid = user.uid;

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      <Navbar
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentTheme={currentTheme}
        setCurrentTheme={setCurrentTheme}
        currentUser={user?.uid || ''}
        setCurrentUser={() => {}} // User is locked by Firebase auth
      />

      {/* Incoming Call Overlay */}
      {incomingCall && (
        <div className="fixed inset-0 z-100 bg-slate-900/95 flex flex-col items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-24 h-24 bg-rose-600 rounded-full flex items-center justify-center animate-pulse mb-6 shadow-2xl shadow-rose-500/50">
            <Phone className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">{incomingCall.callerName}</h2>
          <p className="text-rose-400 font-bold uppercase tracking-widest text-sm mb-12 animate-bounce">Incoming Duo Call...</p>
          
          <div className="flex space-x-8">
            <button 
              onClick={() => {
                dbService.endCall(user!.roomId!);
                setIncomingCall(null);
              }}
              className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition shadow-xl"
            >
              <PhoneOff className="w-8 h-8 text-white" />
            </button>
            <button 
              onClick={() => {
                setIncomingCall(null);
                setActiveTab('chat');
                // In a real app we'd start the WebRTC connection here
              }}
              className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center hover:bg-emerald-600 transition shadow-xl"
            >
              <Phone className="w-8 h-8 text-white" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 pb-16">
        {activeTab === 'home' && (
          <HomeFeed
            currentUser={currentUserUid}
            currentLang={currentLang}
            user={user}
            partner={partner}
            stories={stories}
            anchors={anchors}
            setAnchors={setAnchors}
            onOpenNewStory={() => setIsStoryModalOpen(true)}
            goToChat={() => setActiveTab('chat')}
          />
        )}
        {activeTab === 'chat' && (
          <SmartChat
            currentUser={user}
            partner={partner}
            currentLang={currentLang}
            roomId={user.roomId}
            onAddVocabulary={handleAddVocabularyFromChat}
          />
        )}
        {activeTab === 'vault' && (
          <SmartVault
            vocabulary={vocabulary}
            assets={assets}
            teachingLog={teachingLog}
            onAddVocabularyItem={handleAddVocabularyItem}
            currentUser={user?.uid || ''}
            currentLang={currentLang}
            user={user}
            partner={partner}
          />
        )}
        {activeTab === 'srs' && (
          <SrsReviewCenter 
            currentUser={user?.uid || ''} 
            currentLang={currentLang}
            vocabulary={vocabulary}
            partner={partner}
          />
        )}
        {activeTab === 'prd' && (
          <PrdDocViewer currentLang={currentLang} />
        )}
      </main>

      {user && (
        <NewStoryModal
          currentUser={user}
          currentLang={currentLang}
          roomId={user.roomId}
          isOpen={isStoryModalOpen}
          onClose={() => setIsStoryModalOpen(false)}
          onAddStory={handleAddStory}
        />
      )}
    </div>
  );
}
