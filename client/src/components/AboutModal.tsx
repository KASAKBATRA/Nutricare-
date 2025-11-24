import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Github, 
  Linkedin, 
  X, 
  Code, 
  Target, 
  Star, 
  Users, 
  Search,
  Brain,
  Heart,
  Zap,
  Shield,
  Globe,
  Sparkles,
  TrendingUp,
  Database,
  Smartphone,
  Monitor,
  Award,
  Lightbulb
} from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<keyof typeof tabData>('intro');

  console.log('AboutModal render - isOpen:', isOpen);

  if (!isOpen) return null;

  const tabData = {
    intro: {
      icon: <Heart className="w-4 h-4" />,
      title: "About Me",
      content: "I'm Kasak, a passionate B.Tech AI & Data Science student in my final year, dedicated to revolutionizing healthcare through innovative technology. My journey in artificial intelligence and data science has equipped me with deep knowledge in machine learning, natural language processing, and health informatics. I believe technology should be accessible, inclusive, and genuinely helpful in improving people's lives. My vision is to bridge the gap between complex AI solutions and real-world health challenges, making nutrition guidance as simple as having a conversation with a trusted friend.",
      highlights: ["🎓 Final Year AI & DS Student", "💡 Healthcare Innovation Enthusiast", "🌍 Accessibility Advocate", "🤖 AI/ML Specialist"]
    },
    problem: {
      icon: <Target className="w-4 h-4" />,
      title: "Problem",
      content: "The nutrition and health industry faces significant challenges that prevent people from achieving their wellness goals. Traditional diet tracking apps focus solely on calorie counting without considering individual circumstances, cultural dietary preferences, or real-world cooking methods. Users struggle with inconsistent portion measurements using household items like spoons and bowls. There's a critical disconnect between users and certified nutritionists, making professional guidance inaccessible to many. Language barriers exclude non-English speakers from quality health resources. Most concerning is the lack of motivation and accountability, as users feel isolated in their health journey without community support or expert guidance.",
      highlights: ["📊 Generic, one-size-fits-all solutions", "🥄 Inconsistent portion measurements", "👩‍⚕️ Limited access to nutrition experts", "🌐 Language accessibility barriers", "😔 Lack of motivation & community"]
    },
    solution: {
      icon: <Sparkles className="w-4 h-4" />,
      title: "Solution", 
      content: "NutriCaree+ is a comprehensive  health ecosystem that addresses every aspect of nutrition and wellness. Our platform features intelligent food analysis that understands regional cuisines and cooking methods, providing personalized alternatives based on individual health conditions. Users can seamlessly book consultations with certified nutritionists through our integrated appointment system. The app generates professional-grade health reports suitable for medical consultations. Our social community functions like Instagram for health, where users share progress, recipes, and motivation. The multilingual AI chatbot provides 24/7 guidance in local languages, while our innovative stress management module recognizes that mental health and nutrition are interconnected.",
      highlights: ["👥 Expert Nutritionist Network", "📱 Social Health Community", "📊 Professional Health Reports", "🧘 Integrated Stress Management"]
    },
    usp: {
      icon: <Award className="w-4 h-4" />,
      title: "Unique Value",
      content: "NutriCaree+ stands apart as the world's first holistic health platform that seamlessly integrates artificial intelligence, professional healthcare expertise, and social community engagement. Unlike competitors who focus on isolated features, we've created a unified ecosystem where AI insights, expert consultations, and peer support work together. Our platform adapts to regional diets and cultural preferences, ensuring relevance for diverse global communities. The integration of stress management with nutrition guidance acknowledges the complete picture of health. Our professional-grade reports bridge the gap between consumer health tracking and medical documentation, making the app valuable for both personal use and healthcare provider consultations.",
      highlights: ["🌟 World's First Holistic Health Ecosystem", "🧠 AI + Expert + Community Integration", "🌍 Cultural Diet Adaptation", "🏥 Medical-Grade Documentation", "💖 Mind-Body Health Connection"]
    },
    tech: {
      icon: <Code className="w-4 h-4" />,
      title: "Tech Stack",
      content: "NutriCaree is built using modern web technologies for optimal performance and user experience. The frontend uses React with TypeScript for type safety and TailwindCSS for responsive design. Backend is powered by Node.js with Express server and PostgreSQL database with Drizzle ORM for efficient data management. Vite provides fast development builds, while Wouter handles client-side routing. React Query manages server state and caching. The entire application is deployed on Vercel for reliable hosting and Shadcn/ui provides beautiful, accessible components.",
      highlights: ["⚛️ React + TypeScript Frontend", "� Node.js + Express Backend", "🐘 PostgreSQL + Drizzle ORM", "⚡ Vite Build Tool", "🎯 Shadcn/ui Components", "▲ Vercel Deployment"]
    }
  } as const;

  const techStack = [
    { name: "React", category: "Frontend", icon: "⚛️", color: "from-blue-400 to-blue-600" },
    { name: "TypeScript", category: "Language", icon: "📘", color: "from-blue-500 to-blue-700" },
    { name: "TailwindCSS", category: "Styling", icon: "🎨", color: "from-teal-400 to-teal-600" },
    { name: "Node.js", category: "Backend", icon: "�", color: "from-green-500 to-green-700" },
    { name: "Express", category: "Server", icon: "🚀", color: "from-gray-600 to-gray-800" },
    { name: "PostgreSQL", category: "Database", icon: "🐘", color: "from-blue-600 to-blue-800" },
    { name: "Drizzle ORM", category: "ORM", icon: "�", color: "from-green-400 to-green-600" },
    { name: "Vite", category: "Build Tool", icon: "⚡", color: "from-purple-400 to-purple-600" },
    { name: "Wouter", category: "Routing", icon: "🛣️", color: "from-orange-400 to-orange-600" },
    { name: "React Query", category: "State", icon: "�", color: "from-red-400 to-red-600" },
    { name: "Vercel", category: "Deployment", icon: "▲", color: "from-gray-700 to-gray-900" },
    { name: "Shadcn/ui", category: "Components", icon: "🎯", color: "from-indigo-400 to-indigo-600" }
  ];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6" style={{ zIndex: 99999 }}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal - Laptop Style */}
      <div className="relative w-full max-w-7xl mx-auto animate-in zoom-in-50 duration-300">
        {/* Laptop Frame */}
        <div className="bg-gray-800 rounded-t-3xl p-4 shadow-2xl">
          {/* Laptop Screen Bezel */}
          <div className="bg-black rounded-t-2xl p-2">
            {/* Screen */}
            <div className="bg-white dark:bg-gray-900 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl" style={{ minHeight: '70vh', maxHeight: '85vh' }}>
              <Card className="border-0 h-full flex flex-col">
                {/* Header */}
                <div className="relative bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 text-white p-6 overflow-hidden flex-shrink-0">
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
                  
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-all duration-200 z-10 hover:rotate-90 transform"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  
                  {/* Profile Section - Horizontal Layout for Desktop */}
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="flex-shrink-0">
                      <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white/30 shadow-xl relative group">
                        <img 
                          src="/IMG_20250913_150411.jpg" 
                          alt="Kasak" 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      </div>
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className="space-y-2">
                        <h2 className="text-3xl font-bold flex items-center gap-2">
                          Kasak
                          <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
                        </h2>
                        <p className="text-green-100 text-lg font-medium">Frontend Developer & AI Enthusiast</p>
                        <div className="flex gap-3">
                          <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30 transition-colors px-3 py-1">
                            <Brain className="w-4 h-4 mr-2" />
                            B.Tech AI & DS (4th Year)
                          </Badge>
                          <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30 transition-colors px-3 py-1">
                            <Award className="w-4 h-4 mr-2" />
                            Final Year Project
                          </Badge>
                        </div>
                        <p className="text-green-50 text-sm leading-relaxed max-w-lg">
                          Passionate about creating innovative AI-driven healthcare solutions that make nutrition accessible to everyone.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
        <CardContent className="p-6 overflow-y-auto flex-1" style={{ maxHeight: '65vh' }}>
          {/* College Info */}
          <div className="bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 dark:from-green-900/20 dark:via-blue-900/20 dark:to-purple-900/20 p-4 rounded-xl mb-6 border border-green-100 dark:border-green-800/30 relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-green-200/30 to-transparent rounded-full"></div>
            
            <div className="text-center relative z-10">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Monitor className="w-6 h-6 text-blue-600" />
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Academic Institution</h3>
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-white mb-3 leading-relaxed">
                Dr. Akhilesh Das Gupta Institute of Professional Studies
              </p>
              <div className="flex items-center justify-center gap-4 text-sm">
                <Badge variant="outline" className="text-sm px-3 py-1">
                  📝 Roll No: 02715611922
                </Badge>
                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                <div className="text-gray-500 dark:text-gray-400 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">Supervised by:</span>
                  </div>
                  <p className="mt-1">Prof. Dr. Archana Kumar, Mr. Ritesh Kumar & Ms. Meenu </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs - Horizontal Layout */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-2 gap-2">
              {(Object.entries(tabData) as Array<[keyof typeof tabData, typeof tabData[keyof typeof tabData]]>).map(([key, data]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 relative overflow-hidden min-w-[120px] ${
                    activeTab === key
                      ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-200 dark:shadow-green-900/50'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm'
                  }`}
                >
                  {/* Decorative element for active tab */}
                  {activeTab === key && (
                    <div className="absolute top-0 right-0 w-6 h-6 bg-white/20 rounded-full -translate-y-3 translate-x-3"></div>
                  )}
                  
                  <div className="flex flex-col items-center gap-2 relative z-10">
                    <div className={`p-2 rounded-lg ${activeTab === key ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-600'}`}>
                      {React.cloneElement(data.icon, { 
                        className: `w-5 h-5 ${activeTab === key ? 'text-white' : 'text-gray-600 dark:text-gray-400'}` 
                      })}
                    </div>
                    <span className="leading-tight">{data.title}</span>
                    {activeTab === key && (
                      <div className="w-8 h-1 bg-white/60 rounded-full"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 mb-6 min-h-[250px] border border-gray-100 dark:border-gray-600">
            <div className="animate-in fade-in-50 duration-500">
              <div className="flex items-start gap-6 mb-6">
                <div className="p-4 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-2xl shrink-0">
                  {React.cloneElement(tabData[activeTab].icon, { 
                    className: "w-8 h-8 text-green-600 dark:text-green-400" 
                  })}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-4 text-2xl flex items-center gap-3">
                    {tabData[activeTab].title}
                    <Sparkles className="w-6 h-6 text-yellow-500" />
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed mb-6">
                    {tabData[activeTab].content}
                  </p>
                  
                  {/* Highlights */}
                  {tabData[activeTab].highlights && (
                    <div className="space-y-4">
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
                        Key Highlights:
                      </p>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {tabData[activeTab].highlights.map((highlight, index) => (
                          <div 
                            key={index}
                            className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 bg-white/70 dark:bg-gray-600/30 rounded-xl p-4 border border-green-100 dark:border-green-800/30 hover:shadow-md transition-all duration-200"
                          >
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>{highlight}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Social Links - Only show in About Me tab */}
                  {activeTab === 'intro' && (
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-4">
                        Connect With Me:
                      </p>
                      <div className="flex gap-4">
                        <Button asChild size="lg" className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                          <a href="https://www.linkedin.com/in/kasak-batra/" target="_blank" rel="noopener noreferrer">
                            <Linkedin className="w-5 h-5 mr-3" />
                            LinkedIn
                            <TrendingUp className="w-4 h-4 ml-3" />
                          </a>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="flex-1 border-gray-300 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 transform hover:scale-105">
                          <a href="https://github.com/KASAKBATRA" target="_blank" rel="noopener noreferrer">
                            <Github className="w-5 h-5 mr-3" />
                            GitHub
                            <Code className="w-4 h-4 ml-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Tech Stack */}
          {activeTab === 'tech' && (
            <div className="mb-8">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {techStack.map((tech, index) => (
                  <div
                    key={index}
                    className={`text-center p-4 rounded-2xl bg-gradient-to-br ${tech.color} hover:shadow-xl transition-all duration-300 hover:scale-105 transform border border-white/20`}
                  >
                    <div className="text-3xl mb-3">{tech.icon}</div>
                    <h4 className="font-bold text-sm text-white mb-2">
                      {tech.name}
                    </h4>
                    <p className="text-xs text-white/80">
                      {tech.category}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-6 border-t border-gray-200 dark:border-gray-700 relative">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 text-transparent bg-clip-text">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  Final Year Project - NutriCaree+
                </p>
                <Heart className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                "Bridging Technology & Wellness for a Healthier Tomorrow"
              </p>
            </div>
          </div>
        </CardContent>
              </Card>
            </div>
          </div>
        </div>
        
        {/* Laptop Base */}
        <div className="bg-gray-700 h-6 rounded-b-3xl relative shadow-lg">
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-20 h-3 bg-gray-600 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;