import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize GoogleGenAI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy_key",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Translation & Vocabulary Extraction Endpoint
app.post("/api/translate", async (req, res) => {
  try {
    const { text, sourceLang, targetLang, senderIdentity } = req.body;
    const isFromHK = senderIdentity === 'DW' || senderIdentity === 'DIF' || /[\u4e00-\u9fa5]/.test(text);

    if (!process.env.GEMINI_API_KEY) {
      // High quality fallback dictionary & dynamic response when API key is not configured
      if (isFromHK) {
        // DIF (HK) sending Cantonese to William (SE)
        let translatedText = "Good morning! Let's have a great conversation today.";
        let jyutping = "zou2 san4! gam1 jat6 jat1 cai4 king1 gai2 laa1.";
        let breakdown = {
          explanation: "DIF is greeting you warmly and expressing excitement for today's exchange.",
          explanationEn: "DIF is greeting you warmly and expressing excitement for today's exchange.",
          explanationZh: "DIF 向你親切道早安，並表達對今日語言交流的期待與興奮。",
          grammar: ["早晨 (zou2 san4: Good morning)", "一齊 (jat1 cai4: together)", "傾偈 (king1 gai2: to chat)", "啦 (laa1: friendly sentence-final particle)"],
          grammarEn: ["早晨 (zou2 san4: Good morning)", "一齊 (jat1 cai4: together)", "傾偈 (king1 gai2: to chat)", "啦 (laa1: friendly sentence-final particle)"],
          grammarZh: ["早晨 (zou2 san4: 粵語早安)", "一齊 (jat1 cai4: 一起/共同)", "傾偈 (king1 gai2: 聊天交談)", "啦 (laa1: 語氣助詞，增添親和力)"],
          culture: "Hong Kong greetings are direct, energetic, and frequently incorporate final modal particles (like 啦, 呀) to soften tone.",
          cultureEn: "Hong Kong greetings are direct, energetic, and frequently incorporate final modal particles (like 啦, 呀) to soften tone.",
          cultureZh: "香港問候方式直接、熱情且有活力，句尾常用語氣助詞（如「啦」、「呀」）讓語氣更親切融洽。"
        };
        let vocab = [
          { term: "早晨 (zou2 san4)", translation: "Good morning / God morgon", bucket: "Personal Vocab" },
          { term: "傾偈 (king1 gai2)", translation: "To chat / Prata", bucket: "Grammar" }
        ];

        if (text.includes("食") || text.includes("飯")) {
          translatedText = "Have you eaten yet? How is your day going?";
          jyutping = "nei5 sik6 zo2 faan6 mei6 aa3?";
          breakdown = {
            explanation: "DIF is using the iconic Hong Kong greeting 'Have you eaten yet?', which functions like 'How are you?'.",
            explanationEn: "DIF is using the iconic Hong Kong greeting 'Have you eaten yet?', which functions like 'How are you?'.",
            explanationZh: "DIF 使用了香港極具代表性的問候語「食咗飯未？」，等同於「你好嗎？/ 最近過得點？」。",
            grammar: ["食咗 (sik6 zo2: have eaten - 咗 is the completed aspect)", "未 (mei6: not yet)"],
            grammarEn: ["食咗 (sik6 zo2: have eaten - 咗 is the completed aspect)", "未 (mei6: not yet)"],
            grammarZh: ["食咗 (sik6 zo2: 吃過了 - 「咗」表示動作完成)", "未 (mei6: 還沒/了嗎)"],
            culture: "In Cantonese culture, asking if someone has eaten is a quintessential expression of care and hospitality.",
            cultureEn: "In Cantonese culture, asking if someone has eaten is a quintessential expression of care and hospitality.",
            cultureZh: "在嶺南與香港文化中，以「食飯」問候他人代表深切的關懷與人情味。"
          };
          vocab = [{ term: "食飯 (sik6 faan6)", translation: "To eat a meal / Äta mat", bucket: "Culture" }];
        } else if (text.includes("點") || text.includes("點呀")) {
          translatedText = "How are things going with you lately?";
          jyutping = "zeoi3 gan6 dim2 aa3?";
          breakdown = {
            explanation: "A very common casual Cantonese greeting asking about your current state.",
            explanationEn: "A very common casual Cantonese greeting asking about your current state.",
            explanationZh: "香港日常極為高頻的隨性問候語，詢問你近期的生活狀態與心情。",
            grammar: ["點呀 (dim2 aa3: how is it / what's up)"],
            grammarEn: ["點呀 (dim2 aa3: how is it / what's up)"],
            grammarZh: ["點呀 (dim2 aa3: 怎麼樣/近況如何)"],
            culture: "Standard greeting between friends in Hong Kong.",
            cultureEn: "Standard greeting between friends in Hong Kong.",
            cultureZh: "香港朋友之間最地道的口頭打招呼方式。"
          };
          vocab = [{ term: "點呀 (dim2 aa3)", translation: "What's up / Hur är läget", bucket: "Personal Vocab" }];
        } else if (text.includes("好") || text.includes("正")) {
          translatedText = "That's awesome! Sounds really great.";
          jyutping = "hou2 zeng3 aa3!";
          breakdown = {
            explanation: "Expressing enthusiasm and approval using vibrant Cantonese adjectives.",
            explanationEn: "Expressing enthusiasm and approval using vibrant Cantonese adjectives.",
            explanationZh: "使用地道粵語讚美詞表達高度肯定與熱情。",
            grammar: ["好正 (hou2 zeng3: very awesome/great)"],
            grammarEn: ["好正 (hou2 zeng3: very awesome/great)"],
            grammarZh: ["好正 (hou2 zeng3: 極棒/太讚了)"],
            culture: "「正」 (zeng3) is the go-to Hong Kong slang term for something top-notch or delicious.",
            cultureEn: "「正」 (zeng3) is the go-to Hong Kong slang term for something top-notch or delicious.",
            cultureZh: "「正」是香港人口中最普遍的潮語之一，形容事物極具水準、美味或令人驚豔。"
          };
          vocab = [{ term: "正 (zeng3)", translation: "Awesome / Great / Fantastisk", bucket: "Culture" }];
        }

        return res.json({
          translatedText,
          jyutping,
          learningBreakdown: breakdown,
          vocabularyExtracted: vocab
        });
      } else {
        // William (SE) sending English/Swedish to DIF (HK)
        let translatedText = "最近點呀！今日一切順唔順利？";
        let breakdown = {
          explanation: "William 用地道英語向你輕鬆打招呼，關心你今日的狀況。",
          explanationZh: "William 用地道英語向你輕鬆打招呼，關心你今日的狀況。",
          explanationEn: "William is greeting you casually in natural English, asking how everything is going with you today.",
          grammar: ["What's up (隨性日常問候語)", "How is everything going (近況如何)"],
          grammarZh: ["What's up (隨性日常問候語)", "How is everything going (近況如何)"],
          grammarEn: ["What's up (casual conversational greeting)", "How is everything going (inquiry about current status)"],
          culture: "西方日常對話中「What's up」多用作隨性寒暄，通常回答「Not much」或簡述手頭上的事即可。",
          cultureZh: "西方日常對話中「What's up」多用作隨性寒暄，通常回答「Not much」或簡述手頭上的事即可。",
          cultureEn: "In Western daily conversation, 'What's up' is a friendly casual greeting, typically answered with 'Not much' or a brief update."
        };
        let vocab = [
          { term: "What's up", translation: "最近點呀 / 咩事呀 (Casual greeting)", bucket: "Culture" }
        ];

        if (text.toLowerCase().includes("morgon") || text.toLowerCase().includes("morning")) {
          translatedText = "早晨！琴晚瞓得好唔好？好期待今日我哋嘅交流！";
          breakdown = {
            explanation: "William 向你問候早安，並詢問昨晚睡眠品質，表達對語言交流的期待。",
            explanationZh: "William 向你問候早安，並詢問昨晚睡眠品質，表達對語言交流的期待。",
            explanationEn: "William is wishing you a good morning and asking about your sleep, expressing excitement for today's language exchange.",
            grammar: ["God morgon (瑞典語：早安)", "Good morning (英語：早安)"],
            grammarZh: ["God morgon (瑞典語：早安)", "Good morning (英語：早安)"],
            grammarEn: ["God morgon (Swedish: Good morning)", "Good morning (English greeting)"],
            culture: "瑞典人在清晨見面時習慣親切互道 God morgon，並經常溫馨關心對方的睡眠與身心狀態。",
            cultureZh: "瑞典人在清晨見面時習慣親切互道 God morgon，並經常溫馨關心對方的睡眠與身心狀態。",
            cultureEn: "Swedes warmly exchange 'God morgon' in the morning and genuinely care about sleep quality and daily well-being."
          };
          vocab = [{ term: "God morgon", translation: "早晨 (Good morning in Swedish)", bucket: "Culture" }];
        } else if (text.toLowerCase().includes("coffee") || text.toLowerCase().includes("fika")) {
          translatedText = "我依家享受緊咖啡 / Fika 時間☕";
          breakdown = {
            explanation: "William 正在享受瑞典經典的 Fika 咖啡休息時光。",
            explanationZh: "William 正在享受瑞典經典的 Fika 咖啡休息時光。",
            explanationEn: "William is enjoying the iconic Swedish Fika coffee and pastry break.",
            grammar: ["Fika (瑞典經典名詞/動詞：喝咖啡配甜點小憩)"],
            grammarZh: ["Fika (瑞典經典名詞/動詞：喝咖啡配甜點小憩)"],
            grammarEn: ["Fika (Swedish noun/verb: coffee break with pastries and conversation)"],
            culture: "「Fika」是瑞典文化的核心，每天與朋友或同事暫停工作享用咖啡與肉桂卷，象徵生活慢步調與深層社交。",
            cultureZh: "「Fika」是瑞典文化的核心，每天與朋友或同事暫停工作享用咖啡與肉桂卷，象徵生活慢步調與深層社交。",
            cultureEn: "'Fika' is central to Swedish culture—pausing daily routines to enjoy coffee, cinnamon buns, and meaningful bonding."
          };
          vocab = [{ term: "Fika", translation: "瑞典咖啡甜點休閒文化", bucket: "Culture" }];
        } else if (text.toLowerCase().includes("great") || text.toLowerCase().includes("sounds")) {
          translatedText = "聽落好正！好期待！✨";
          breakdown = {
            explanation: "William 表達積極肯定與讚同，期待接下來的安排。",
            explanationZh: "William 表達積極肯定與讚同，期待接下來的安排。",
            explanationEn: "William is expressing enthusiastic agreement and looking forward to the plan.",
            grammar: ["Sounds great (聽起來太棒了)"],
            grammarZh: ["Sounds great (聽起來太棒了)"],
            grammarEn: ["Sounds great (positive colloquial affirmation)"],
            culture: "西方人常用「Sounds great!」或瑞典語「Låter bra!」給予即時、熱情且正面的反饋。",
            cultureZh: "西方人常用「Sounds great!」或瑞典語「Låter bra!」給予即時、熱情且正面的反饋。",
            cultureEn: "Western conversations frequently use 'Sounds great!' or Swedish 'Låter bra!' for warm, spontaneous validation."
          };
          vocab = [{ term: "Sounds great", translation: "聽落好正 / 聽起來很棒", bucket: "Personal Vocab" }];
        }

        return res.json({
          translatedText,
          jyutping: "", // DIF does NOT need Jyutping
          learningBreakdown: breakdown,
          vocabularyExtracted: vocab
        });
      }
    }

    const prompt = `Translate the following message in a bilateral language exchange between 🇭🇰 DIF (Hong Kong, native Cantonese/Chinese speaker) and 🇸🇪 William (Sweden, native English/Swedish speaker).

Sender: ${senderIdentity || (isFromHK ? 'DIF (Hong Kong)' : 'William (Sweden)')}
Message: "${text}"

STRICT BILATERAL RULES:
1. When SENDER is 🇭🇰 DIF (Cantonese/Chinese input) ➔ RECEIVER is 🇸🇪 William:
   - translatedText: Must be fluent, natural conversational English (or Swedish) so William understands instantly.
   - jyutping: Accurate standard Cantonese Jyutping with tones (e.g. 'zou2 san4! nei5 sik6 zo2 faan6 mei6?') for the Cantonese source message so William can learn pronunciation.
   - learningBreakdown:
     * explanation: English explanation of what this phrase/slang means in Hong Kong daily life.
     * explanationZh: Traditional Chinese (繁體中文) explanation of the phrase.
     * explanationEn: Natural English explanation of the phrase.
     * grammar: Array of key Cantonese grammar points in English.
     * grammarZh: Array of key Cantonese grammar points in Traditional Chinese (繁體中文).
     * grammarEn: Array of key Cantonese grammar points in English.
     * culture: Cultural background in Hong Kong in English.
     * cultureZh: Cultural background in Hong Kong in Traditional Chinese (繁體中文).
     * cultureEn: Cultural background in Hong Kong in English.
   - vocabularyExtracted: 1-3 useful Cantonese terms with English definitions and Jyutping in bucket ('Personal Vocab' | 'Grammar' | 'Culture').

2. When SENDER is 🇸🇪 William (English/Swedish input) ➔ RECEIVER is 🇭🇰 DIF:
   - translatedText: Must be authentic, natural Hong Kong Traditional Chinese / Cantonese (e.g. "What's up" ➔ "最近點呀？", "Good morning" ➔ "早晨！") so DIF understands immediately.
   - jyutping: MUST BE EMPTY STRING "" because DIF is a native Hong Konger and does NOT need Cantonese Jyutping!
   - learningBreakdown:
     * explanation: Traditional Chinese (繁體中文) explanation of the English/Swedish nuance.
     * explanationZh: Traditional Chinese (繁體中文) explanation of the nuance, tone, and idioms.
     * explanationEn: English explanation of the nuance and idioms (so DIF can read and learn in full English).
     * grammar: Array of grammar points in Traditional Chinese.
     * grammarZh: Array of grammar structures explained in Traditional Chinese (繁體中文).
     * grammarEn: Array of grammar structures explained in English.
     * culture: Western/Swedish cultural context in Traditional Chinese.
     * cultureZh: Western/Swedish cultural context in Traditional Chinese (繁體中文).
     * cultureEn: Western/Swedish cultural context in English.
   - vocabularyExtracted: 1-3 English/Swedish vocabulary items with Traditional Chinese definitions and bucket ('Personal Vocab' | 'Grammar' | 'Culture').`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert bilingual exchange assistant between DIF (Hong Kong native Cantonese speaker) and William (Sweden native English/Swedish speaker). Always generate dual-language breakdown fields (both Chinese 'Zh' and English 'En') so users can switch seamlessly.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedText: { type: Type.STRING },
            jyutping: { type: Type.STRING, description: "Cantonese Jyutping for Cantonese text, or empty string if sender is William" },
            learningBreakdown: {
              type: Type.OBJECT,
              properties: {
                explanation: { type: Type.STRING },
                explanationZh: { type: Type.STRING },
                explanationEn: { type: Type.STRING },
                grammar: { type: Type.ARRAY, items: { type: Type.STRING } },
                grammarZh: { type: Type.ARRAY, items: { type: Type.STRING } },
                grammarEn: { type: Type.ARRAY, items: { type: Type.STRING } },
                culture: { type: Type.STRING },
                cultureZh: { type: Type.STRING },
                cultureEn: { type: Type.STRING }
              }
            },
            vocabularyExtracted: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  translation: { type: Type.STRING },
                  bucket: { type: Type.STRING }
                }
              }
            }
          }
        }
      },
    });

    const result = JSON.parse(response.text || "{}");
    // Ensure if sender is William, jyutping is empty
    if (!isFromHK) {
      result.jyutping = "";
    }
    res.json(result);
  } catch (error: any) {
    console.warn("Translation AI error, using graceful fallback:", error.message || error);
    const { text, senderIdentity } = req.body;
    const isFromHK = senderIdentity === 'DW' || senderIdentity === 'DIF' || /[\u4e00-\u9fa5]/.test(text);
    
    if (isFromHK) {
      res.json({
        translatedText: text || "Hello!",
        jyutping: "nei5 hou2",
        learningBreakdown: {
          explanation: "Cantonese message sent from DIF.",
          explanationZh: "來自 DIF 的粵語訊息。",
          explanationEn: "Cantonese message sent from DIF.",
          grammar: ["Cantonese conversation"],
          grammarZh: ["粵語對話模式"],
          grammarEn: ["Cantonese conversation pattern"],
          culture: "Hong Kong daily communication.",
          cultureZh: "香港日常生活交流。",
          cultureEn: "Hong Kong daily communication."
        },
        vocabularyExtracted: []
      });
    } else {
      res.json({
        translatedText: text || "你好！",
        jyutping: "",
        learningBreakdown: {
          explanation: "來自 William 的英文/瑞典語訊息。",
          explanationZh: "來自 William 的英文/瑞典語訊息。",
          explanationEn: "English/Swedish message from William.",
          grammar: ["日常交流"],
          grammarZh: ["日常交流文法"],
          grammarEn: ["Daily conversational structure"],
          culture: "西方日常對話。",
          cultureZh: "西方日常對話文化。",
          cultureEn: "Western conversational culture."
        },
        vocabularyExtracted: []
      });
    }
  }
});

// Quick Replies Generation tailored to user identity
app.post("/api/quick-replies", async (req, res) => {
  try {
    const { lastMessage, userLocation, userIdentity } = req.body;
    const isHK = userLocation === 'HK' || userIdentity === 'DW';

    if (!process.env.GEMINI_API_KEY) {
      if (isHK) {
        return res.json({
          replies: [
            { text: "好呀，無問題！✨", translation: "Sure, no problem! ✨" },
            { text: "你食咗嘢未呀？", translation: "Have you eaten yet?" },
            { text: "陣間再同你傾！", translation: "Talk to you in a bit!" }
          ]
        });
      } else {
        return res.json({
          replies: [
            { text: "Sounds great! ✨", translation: "聽落好正！" },
            { text: "Just having my coffee ☕", translation: "啱啱飲緊咖啡" },
            { text: "Talk to you later!", translation: "遲啲再傾！" }
          ]
        });
      }
    }

    const prompt = isHK 
      ? `Generate 3 natural, 1-tap quick replies in authentic Cantonese / Traditional Chinese for 🇭🇰 DIF (Hong Kong) replying to partner William.
Last message received: "${lastMessage || 'Hello'}"
Provide 'text' in authentic Cantonese (繁體中文) and 'translation' in English.`
      : `Generate 3 natural, 1-tap quick replies in English (or Swedish touch) for 🇸🇪 William (Sweden) replying to partner DIF.
Last message received: "${lastMessage || '你好'}"
Provide 'text' in English/Swedish and 'translation' in Cantonese (繁體中文).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        systemInstruction: "Generate 3 concise, friendly, 1-tap quick reply options for a cross-cultural messaging app.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              translation: { type: Type.STRING }
            }
          }
        }
      },
    });

    const data = JSON.parse(response.text || "[]");
    res.json({ replies: Array.isArray(data) ? data : data.replies || [] });
  } catch (error: any) {
    console.warn("Quick replies AI error, using fallback:", error.message);
    const { userLocation } = req.body;
    const isHK = userLocation === 'HK';
    res.json({
      replies: isHK ? [
        { text: "好呀，無問題！✨", translation: "Sounds good! ✨" },
        { text: "你今日過得點？", translation: "How is your day going?" },
        { text: "陣間傾！", translation: "Talk soon!" }
      ] : [
        { text: "Have a great day! ✨", translation: "祝你有美好的一天！" },
        { text: "Having my coffee now ☕", translation: "我E家飲緊咖啡" },
        { text: "Talk soon later!", translation: "陣間傾計！" }
      ]
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Duo Exchange Hub Server running on http://localhost:${PORT}`);
  });
}

startServer();
