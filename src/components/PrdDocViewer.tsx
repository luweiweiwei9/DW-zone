import React, { useState } from 'react';
import { ShieldCheck, BookOpen, Layers, Cpu, Compass, FileText, CheckCircle2 } from 'lucide-react';

export const PrdDocViewer: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('sec1');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Document Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl space-y-4">
        <div className="flex items-center space-x-2 text-indigo-400 text-xs font-mono uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Product Requirements Document (PRD) & Architecture Specification</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          DW Zone: Private Dual-Language Platform
        </h1>
        <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
          System architecture & closed-loop flows for DIF (HK) & William (Stockholm).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Table of Contents */}
        <div className="lg:col-span-1 space-y-2 sticky top-24 self-start">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3">Table of Contents</div>
          <button
            onClick={() => setActiveSection('sec1')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition flex items-center space-x-2 ${
              activeSection === 'sec1' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>1. System Architecture</span>
          </button>
          <button
            onClick={() => setActiveSection('sec2')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition flex items-center space-x-2 ${
              activeSection === 'sec2' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. Information Architecture</span>
          </button>
          <button
            onClick={() => setActiveSection('sec3')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition flex items-center space-x-2 ${
              activeSection === 'sec3' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>3. Daily User Journey</span>
          </button>
          <button
            onClick={() => setActiveSection('sec4')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition flex items-center space-x-2 ${
              activeSection === 'sec4' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>4. UI/UX Wireframes</span>
          </button>
          <button
            onClick={() => setActiveSection('sec5')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition flex items-center space-x-2 ${
              activeSection === 'sec5' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>5. Technical & Algorithms</span>
          </button>
        </div>

        {/* Main Document Content Area */}
        <div className="lg:col-span-3 glass-card p-6 sm:p-10 space-y-10">
          
          {/* SECTION 1 */}
          {activeSection === 'sec1' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Deliverable 1</span>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">System Architecture & Data Flow Diagram</h2>
              </div>
              
              <p className="text-slate-600 text-sm leading-relaxed">
                The closed-loop data architecture orchestrates real-time bilateral communication between User A (Hong Kong 🇭🇰) and User B (Stockholm 🇸🇪), eliminating translation fatigue and structuring casual chat into high-retention language acquisition assets.
              </p>

              <div className="bg-slate-900 text-slate-200 p-6 rounded-2xl font-mono text-xs space-y-3 shadow-inner overflow-x-auto">
                <div className="text-indigo-400 font-bold">[1. User Input Layer]</div>
                <div className="pl-4">↳ Voice Note (5s) / Micro-Story Photo / Chat Message (Cantonese / Swedish)</div>
                <div className="text-indigo-400 font-bold mt-2">[2. AI Processing Pipeline (Gemini 3.7 Flash / STT)]</div>
                <div className="pl-4">↳ Automatic Transcription → Trilingual Translation → Jyutping / Pinyin Extraction → Cultural Hotspot Tagging</div>
                <div className="text-indigo-400 font-bold mt-2">[3. Closed-Loop Storage & Vault]</div>
                <div className="pl-4">↳ Auto-sorting into 4 Smart Buckets: Daily Life, Emotional/Pet Names, Cultural Slang, LDR Future Plans</div>
                <div className="text-indigo-400 font-bold mt-2">[4. Spaced Repetition System (SRS) Queue]</div>
                <div className="pl-4">↳ 1-3-7-14 Day Decay Interval Calculation → Review Mini-Game Generation (Shadowing & Quizzes)</div>
                <div className="text-indigo-400 font-bold mt-2">[5. Emotional Feedback Loop]</div>
                <div className="pl-4">↳ Friendship Connection Widget Update (+% score) → Unlock Private Streak Badges & Weekly Flashback Deck</div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-sm">Key Architectural Guarantees</h4>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Zero Latency Overlay:</strong> Messages appear instantly with asynchronous background translation and Jyutping generation.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Private End-to-End Encryption:</strong> All private micro-stories and chat vaults are isolated to the 2 authorized user UUIDs.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* SECTION 2 */}
          {activeSection === 'sec2' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Deliverable 2</span>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">Information Architecture (IA) & App Map</h2>
              </div>

              <p className="text-slate-600 text-sm leading-relaxed">
                The application structure is streamlined around a 5-tab hyper-focused pair interface designed specifically to minimize friction for busy professionals.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                    <span>1. Home Feed & Micro-Stories</span>
                  </h4>
                  <p className="text-xs text-slate-600">
                    One-Tap Life Signal poster, partner status ticker, live Stockholm vs Hong Kong time-zone and distance tracker, reunion countdown timer, and shared daily micro-habit checkboxes.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                    <span>2. Frictionless Smart Chat</span>
                  </h4>
                  <p className="text-xs text-slate-600">
                    Real-time bidirectional translation overlay, AI quick-reply cards for User A, 5-second voice notes with Jyutping, and double-tap vocabulary vault extraction.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                    <span>3. Categorized Vocabulary Vault</span>
                  </h4>
                  <p className="text-xs text-slate-600">
                    4 smart buckets (Daily Life, Emotional/Pet Names, Cultural Slang, LDR Future Plans) with audio pronunciation and search filters.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                    <span>4. SRS Review Center</span>
                  </h4>
                  <p className="text-xs text-slate-600">
                    1-3-7-14 day spaced repetition mini-games (English shadowing for User A, "Guess Her Emotion" Cantonese quiz for User B) and weekly flashback slide decks.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3 */}
          {activeSection === 'sec3' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Deliverable 3</span>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">Complete Daily User Journey (5-Minute Micro-Loops)</h2>
              </div>

              <div className="space-y-4 text-sm text-slate-700">
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-2">
                  <h4 className="font-bold text-indigo-900">🌅 Morning Check-in (08:30 HKT / 02:30 CET)</h4>
                  <p className="text-xs text-slate-600">
                    <strong>User B (William in Stockholm)</strong> sends a 5-second voice note saying good morning in Swedish with loving pet names. AI automatically transcribes and translates to Cantonese for DIF with Jyutping.
                  </p>
                </div>

                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-2">
                  <h4 className="font-bold text-indigo-900">☕ Mid-day Fast Chat & Vocabulary Extraction (13:00 HKT)</h4>
                  <p className="text-xs text-slate-600">
                    <strong>User A (DIF in HK)</strong> shares a photo of milk tea via Micro-Stories. She replies using 1-tap AI quick reply cards, saving local slang terms directly into the Smart Vocabulary Vault without manual typing effort.
                  </p>
                </div>

                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-2">
                  <h4 className="font-bold text-indigo-900">🌙 Evening 2-Minute SRS Review (21:00 HKT / 15:00 CET)</h4>
                  <p className="text-xs text-slate-600">
                    Both users complete their 2-minute SRS review mini-games using each other's voice notes from earlier in the week. Friendship connection score updates and daily streak badge increments.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4 */}
          {activeSection === 'sec4' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Deliverable 4</span>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">UI/UX Wireframe & Functional Specifications</h2>
              </div>

              <div className="space-y-4">
                <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-slate-50">
                  <h4 className="font-bold text-slate-900 text-sm">Component A: Smart Chat Translation Overlay</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Designed with high-contrast message bubbles, integrated Jyutping pronunciation pill badges below the primary text, and a toggle button to switch instantly between translated text and original author dialect.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-slate-50">
                  <h4 className="font-bold text-slate-900 text-sm">Component B: Micro-Story View with Cultural Hotspots</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Card-based photo and audio snippet layout featuring interactive pulsing hotspot pins ('i') that reveal deep cultural context when tapped.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-slate-50">
                  <h4 className="font-bold text-slate-900 text-sm">Component C: SRS Review Mini-Game Card</h4>
                  <p className="text-xs text-slate-600 leading-relaxed-relaxed">
                    Gamified interface presenting partner audio hints, multiple-choice translation or emotional nuance options, instant celebratory feedback, and point tallying.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5 */}
          {activeSection === 'sec5' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Deliverable 5</span>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">Technical & Algorithmic Specifications</h2>
              </div>

              <div className="space-y-4 text-xs text-slate-700">
                <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl font-mono space-y-2">
                  <div className="text-indigo-400 font-bold">// 1. Spaced Repetition System (SRS) Decay Formula</div>
                  <div>interval(n) = interval(n-1) * easeFactor</div>
                  <div>Default Intervals: [1 day, 3 days, 7 days, 14 days, 30 days]</div>
                  <div>If correct: srsLevel = min(5, srsLevel + 1)</div>
                  <div>If incorrect: srsLevel = max(1, srsLevel - 1)</div>
                </div>

                <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl font-mono space-y-2">
                  <div className="text-indigo-400 font-bold">// 2. Contextual AI Prompt Structure (@google/genai)</div>
                  <div>Model: gemini-3.7-flash</div>
                  <div>System Instruction: "You are an empathetic LDR linguistic bridge between Cantonese, Swedish, and English."</div>
                  <div>ResponseMimeType: application/json (Structured schema with translatedText, jyutping, vocabularyNotes)</div>
                </div>

                <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl font-mono space-y-2">
                  <div className="text-indigo-400 font-bold">// 3. Voice-to-Text & Jyutping Requirements</div>
                  <div>- Audio sample rate: 16kHz PCM input / 24kHz output</div>
                  <div>- Phonetic romanization generated via Gemini Cantonese linguistic dictionary rules</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
