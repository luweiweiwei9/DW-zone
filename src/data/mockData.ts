import { UserProfile, ChatMessage, VocabularyItem, MicroStory, LanguageSyncAnchorState, SrsCard, SharedAsset, TeachingLogEntry } from '../types';

export const PROFILES: Record<'userA' | 'userB', any> = {
  userA: {
    uid: 'userA',
    email: 'dif@example.com',
    displayName: 'DIF',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    name: 'DIF',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    currentLang: 'en'
  },
  userB: {
    uid: 'userB',
    email: 'william@example.com',
    displayName: 'William',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    name: 'William',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    currentLang: 'sv'
  }
};

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    senderId: 'userB',
    originalText: 'God morgon! Hur sov du? Ser fram emot vår språkväxling idag.',
    originalLang: 'Swedish',
    translatedText: '早晨！你琴晚瞓得好唔好？好期待今日我哋嘅語言交換！',
    targetLang: 'Traditional Chinese / Cantonese',
    jyutping: '', // No Jyutping when DIF receives Swedish/English
    learningBreakdown: {
      explanation: 'William 向你問候早安，並詢問昨晚睡眠品質，表達對今日語言交換的期待。',
      explanationZh: 'William 向你問候早安，並詢問昨晚睡眠品質，表達對今日語言交換的期待。',
      explanationEn: 'William is wishing you a good morning and asking about your sleep, expressing excitement for today’s language exchange.',
      grammar: ['God morgon (瑞典語：早晨)', 'Hur sov du? (你瞓得好唔好？過去式問句)', 'Ser fram emot (十分期待...)'],
      grammarZh: ['God morgon (瑞典語：早晨)', 'Hur sov du? (你瞓得好唔好？過去式問句)', 'Ser fram emot (十分期待...)'],
      grammarEn: ['God morgon (Swedish: Good morning)', 'Hur sov du? (How did you sleep? Past tense question)', 'Ser fram emot (Looking forward to...)'],
      culture: '瑞典人在清晨見面時習慣親切互道 God morgon，並經常溫馨關心對方的睡眠與身心狀態。',
      cultureZh: '瑞典人在清晨見面時習慣親切互道 God morgon，並經常溫馨關心對方的睡眠與身心狀態。',
      cultureEn: 'Swedes warmly exchange "God morgon" in the morning and genuinely care about each other’s sleep quality and daily well-being.'
    },
    timestamp: '08:30 AM',
    vocabularyExtracted: [
      { term: 'språkväxling', translation: '語言交換 (Language exchange)', bucket: 'Culture' },
      { term: 'Ser fram emot', translation: '十分期待 (Looking forward to)', bucket: 'Personal Vocab' }
    ]
  },
  {
    id: 'm2',
    senderId: 'userA',
    originalText: '早晨！我昨晚溫咗陣瑞典文文法。今日要傾 project 呢個 term！',
    originalLang: 'Cantonese',
    translatedText: "Good morning! I reviewed some Swedish grammar last night. Let's discuss the project terms today!",
    targetLang: 'English',
    jyutping: 'zou2 san4! ngo5 zok3 maan5 wan1 zo2 zan6 seoi5 din2 man4 man4 faat3. gam1 jat6 jiu3 king1 project ni1 go3 term!',
    learningBreakdown: {
      explanation: 'DIF is saying good morning, mentioning studying Swedish grammar last night, and suggesting discussing the project terminology today.',
      explanationEn: 'DIF is saying good morning, mentioning studying Swedish grammar last night, and suggesting discussing the project terminology today.',
      explanationZh: 'DIF 向你問候早安，提到昨晚溫習了瑞典語文法，並提議今天討論專案詞彙。',
      grammar: ['溫咗 (wan1 zo2: reviewed/studied, 咗 is the completed aspect marker)', '要傾 (jiu3 king1: need to discuss)', '呢個 (ni1 go3: this)'],
      grammarEn: ['溫咗 (wan1 zo2: reviewed/studied, 咗 is the completed aspect marker)', '要傾 (jiu3 king1: need to discuss)', '呢個 (ni1 go3: this)'],
      grammarZh: ['溫咗 (wan1 zo2: 溫習了 - 「咗」表示動作完成)', '要傾 (jiu3 king1: 需要商討)', '呢個 (ni1 go3: 這個)'],
      culture: 'In Hong Kong work culture, seamlessly mixing English loanwords like "project" and "term" with Cantonese is standard daily practice.',
      cultureEn: 'In Hong Kong work culture, seamlessly mixing English loanwords like "project" and "term" with Cantonese is standard daily practice.',
      cultureZh: '在香港工作與校園文化中，口語中夾雜「project」、「term」等英文術語是非常地道自然的日常溝通方式。'
    },
    timestamp: '08:42 AM',
    vocabularyExtracted: [
      { term: '溫書 / 溫習 (wan1)', translation: 'To study / revise', bucket: 'Personal Vocab' },
      { term: '傾 (king1)', translation: 'To chat / discuss', bucket: 'Grammar' }
    ]
  },
  {
    id: 'm3',
    senderId: 'userB',
    originalText: "What's up! Låter fantastiskt. How is everything going with you today?",
    originalLang: 'English / Swedish',
    translatedText: '最近點呀！聽落好正。你今日一切過得點呀？',
    targetLang: 'Traditional Chinese / Cantonese',
    jyutping: '', // No Jyutping when DIF receives English
    learningBreakdown: {
      explanation: 'William 用地道英語與瑞典語熱情回應，並關心你今日的整體狀況。',
      explanationZh: 'William 用地道英語與瑞典語熱情回應，並關心你今日的整體狀況。',
      explanationEn: 'William is responding enthusiastically with natural English and Swedish, asking how your day is going.',
      grammar: ["What's up (隨性日常問候語)", "Låter fantastiskt (瑞典語：聽起來太棒了)", "How is everything going (近況如何)"],
      grammarZh: ["What's up (隨性日常問候語)", "Låter fantastiskt (瑞典語：聽起來太棒了)", "How is everything going (近況如何)"],
      grammarEn: ["What's up (casual conversational greeting)", "Låter fantastiskt (Swedish: Sounds fantastic)", "How is everything going (friendly inquiry)"],
      culture: '西方人在日常交流中常用「What\'s up」或「Låter bra / fantastiskt」給予即時、熱情且正面的反饋。',
      cultureZh: '西方人在日常交流中常用「What\'s up」或「Låter bra / fantastiskt」給予即時、熱情且正面的反饋。',
      cultureEn: 'In Western and Nordic culture, expressions like "What’s up" and "Låter fantastiskt" provide spontaneous, warm, and positive energy.'
    },
    timestamp: '09:15 AM',
    vocabularyExtracted: [
      { term: "What's up", translation: '最近點呀 / 咩事呀 (Casual greeting)', bucket: 'Culture' },
      { term: 'Låter fantastiskt', translation: '聽起來太棒了 (Sounds fantastic)', bucket: 'Personal Vocab' }
    ]
  }
];

export const INITIAL_STORIES: MicroStory[] = [
  {
    id: 's1',
    userId: 'userA',
    authorName: 'DIF (HK)',
    caption: '今日喺公司樓下飲咗一杯好滑嘅港式奶茶，練緊點用瑞典文同 William 講呢種口感！',
    translatedCaption: 'Drank a smooth HK style milk tea downstairs today, practicing how to describe this texture in Swedish with William!',
    jyutping: 'gam1 jat6 hai2 gung1 si1 lau4 haa2 jam2 zo2 jat1 bui1 hou2 waat6 ge5 gong2 sik1 naai5 caa4.',
    imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80',
    voiceSnippetDuration: '0:05',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    culturalHotspots: [
      { title: '絲襪奶茶 (Silk Milk Tea)', description: 'Traditional HK tea brewing technique.', x: 45, y: 60 }
    ]
  },
  {
    id: 's2',
    userId: 'userB',
    authorName: 'William (Stockholm)',
    caption: 'Fika break in Stockholm. Practicing Cantonese tones while enjoying cinnamon buns.',
    translatedCaption: '斯德哥爾摩 Fika 時間。一邊食肉桂卷一邊練習粵語聲調。',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
    voiceSnippetDuration: '0:04',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    culturalHotspots: [
      { title: 'Fika', description: 'Swedish coffee break culture.', x: 70, y: 40 }
    ]
  },
  {
    id: 's3',
    userId: 'userA',
    authorName: 'DIF (HK)',
    caption: '香港嘅日落，今日特別橙色。',
    translatedCaption: 'Hong Kong sunset, exceptionally orange today.',
    jyutping: 'hoeng1 gong2 ge5 jat6 lok6, gam1 jat6 dak6 bit6 caang2 sik1.',
    imageUrl: 'https://images.unsplash.com/photo-1506466010722-395aa2bef877?w=600&auto=format&fit=crop&q=80',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 's4',
    userId: 'userB',
    authorName: 'William (Stockholm)',
    caption: 'Gick en promenad i Gamla Stan. Så vackert!',
    translatedCaption: 'Went for a walk in Gamla Stan. So beautiful!',
    imageUrl: 'https://images.unsplash.com/photo-1595861448834-01306f364a27?w=600&auto=format&fit=crop&q=80',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  }
];

export const INITIAL_VOCABULARY: VocabularyItem[] = [
  {
    id: 'v1',
    term: 'Fika',
    phonetic: 'Fee-kah',
    translation: 'Swedish coffee & pastry break tradition',
    bucket: 'Culture',
    addedBy: 'userB',
    srsLevel: 3,
    nextReviewDate: 'Tomorrow'
  },
  {
    id: 'v2',
    term: '撈亂骨頭',
    phonetic: 'lou1 lyun6 gwat1 tau4',
    translation: 'Inseparable best friends / close partners',
    bucket: 'Culture',
    addedBy: 'userA',
    srsLevel: 2,
    nextReviewDate: 'In 3 days'
  },
  {
    id: 'v3',
    term: 'Att fika',
    phonetic: 'At-fee-kah',
    translation: 'To have a fika (Verb form)',
    bucket: 'Grammar',
    addedBy: 'userB',
    srsLevel: 4,
    nextReviewDate: 'In 7 days'
  },
  {
    id: 'v4',
    term: '行街',
    phonetic: 'haang1 gaai1',
    translation: 'Casual walk around / Strolling',
    bucket: 'Personal Vocab',
    addedBy: 'userA',
    srsLevel: 1,
    nextReviewDate: 'Today'
  }
];

export const INITIAL_ASSETS: SharedAsset[] = [
  {
    id: 'a1',
    type: 'Photo',
    url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80',
    title: 'HK Milk Tea downstairs',
    timestamp: '2 hours ago',
    addedBy: 'userA'
  },
  {
    id: 'a2',
    type: 'Photo',
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
    title: 'Fika Cinnamon Buns',
    timestamp: '5 hours ago',
    addedBy: 'userB'
  },
  {
    id: 'a3',
    type: 'Link',
    url: 'https://www.visitsweden.com/what-to-do/food-drink/swedish-kitchen/fika-swedish-tradition/',
    title: 'Understanding Fika Culture',
    timestamp: 'Yesterday',
    addedBy: 'userB'
  }
];

export const INITIAL_TEACHING_LOG: TeachingLogEntry[] = [
  {
    id: 't1',
    topic: 'Cantonese Tones (9 Tones)',
    explanation: 'Cantonese has 6 active tones (traditionally 9). William, focus on the high-flat vs mid-rising.',
    example: 'ma (Mother) vs ma (Horse)',
    teacher: 'userA',
    timestamp: 'Yesterday'
  },
  {
    id: 't2',
    topic: 'Swedish Word Order (V2)',
    explanation: 'In Swedish, the verb always stays in the second position in a declarative sentence.',
    example: 'Idag *dricker* jag kaffe. (Today drink I coffee)',
    teacher: 'userB',
    timestamp: '3 days ago'
  }
];

export const INITIAL_SRS_CARDS: SrsCard[] = [
  {
    id: 'sc1',
    vocabularyId: 'v1',
    term: 'Fika',
    promptType: 'shadowing',
    targetLang: 'English / Swedish',
    correctAnswer: 'Swedish coffee and pastry break',
    audioHint: 'Listen to William voice note: "Let us have a nice fika together."'
  },
  {
    id: 'sc2',
    vocabularyId: 'v2',
    term: '撈亂骨頭',
    promptType: 'emotion_quiz',
    targetLang: 'Cantonese',
    correctAnswer: 'Inseparable close partners',
    options: ['Inseparable close partners', 'Spicy hotpot noodles', 'Busy workday morning', 'Long flight to Sweden']
  }
];

export const INITIAL_ANCHOR_STATE: LanguageSyncAnchorState = {
  stockholmTime: '06:44 PM',
  hongKongTime: '12:44 AM',
  exchangeProgress: 92,
  streakDays: 43,
  sharedHabits: [
    { id: 'h1', title: 'Daily 5-Min Voice Note Exchange', userACompleted: true, userBCompleted: true },
    { id: 'h2', title: 'Extract & Sync 3 New Vocabulary Terms', userACompleted: true, userBCompleted: true },
    { id: 'h3', title: 'Complete SRS Spaced Repetition Review', userACompleted: true, userBCompleted: false }
  ]
};

