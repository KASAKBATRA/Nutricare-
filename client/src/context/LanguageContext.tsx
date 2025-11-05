import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'hi' | 'ur' | 'pa' | 'mr' | 'gu';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    // Header
    'header.signin': 'Sign In',
    'header.register': 'Register',
    'header.progress': 'Progress',
    'header.daily': 'Daily View',
    'header.weekly': 'Weekly View',
    'header.monthly': 'Monthly View',
    
    // Dashboard
    'dashboard.welcome': 'Welcome back',
    'dashboard.journey': "Here's your health journey today",
    'dashboard.calories': 'Calories',
    'dashboard.water': 'Water',
    'dashboard.weight': 'Weight',
    'dashboard.bmi': 'BMI',
    'dashboard.today': 'Today',
    'dashboard.thisweek': 'This week',
    'dashboard.current': 'Current',
    'dashboard.glasses': 'glasses',
    'dashboard.normal': 'Normal',
    'dashboard.healthy_range': 'Healthy range: 18.5-24.9',
    
    // Meals
    'meals.title': "Today's Meals",
    'meals.add': 'Add Meal',
    'meals.breakfast': 'Breakfast',
    'meals.lunch': 'Lunch',
    'meals.dinner': 'Dinner',
    'meals.snack': 'Snack',
    'meals.not_logged': 'Not logged yet',
    'meals.add_button': 'Add',
    
    // Community
    'community.title': 'Community Feed',
    'community.view_all': 'View All',
    
  // Quick Actions
  'actions.title': 'Quick Actions',
  'actions.appointment': 'Book Appointment',
  'actions.reports': 'View Reports',
    
    // Appointments
    'appointments.title': 'Upcoming Appointments',
    'appointments.consultation': 'Nutritionist Consultation',
    'appointments.tomorrow': 'Tomorrow',
    
    // Friends
    'friends.title': 'Friends Activity',
    'friends.completed_goal': 'completed his daily goal',
    'friends.shared_recipe': 'shared a healthy recipe',
    
    // Chatbot
    'chatbot.title': 'NutriCare AI',
    'chatbot.placeholder': 'Ask me anything...',
    'chatbot.initial': "Hello! I'm here to help you with your nutrition and health goals. What would you like to know?",
    
    // Motivation
    'motivation.title': 'Daily Motivation',
    'motivation.streak': 'Daily Streak',
    'motivation.days': 'days',
    'motivation.week': 'This Week',
    'motivation.meals_logged': 'healthy meals logged!',

    // Mood Tracking
    'mood.question': 'How are you feeling now?',
    'mood.selectFeeling': 'Please select how you feel after this meal:',
    'mood.veryGood': 'Very Good',
    'mood.good': 'Good',
    'mood.neutral': 'Neutral',
    'mood.bad': 'Bad',
    'mood.veryBad': 'Very Bad',
    'mood.whyGood': 'That\'s great! What made you feel good? Was the meal tasty and satisfying?',
    'mood.whyBad': 'Sorry to hear that. What went wrong? Was the meal not good or something else?',
    'mood.reasonPlaceholder': 'Please share your thoughts...',
    'mood.submit': 'Submit',
    'common.cancel': 'Cancel',
  },
  
  hi: {
    // Header
    'header.signin': 'साइन इन',
    'header.register': 'पंजीकरण',
    'header.progress': 'प्रगति',
    'header.daily': 'दैनिक दृश्य',
    'header.weekly': 'साप्ताहिक दृश्य',
    'header.monthly': 'मासिक दृश्य',
    
    // Dashboard
    'dashboard.welcome': 'वापसी पर स्वागत है',
    'dashboard.journey': 'यहाँ आज आपकी स्वास्थ्य यात्रा है',
    'dashboard.calories': 'कैलोरी',
    'dashboard.water': 'पानी',
    'dashboard.weight': 'वजन',
    'dashboard.bmi': 'बीएमआई',
    'dashboard.today': 'आज',
    'dashboard.thisweek': 'इस सप्ताह',
    'dashboard.current': 'वर्तमान',
    'dashboard.glasses': 'गिलास',
    'dashboard.normal': 'सामान्य',
    'dashboard.healthy_range': 'स्वस्थ सीमा: 18.5-24.9',
    
    // Meals
    'meals.title': 'आज का भोजन',
    'meals.add': 'भोजन जोड़ें',
    'meals.breakfast': 'नाश्ता',
    'meals.lunch': 'दोपहर का खाना',
    'meals.dinner': 'रात का खाना',
    'meals.snack': 'नाश्ता',
    'meals.not_logged': 'अभी तक लॉग नहीं किया गया',
    'meals.add_button': 'जोड़ें',
    
    // Community
    'community.title': 'समुदायिक फ़ीड',
    'community.view_all': 'सभी देखें',
    
  // Quick Actions
  'actions.title': 'त्वरित कार्य',
  'actions.appointment': 'अपॉइंटमेंट बुक करें',
  'actions.reports': 'रिपोर्ट देखें',
    
    // Appointments
    'appointments.title': 'आगामी अपॉइंटमेंट',
    'appointments.consultation': 'पोषणविशेषज्ञ परामर्श',
    'appointments.tomorrow': 'कल',
    
    // Friends
    'friends.title': 'मित्रों की गतिविधि',
    'friends.completed_goal': 'ने अपना दैनिक लक्ष्य पूरा किया',
    'friends.shared_recipe': 'ने एक स्वस्थ रेसिपी साझा की',
    
    // Chatbot
    'chatbot.title': 'NutriCare AI',
    'chatbot.placeholder': 'मुझसे कुछ भी पूछें...',
    'chatbot.initial': 'नमस्ते! मैं यहाँ आपके पोषण और स्वास्थ्य लक्ष्यों में मदद करने के लिए हूँ। आप क्या जानना चाहते हैं?',
    
    // Motivation
    'motivation.title': 'दैनिक प्रेरणा',
    'motivation.streak': 'दैनिक लकीर',
    'motivation.days': 'दिन',
    'motivation.week': 'इस सप्ताह',
    'motivation.meals_logged': 'स्वस्थ भोजन लॉग किया गया!',

    // Mood Tracking
    'mood.question': 'अभी आप कैसा महसूस कर रहे हैं?',
    'mood.selectFeeling': 'कृपया बताएं कि इस भोजन के बाद आप कैसा महसूस कर रहे हैं:',
    'mood.veryGood': 'बहुत अच्छा',
    'mood.good': 'अच्छा',
    'mood.neutral': 'सामान्य',
    'mood.bad': 'बुरा',
    'mood.veryBad': 'बहुत बुरा',
    'mood.whyGood': 'यह बहुत अच्छी बात है! आपको अच्छा क्या लगा? क्या खाना स्वादिष्ट और संतोषजनक था?',
    'mood.whyBad': 'यह सुनकर दुख हुआ। क्या गलत हुआ? क्या खाना अच्छा नहीं था या कुछ और?',
    'mood.reasonPlaceholder': 'कृपया अपने विचार साझा करें...',
    'mood.submit': 'जमा करें',
    'common.cancel': 'रद्द करें',
  },
  
  // Add other languages similarly...
  ur: {
    'header.signin': 'سائن ان',
    'header.register': 'رجسٹر',
    'dashboard.welcome': 'واپسی پر خوش آمدید',
    'dashboard.journey': 'یہاں آج آپ کا صحت کا سفر ہے',
    'chatbot.initial': 'ہیلو! میں یہاں آپ کی غذائیت اور صحت کے اہداف میں مدد کے لیے ہوں۔ آپ کیا جاننا چاہتے ہیں؟',
    
    // Mood Tracking
    'mood.question': 'آپ اب کیسا محسوس کر رہے ہیں؟',
    'mood.selectFeeling': 'براہ کرم بتائیں کہ اس کھانے کے بعد آپ کیسا محسوس کر رہے ہیں:',
    'mood.veryGood': 'بہت اچھا',
    'mood.good': 'اچھا',
    'mood.neutral': 'عام',
    'mood.bad': 'برا',
    'mood.veryBad': 'بہت برا',
    'mood.whyGood': 'یہ بہت اچھی بات ہے! آپ کو کیا اچھا لگا؟ کیا کھانا مزیدار اور مطمئن کن تھا؟',
    'mood.whyBad': 'یہ سن کر افسوس ہوا۔ کیا غلط ہوا؟ کیا کھانا اچھا نہیں تھا یا کچھ اور؟',
    'mood.reasonPlaceholder': 'براہ کرم اپنے خیالات شیئر کریں...',
    'mood.submit': 'جمع کریں',
    'common.cancel': 'منسوخ کریں',
  },
  
  pa: {
    'header.signin': 'ਸਾਈਨ ਇਨ',
    'header.register': 'ਰਜਿਸਟਰ',
    'dashboard.welcome': 'ਵਾਪਸੀ ਤੇ ਜੀ ਆਇਆਂ ਨੂੰ',
    'dashboard.journey': 'ਇੱਥੇ ਅੱਜ ਤੁਹਾਡੀ ਸਿਹਤ ਦੀ ਯਾਤਰਾ ਹੈ',
    'chatbot.initial': 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਇੱਥੇ ਤੁਹਾਡੇ ਪੋਸ਼ਣ ਅਤੇ ਸਿਹਤ ਦੇ ਟੀਚਿਆਂ ਵਿੱਚ ਮਦਦ ਕਰਨ ਲਈ ਹਾਂ। ਤੁਸੀਂ ਕੀ ਜਾਣਨਾ ਚਾਹੁੰਦੇ ਹੋ?',
    
    // Mood Tracking
    'mood.question': 'ਤੁਸੀਂ ਹੁਣ ਕਿਵੇਂ ਮਹਿਸੂਸ ਕਰ ਰਹੇ ਹੋ?',
    'mood.selectFeeling': 'ਕਿਰਪਾ ਕਰਕੇ ਦੱਸੋ ਕਿ ਇਸ ਖਾਣੇ ਤੋਂ ਬਾਅਦ ਤੁਸੀਂ ਕਿਵੇਂ ਮਹਿਸੂਸ ਕਰ ਰਹੇ ਹੋ:',
    'mood.veryGood': 'ਬਹੁਤ ਵਧੀਆ',
    'mood.good': 'ਵਧੀਆ',
    'mood.neutral': 'ਸਾਧਾਰਨ',
    'mood.bad': 'ਬੁਰਾ',
    'mood.veryBad': 'ਬਹੁਤ ਬੁਰਾ',
    'mood.whyGood': 'ਇਹ ਬਹੁਤ ਵਧੀਆ ਗੱਲ ਹੈ! ਤੁਹਾਨੂੰ ਕੀ ਚੰਗਾ ਲੱਗਿਆ? ਕੀ ਖਾਣਾ ਸੁਆਦੀ ਅਤੇ ਸੰਤੁਸ਼ਟ ਕਰਨ ਵਾਲਾ ਸੀ?',
    'mood.whyBad': 'ਇਹ ਸੁਣ ਕੇ ਅਫਸੋਸ ਹੋਇਆ। ਕੀ ਗਲਤ ਹੋਇਆ? ਕੀ ਖਾਣਾ ਚੰਗਾ ਨਹੀਂ ਸੀ ਜਾਂ ਕੁਝ ਹੋਰ?',
    'mood.reasonPlaceholder': 'ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਵਿਚਾਰ ਸਾਂਝੇ ਕਰੋ...',
    'mood.submit': 'ਜਮ੍ਹਾਂ ਕਰੋ',
    'common.cancel': 'ਰੱਦ ਕਰੋ',
  },
  
  mr: {
    'header.signin': 'साइन इन',
    'header.register': 'नोंदणी',
    'dashboard.welcome': 'परत येण्यावर स्वागत आहे',
    'dashboard.journey': 'आज तुमचा आरोग्य प्रवास इथे आहे',
    'chatbot.initial': 'नमस्कार! मी तुमच्या पोषण आणि आरोग्य उद्दिष्टांमध्ये मदत करण्यासाठी येथे आहे। तुम्हाला काय जाणून घ्यायचे आहे?',
    
    // Mood Tracking
    'mood.question': 'तुम्ही आता कसं वाटतंय?',
    'mood.selectFeeling': 'कृपया सांगा की या जेवणानंतर तुम्हाला कसं वाटतंय:',
    'mood.veryGood': 'खूप चांगलं',
    'mood.good': 'चांगलं',
    'mood.neutral': 'सामान्य',
    'mood.bad': 'वाईट',
    'mood.veryBad': 'खूप वाईट',
    'mood.whyGood': 'हे खूप चांगलं आहे! तुम्हाला काय चांगलं वाटलं? जेवण चवदार आणि समाधानकारक होतं का?',
    'mood.whyBad': 'हे ऐकून वाईट वाटलं। काय चुकलं? जेवण चांगलं नव्हतं की काही आणि?',
    'mood.reasonPlaceholder': 'कृपया तुमचे विचार शेअर करा...',
    'mood.submit': 'सबमिट करा',
    'common.cancel': 'रद्द करा',
  },
  
  gu: {
    'header.signin': 'સાઇન ઇન',
    'header.register': 'નોંધણી',
    'dashboard.welcome': 'પાછા આવવા પર સ્વાગત છે',
    'dashboard.journey': 'અહીં આજે તમારી આરોગ્યની યાત્રા છે',
    'chatbot.initial': 'નમસ્તે! હું અહીં તમારા પોષણ અને આરોગ્યના લક્ષ્યોમાં મદદ કરવા માટે છું। તમે શું જાણવા માંગો છો?',
    
    // Mood Tracking
    'mood.question': 'તમે અત્યારે કેવું લાગે છે?',
    'mood.selectFeeling': 'કૃપા કરીને કહો કે આ ભોજન પછી તમને કેવું લાગે છે:',
    'mood.veryGood': 'ખૂબ સારું',
    'mood.good': 'સારું',
    'mood.neutral': 'સામાન્ય',
    'mood.bad': 'ખરાબ',
    'mood.veryBad': 'ખૂબ ખરાબ',
    'mood.whyGood': 'આ ખૂબ સારી વાત છે! તમને શું સારું લાગ્યું? શું ખોરાક સ્વાદિષ્ટ અને સંતોષકારક હતો?',
    'mood.whyBad': 'આ સાંભળીને દુઃખ થયું. શું ખોટું થયું? શું ખોરાક સારો નહોતો કે કંઈ બીજું?',
    'mood.reasonPlaceholder': 'કૃપા કરીને તમારા વિચારો શેર કરો...',
    'mood.submit': 'સબમિટ કરો',
    'common.cancel': 'રદ કરો',
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && Object.keys(translations).includes(savedLanguage)) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  const t = (key: string): string => {
    return (translations[language] as any)?.[key] || (translations.en as any)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
