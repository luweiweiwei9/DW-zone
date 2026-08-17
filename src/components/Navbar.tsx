import React from 'react';
import { UiTheme, UiLanguage, UserRole } from '../types';
import { translations } from '../lib/translations';
import { BookOpen, MessageCircle, Sparkles, Home, ShieldCheck, Palette, Languages, Globe } from 'lucide-react';

interface NavbarProps {
  currentLang: UiLanguage;
  setCurrentLang: (lang: UiLanguage) => void;
  activeTab: 'home' | 'chat' | 'vault' | 'srs' | 'prd';
  setActiveTab: (tab: 'home' | 'chat' | 'vault' | 'srs' | 'prd') => void;
  currentTheme: UiTheme;
  setCurrentTheme: (theme: UiTheme) => void;
  currentUser: UserRole;
  setCurrentUser: (user: UserRole) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  setCurrentLang,
  activeTab,
  setActiveTab,
  currentTheme,
  setCurrentTheme,
  currentUser,
  setCurrentUser
}) => {
  const t = translations[currentLang];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-opacity-70 border-b border-white/20 shadow-xs transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-6">
            {/* Brand Logo */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('home')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Languages className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg bg-gradient-to-r from-rose-500 to-indigo-600 bg-clip-text text-transparent">
                  DW Zone
                </span>
                <span className="block text-[11px] text-slate-500 font-medium">{t.brandSubtitle}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                activeTab === 'home'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-rose-600 hover:bg-slate-100/50'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>{t.tabs.stories}</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                activeTab === 'chat'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-rose-600 hover:bg-slate-100/50'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{t.tabs.chat}</span>
            </button>
            <button
              onClick={() => setActiveTab('vault')}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                activeTab === 'vault'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-rose-600 hover:bg-slate-100/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>{t.tabs.vault}</span>
            </button>
            <button
              onClick={() => setActiveTab('srs')}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                activeTab === 'srs'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-rose-600 hover:bg-slate-100/50'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{t.tabs.srs}</span>
            </button>
            <button
              onClick={() => setActiveTab('prd')}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                activeTab === 'prd'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{t.tabs.prd}</span>
            </button>
          </nav>

          {/* Controls: Theme Switcher & UI Translation Language Selector */}
          <div className="flex items-center space-x-3">
            {/* Theme Selector Dropdown / Pills */}
            <div className="hidden sm:flex items-center bg-slate-200/70 p-1 rounded-2xl space-x-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 px-2 flex items-center gap-1">
                <Palette className="w-3 h-3" /> {t.themeLabel}
              </span>
              <button
                onClick={() => setCurrentTheme('glass')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                  currentTheme === 'glass' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Frosted Glass Bento"
              >
                Glass
              </button>
              <button
                onClick={() => setCurrentTheme('editorial')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                  currentTheme === 'editorial' ? 'bg-[#FDFBF7] text-[#8C6D46] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Editorial Zen Paper"
              >
                Zen
              </button>
              <button
                onClick={() => setCurrentTheme('neon')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                  currentTheme === 'neon' ? 'bg-cyan-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-slate-100'
                }`}
                title="Neon Cyber"
              >
                Neon
              </button>
              <button
                onClick={() => setCurrentTheme('biolume')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                  currentTheme === 'biolume' ? 'bg-emerald-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-emerald-200'
                }`}
                title="Biolume Aurora"
              >
                Biolume
              </button>
            </div>

            {/* UI Translation Language Selector (Top Right) */}
            <div className="bg-slate-200/70 p-1 rounded-2xl flex items-center space-x-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 px-2 hidden sm:flex items-center gap-1">
                <Globe className="w-3 h-3" /> {t.langLabel}
              </span>
              <button
                onClick={() => setCurrentLang('en')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  currentLang === 'en'
                    ? 'bg-white text-rose-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="English UI"
              >
                EN 🇺🇸
              </button>
              <button
                onClick={() => setCurrentLang('zh')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  currentLang === 'zh'
                    ? 'bg-white text-rose-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Traditional Chinese UI / 繁體中文"
              >
                繁中 🇭🇰
              </button>
              <button
                onClick={() => setCurrentLang('sv')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  currentLang === 'sv'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Swedish UI / Svenska"
              >
                SV 🇸🇪
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex lg:hidden items-center justify-around py-2 border-t border-slate-200/40">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center text-xs ${activeTab === 'home' ? 'text-rose-600 font-bold' : 'text-slate-500'}`}
          >
            <Home className="w-4 h-4 mb-0.5" />
            <span>{t.tabs.stories}</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center text-xs ${activeTab === 'chat' ? 'text-rose-600 font-bold' : 'text-slate-500'}`}
          >
            <MessageCircle className="w-4 h-4 mb-0.5" />
            <span>{t.tabs.chat}</span>
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex flex-col items-center text-xs ${activeTab === 'vault' ? 'text-rose-600 font-bold' : 'text-slate-500'}`}
          >
            <BookOpen className="w-4 h-4 mb-0.5" />
            <span>{t.tabs.vault}</span>
          </button>
          <button
            onClick={() => setActiveTab('srs')}
            className={`flex flex-col items-center text-xs ${activeTab === 'srs' ? 'text-rose-600 font-bold' : 'text-slate-500'}`}
          >
            <Sparkles className="w-4 h-4 mb-0.5" />
            <span>{t.tabs.srs}</span>
          </button>
          <button
            onClick={() => setActiveTab('prd')}
            className={`flex flex-col items-center text-xs ${activeTab === 'prd' ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}
          >
            <ShieldCheck className="w-4 h-4 mb-0.5" />
            <span>{t.tabs.prd}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

