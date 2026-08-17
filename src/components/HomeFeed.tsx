import React, { useState, useEffect, useRef } from 'react';
import { MicroStory, LanguageSyncAnchorState, UserRole, UiLanguage, UserProfile } from '../types';
import { INITIAL_STORIES, INITIAL_ANCHOR_STATE, PROFILES } from '../data/mockData';
import { translations } from '../lib/translations';
import { Clock, MapPin, Heart, Flame, Volume2, Plus, Sparkles, CheckCircle2, Circle, Calendar, Globe, Languages, Check, X, Award, ChevronRight, Zap, Target, Trophy, RefreshCw } from 'lucide-react';
import { dbService } from '../lib/dbService';
import { playVoice } from '../lib/voiceUtils';

interface HomeFeedProps {
  currentUser: UserRole;
  currentLang: UiLanguage;
  stories: MicroStory[];
  anchors: LanguageSyncAnchorState;
  setAnchors: React.Dispatch<React.SetStateAction<LanguageSyncAnchorState>>;
  onOpenNewStory: () => void;
  goToChat: () => void;
  user?: UserProfile | null;
  partner?: UserProfile | null;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({ 
  currentUser, 
  currentLang, 
  stories, 
  anchors, 
  setAnchors, 
  onOpenNewStory, 
  goToChat,
  user,
  partner
}) => {
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const [hkTime, setHkTime] = useState('');
  const [stoTime, setStoTime] = useState('');
  const [showBreakdown, setShowBreakdown] = useState<Record<string, boolean>>({});
  const [addedTerms, setAddedTerms] = useState<Record<string, boolean>>({});
  
  // Modals for Streak Calendar and Goal Details
  const [showStreakCalendar, setShowStreakCalendar] = useState(false);
  const [showGoalDetailsModal, setShowGoalDetailsModal] = useState(false);
  const [showProgressCelebration, setShowProgressCelebration] = useState(false);

  // Pull to refresh states
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const isPullingRef = useRef(false);

  const t = translations[currentLang].home;
  const isMeHK = user?.location === 'HK' || currentUser.location === 'HK' || currentUser.identity === 'DW';

  const getViewerTimezone = () => user?.timezone || (isMeHK ? 'Asia/Hong_Kong' : 'Europe/Stockholm');
  const getZoneLabel = () => isMeHK ? 'HK' : 'STO';

  const isNight = (timeStr: string) => {
    if (!timeStr) return false;
    const hour = parseInt(timeStr.split(':')[0]);
    const isPM = timeStr.includes('PM');
    const adjustedHour = isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
    return adjustedHour >= 22 || adjustedHour <= 6;
  };

  const formatLocalTime = (dateIso: string) => {
    const date = new Date(dateIso);
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: getViewerTimezone(),
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(date) + ' ' + getZoneLabel();
    } catch (e) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
  };

  const getRelativeTime = (dateIso: string) => {
    const now = new Date();
    const past = new Date(dateIso);
    const diffInMs = now.getTime() - past.getTime();
    const diffInHrs = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMins = Math.floor(diffInMs / (1000 * 60));

    if (currentLang === 'zh') {
      if (diffInHrs < 1) return `${Math.max(1, diffInMins)} 分鐘前`;
      if (diffInHrs < 24) return `${diffInHrs} 小時前`;
      return past.toLocaleDateString('zh-HK');
    } else if (currentLang === 'sv') {
      if (diffInHrs < 1) return `${Math.max(1, diffInMins)}m sedan`;
      if (diffInHrs < 24) return `${diffInHrs}t sedan`;
      return past.toLocaleDateString('sv-SE');
    } else {
      if (diffInHrs < 1) return `${Math.max(1, diffInMins)}m ago`;
      if (diffInHrs < 24) return `${diffInHrs}h ago`;
      return past.toLocaleDateString();
    }
  };

  const getTimeRemaining = (dateIso: string) => {
    const date = new Date(dateIso);
    const expiry = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffInMs = expiry.getTime() - now.getTime();
    if (diffInMs <= 0) return currentLang === 'zh' ? '已過期' : (currentLang === 'sv' ? 'Utgången' : 'Expired');
    const hrs = Math.floor(diffInMs / (1000 * 60 * 60));
    if (currentLang === 'zh') return `⏳ 剩餘 ${hrs} 小時`;
    if (currentLang === 'sv') return `⏳ ${hrs}t kvar`;
    return `⏳ ${hrs}h left`;
  };

  // Pull to refresh touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 5) {
      touchStartY.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || touchStartY.current === null || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0 && window.scrollY <= 5) {
      // Elastic resistance
      const distance = Math.min(diff * 0.45, 90);
      setPullDistance(distance);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;
    touchStartY.current = null;

    if (pullDistance > 55 && !isRefreshing) {
      triggerRefresh();
    } else {
      setPullDistance(0);
    }
  };

  const triggerRefresh = async () => {
    setIsRefreshing(true);
    setPullDistance(60);

    // Refresh times and synchronize anchor state
    const now = new Date();
    try {
      const hkFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Hong_Kong',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      const stoFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Stockholm',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setHkTime(hkFormatter.format(now));
      setStoTime(stoFormatter.format(now));
    } catch (e) {
      // fallback
    }

    // If connected to room, simulate quick sync recheck
    if (user?.roomId) {
      try {
        await dbService.updateRoomState(user.roomId, {
          lastSynced: new Date().toISOString()
        });
      } catch (err) {
        console.error("Refresh sync error:", err);
      }
    }

    setTimeout(() => {
      setIsRefreshing(false);
      setPullDistance(0);
    }, 800);
  };

  // Group stories by user and day for Daily Memory Strip
  const sortedStories = [...stories].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  const groupedStories = sortedStories.reduce((acc, story) => {
    const dateKey = new Date(story.timestamp).toLocaleDateString();
    const groupKey = `${story.userId}-${dateKey}`;
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(story);
    return acc;
  }, {} as Record<string, MicroStory[]>);

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      try {
        const hkFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Hong_Kong',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        const stoFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Europe/Stockholm',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        setHkTime(hkFormatter.format(now));
        setStoTime(stoFormatter.format(now));
      } catch (e) {
        setHkTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setStoTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, []);

  const partnerActive = partner?.lastActive;
  const isPartnerActive = partnerActive 
    ? (Date.now() - (partnerActive.toDate?.()?.getTime() || (partnerActive.seconds * 1000) || new Date(partnerActive).getTime()) < 5 * 60 * 1000)
    : false;

  const toggleHabit = async (id: string) => {
    const isUserA = user?.uid && partner?.uid ? user.uid < partner.uid : isMeHK;
    
    let allCompletedAfterThis = false;
    let newProgress = anchors.exchangeProgress;

    const updatedHabits = anchors.sharedHabits.map(h => {
      if (h.id === id) {
        const updated = isUserA 
          ? { ...h, userACompleted: !h.userACompleted }
          : { ...h, userBCompleted: !h.userBCompleted };
        return updated;
      }
      return h;
    });

    // Check if all goals are now completed by this user
    const completedCount = updatedHabits.filter(h => isUserA ? h.userACompleted : h.userBCompleted).length;
    if (completedCount === updatedHabits.length) {
      allCompletedAfterThis = true;
      newProgress = Math.min(100, anchors.exchangeProgress + 5);
      setShowProgressCelebration(true);
      setTimeout(() => setShowProgressCelebration(false), 4000);
    }

    const nextState = {
      ...anchors,
      sharedHabits: updatedHabits,
      exchangeProgress: newProgress
    };

    setAnchors(nextState);

    // Save to Firestore if connected to a room
    if (user?.roomId) {
      try {
        await dbService.updateRoomState(user.roomId, {
          sharedHabits: updatedHabits,
          exchangeProgress: newProgress
        });
      } catch (err) {
        console.error("Failed to update habits in Firestore:", err);
      }
    }
  };

  const handleSpeak = (text: string, lang: string) => {
    playVoice(text, lang === 'zh-HK' || /[\u4e00-\u9fa5]/.test(text) ? 'zh-HK' : (lang === 'sv-SE' ? 'sv-SE' : 'en-US'));
  };

  const handleAddToVault = async (storyId: string, term: string, translation: string) => {
    if (!user?.roomId) {
      setAddedTerms(prev => ({ ...prev, [`${storyId}_${term}`]: true }));
      return;
    }
    try {
      await dbService.addToVault(user.roomId, {
        term,
        translation,
        phonetic: '',
        bucket: 'Grammar',
        addedBy: user.uid,
        srsLevel: 1,
        nextReviewDate: new Date().toISOString()
      });
      setAddedTerms(prev => ({ ...prev, [`${storyId}_${term}`]: true }));
    } catch (err) {
      console.error("Failed to add to vault:", err);
      setAddedTerms(prev => ({ ...prev, [`${storyId}_${term}`]: true }));
    }
  };

  // Calendar generation for Streak Modal
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const todayDateNum = new Date().getDate();

  const monthName = new Intl.DateTimeFormat(
    currentLang === 'zh' ? 'zh-HK' : (currentLang === 'sv' ? 'sv-SE' : 'en-US'), 
    { month: 'long', year: 'numeric' }
  ).format(new Date());

  return (
    <div 
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-To-Refresh Visual Indicator Banner */}
      <div 
        className="overflow-hidden transition-all duration-200 flex flex-col items-center justify-center text-slate-500"
        style={{ 
          height: pullDistance > 0 ? `${pullDistance}px` : (isRefreshing ? '50px' : '0px'),
          opacity: pullDistance > 10 || isRefreshing ? 1 : 0
        }}
      >
        <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-md border border-rose-100 text-xs font-bold text-rose-600">
          <RefreshCw className={`w-4 h-4 text-rose-500 ${isRefreshing || pullDistance > 55 ? 'animate-spin' : ''}`} />
          <span>
            {isRefreshing 
              ? t.pullToRefresh.refreshing 
              : (pullDistance > 55 ? t.pullToRefresh.release : t.pullToRefresh.pulling)}
          </span>
        </div>
      </div>
      
      {/* Celebration Banner when completing daily goals */}
      {showProgressCelebration && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-top duration-300 border border-white/20">
          <Trophy className="w-6 h-6 text-amber-300 animate-bounce" />
          <div>
            <div className="font-black text-sm">{t.goalsCelebration.title}</div>
            <div className="text-xs text-emerald-100">{t.goalsCelebration.sub}</div>
          </div>
        </div>
      )}

      {/* 1. Streak Calendar Modal */}
      {showStreakCalendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-600">
                  <Flame className="w-7 h-7 fill-pink-500 text-pink-500 animate-bounce" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-xl tracking-tight">{t.streakModal.title}</h3>
                  <p className="text-xs text-slate-500 font-semibold">{t.streakModal.subtitle}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowStreakCalendar(false)} 
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Streak Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 bg-rose-50 rounded-2xl text-center border border-rose-100">
                <div className="text-2xl font-black text-rose-600 font-mono">{anchors.streakDays}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{t.streakModal.currentStreak}</div>
              </div>
              <div className="p-3.5 bg-indigo-50 rounded-2xl text-center border border-indigo-100">
                <div className="text-2xl font-black text-indigo-600 font-mono">48</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{t.streakModal.totalDays}</div>
              </div>
              <div className="p-3.5 bg-amber-50 rounded-2xl text-center border border-amber-100">
                <div className="text-2xl font-black text-amber-600 font-mono">50</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{t.streakModal.nextTrophy}</div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                <span>{monthName}</span>
                <span className="text-[10px] text-slate-400">{t.streakModal.bothCheckedIn}</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-slate-400 pb-1">
                {t.streakModal.daysShort.map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-9 rounded-xl bg-transparent" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isToday = day === todayDateNum;
                  const isPast = day < todayDateNum;
                  const hasCheckedIn = isPast || (isToday && anchors.streakDays > 0);
                  
                  return (
                    <div
                      key={`day-${day}`}
                      className={`h-9 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all relative ${
                        isToday
                          ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-300'
                          : hasCheckedIn
                          ? 'bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100'
                          : 'bg-slate-50 text-slate-400 border border-slate-100'
                      }`}
                    >
                      <span className="text-[11px] font-mono leading-none">{day}</span>
                      {hasCheckedIn && (
                        <span className="text-[9px] leading-none mt-0.5">{isToday ? '🔥' : '✨'}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Milestone Roadmap */}
            <div className="p-4 bg-slate-50 rounded-2xl space-y-2.5 border border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>{t.streakModal.nextMilestone}</span>
                </span>
                <span className="text-rose-600 font-mono font-black">{50 - anchors.streakDays} {t.streakModal.daysLeft}</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-rose-600 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, (anchors.streakDays / 50) * 100)}%` }}
                />
              </div>
            </div>

            <button
              onClick={() => { setShowStreakCalendar(false); goToChat(); }}
              className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:opacity-95 transition flex items-center justify-center space-x-2 text-xs"
            >
              <span>{t.streakModal.keepStreakBtn}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Goal Details & Rewards Modal */}
      {showGoalDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Target className="w-7 h-7 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-xl tracking-tight">{t.goalDetailsModal.title}</h3>
                  <p className="text-xs text-slate-500 font-semibold">{t.goalDetailsModal.subtitle}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowGoalDetailsModal(false)} 
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between font-bold text-xs text-slate-800">
                  <span className="flex items-center space-x-2">
                    <span className="text-base">🎙️</span>
                    <span>{t.goalDetailsModal.task1Title}</span>
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md font-mono text-[10px] font-bold">+15 XP</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t.goalDetailsModal.task1Desc}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between font-bold text-xs text-slate-800">
                  <span className="flex items-center space-x-2">
                    <span className="text-base">📚</span>
                    <span>{t.goalDetailsModal.task2Title}</span>
                  </span>
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md font-mono text-[10px] font-bold">+20 XP</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t.goalDetailsModal.task2Desc}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between font-bold text-xs text-slate-800">
                  <span className="flex items-center space-x-2">
                    <span className="text-base">🧠</span>
                    <span>{t.goalDetailsModal.task3Title}</span>
                  </span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md font-mono text-[10px] font-bold">+25 XP</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t.goalDetailsModal.task3Desc}
                </p>
              </div>
            </div>

            {/* Duo Sync Bonus Card */}
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white space-y-1.5 shadow-md">
              <div className="flex items-center justify-between font-bold text-xs">
                <span className="flex items-center space-x-1.5">
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>{t.goalDetailsModal.bonusTitle}</span>
                </span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">+50 Duo XP</span>
              </div>
              <p className="text-xs text-indigo-100">
                {t.goalDetailsModal.bonusDesc}
              </p>
            </div>

            <button
              onClick={() => setShowGoalDetailsModal(false)}
              className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition text-xs"
            >
              {t.goalDetailsModal.closeBtn}
            </button>
          </div>
        </div>
      )}

      {/* Bento Grid Header & Anchor Banner */}
      <div className="bento-grid gap-6">
        {/* Time & Sync Bento Card */}
        <div className="col-span-12 md:col-span-4 dynamic-card p-6 flex flex-col justify-between overflow-hidden relative shadow-sm">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Globe className="w-32 h-32" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase tracking-wider font-bold text-rose-600 bg-rose-500/10 px-3 py-1 rounded-full">{t.syncTitle}</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t.liveConnection}</span>
            </div>
          </div>
          <div className="space-y-4 my-2">
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-2xl border transition-colors ${isNight(hkTime) ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-rose-50 border-rose-100 text-rose-900'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">HK 🇭🇰</span>
                  <span>{isNight(hkTime) ? '🌙' : '☀️'}</span>
                </div>
                <div className="text-xl font-mono font-black tracking-tighter">{hkTime || '--:--'}</div>
              </div>
              <div className={`p-3 rounded-2xl border transition-colors ${isNight(stoTime) ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">STO 🇸🇪</span>
                  <span>{isNight(stoTime) ? '🌙' : '☀️'}</span>
                </div>
                <div className="text-xl font-mono font-black tracking-tighter">{stoTime || '--:--'}</div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>{t.exchangeProgress}</span>
                <span className="text-rose-600 font-extrabold">{anchors.exchangeProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden p-0.5">
                <div 
                  className="bg-gradient-to-r from-rose-500 to-indigo-600 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${anchors.exchangeProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span>{t.duoStatus}:</span>
            <span className="text-emerald-600 font-bold">{t.perfectlySynced}</span>
          </div>
        </div>

        {/* Streak & Score Bento Card (Interactive, opens Calendar Modal) */}
        <div 
          onClick={() => setShowStreakCalendar(true)}
          className="col-span-12 md:col-span-4 dynamic-card p-6 flex flex-col justify-between cursor-pointer hover:shadow-xl hover:border-pink-300 transition duration-200 group relative shadow-sm"
          title="Click to view Streak History Calendar"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase tracking-wider font-bold text-pink-600 bg-pink-500/10 px-3 py-1 rounded-full flex items-center space-x-1">
              <span>{t.streakTitle}</span>
              <span className="text-[10px] font-normal text-pink-500 group-hover:underline">{t.viewCalendar}</span>
            </span>
            <Sparkles className="w-5 h-5 text-pink-500 group-hover:rotate-12 transition" />
          </div>
          <div className="flex items-center justify-between my-2">
            <div>
              <div className="text-4xl font-extrabold tracking-tight flex items-center space-x-2 text-slate-900">
                <span>{anchors.streakDays}</span>
                <Flame className="w-8 h-8 text-rose-500 fill-rose-500 animate-pulse" />
              </div>
              <p className="text-xs text-slate-500 mt-1">{t.streakSub}</p>
            </div>
            <div className="bg-slate-100/60 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center space-x-2 border border-white/40 shadow-xs">
              <div className={`w-3 h-3 rounded-full animate-pulse ${isPartnerActive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-400'}`}></div>
              <div>
                <div className={`text-lg font-extrabold ${isPartnerActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {isPartnerActive ? t.partnerStatus.active : t.partnerStatus.away}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">{t.duoStatus}</div>
              </div>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); goToChat(); }}
            className="w-full bg-gradient-to-r from-rose-600 to-indigo-600 hover:opacity-90 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-md text-center mt-2"
          >
            {translations[currentLang].tabs.chat} 💬
          </button>
        </div>

        {/* Daily Micro-Habits Bento Card (Interactive Real-time Sync) */}
        <div className="col-span-12 md:col-span-4 dynamic-card p-6 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider font-bold text-indigo-600 bg-indigo-500/10 px-3 py-1 rounded-full">{t.goalsTitle}</span>
            <button 
              onClick={() => setShowGoalDetailsModal(true)}
              className="p-1 rounded-lg hover:bg-indigo-50 text-indigo-500 transition"
              title="View Goal Details"
            >
              <Calendar className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-2.5 my-2">
            {anchors.sharedHabits.map((habit) => {
              const isUserA = user?.uid && partner?.uid ? user.uid < partner.uid : isMeHK;
              const isCompleted = isUserA ? habit.userACompleted : habit.userBCompleted;
              const partnerCompleted = isUserA ? habit.userBCompleted : habit.userACompleted;
              const habitText = t.goalsList ? (t.goalsList as any)[habit.id] || habit.title : habit.title;
              const partnerFlag = isMeHK ? '🇸🇪' : '🇭🇰';

              return (
                <div
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition text-xs border ${
                    isCompleted 
                      ? 'bg-emerald-50/60 border-emerald-200 text-slate-800' 
                      : 'bg-white/60 hover:bg-white/90 border-slate-200/50 text-slate-700'
                  } shadow-2xs active:scale-98`}
                >
                  <div className="flex items-center space-x-2 truncate pr-2">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span className={`font-semibold truncate ${isCompleted ? 'text-slate-900 line-through opacity-80' : 'text-slate-800'}`}>
                      {habitText}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      partnerCompleted 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {partnerFlag} {partnerCompleted ? (currentLang === 'zh' ? '已完成 ✓' : (currentLang === 'sv' ? 'Klar ✓' : 'Done ✓')) : (currentLang === 'zh' ? '待處理' : (currentLang === 'sv' ? 'Väntar' : 'Pending'))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setShowGoalDetailsModal(true)}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold italic pt-2 border-t border-slate-200/40 text-left flex items-center justify-between"
          >
            <span>{t.goalsFooter}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Micro-Story Check-in Section */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t.feedTitle}</h2>
            <p className="text-sm text-slate-500">{t.feedSubtitle}</p>
          </div>
          <button
            onClick={onOpenNewStory}
            className="bg-gradient-to-r from-rose-600 to-indigo-600 hover:opacity-90 text-white font-medium px-4 py-2.5 rounded-2xl shadow-md transition flex items-center space-x-2 text-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t.postStory}</span>
          </button>
        </div>

        {/* Stories Timeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {Object.entries(groupedStories).map(([groupKey, groupStories]) => {
            const stories = groupStories as MicroStory[];
            const firstStory = stories[0];
            const hasMultiple = stories.length > 1;

            return (
              <div key={groupKey} className="space-y-4">
                {hasMultiple && (
                  <div className="flex items-center space-x-2 px-1">
                    <div className="h-px flex-1 bg-slate-200"></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 shadow-xs">
                      {t.memoryStrip} • {stories.length} {t.signals}
                    </span>
                    <div className="h-px flex-1 bg-slate-200"></div>
                  </div>
                )}
                
                <div className={`${hasMultiple ? 'flex flex-col space-y-4' : ''}`}>
                  {stories.map((story, sIdx) => {
                    const isAuthorHK = story.userId === 'userA' || (story.userId === user?.uid && isMeHK) || (story.userId === partner?.uid && !isMeHK);
                    const authorFlag = isAuthorHK ? '🇭🇰' : '🇸🇪';
                    const authorLocationName = isAuthorHK 
                      ? (currentLang === 'zh' ? '香港' : (currentLang === 'sv' ? 'Hongkong' : 'Hong Kong')) 
                      : (currentLang === 'zh' ? '瑞典' : (currentLang === 'sv' ? 'Sverige' : 'Sweden'));

                    return (
                      <div key={story.id} className="dynamic-card overflow-hidden flex flex-col group hover:shadow-2xl transition duration-300 relative">
                        {/* Header */}
                        <div className="p-4 pb-3 flex items-center justify-between border-b border-slate-200/40 bg-white/30 backdrop-blur-sm">
                          <div className="flex items-center space-x-3">
                            <div className="relative shrink-0">
                              <img
                                src={story.userId === user?.uid ? user.avatar : partner?.avatar || (isAuthorHK ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80')}
                                alt={story.authorName}
                                className={`w-10 h-10 rounded-full object-cover shadow-xs ring-2 ${isAuthorHK ? 'ring-rose-200' : 'ring-indigo-200'}`}
                              />
                              <span className="absolute -bottom-1 -right-1 text-[10px] bg-white rounded-full shadow-sm p-0.5">
                                {authorFlag}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-slate-900">{story.userId === user?.uid ? user.name : partner?.name || story.authorName}</h4>
                              <div className="text-[10px] text-slate-400 flex items-center space-x-2">
                                <span className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {getRelativeTime(story.timestamp)}
                                </span>
                                <span className="text-rose-500 font-semibold">{getTimeRemaining(story.timestamp)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold shadow-2xs border uppercase tracking-tight ${isAuthorHK ? 'bg-rose-50 text-rose-600 border-rose-200/50' : 'bg-indigo-50 text-indigo-600 border-indigo-200/50'}`}>
                              {authorLocationName}
                            </span>
                          </div>
                        </div>

                        {/* Image & Hotspots */}
                        <div className="relative aspect-video bg-slate-100 overflow-hidden">
                          {story.imageUrl && (
                            <img
                              src={story.imageUrl}
                              alt="Story media"
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                            />
                          )}
                          
                          {/* Real-Time Timestamp Badge Overlay */}
                          <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md border border-white/20 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1.5 shadow-lg">
                            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                            <span>{t.capturedAt} {formatLocalTime(story.timestamp)}</span>
                          </div>

                          {/* Sequential Strip Indicator for multiple stories */}
                          {hasMultiple && (
                            <div className="absolute top-3 right-3 flex space-x-1">
                              {stories.map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`h-1 rounded-full transition-all duration-300 ${i === sIdx ? 'w-4 bg-rose-500' : 'w-2 bg-white/40'}`} 
                                />
                              ))}
                            </div>
                          )}

                          {story.culturalHotspots?.map((hs, idx) => (
                            <div
                              key={idx}
                              className="absolute"
                              style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
                            >
                              <button
                                onClick={() => setActiveHotspot(activeHotspot === hs.title ? null : hs.title)}
                                className="w-7 h-7 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center shadow-lg ring-4 ring-white/70 animate-bounce text-xs"
                              >
                                i
                              </button>
                              {activeHotspot === hs.title && (
                                <div className="absolute left-8 top-0 w-64 backdrop-blur-xl bg-slate-900/90 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1 z-20 border border-slate-700">
                                  <div className="font-bold text-rose-300">{hs.title}</div>
                                  <p className="text-slate-200">{hs.description}</p>
                                </div>
                              )}
                            </div>
                          ))}

                          {story.voiceSnippetDuration && (
                            <div className="absolute bottom-3 left-3 backdrop-blur-md bg-black/60 text-white px-3 py-1.5 rounded-full flex items-center space-x-2 text-xs shadow-md border border-white/20">
                              <Volume2 className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                              <span>{t.audioClip} ({story.voiceSnippetDuration})</span>
                            </div>
                          )}
                        </div>

                        {/* Content & Parallel Subtitles */}
                        <div className="p-6 space-y-4 flex-1 flex flex-col justify-between bg-white/40">
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <p className="text-sm font-medium leading-relaxed text-slate-800">
                                "{story.caption}"
                              </p>
                              <div className="flex items-center space-x-2">
                                <p className="text-[11px] text-slate-500 italic opacity-90">
                                  {t.translation} {story.translatedCaption}
                                </p>
                                <button
                                  onClick={() => handleSpeak(story.caption, isAuthorHK ? 'zh-HK' : 'sv-SE')}
                                  className="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 transition text-slate-600 active:scale-95"
                                  title={t.listenAudio}
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Expandable Learning Breakdown for Stories */}
                            {story.learningBreakdown && (
                              <div className="rounded-xl overflow-hidden border border-slate-200/50 bg-white/60 backdrop-blur-sm transition-all duration-300">
                                <button
                                  onClick={() => setShowBreakdown(prev => ({ ...prev, [story.id]: !prev[story.id] }))}
                                  className="w-full px-3 py-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-600"
                                >
                                  <span className="flex items-center space-x-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                    <span>{translations[currentLang].chat.breakdownTitle}</span>
                                  </span>
                                  <span>{showBreakdown[story.id] ? '▲' : '▼'}</span>
                                </button>
                                {showBreakdown[story.id] && (
                                  <div className="p-3 pt-0 space-y-2 animate-in slide-in-from-top-1 duration-200">
                                    <p className="text-[11px] leading-relaxed text-slate-700 font-medium">{story.learningBreakdown.explanation}</p>
                                    {story.learningBreakdown.grammar && story.learningBreakdown.grammar.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {story.learningBreakdown.grammar.map((g, i) => (
                                          <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white text-slate-700 border border-slate-200 shadow-2xs">
                                            {g}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    <div className="pt-2 flex items-center justify-between">
                                      <div className="text-[10px] italic text-slate-500 max-w-[70%]">
                                        {story.learningBreakdown.culture && `💡 ${story.learningBreakdown.culture}`}
                                      </div>
                                      <button
                                        onClick={() => handleAddToVault(story.id, story.caption, story.translatedCaption)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5 active:scale-95 ${
                                          addedTerms[`${story.id}_${story.caption}`] ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs'
                                        }`}
                                      >
                                        {addedTerms[`${story.id}_${story.caption}`] ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                        <span>{addedTerms[`${story.id}_${story.caption}`] ? t.saved : t.saveToVault}</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {story.jyutping && (
                              <div className="flex items-center space-x-2">
                                <p className="flex-1 text-xs font-mono text-rose-700 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-200/40">
                                  🗣️ {t.jyutping}: {story.jyutping}
                                </p>
                                <button 
                                  onClick={() => {
                                    // Speak the original Chinese/Cantonese characters, never the English romanization
                                    const cantoneseText = /[\u4e00-\u9fa5]/.test(story.caption) 
                                      ? story.caption 
                                      : (/[\u4e00-\u9fa5]/.test(story.translatedCaption) ? story.translatedCaption : story.caption);
                                    playVoice(cantoneseText, 'zh-HK');
                                  }}
                                  className="p-2 bg-rose-50 rounded-xl hover:bg-rose-100 transition text-rose-600 active:scale-95"
                                  title="朗讀粵語原文字句 (zh-HK)"
                                >
                                  <Volume2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="pt-3 border-t border-slate-200/40 flex items-center justify-between text-xs text-slate-500">
                            <span className="flex items-center space-x-1 text-rose-600 font-semibold">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{t.saveToVault ? `${t.saveToVault.replace('⭐ ', '')} Synced ✨` : 'Vault Synced ✨'}</span>
                            </span>
                            <button
                              onClick={goToChat}
                              className="hover:text-rose-600 font-semibold underline"
                            >
                              {t.replyInChat}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
