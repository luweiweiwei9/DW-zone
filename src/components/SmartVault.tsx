import React, { useState, useMemo } from 'react';
import { VocabularyItem, VocabularyBucket, UserRole, UiLanguage, SharedAsset, TeachingLogEntry, UserProfile } from '../types';
import { translations } from '../lib/translations';
import { playVoice } from '../lib/voiceUtils';
import { BookOpen, Search, Volume2, Sparkles, Plus, CheckCircle, Tag, Filter, Image as ImageIcon, Video, Link as LinkIcon, History, ExternalLink, GraduationCap } from 'lucide-react';

interface SmartVaultProps {
  vocabulary: VocabularyItem[];
  assets: SharedAsset[];
  teachingLog: TeachingLogEntry[];
  onAddVocabularyItem: (item: VocabularyItem) => void;
  currentUser: string;
  currentLang: UiLanguage;
  user?: UserProfile | null;
  partner?: UserProfile | null;
}

const BUCKETS: VocabularyBucket[] = [
  'Personal Vocab',
  'Grammar',
  'Culture'
];

export const SmartVault: React.FC<SmartVaultProps> = ({ 
  vocabulary, 
  assets, 
  teachingLog, 
  onAddVocabularyItem, 
  currentUser, 
  currentLang,
  user,
  partner
}) => {
  const [activeTab, setActiveTab] = useState<'knowledge' | 'media' | 'teaching'>('knowledge');
  const [selectedBucket, setSelectedBucket] = useState<VocabularyBucket | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [newPhonetic, setNewPhonetic] = useState('');
  const [newBucket, setNewBucket] = useState<VocabularyBucket>('Personal Vocab');
  const t = translations[currentLang].vault;

  // Semantic Search Simulation Logic
  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase();
    
    if (activeTab === 'knowledge') {
      return vocabulary.filter(item => {
        const matchesBucket = selectedBucket === 'All' || item.bucket === selectedBucket;
        const matchesSearch = item.term.toLowerCase().includes(query) || 
                             item.translation.toLowerCase().includes(query) ||
                             item.bucket.toLowerCase().includes(query);
        return matchesBucket && matchesSearch;
      });
    } else if (activeTab === 'media') {
      return assets.filter(asset => 
        asset.title?.toLowerCase().includes(query) || 
        asset.type.toLowerCase().includes(query)
      );
    } else {
      return teachingLog.filter(entry => 
        entry.topic.toLowerCase().includes(query) || 
        entry.explanation.toLowerCase().includes(query) ||
        (entry.teacher === currentUser ? user?.name : partner?.name || 'Partner').toLowerCase().includes(query)
      );
    }
  }, [activeTab, selectedBucket, searchQuery, vocabulary, assets, teachingLog, currentUser]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim() || !newTranslation.trim()) return;
    const newItem: VocabularyItem = {
      id: `v_${Date.now()}`,
      term: newTerm,
      translation: newTranslation,
      phonetic: newPhonetic || 'Custom Entry',
      bucket: newBucket,
      addedBy: currentUser,
      srsLevel: 1,
      nextReviewDate: 'Tomorrow'
    };
    onAddVocabularyItem(newItem);
    setNewTerm('');
    setNewTranslation('');
    setNewPhonetic('');
    setIsModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t.title}</h2>
          <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-slate-100 p-1 rounded-2xl flex border border-slate-200">
            <button
              onClick={() => setActiveTab('knowledge')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'knowledge' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t.myVault}</span>
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'media' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{t.sharedSpace}</span>
            </button>
            <button
              onClick={() => setActiveTab('teaching')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'teaching' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{t.teachingLog}</span>
            </button>
          </div>
          {activeTab === 'knowledge' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-rose-600 to-indigo-600 hover:opacity-90 text-white font-medium px-5 py-2.5 rounded-2xl shadow-md transition flex items-center space-x-2 text-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addTerm}</span>
            </button>
          )}
        </div>
      </div>

      {/* AI Semantic Search Bar */}
      <div className="flex flex-col gap-4">
        <div className="relative w-full">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
            <Search className="w-4 h-4 text-rose-500" />
            <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-14 pr-4 py-4 rounded-3xl bg-white border-2 border-slate-100 text-sm focus:outline-hidden focus:border-rose-200 focus:ring-4 focus:ring-rose-500/5 shadow-xl transition-all"
          />
          {searchQuery && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">
              AI SEMANTIC FILTER ACTIVE
            </div>
          )}
        </div>

        {activeTab === 'knowledge' && (
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedBucket('All')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap border ${
                selectedBucket === 'All' ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.all} ({vocabulary.length})
            </button>
            {BUCKETS.map(b => (
              <button
                key={b}
                onClick={() => setSelectedBucket(b)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap border ${
                  selectedBucket === b ? 'bg-rose-600 border-rose-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {b === 'Personal Vocab' ? t.personalVocab : (b === 'Grammar' ? t.grammar : t.culture)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'knowledge' && (filteredData as VocabularyItem[]).map((item) => (
          <div key={item.id} className="dynamic-card p-6 flex flex-col justify-between space-y-4 group hover:shadow-2xl transition-all border-l-4 border-l-rose-500">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                  {item.bucket === 'Personal Vocab' ? t.personalVocab : (item.bucket === 'Grammar' ? t.grammar : t.culture)}
                </span>
                <History className="w-3.5 h-3.5 text-slate-300" />
              </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">{item.term}</h3>
                    <button 
                      onClick={() => {
                        const isChinese = /[\u4e00-\u9fa5]/.test(item.term);
                        playVoice(item.term, isChinese ? 'zh-HK' : 'auto');
                      }}
                      className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600 transition"
                      title="朗讀原文字句"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs font-mono text-slate-500 mt-1">🗣️ {item.phonetic}</p>
                </div>
              <p className="text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                {item.translation}
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span className="flex items-center space-x-1 text-emerald-600">
                <CheckCircle className="w-3 h-3" />
                <span>{t.retention} {item.srsLevel}/5</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full flex items-center space-x-1 ${item.addedBy === currentUser ? (user?.location === 'HK' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600') : (partner?.location === 'HK' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600')}`}>
                <span>{item.addedBy === currentUser ? (user?.location === 'HK' ? '🇭🇰' : '🇸🇪') : (partner?.location === 'HK' ? '🇭🇰' : '🇸🇪')}</span>
                <span>{item.addedBy === currentUser ? (currentLang === 'zh' ? '您' : (currentLang === 'sv' ? 'Du' : 'You')) : (partner?.name || (currentLang === 'zh' ? '語伴' : 'Partner'))}</span>
              </span>
            </div>
          </div>
        ))}

        {activeTab === 'media' && (filteredData as SharedAsset[]).map((asset) => (
          <div key={asset.id} className="dynamic-card overflow-hidden group hover:shadow-2xl transition-all">
            {asset.type === 'Photo' ? (
              <div className="relative aspect-video overflow-hidden">
                <img src={asset.url} alt={asset.title} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md p-1.5 rounded-lg">
                  <ImageIcon className="w-4 h-4 text-white" />
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-slate-900 flex items-center justify-center">
                <LinkIcon className="w-8 h-8 text-white/20" />
              </div>
            )}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 truncate">{asset.title || (currentLang === 'zh' ? '未命名素材' : 'Untitled Asset')}</h4>
                <a href={asset.url} target="_blank" rel="noreferrer" className="text-rose-500 hover:text-rose-600">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center space-x-1">
                  <img src={asset.addedBy === currentUser ? user?.avatar : partner?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=partner'} className="w-4 h-4 rounded-full" />
                  <span>{currentLang === 'zh' ? '分享者：' : 'Shared by '}{asset.addedBy === currentUser ? (user?.name || (currentLang === 'zh' ? '您' : 'You')) : (partner?.name || 'Partner')}</span>
                </span>
                <span>{asset.timestamp}</span>
              </div>
            </div>
          </div>
        ))}

        {activeTab === 'teaching' && (filteredData as TeachingLogEntry[]).map((log) => (
          <div key={log.id} className="dynamic-card p-6 space-y-4 border-t-4 border-t-emerald-500">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900">{log.topic}</h4>
              <GraduationCap className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-sm text-slate-700 italic">
              "{log.explanation}"
            </div>
            <div className="bg-slate-900 p-3 rounded-xl text-xs font-mono text-emerald-400">
              <span className="text-white/40 mr-2">EX:</span> {log.example}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>{currentLang === 'zh' ? '導師：' : 'Teacher: '}{log.teacher === currentUser ? (user?.name || (currentLang === 'zh' ? '您' : 'You')) : (partner?.name || 'Partner')}</span>
              <span>{log.timestamp}</span>
            </div>
          </div>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">{t.noItems}</h3>
          <p className="text-sm text-slate-500 mt-2">{currentLang === 'zh' ? '請嘗試其他關鍵字或切換分頁' : (currentLang === 'sv' ? 'Prova en annan sökterm eller flik' : 'Try a different search query or tab')}</p>
        </div>
      )}

      {/* Modal for adding term */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">{t.addTerm}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{currentLang === 'zh' ? '詞彙 / 概念' : (currentLang === 'sv' ? 'Begrepp / Term' : 'Concept / Term')}</label>
                <input
                  type="text"
                  value={newTerm}
                  onChange={e => setNewTerm(e.target.value)}
                  placeholder={currentLang === 'zh' ? '例：早晨 或 Hej!' : 'e.g. Cantonese Vowels or Hej!'}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{currentLang === 'zh' ? '翻譯 / 解釋' : (currentLang === 'sv' ? 'Förklaring / Översättning' : 'Explanation / Translation')}</label>
                <input
                  type="text"
                  value={newTranslation}
                  onChange={e => setNewTranslation(e.target.value)}
                  placeholder={currentLang === 'zh' ? '描述知識點或含意...' : 'Describe the knowledge point...'}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{currentLang === 'zh' ? '語境 / 讀音' : (currentLang === 'sv' ? 'Kontext / Uttal' : 'Context / Pronunciation')}</label>
                <input
                  type="text"
                  value={newPhonetic}
                  onChange={e => setNewPhonetic(e.target.value)}
                  placeholder={currentLang === 'zh' ? '如何發音或使用場景...' : 'How to say it or use it...'}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{currentLang === 'zh' ? '分類' : (currentLang === 'sv' ? 'Kategori' : 'Category')}</label>
                <select
                  value={newBucket}
                  onChange={e => setNewBucket(e.target.value as VocabularyBucket)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-hidden bg-white"
                >
                  {BUCKETS.map(b => (
                    <option key={b} value={b}>{b === 'Personal Vocab' ? t.personalVocab : (b === 'Grammar' ? t.grammar : t.culture)}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  {translations[currentLang].chat.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white shadow-md"
                >
                  {t.addTerm}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
