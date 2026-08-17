import React, { useState } from 'react';
import { UserRole, UiLanguage, VocabularyItem, UserProfile } from '../types';
import { translations } from '../lib/translations';
import { playVoice } from '../lib/voiceUtils';
import { Sparkles, CheckCircle2, XCircle, RotateCcw, Volume2, Trophy, ArrowRight, Heart } from 'lucide-react';

interface SrsReviewCenterProps {
  currentUser: string;
  currentLang: UiLanguage;
  vocabulary: VocabularyItem[];
  partner?: UserProfile | null;
}

export const SrsReviewCenter: React.FC<SrsReviewCenterProps> = ({ currentUser, currentLang, vocabulary, partner }) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [reviewCompleted, setReviewCompleted] = useState(false);
  const t = translations[currentLang].srs;

  // Generate dynamic cards from vocabulary
  const reviewCards = vocabulary
    .filter(item => item.addedBy === currentUser)
    .map(item => {
      const options = [
        item.translation,
        'Something unrelated',
        'A different concept',
        'Not the right answer'
      ].sort(() => Math.random() - 0.5);

      return {
        id: item.id,
        term: item.term,
        prompt: `Recall the meaning for your practice:`,
        audioContext: `${partner?.name || 'Partner'} shared this with you.`,
        targetTranslation: item.translation,
        options,
        correct: item.translation
      };
    });

  // Fallback if no vocab exists yet
  const displayCards = reviewCards.length > 0 ? reviewCards : [
    {
      id: 'fallback',
      term: 'Welcome to SRS',
      prompt: 'Add terms to your Vault to start personalized reviews!',
      audioContext: 'System Message',
      targetTranslation: 'Get Started',
      options: ['Get Started', 'Wait', 'Skip', 'Exit'],
      correct: 'Get Started'
    }
  ];

  const currentCard = displayCards[currentCardIndex];

  const handleAnswer = (option: string) => {
    setSelectedAnswer(option);
    const correct = option === currentCard.correct;
    setIsCorrect(correct);
    if (correct) {
      setScore(prev => prev + 15);
    }
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setIsCorrect(null);
    if (currentCardIndex + 1 < displayCards.length) {
      setCurrentCardIndex(prev => prev + 1);
    } else {
      setReviewCompleted(true);
    }
  };

  const restartReview = () => {
    setCurrentCardIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setScore(0);
    setReviewCompleted(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 bg-rose-500/10 text-rose-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
          <Sparkles className="w-4 h-4" />
          <span>SRS Spaced Repetition System</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t.title}</h2>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">{t.subtitle}</p>
      </div>

      {!reviewCompleted ? (
        <div className="bg-white rounded-3xl border border-rose-100 shadow-xl p-6 sm:p-8 space-y-6">
          {/* Progress Bar */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{currentLang === 'zh' ? `卡片 ${currentCardIndex + 1} / ${reviewCards.length}` : (currentLang === 'sv' ? `Kort ${currentCardIndex + 1} av ${reviewCards.length}` : `Card ${currentCardIndex + 1} of ${reviewCards.length}`)}</span>
            <span className="text-rose-600 font-bold">{currentLang === 'zh' ? `分數: ${score} 分` : (currentLang === 'sv' ? `Poäng: ${score} p` : `Score: ${score} pts`)}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-rose-500 to-indigo-600 h-full transition-all duration-300"
              style={{ width: `${((currentCardIndex + 1) / reviewCards.length) * 100}%` }}
            ></div>
          </div>

          {/* Card Content */}
          <div className="bg-gradient-to-br from-rose-50/50 to-indigo-50/50 p-6 rounded-2xl border border-rose-100/60 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-indigo-600 tracking-wider">{currentLang === 'zh' ? '發音與記憶提示' : (currentLang === 'sv' ? 'Uttal och minnesprompt' : 'Pronunciation & Memory Prompt')}</span>
              <button 
                onClick={() => {
                  const isChinese = /[\u4e00-\u9fa5]/.test(currentCard.term);
                  playVoice(currentCard.term, isChinese ? 'zh-HK' : 'auto');
                }}
                className="p-2 rounded-xl bg-white text-rose-600 shadow-xs hover:bg-rose-50 transition active:scale-95" 
                title="朗讀原文字句"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900">{currentCard.term}</div>
              <p className="text-xs text-slate-500 mt-1">{currentLang === 'zh' ? '回想此詞彙在交流中的含意：' : (currentLang === 'sv' ? 'Minns betydelsen för din övning:' : currentCard.prompt)}</p>
            </div>
            <div className="bg-white/80 p-3 rounded-xl border border-slate-200/50 text-xs italic text-slate-700">
              "{currentCard.audioContext}"
            </div>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentCard.options.map((opt, idx) => {
              let btnStyle = 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50';
              if (selectedAnswer !== null) {
                if (opt === currentCard.correct) {
                  btnStyle = 'bg-emerald-600 border-emerald-600 text-white shadow-md';
                } else if (opt === selectedAnswer) {
                  btnStyle = 'bg-rose-600 border-rose-600 text-white shadow-md';
                } else {
                  btnStyle = 'bg-slate-100 border-slate-200 text-slate-400 opacity-60';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => selectedAnswer === null && handleAnswer(opt)}
                  disabled={selectedAnswer !== null}
                  className={`p-4 rounded-2xl border text-sm font-medium transition text-left flex items-center justify-between ${btnStyle}`}
                >
                  <span>{opt}</span>
                  {selectedAnswer !== null && opt === currentCard.correct && <CheckCircle2 className="w-5 h-5 text-white" />}
                  {selectedAnswer !== null && opt === selectedAnswer && opt !== currentCard.correct && <XCircle className="w-5 h-5 text-white" />}
                </button>
              );
            })}
          </div>

          {selectedAnswer !== null && (
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className={`text-sm font-bold ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isCorrect ? `✨ ${t.correct}` : `❌ ${t.incorrect} (${currentCard.correct})`}
              </span>
              <button
                onClick={handleNext}
                className="bg-gradient-to-r from-rose-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold shadow-md hover:opacity-90 transition flex items-center space-x-2 text-sm"
              >
                <span>{currentCardIndex + 1 < reviewCards.length ? t.nextCard : (currentLang === 'zh' ? '完成複習' : (currentLang === 'sv' ? 'Slutför session' : 'Complete Session'))}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-rose-100 shadow-xl p-10 text-center space-y-6">
          <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Trophy className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-900">{currentLang === 'zh' ? '🎉 複習圓滿完成！' : (currentLang === 'sv' ? '🎉 Repetition slutförd!' : 'Review Completed Successfully! ✨')}</h3>
            <p className="text-sm text-slate-500">
              {currentLang === 'zh' 
                ? <>您獲得了 <strong className="text-rose-600">{score} 經驗值</strong>，並更新了 1-3-7-14 天 SRS 記憶間隔！</>
                : (currentLang === 'sv' 
                  ? <>Du tjänade <strong className="text-rose-600">{score} poäng</strong> och uppdaterade dina 1-3-7-14 dagars SRS-minnesintervall!</>
                  : <>You earned <strong className="text-rose-600">{score} points</strong> and updated your 1-3-7-14 day SRS memory retention intervals.</>)}
            </p>
          </div>

          <div className="bg-rose-50 p-4 rounded-2xl max-w-md mx-auto flex items-center justify-center space-x-3 text-rose-800 text-sm">
            <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
            <span>{currentLang === 'zh' ? '今日雙方交流默契度提升！✨' : (currentLang === 'sv' ? 'Kontaktpoängen ökade idag! ✨' : 'Connection score increased today! ✨')}</span>
          </div>

          <div className="pt-4 flex justify-center space-x-4">
            <button
              onClick={restartReview}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-xl text-sm transition flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.startReview}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
