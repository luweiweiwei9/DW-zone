export const playVoice = (text: string, lang: string = 'auto') => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('Speech synthesis not supported in this browser environment');
    return;
  }

  if (!text || !text.trim()) {
    console.warn('No text provided for speech synthesis');
    return;
  }

  // If text contains Chinese characters along with parenthesized pronunciation/pinyin/jyutping (e.g., '早晨 (zou2 san4)'),
  // strip out the parenthesized romanization so TTS speaks pure natural Cantonese/Chinese words.
  let cleanedText = text.trim();
  if (/[\u4e00-\u9fa5]/.test(cleanedText)) {
    cleanedText = cleanedText.replace(/\([a-zA-Z0-9\s:_-]+\)/g, '').trim() || cleanedText;
  }

  // Cancel any ongoing speech before starting a new one
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(cleanedText);
  
  // Determine target language:
  // zh-HK for Cantonese / Chinese characters
  // sv-SE for Swedish
  // en-US for English
  let targetLang = 'en-US';
  const hasChineseChars = /[\u4e00-\u9fa5]/.test(text);
  const hasSwedishChars = /[åäöÅÄÖ]/.test(text);

  if (lang === 'zh-HK' || lang === 'zh' || lang === 'cantonese' || hasChineseChars) {
    targetLang = 'zh-HK';
  } else if (lang === 'sv-SE' || lang === 'sv' || lang === 'swedish' || hasSwedishChars) {
    targetLang = 'sv-SE';
  } else if (lang && lang !== 'auto') {
    targetLang = lang;
  }

  utterance.lang = targetLang;
  utterance.rate = targetLang === 'zh-HK' ? 0.9 : 1.0;
  utterance.pitch = 1.0;

  // Search for the best matched voice
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    if (targetLang === 'zh-HK') {
      const cantoneseVoice = voices.find(v => 
        v.lang === 'zh-HK' || 
        v.lang === 'zh_HK' || 
        v.lang === 'yue' || 
        v.lang === 'zh-yue' ||
        v.name.toLowerCase().includes('cantonese') ||
        v.name.toLowerCase().includes('hong kong') ||
        v.name.toLowerCase().includes('sin-ji') ||
        v.name.toLowerCase().includes('tracy') ||
        v.name.toLowerCase().includes('danny')
      ) || voices.find(v => v.lang.startsWith('zh'));

      if (cantoneseVoice) {
        utterance.voice = cantoneseVoice;
      }
    } else if (targetLang === 'sv-SE') {
      const swedishVoice = voices.find(v => 
        v.lang === 'sv-SE' || 
        v.lang.startsWith('sv') || 
        v.name.toLowerCase().includes('swedish') ||
        v.name.toLowerCase().includes('alva') ||
        v.name.toLowerCase().includes('klara') ||
        v.name.toLowerCase().includes('oskar')
      );
      if (swedishVoice) {
        utterance.voice = swedishVoice;
      }
    }
  }

  window.speechSynthesis.speak(utterance);
};

