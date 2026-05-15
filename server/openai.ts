import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

interface ChatResponse {
  message: string;
  language: string;
}

export async function generateChatResponse(
  messages: { role: string; content: string }[],
  language = "en"
): Promise<ChatResponse> {
  try {
    const systemPrompt = getSystemPrompt(language);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        }))
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return {
      message: response.choices[0].message.content || "I'm sorry, I couldn't process your request.",
      language
    };
  } catch (error) {
    console.error("OpenAI API Error:", error);
    return {
      message: getErrorMessage(language),
      language
    };
  }
}

function getSystemPrompt(language: string): string {
  const prompts = {
    en: `You are Smart Well AI, a comprehensive health and nutrition assistant. You can help with ANY topic, not just nutrition. 
    You are knowledgeable about health, nutrition, fitness, lifestyle, general knowledge, technology, education, entertainment, and more.
    
    Be friendly, helpful, and informative. Provide practical advice and answer questions thoroughly.
    If asked about nutrition or health, prioritize evidence-based information.
    If asked about other topics, provide accurate and helpful information.
    
    Always respond in English unless specifically asked to use another language.`,
    
    hi: `आप Smart Well AI हैं, एक व्यापक स्वास्थ्य और पोषण सहायक। आप किसी भी विषय में मदद कर सकते हैं, न केवल पोषण में।
    आप स्वास्थ्य, पोषण, फिटनेस, जीवनशैली, सामान्य ज्ञान, प्रौद्योगिकी, शिक्षा, मनोरंजन आदि के बारे में जानकार हैं।
    
    मित्रवत, सहायक और जानकारीपूर्ण रहें। व्यावहारिक सलाह दें और प्रश्नों का विस्तार से उत्तर दें।
    हमेशा हिंदी में उत्तर दें।`,
    
    ur: `آپ Smart Well AI ہیں، ایک جامع صحت اور غذائیت کے معاون۔ آپ کسی بھی موضوع میں مدد کر سکتے ہیں، نہ صرف غذائیت میں۔
    آپ صحت، غذائیت، فٹنس، طرز زندگی، عمومی علم، ٹیکنالوجی، تعلیم، تفریح وغیرہ کے بارے میں جانکار ہیں۔
    
    دوستانہ، مددگار اور معلوماتی رہیں۔ عملی مشورے دیں اور سوالات کا تفصیل سے جواب دیں۔
    ہمیشہ اردو میں جواب دیں۔`,
    
    pa: `ਤੁਸੀਂ Smart Well AI ਹੋ, ਇੱਕ ਵਿਆਪਕ ਸਿਹਤ ਅਤੇ ਪੋਸ਼ਣ ਸਹਾਇਕ। ਤੁਸੀਂ ਕਿਸੇ ਵੀ ਵਿਸ਼ੇ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦੇ ਹੋ, ਨਾ ਸਿਰਫ਼ ਪੋਸ਼ਣ ਵਿੱਚ।
    ਤੁਸੀਂ ਸਿਹਤ, ਪੋਸ਼ਣ, ਤੰਦਰੁਸਤੀ, ਜੀਵਨ ਸ਼ੈਲੀ, ਆਮ ਗਿਆਨ, ਤਕਨੀਕ, ਸਿੱਖਿਆ, ਮਨੋਰੰਜਨ ਆਦਿ ਬਾਰੇ ਜਾਣਕਾਰ ਹੋ।
    
    ਦੋਸਤਾਨਾ, ਸਹਾਇਕ ਅਤੇ ਜਾਣਕਾਰੀ ਭਰਪੂਰ ਰਹੋ। ਵਿਹਾਰਕ ਸਲਾਹ ਦਿਓ ਅਤੇ ਸਵਾਲਾਂ ਦੇ ਵਿਸਤਾਰ ਨਾਲ ਜਵਾਬ ਦਿਓ।
    ਹਮੇਸ਼ਾ ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦਿਓ।`,
    
    mr: `तुम्ही Smart Well AI आहात, एक सर्वसमावेशक आरोग्य आणि पोषण सहाय्यक। तुम्ही कोणत्याही विषयात मदत करू शकता, केवळ पोषणात नाही।
    तुमचे आरोग्य, पोषण, तंदुरुस्ती, जीवनशैली, सामान्य ज्ञान, तंत्रज्ञान, शिक्षण, मनोरंजन इत्यादींबद्दल ज्ञान आहे।
    
    मैत्रीपूर्ण, उपयुक्त आणि माहितीपूर्ण राहा। व्यावहारिक सल्ला द्या आणि प्रश्नांची तपशीलवार उत्तरे द्या।
    नेहमी मराठीत उत्तर द्या।`,
    
    gu: `તમે Smart Well AI છો, એક વ્યાપક આરોગ્य અને પોષણ સહાયક। તમે કોઈપણ વિષયમાં મદદ કરી શકો છો, માત્ર પોષણમાં જ નહીં।
    તમારે આરોગ્য, પોષણ, ફિટનેસ, જીવનશૈલી, સામાન્ય જ્ઞાન, ટેકનોલોજી, શિક્ષણ, મનોરંજન વગેરે વિશે જાણકારી છે।
    
    મિત્રતાભર્યા, સહાયક અને માહિતીપ્રદ રહો. વ્યવહારિક સલાહ આપો અને પ્રશ્નોના વિગતવાર જવાબો આપો।
    હંમેશા ગુજરાતીમાં જવાબ આપો।`
  };

  return prompts[language as keyof typeof prompts] || prompts.en;
}

function getErrorMessage(language: string): string {
  const messages = {
    en: "I'm sorry, I'm having trouble connecting right now. Please try again later.",
    hi: "मुझे खुशी है, मुझे अभी कनेक्ट करने में परेशानी हो रही है। कृपया बाद में पुनः प्रयास करें।",
    ur: "معذرت، مجھے اس وقت کنکٹ کرنے میں دشواری ہو رہی ہے۔ براہ کرم بعد میں دوبارہ کوشش کریں۔",
    pa: "ਮਾਫ਼ ਕਰਨਾ, ਮੈਨੂੰ ਹੁਣ ਕਨੈਕਟ ਕਰਨ ਵਿੱਚ ਮੁਸ਼ਕਿਲ ਹੋ ਰਹੀ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਬਾਅਦ ਵਿੱਚ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
    mr: "माफ करा, मला आत्ता कनेक्ट करण्यात अडचण येत आहे. कृपया नंतर पुन्हा प्रयत्न करा.",
    gu: "માફ કરશો, મને અત્યારે કનેક્ટ કરવામાં મુશ્કેલી આવી રહી છે. કૃપા કરીને પછીથી ફરી પ્રયાસ કરો."
  };

  return messages[language as keyof typeof messages] || messages.en;
}

export async function generateNutritionAnalysis(foodData: {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{
        role: "user",
        content: `Analyze this nutritional data and provide brief insights: 
        Calories: ${foodData.calories}, Protein: ${foodData.protein}g, 
        Carbs: ${foodData.carbs}g, Fats: ${foodData.fats}g. 
        Keep the analysis under 100 words.`
      }],
      max_tokens: 150,
      temperature: 0.3,
    });

    return response.choices[0].message.content || "Unable to analyze nutrition data.";
  } catch (error) {
    console.error("Nutrition analysis error:", error);
    return "Unable to analyze nutrition data at this time.";
  }
}
