import React, { useState } from 'react';
import { authService } from '../lib/authService';
import { UserProfile } from '../types';
import { Sparkles, Phone, Link as LinkIcon, LogIn, UserPlus, Check } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface OnboardingProps {
  onLogin: (user: UserProfile) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onLogin }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [userName, setUserName] = useState('');
  const [step, setStep] = useState<'login' | 'mode' | 'profile' | 'pairing'>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<'HK' | 'SE'>('HK');
  const [identity, setIdentity] = useState<'DW' | 'William'>('DW');
  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  const [partnerIdentity, setPartnerIdentity] = useState<'DW' | 'William' | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const user = await authService.login();
      setCurrentUser(user);
      setUserName(user.name);
      if (user.partnerId) {
        onLogin(user);
      } else {
        setStep('mode');
      }
    } catch (err) {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleModeSelection = (selectedMode: 'create' | 'join') => {
    setMode(selectedMode);
    if (selectedMode === 'create') {
      setStep('profile');
    } else {
      setStep('pairing');
    }
  };

  const handleFetchInvite = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const inviteDoc = await getDoc(doc(db, 'invites', inviteCode));
      if (!inviteDoc.exists()) {
        setError('Invalid invite code');
        setLoading(false);
        return;
      }
      const inviteData = inviteDoc.data();
      const senderDoc = await getDoc(doc(db, 'users', inviteData.senderId));
      if (senderDoc.exists()) {
        const sender = senderDoc.data() as UserProfile;
        setPartnerIdentity(sender.identity || null);
        // Automatically set the opposite identity
        if (sender.identity === 'DW') {
          setIdentity('William');
          setLocation('SE');
          setUserName('William');
        } else {
          setIdentity('DW');
          setLocation('HK');
          setUserName('DW');
        }
      }
      setStep('profile');
    } catch (err) {
      setError('Failed to fetch invite details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser || !userName.trim()) return;
    setLoading(true);
    try {
      const updates = { 
        name: userName, 
        identity, 
        location,
        timezone: location === 'HK' ? 'Asia/Hong_Kong' : 'Europe/Stockholm'
      };
      await authService.updateProfile(currentUser.uid, updates);
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
      
      if (mode === 'join') {
        const result = await authService.pairWithCode(updatedUser, inviteCode);
        if (result.success) {
          onLogin({ ...updatedUser, partnerId: result.partnerId, roomId: result.roomId });
        } else {
          setError(result.error || 'Pairing failed');
          setLoading(false);
        }
      } else {
        setStep('pairing');
      }
    } catch (err) {
      setError('Failed to update profile');
      setLoading(false);
    } finally {
      if (step !== 'pairing' || mode !== 'create') setLoading(false);
    }
  };

  if (step === 'login') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-xl mb-8 animate-bounce">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4 text-balance">Welcome to DW Zone</h1>
        <p className="text-slate-500 max-w-sm mb-12 leading-relaxed text-balance">
          The private space for peer language exchange and cultural discovery.
        </p>
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="bg-white text-slate-900 font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition flex items-center space-x-3 border-2 border-slate-100"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          <span>{loading ? 'Connecting...' : 'Sign in with Google'}</span>
        </button>
      </div>
    );
  }

  if (step === 'mode') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 space-y-8 border border-slate-100">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Get Started</h2>
            <p className="text-slate-400 text-sm">Create a new space or join your partner</p>
          </div>
          <div className="grid gap-4">
            <button
              onClick={() => handleModeSelection('create')}
              className="p-6 rounded-3xl border-2 border-slate-100 hover:border-rose-500 hover:bg-rose-50 transition-all text-left flex items-center space-x-4 group"
            >
              <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 group-hover:bg-rose-500 group-hover:text-white transition">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="font-black text-slate-900">Start New Space</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">I have no code yet</div>
              </div>
            </button>
            <button
              onClick={() => handleModeSelection('join')}
              className="p-6 rounded-3xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left flex items-center space-x-4 group"
            >
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white transition">
                <LinkIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="font-black text-slate-900">Join Existing Space</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">My partner sent me a code</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 space-y-8 border border-slate-100">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Choose Identity</h2>
            <p className="text-slate-400 text-sm leading-relaxed px-4">
              {partnerIdentity ? `Your partner is ${partnerIdentity === 'DW' ? 'DW' : 'William'}. You must choose the remaining identity.` : 'Select your location & identity for the duo'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              disabled={partnerIdentity === 'DW'}
              onClick={() => { setLocation('HK'); setIdentity('DW'); setUserName('DW'); }}
              className={`p-6 rounded-3xl border-2 transition-all text-left space-y-2 relative ${partnerIdentity === 'DW' ? 'opacity-30 grayscale cursor-not-allowed border-slate-100' : (location === 'HK' ? 'border-rose-500 bg-rose-50 shadow-md' : 'border-slate-100 bg-white hover:border-slate-200')}`}
            >
              {partnerIdentity === 'DW' && <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black uppercase text-slate-400 -rotate-12 bg-white/50 rounded-3xl z-10">Taken</span>}
              <span className="text-4xl block">🇭🇰</span>
              <div className="font-black text-slate-900">DW (Hong Kong)</div>
              <div className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">Warm Palette</div>
            </button>
            <button
              disabled={partnerIdentity === 'William'}
              onClick={() => { setLocation('SE'); setIdentity('William'); setUserName('William'); }}
              className={`p-6 rounded-3xl border-2 transition-all text-left space-y-2 relative ${partnerIdentity === 'William' ? 'opacity-30 grayscale cursor-not-allowed border-slate-100' : (location === 'SE' ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-slate-100 bg-white hover:border-slate-200')}`}
            >
              {partnerIdentity === 'William' && <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black uppercase text-slate-400 -rotate-12 bg-white/50 rounded-3xl z-10">Taken</span>}
              <span className="text-4xl block">🇸🇪</span>
              <div className="font-black text-slate-900">William (Sweden)</div>
              <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Cool Palette</div>
            </button>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-50">
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Your Name"
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-hidden transition-all font-bold text-slate-900 text-center text-xl"
            />
            {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}
            <button
              onClick={handleSaveProfile}
              disabled={!userName.trim() || loading}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-slate-800 transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : (mode === 'join' ? 'Complete Pairing' : 'Enter Pairing')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'pairing') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 space-y-10 border border-slate-100">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-slate-900">Enter Invite Code</h2>
            <p className="text-slate-400 text-sm">Paste the code your partner sent you</p>
          </div>
          <div className="space-y-4">
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="DW-XXXX-0000"
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-hidden transition-all font-mono font-bold text-slate-900"
              />
            </div>
            {error && <p className="text-xs text-rose-600 font-bold text-center">{error}</p>}
            <button
              onClick={handleFetchInvite}
              disabled={!inviteCode || loading}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-slate-800 transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <UserPlus className="w-5 h-5" />
              <span>{loading ? 'Validating...' : 'Validate Code'}</span>
            </button>
          </div>
          <button onClick={() => setStep('mode')} className="w-full text-[10px] font-black uppercase text-slate-300 hover:text-slate-400 transition tracking-widest">Back to mode selection</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 space-y-10 border border-slate-100">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-slate-900">Pair Your Device</h2>
          <p className="text-slate-400 text-sm">Connect with your exchange partner</p>
        </div>

        {/* Share Code */}
        <div className="bg-rose-50/50 p-6 rounded-3xl border-2 border-rose-100/50 space-y-4">
          <p className="text-[10px] uppercase font-black text-rose-600 tracking-widest text-center">Your Invite Code</p>
          <div className="bg-white p-4 rounded-2xl text-2xl font-mono font-bold text-center border border-rose-100 text-slate-800 tracking-tighter">
            {currentUser?.inviteCode}
          </div>
          <p className="text-[10px] text-slate-400 text-center leading-tight">
            Send this to your partner. Once they enter it, you'll be connected instantly.
          </p>
        </div>

        <button 
          onClick={() => {
            // Re-sync with profile from server
            window.location.reload();
          }} 
          className="w-full bg-emerald-50 text-emerald-600 font-bold py-4 rounded-2xl border-2 border-emerald-100 hover:bg-emerald-100 transition flex items-center justify-center space-x-2"
        >
          <Check className="w-5 h-5" />
          <span>I've shared the code</span>
        </button>
      </div>
    </div>
  );
};
