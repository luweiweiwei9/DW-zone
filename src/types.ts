export type UserRole = string; 

export type UiTheme = 'glass' | 'editorial' | 'neon' | 'biolume';

export type UiLanguage = 'en' | 'zh' | 'sv';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  name: string;
  avatar: string;
  identity?: 'DW' | 'William';
  location?: 'HK' | 'SE';
  partnerId?: string;
  inviteCode?: string;
  roomId?: string;
  currentLang?: UiLanguage;
  timezone?: string;
  streak?: number;
  lastActive?: any;
}

export interface LearningBreakdown {
  explanation: string;
  grammar?: string[];
  culture?: string;
  explanationZh?: string;
  explanationEn?: string;
  grammarZh?: string[];
  grammarEn?: string[];
  cultureZh?: string;
  cultureEn?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  originalText: string;
  originalLang: string;
  translatedText: string;
  targetLang: string;
  jyutping?: string;
  learningBreakdown?: LearningBreakdown;
  timestamp: any;
  vocabularyExtracted?: {
    term: string;
    translation: string;
    bucket: VocabularyBucket;
  }[];
  audioDuration?: string;
  audioUrl?: string;
  isAudioMessage?: boolean;
  imageUrl?: string;
  isImageMessage?: boolean;
  expiresAt?: any;
  createdAtMillis?: number;
  recalled?: boolean;
  recalledBy?: string;
  deletedBy?: string[]; // Array of user IDs who have hidden this message
}

export type VocabularyBucket = 
  | 'Personal Vocab'
  | 'Grammar'
  | 'Culture';

export type AssetType = 'Photo' | 'Video' | 'Link';

export interface SharedAsset {
  id: string;
  type: AssetType;
  url: string;
  title?: string;
  timestamp: string;
  addedBy: UserRole;
}

export interface TeachingLogEntry {
  id: string;
  topic: string;
  explanation: string;
  example: string;
  teacher: UserRole;
  timestamp: string;
}

export interface VocabularyItem {
  id: string;
  term: string;
  phonetic: string; // Jyutping or IPA
  translation: string;
  bucket: VocabularyBucket;
  addedBy: UserRole;
  srsLevel: number; // 0 to 5 (1, 3, 7, 14, 30 days)
  nextReviewDate: string;
  audioUrl?: string;
}

export interface MicroStory {
  id: string;
  userId: UserRole;
  authorName: string;
  caption: string;
  translatedCaption: string;
  learningBreakdown?: {
    explanation: string;
    grammar?: string[];
    culture?: string;
  };
  jyutping?: string;
  imageUrl?: string;
  voiceSnippetDuration?: string;
  timestamp: string;
  culturalHotspots?: {
    title: string;
    description: string;
    x: number; // percentage
    y: number; // percentage
  }[];
}

export interface SrsCard {
  id: string;
  vocabularyId: string;
  term: string;
  promptType: 'shadowing' | 'emotion_quiz' | 'translation_match';
  targetLang: string;
  correctAnswer: string;
  options?: string[];
  audioHint?: string;
}

export interface LanguageSyncAnchorState {
  stockholmTime: string;
  hongKongTime: string;
  exchangeProgress: number; // 0 - 100
  streakDays: number;
  sharedHabits: {
    id: string;
    title: string;
    userACompleted: boolean;
    userBCompleted: boolean;
  }[];
}

