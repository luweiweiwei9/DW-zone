import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, UserRole, UiLanguage, UserProfile } from '../types';
import { PROFILES } from '../data/mockData';
import { translations } from '../lib/translations';
import { dbService } from '../lib/dbService';
import { Send, Mic, Sparkles, Languages, Check, Plus, Volume2, Phone, PhoneOff, X, Play, Square, Camera, Video, RotateCcw, MoreHorizontal, Trash2, Undo2, Moon, Sun, Clock } from 'lucide-react';
import { playVoice } from '../lib/voiceUtils';

interface SmartChatProps {
  currentUser: UserProfile;
  partner: UserProfile | null;
  currentLang: UiLanguage;
  roomId: string;
  onAddVocabulary: (term: string, translation: string, bucket: any) => void;
}

export const SmartChat: React.FC<SmartChatProps> = ({ currentUser, partner, currentLang, roomId, onAddVocabulary }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showBreakdown, setShowBreakdown] = useState<Record<string, boolean>>({});
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  
  const isMeHK = currentUser.location === 'HK' || currentUser.identity === 'DW';
  
  const [quickReplies, setQuickReplies] = useState<{ text: string; translation: string }[]>(
    isMeHK ? [
      { text: "好呀，無問題！✨", translation: "Sure, no problem! ✨" },
      { text: "你食咗嘢未呀？", translation: "Have you eaten yet?" },
      { text: "陣間再同你傾！", translation: "Talk to you in a bit!" }
    ] : [
      { text: "Sounds great! ✨", translation: "聽落好正！" },
      { text: "Just having my coffee ☕", translation: "啱啱飲緊咖啡" },
      { text: "Talk to you later!", translation: "遲啲再傾！" }
    ]
  );
  
  const [breakdownLang, setBreakdownLang] = useState<Record<string, 'zh' | 'en'>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [addedTerms, setAddedTerms] = useState<Record<string, boolean>>({});
  const [isCalling, setIsCalling] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<{ id: string, type: 'delete' | 'recall' } | null>(null);
  const [partnerLocalTime, setPartnerLocalTime] = useState<{ time: string, isNight: boolean }>({ time: '', isNight: false });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const callIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedMsgRef = useRef<string>('');
  const t = translations[currentLang].chat;

  // Compute Partner Time
  useEffect(() => {
    const updatePartnerTime = () => {
      const partnerTz = isMeHK ? 'Europe/Stockholm' : 'Asia/Hong_Kong';
      try {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', {
          timeZone: partnerTz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        const hourNum = parseInt(
          now.toLocaleTimeString('en-US', { timeZone: partnerTz, hour: '2-digit', hour12: false })
        );
        const isNight = hourNum >= 22 || hourNum < 7;
        setPartnerLocalTime({ time: timeStr, isNight });
      } catch (err) {
        console.error("Timezone format error:", err);
      }
    };
    updatePartnerTime();
    const interval = setInterval(updatePartnerTime, 30000);
    return () => clearInterval(interval);
  }, [isMeHK]);

  // Real-time listener
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = dbService.subscribeToMessages(roomId, (newMessages) => {
      const filtered = newMessages.filter(msg => !msg.deletedBy?.includes(currentUser.uid));
      setMessages(filtered);
      
      // Fetch new quick replies based on the last message if it's from partner and not yet fetched
      const lastMsg = filtered[filtered.length - 1];
      if (lastMsg && lastMsg.senderId !== currentUser.uid && lastMsg.originalText && lastMsg.originalText !== lastFetchedMsgRef.current) {
        lastFetchedMsgRef.current = lastMsg.originalText;
        fetchQuickReplies(lastMsg.originalText);
      }
    });
    return () => unsubscribe();
  }, [roomId]);

  const fetchQuickReplies = async (lastMessage: string) => {
    try {
      const res = await fetch('/api/quick-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lastMessage, 
          userLocation: currentUser.location || (isMeHK ? 'HK' : 'SE'),
          userIdentity: currentUser.identity || (isMeHK ? 'DW' : 'William')
        })
      });
      const data = await res.json();
      if (data.replies && data.replies.length > 0) setQuickReplies(data.replies);
    } catch (err) {
      console.warn("Failed to fetch quick replies:", err);
    }
  };

  useEffect(() => {
    if (isCalling) {
      callIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callIntervalRef.current) clearInterval(callIntervalRef.current);
      setCallDuration(0);
    }
    return () => {
      if (callIntervalRef.current) clearInterval(callIntervalRef.current);
    };
  }, [isCalling]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.split('/')[1].split(';')[0];
        const fileName = `audio_${Date.now()}.${ext}`;
        try {
          const url = await dbService.uploadMedia(audioBlob, `rooms/${roomId}/audio/${fileName}`);
          sendAudioMessage(url);
        } catch (uploadErr) {
          console.error("Upload failed:", uploadErr);
          alert("Failed to send voice note. Please try again.");
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') stopRecording();
      }, 10000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone access denied. Please check your browser permissions.");
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const startCall = async () => {
    if (!roomId || !currentUser) return;
    try {
      await dbService.initiateCall(roomId, currentUser.uid, currentUser.name);
      setIsCalling(true);
    } catch (err) {
      console.error("Failed to start call:", err);
    }
  };

  const endCall = async () => {
    if (!roomId) return;
    try {
      await dbService.endCall(roomId);
      setIsCalling(false);
    } catch (err) {
      console.error("Failed to end call:", err);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("Video play failed:", e));
        };
      }
      streamRef.current = stream;
      setIsCameraActive(true);
      setCapturedImage(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Camera access denied. Please check your browser permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const sendAudioMessage = async (url: string) => {
    const durationStr = `0:${recordingTime < 10 ? '0' : ''}${recordingTime || 5}`;
    const newMessage: Partial<ChatMessage> = {
      senderId: currentUser.uid,
      originalText: '[Voice Note]',
      originalLang: 'Audio',
      translatedText: '[Voice Note]',
      targetLang: 'Audio',
      isAudioMessage: true,
      audioUrl: url,
      audioDuration: durationStr
    };
    await dbService.sendMessage(roomId, newMessage, 24);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const sendImageMessage = async () => {
    if (!capturedImage) return;
    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const fileName = `photo_${Date.now()}.jpg`;
      const url = await dbService.uploadMedia(blob, `rooms/${roomId}/photos/${fileName}`);

      const newMessage: Partial<ChatMessage> = {
        senderId: currentUser.uid,
        originalText: '[Photo]',
        originalLang: 'Photo',
        translatedText: '[Photo]',
        targetLang: 'Photo',
        isImageMessage: true,
        imageUrl: url
      };
      await dbService.sendMessage(roomId, newMessage, 24);
      setCapturedImage(null);
    } catch (e) {
      console.error("Failed to send image:", e);
      alert("Failed to upload image.");
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    if (!textToSend) setInputText('');

    try {
      const isWilliam = currentUser.identity === 'William' || currentUser.location === 'SE';
      const senderIdentity = isWilliam ? 'William' : 'DW';
      const sourceLang = isWilliam ? 'Swedish/English' : 'Cantonese/Chinese';
      const targetLang = isWilliam ? 'Traditional Chinese / Cantonese' : 'English';

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLang: 'auto', targetLang, senderIdentity })
      });
      const data = await res.json();
      
      const newMessage: Partial<ChatMessage> = {
        senderId: currentUser.uid,
        originalText: text,
        originalLang: sourceLang,
        translatedText: data.translatedText || `[Synced] ${text}`,
        jyutping: data.jyutping,
        learningBreakdown: data.learningBreakdown,
        vocabularyExtracted: data.vocabularyExtracted,
        targetLang
      };
      await dbService.sendMessage(roomId, newMessage);
    } catch {
      await dbService.sendMessage(roomId, {
        senderId: currentUser.uid,
        originalText: text,
        originalLang: 'Auto',
        translatedText: `[Synced] ${text}`,
        targetLang: 'English'
      });
    }
  };

  const handleSpeak = (text: string, lang?: string) => {
    if (!text) return;
    const hasChinese = /[\u4e00-\u9fa5]/.test(text);
    const hasSwedish = /[åäöÅÄÖ]/.test(text);
    const isLangChinese = lang ? (lang.includes('Cantonese') || lang.includes('Chinese') || lang.includes('zh') || lang === 'zh-HK') : false;
    const isLangSwedish = lang ? (lang.includes('Swedish') || lang.includes('sv') || lang === 'sv-SE') : false;

    if (hasChinese || isLangChinese) {
      playVoice(text, 'zh-HK');
    } else if (hasSwedish || isLangSwedish) {
      playVoice(text, 'sv-SE');
    } else {
      playVoice(text, 'en-US');
    }
  };

  const handleQuickReplyClick = (text: string) => {
    setInputText(text);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const toggleOriginal = (id: string) => {
    setShowOriginal(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleBreakdownLang = (id: string) => {
    setBreakdownLang(prev => {
      const current = prev[id] || (isMeHK ? 'zh' : 'en');
      return {
        ...prev,
        [id]: current === 'zh' ? 'en' : 'zh'
      };
    });
  };

  const handleAddToVault = (msgId: string, term: string, translation: string, bucket: any) => {
    onAddVocabulary(term, translation, bucket);
    setAddedTerms(prev => ({ ...prev, [`${msgId}_${term}`]: true }));
  };

  const handleOpenMenu = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    setSelectedMessage(messageId);
    setMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const handleDeleteForSelf = (messageId: string) => {
    setConfirmingAction({ id: messageId, type: 'delete' });
    setSelectedMessage(null);
    setMenuPosition(null);
  };

  const handleRecall = (messageId: string) => {
    setConfirmingAction({ id: messageId, type: 'recall' });
    setSelectedMessage(null);
    setMenuPosition(null);
  };

  const executeConfirmedAction = async () => {
    if (!confirmingAction) return;
    const { id, type } = confirmingAction;
    try {
      if (type === 'delete') {
        await dbService.deleteMessageForSelf(roomId, id, currentUser.uid);
      } else {
        await dbService.recallMessage(roomId, id, currentUser.uid);
      }
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    }
    setConfirmingAction(null);
  };

  // Partner display details
  const partnerName = partner?.name || (isMeHK ? 'William' : 'DIF');
  const partnerLocation = isMeHK ? 'SE' : 'HK';
  const partnerFlag = isMeHK ? '🇸🇪' : '🇭🇰';
  const partnerCity = isMeHK ? 'Stockholm' : 'Hong Kong';
  const myFlag = isMeHK ? '🇭🇰' : '🇸🇪';
  const myName = currentUser.name || (isMeHK ? 'DIF' : 'William');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col h-[calc(100vh-5rem)] relative">
      {/* Camera Overlay */}
      {isCameraActive && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center space-y-6 rounded-3xl mx-4 my-6 overflow-hidden animate-in fade-in">
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover rounded-3xl" />
            <div className="absolute bottom-10 flex space-x-6">
              <button onClick={stopCamera} className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition backdrop-blur-md">
                <X className="w-6 h-6 text-white" />
              </button>
              <button onClick={capturePhoto} className="w-20 h-20 bg-rose-600 rounded-full border-4 border-white flex items-center justify-center hover:bg-rose-700 transition shadow-2xl active:scale-95">
                <div className="w-16 h-16 rounded-full border-2 border-white/30" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Overlay (before sending) */}
      {capturedImage && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center space-y-6 rounded-3xl mx-4 my-6 overflow-hidden animate-in zoom-in-95">
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            <img src={capturedImage} className="max-h-[70%] rounded-2xl shadow-2xl object-contain border border-white/20" alt="Preview" />
            <div className="absolute bottom-10 flex space-x-6">
              <button onClick={() => setCapturedImage(null)} className="bg-white/20 px-6 py-3 rounded-2xl text-white font-bold hover:bg-white/30 transition backdrop-blur-md flex items-center space-x-2">
                <RotateCcw className="w-5 h-5" />
                <span>{translations[currentLang].newStory.retakeBtn}</span>
              </button>
              <button onClick={sendImageMessage} className="bg-rose-600 px-8 py-3 rounded-2xl text-white font-bold hover:bg-rose-700 transition shadow-xl flex items-center space-x-2">
                <Send className="w-5 h-5" />
                <span>{translations[currentLang].chat.send}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Overlay */}
      {isCalling && (
        <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-300 rounded-3xl mx-4 my-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-rose-500 animate-pulse">
              <img src={partner?.avatar || (isMeHK ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80')} alt="Duo Partner" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-2 rounded-full ring-4 ring-slate-900">
              <Phone className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-2xl font-bold text-white">{partnerName}</h3>
            <p className="text-rose-400 font-medium">{t.calling} ({Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')})</p>
          </div>
          <div className="flex space-x-6">
            <button className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition">
              <Mic className="w-6 h-6 text-white" />
            </button>
            <button 
              onClick={endCall}
              className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition shadow-xl shadow-red-900/40"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Header Info with Partner Time & Day/Night Status */}
      <div className="glass-card p-4 mb-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img 
              src={partner?.avatar || (isMeHK ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80')} 
              alt={partnerName}
              className="w-11 h-11 rounded-full object-cover ring-2 ring-indigo-200" 
            />
            <span className="absolute -bottom-1 -right-1 text-xs bg-white rounded-full p-0.5 shadow-xs">{partnerFlag}</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-black text-slate-900 tracking-tight">{partnerName}</h2>
              <span className="text-[10px] text-slate-400 font-semibold">• {partnerCity}</span>
            </div>
            {/* Minimalist Partner Time & Sleep State */}
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 mt-0.5">
              {partnerLocalTime.isNight ? (
                <span className="flex items-center space-x-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-mono text-[11px]">
                  <Moon className="w-3 h-3 text-indigo-500" />
                  <span>{partnerLocalTime.time} ({t.call.sleeping})</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md font-mono text-[11px]">
                  <Sun className="w-3 h-3 text-amber-500" />
                  <span>{partnerLocalTime.time} ({t.call.awake})</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${isMeHK ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
              {myFlag} {myName}
            </span>
          </div>
          <button 
            onClick={startCall}
            className={`p-2.5 rounded-xl text-white transition shadow-md flex items-center space-x-2 active:scale-95 ${isMeHK ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            <Phone className="w-4 h-4" />
            <span className="text-xs font-bold hidden sm:inline">{t.startCall}</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.uid;
          
          // Accurate identity binding:
          // If message is sent by me -> use currentUser profile with myFlag
          // If message is sent by partner -> use partner profile with partnerFlag
          const senderName = isMe ? (currentUser.name || (isMeHK ? 'DIF' : 'William')) : partnerName;
          const senderAvatar = isMe 
            ? (currentUser.avatar || (isMeHK ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'))
            : (partner?.avatar || (isMeHK ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'));
          const flag = isMe ? myFlag : partnerFlag;
          const isHK = flag === '🇭🇰';
          const senderLocationLabel = isHK 
            ? (currentLang === 'zh' ? '香港' : (currentLang === 'sv' ? 'Hongkong' : 'Hong Kong'))
            : (currentLang === 'zh' ? '瑞典' : (currentLang === 'sv' ? 'Sverige' : 'Sweden'));
          
          return (
            <div key={msg.id} className={`group flex items-start space-x-3 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className="relative shrink-0">
                <img
                  src={senderAvatar}
                  alt={senderName}
                  className={`w-10 h-10 rounded-full object-cover shadow-xs ring-2 ${isHK ? 'ring-rose-200' : 'ring-indigo-200'}`}
                />
                <span className="absolute -bottom-1 -right-1 text-xs bg-white rounded-full shadow-sm p-0.5">{flag}</span>
              </div>

              {msg.recalled ? (
                <div className={`italic text-[11px] text-slate-400 py-2 px-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center space-x-2 ${isMe ? 'mr-1' : 'ml-1'}`}>
                  <Undo2 className="w-3.5 h-3.5 opacity-60 text-slate-400" />
                  <span className="font-medium">
                    {msg.recalledBy === currentUser.uid 
                      ? `${flag} ${senderName} ${t.recalledMsg.recalledByYou.replace('You', '')}` 
                      : `${flag} ${senderName} ${t.recalledMsg.recalledByPartner.replace('Partner', '')}`}
                  </span>
                </div>
              ) : (
                <div 
                  className="relative group"
                  onContextMenu={(e) => handleOpenMenu(e, msg.id)}
                >
                  <div className={`max-w-lg rounded-2xl p-4 shadow-sm space-y-2 relative ${
                    isMe 
                      ? (isHK ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white' : 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white') + ' rounded-tr-none'
                      : 'glass-card bg-white/90 text-slate-800 rounded-tl-none border border-slate-100'
                  }`}>
                    <div className="flex items-center justify-between text-[10px] opacity-70">
                      <span className="font-bold flex items-center space-x-1">
                        <span>{senderName}</span>
                        <span className="opacity-50">•</span>
                        <span>{senderLocationLabel}</span>
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>

                    {/* Audio Message */}
                    {msg.isAudioMessage ? (
                      <div className="flex items-center space-x-3 bg-black/10 p-3 rounded-xl border border-white/10">
                        <button 
                          onClick={() => {
                            if (msg.audioUrl) {
                              const audio = new Audio(msg.audioUrl);
                              audio.play();
                            }
                          }}
                          className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition text-white"
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                        <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                          <div className="w-1/3 h-full bg-white animate-pulse" />
                        </div>
                        <span className="text-[10px] font-mono">{msg.audioDuration || '0:05'}</span>
                      </div>
                    ) : msg.isImageMessage ? (
                      <div className="rounded-xl overflow-hidden shadow-sm border border-black/10">
                        <img src={msg.imageUrl} alt="Chat Moment" className="max-w-full h-auto object-cover max-h-64 rounded-lg" />
                        <div className="p-2 bg-black/5 text-[10px] italic opacity-70 flex items-center space-x-1">
                          <Camera className="w-3 h-3" />
                          <span>{translations[currentLang].chat.photoSent}</span>
                        </div>
                      </div>
                    ) : (
                      /* Text Bubble Content */
                      isMe ? (
                        /* SENDER VIEW (isMe === true): ONLY show original text, no translation buttons, no Jyutping, no Breakdown, no Vocab chips */
                        <div className="space-y-1 py-0.5">
                          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                            {msg.originalText}
                          </p>
                        </div>
                      ) : (
                        /* RECEIVER VIEW (isMe === false): Dynamic translation, toggle original, conditional Jyutping, Breakdown, and Vocab */
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap text-slate-900">
                              {showOriginal[msg.id] ? msg.originalText : (msg.translatedText || msg.originalText)}
                            </p>
                            <div className="flex items-center space-x-3 pt-0.5">
                              <button
                                onClick={() => toggleOriginal(msg.id)}
                                className="text-[11px] underline font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                              >
                                {showOriginal[msg.id] 
                                  ? t.showTranslated 
                                  : `${t.showOriginal} (${msg.originalLang || 'Original'})`}
                              </button>
                              <button
                                onClick={() => {
                                  const textToSpeak = showOriginal[msg.id] ? msg.originalText : (msg.translatedText || msg.originalText);
                                  const langCode = showOriginal[msg.id] ? msg.originalLang : msg.targetLang;
                                  handleSpeak(textToSpeak, langCode);
                                }}
                                className="text-slate-500 hover:text-slate-900 transition p-1 rounded-md hover:bg-slate-100 cursor-pointer"
                                title="朗讀發音"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Jyutping tag: ONLY shown when receiver is learning Cantonese (non-HK user / William) and message has Jyutping */}
                          {!isMeHK && msg.jyutping && msg.jyutping.trim() !== '' && (
                            <div className="mt-2 flex items-center space-x-2 p-2.5 rounded-xl border bg-rose-50/80 text-rose-900 border-rose-100">
                              <div className="text-xs font-mono flex-1">
                                <span className="font-bold mr-1.5 text-rose-700">🗣️ Jyutping:</span>
                                <span className="font-semibold">{msg.jyutping}</span>
                              </div>
                              <button 
                                onClick={() => {
                                  // Strictly speak the Chinese/Cantonese characters with lang 'zh-HK', NEVER the Jyutping alphabet
                                  const chineseText = /[\u4e00-\u9fa5]/.test(msg.originalText) 
                                    ? msg.originalText 
                                    : (/[\u4e00-\u9fa5]/.test(msg.translatedText) ? msg.translatedText : msg.originalText);
                                  playVoice(chineseText, 'zh-HK');
                                }}
                                className="p-1.5 rounded-lg hover:bg-rose-100/80 transition active:scale-95 text-rose-700 cursor-pointer"
                                title="朗讀粵語發音 (zh-HK)"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Expandable Learning Breakdown for Receiver */}
                          {msg.learningBreakdown && (() => {
                            const isZhDefault = isMeHK;
                            const selectedBreakdownLang = breakdownLang[msg.id] || (isZhDefault ? 'zh' : 'en');
                            const expText = selectedBreakdownLang === 'en'
                              ? (msg.learningBreakdown.explanationEn || msg.learningBreakdown.explanation)
                              : (msg.learningBreakdown.explanationZh || msg.learningBreakdown.explanation);
                            const grammarList = selectedBreakdownLang === 'en'
                              ? (msg.learningBreakdown.grammarEn && msg.learningBreakdown.grammarEn.length > 0 ? msg.learningBreakdown.grammarEn : msg.learningBreakdown.grammar)
                              : (msg.learningBreakdown.grammarZh && msg.learningBreakdown.grammarZh.length > 0 ? msg.learningBreakdown.grammarZh : msg.learningBreakdown.grammar);
                            const cultureContent = selectedBreakdownLang === 'en'
                              ? (msg.learningBreakdown.cultureEn || msg.learningBreakdown.culture)
                              : (msg.learningBreakdown.cultureZh || msg.learningBreakdown.culture);

                            return (
                              <div 
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  toggleBreakdownLang(msg.id);
                                }}
                                className="rounded-xl overflow-hidden border border-slate-200/70 bg-slate-50/90 transition-all duration-300 select-none shadow-2xs"
                                title="雙擊卡片切換 英文/繁中 解析"
                              >
                                <div className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-bold text-slate-700 bg-slate-100/40 hover:bg-slate-100/70 transition">
                                  <div 
                                    onClick={() => setShowBreakdown(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                                    className="flex items-center space-x-1.5 cursor-pointer flex-1 py-0.5"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <span>{t.breakdownTitle}</span>
                                    <span className="text-[9px] font-normal text-slate-400 opacity-80 hidden sm:inline ml-1">
                                      (雙擊切換 / Double-tap)
                                    </span>
                                  </div>

                                  {/* Interactive Language Switcher & Collapse Button */}
                                  <div className="flex items-center space-x-1.5 ml-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleBreakdownLang(msg.id);
                                      }}
                                      className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-indigo-700 hover:text-indigo-900 border border-indigo-200 shadow-2xs hover:bg-indigo-50 transition cursor-pointer flex items-center space-x-1 active:scale-95"
                                      title="點擊切換 英文 / 繁中 解析 (亦可雙擊卡片)"
                                    >
                                      <span>🔤</span>
                                      <span>{selectedBreakdownLang === 'en' ? 'EN' : '繁中'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setShowBreakdown(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                                      className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                                    >
                                      <span className="text-xs">{showBreakdown[msg.id] ? '▲' : '▼'}</span>
                                    </button>
                                  </div>
                                </div>

                                {showBreakdown[msg.id] && (
                                  <div 
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      toggleBreakdownLang(msg.id);
                                    }}
                                    className="p-3 pt-2 space-y-2.5 animate-in slide-in-from-top-1 duration-200 text-slate-800"
                                  >
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-200/50 pb-1">
                                      <span className="font-semibold text-indigo-600 flex items-center space-x-1">
                                        <span>{selectedBreakdownLang === 'en' ? '🌐 English Explanation' : '🌐 繁體中文解析'}</span>
                                      </span>
                                      <span className="text-[9px] text-slate-400 italic">
                                        雙擊切換語言
                                      </span>
                                    </div>

                                    <p className="text-xs leading-relaxed font-medium text-slate-700 whitespace-pre-wrap">
                                      {expText}
                                    </p>

                                    {grammarList && grammarList.length > 0 && (
                                      <div className="space-y-1 pt-0.5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                          {t.grammarPatterns}
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                          {grammarList.map((g, i) => (
                                            <span key={i} className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white text-slate-800 border border-slate-200 shadow-2xs">
                                              {g}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {cultureContent && (
                                      <div className="p-2.5 rounded-lg text-xs leading-relaxed bg-amber-50 text-amber-900 border border-amber-200/70">
                                        <span className="font-bold">🏙️ {t.culturalContext}:</span> {cultureContent}
                                      </div>
                                    )}

                                    <div className="pt-1 flex justify-end">
                                      <button
                                        onClick={() => handleAddToVault(msg.id, msg.originalText, msg.translatedText, 'Grammar')}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                                          addedTerms[`${msg.id}_${msg.originalText}`] ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs'
                                        }`}
                                      >
                                        {addedTerms[`${msg.id}_${msg.originalText}`] ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                        <span>{addedTerms[`${msg.id}_${msg.originalText}`] ? t.savedToVault : t.addToVault}</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Auto-extracted Vocabulary chips for Receiver */}
                          {msg.vocabularyExtracted && msg.vocabularyExtracted.length > 0 && (
                            <div className="pt-2 border-t border-slate-200/50 space-y-1.5">
                              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center space-x-1">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                <span>{t.autoExtracted}</span>
                              </div>
                              {msg.vocabularyExtracted.map((vocab, vIdx) => {
                                const termKey = `${msg.id}_${vocab.term}`;
                                const isAdded = addedTerms[termKey];
                                return (
                                  <div key={vIdx} className="flex items-center justify-between p-2 rounded-xl text-xs bg-slate-50 text-slate-800 border border-slate-200/60">
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-bold text-slate-900">{vocab.term}</span>
                                        <button 
                                          onClick={() => {
                                            const isChinese = /[\u4e00-\u9fa5]/.test(vocab.term);
                                            playVoice(vocab.term, isChinese ? 'zh-HK' : 'auto');
                                          }} 
                                          className="text-slate-400 hover:text-slate-800 transition cursor-pointer"
                                          title="朗讀發音"
                                        >
                                          <Volume2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      <div className="mt-0.5">
                                        <span className="text-slate-600">{vocab.translation}</span>
                                        <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{vocab.bucket}</span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleAddToVault(msg.id, vocab.term, vocab.translation, vocab.bucket)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                                        isAdded ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs'
                                      }`}
                                    >
                                      {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                      <span>{isAdded ? (currentLang === 'zh' ? '已存' : 'Saved') : (currentLang === 'zh' ? '存入' : 'Vault')}</span>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                  
                  {/* Context Menu Trigger */}
                  <button
                    onClick={(e) => handleOpenMenu(e, msg.id)}
                    className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition p-2 rounded-full hover:bg-slate-100/50 ${isMe ? '-left-10' : '-right-10'}`}
                  >
                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Context Menu Portal-like UI */}
      {selectedMessage && menuPosition && (
        <div className="fixed inset-0 z-[100]" onClick={() => setSelectedMessage(null)}>
          <div 
            className="absolute bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 w-48 animate-in fade-in zoom-in-95 duration-100"
            style={{ 
              top: Math.min(menuPosition.y, window.innerHeight - 150), 
              left: Math.min(menuPosition.x, window.innerWidth - 200) 
            }}
          >
            <button 
              onClick={() => handleDeleteForSelf(selectedMessage)}
              className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-3"
            >
              <Trash2 className="w-4 h-4 text-slate-400" />
              <span>{t.recalledMsg.deleteForSelf}</span>
            </button>
            {(() => {
              const targetMsg = messages.find(m => m.id === selectedMessage);
              if (!targetMsg || targetMsg.senderId !== currentUser.uid || targetMsg.recalled) return null;
              
              const isWithin3Hours = targetMsg.createdAtMillis 
                ? (Date.now() - targetMsg.createdAtMillis <= 3 * 60 * 60 * 1000)
                : true;

              if (!isWithin3Hours) {
                return (
                  <div className="w-full px-4 py-2 text-left text-xs font-medium text-slate-300 flex items-center space-x-3 cursor-not-allowed">
                    <Undo2 className="w-4 h-4 opacity-50" />
                    <span>{t.recalledMsg.recallExpired}</span>
                  </div>
                );
              }

              return (
                <button 
                  onClick={() => handleRecall(selectedMessage)}
                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 flex items-center space-x-3"
                >
                  <Undo2 className="w-4 h-4" />
                  <span>{t.recalledMsg.recallForEveryone}</span>
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmingAction && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xs p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
              {confirmingAction.type === 'delete' ? <Trash2 className="w-8 h-8" /> : <Undo2 className="w-8 h-8" />}
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">
                {t.recalledMsg.confirmTitle}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {confirmingAction.type === 'delete' 
                  ? t.recalledMsg.confirmDeleteDesc
                  : t.recalledMsg.confirmRecallDesc}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setConfirmingAction(null)}
                className="py-3.5 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition"
              >
                {t.recalledMsg.cancel}
              </button>
              <button 
                onClick={executeConfirmedAction}
                className="py-3.5 rounded-2xl font-bold bg-rose-600 text-white shadow-lg hover:bg-rose-700 transition"
              >
                {t.recalledMsg.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic AI Quick Reply Cards for BOTH users */}
      <div className="py-2.5 flex items-center space-x-2 overflow-x-auto no-scrollbar">
        <span className="text-xs font-bold text-rose-600 uppercase tracking-wide shrink-0 flex items-center space-x-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t.quickRepliesLabel}</span>
        </span>
        {quickReplies.map((qr, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickReplyClick(qr.text)}
            className="bg-white border border-rose-200 hover:border-rose-400 hover:bg-rose-50/60 text-slate-800 text-xs px-3.5 py-1.5 rounded-full shadow-xs shrink-0 transition flex items-center space-x-1.5 group active:scale-95 cursor-pointer"
            title="點擊填入訊息欄"
          >
            <span className="font-semibold group-hover:text-rose-600">{qr.text}</span>
            <span className="text-[10px] text-slate-400">({qr.translation})</span>
          </button>
        ))}
      </div>

      {/* Voice Recording Banner */}
      {isRecording && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-ping" />
            <span className="text-xs font-bold text-red-700 font-mono">
              {t.recordingVoiceNote} 0:{recordingTime < 10 ? '0' : ''}{recordingTime} (max 10s)
            </span>
          </div>
          <button 
            onClick={stopRecording}
            className="px-3 py-1 bg-red-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-red-700 transition"
          >
            {t.doneAndSend}
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div className="mt-2 glass-card p-3 flex flex-col space-y-3">
        <div className="flex items-center space-x-2 px-1">
          <button 
            type="button"
            onClick={() => {
              const askText = isMeHK ? '這句用瑞典文/英文怎麼說？' : 'How do you say this in Cantonese?';
              setInputText(askText);
              setTimeout(() => {
                inputRef.current?.focus();
              }, 50);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all shadow-xs cursor-pointer ${isMeHK ? 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100' : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100'}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.askInTargetLang}</span>
          </button>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={startCamera}
            className="p-2.5 rounded-xl bg-white/80 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition shadow-2xs active:scale-95"
            title={t.takePhoto}
          >
            <Camera className="w-5 h-5" />
          </button>
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-2.5 rounded-xl transition shadow-2xs active:scale-95 ${isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-white/80 text-slate-600 hover:bg-rose-50 hover:text-rose-600'}`} 
            title={t.audioVoiceNote}
          >
            {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isRecording ? t.recording : t.placeholder}
            disabled={isRecording}
            className="flex-1 bg-transparent border-none focus:outline-hidden text-sm text-slate-800 placeholder-slate-400 px-2 disabled:opacity-50"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isRecording}
            className="bg-gradient-to-r from-rose-600 to-pink-600 hover:opacity-90 text-white px-4 py-2.5 rounded-xl shadow-md transition flex items-center justify-center space-x-1 font-semibold text-xs disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            <span>{t.send}</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
