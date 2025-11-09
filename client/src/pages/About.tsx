import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Github, Linkedin, ExternalLink, Star, Users, Target, Search, Code, User } from 'lucide-react';

const About = () => {
  const [activeTab, setActiveTab] = useState('problem');
  const tabData = {
    problem: {
      icon: <Target className="w-5 h-5" />,
      title: "Problem",
      content: "Many users struggle to maintain healthy diets because existing tools focus narrowly on calorie counting and lack personalization for real home-cooking practices. Key gaps: inconsistent portion measurement (utensils), variable cooking methods, limited access to certified nutritionists, poor multilingual support, and weak motivation/community features. These gaps make practical, reliable nutrition tracking difficult for everyday people."
    },
    solution: {
      icon: <Star className="w-5 h-5" />,
      title: "Solution",
      content: "NutriCare++ is a full‑stack nutrition companion that combines automated nutrition estimation, personalized baselines, expert consultations, and community motivation. It uses Nutritionix for food data, a learned per-user baseline to improve accuracy, Utensil calibration to map bowls/spoons to grams, an AI-powered multilingual chatbot (OpenAI) for guidance, and an appointments/reports system to connect users with nutritionists. The result is a practical, privacy-conscious tool for real-world eating habits."
    },
    usp: {
      icon: <Users className="w-5 h-5" />,
      title: "Unique Value (USP)",
      content: "Unlike single-purpose calorie trackers, NutriCare++ fuses: personalized calorie baselines (learned from user data), utensil calibration for realistic portioning, integrated nutritionist appointments & professional reports, multilingual AI assistance, and a social feed for accountability. This makes it useful for both individual self-monitoring and clinical/consultation contexts."
    },
    research: {
      icon: <Search className="w-5 h-5" />,
      title: "Research & Motivation",
      content: "Literature showed most consumer apps emphasize calorie logging without adapting to regional recipes or home-cooking variance. NutriCare++ targets that gap by combining nutrition APIs with per-user learning and nutritionist workflows so recommendations are practical and locally relevant."
    },
    tech: {
      icon: <Code className="w-5 h-5" />,
      title: "Tech Stack",
      content: "Frontend: React + Vite + TypeScript + TailwindCSS. Backend: Node.js + Express (TypeScript). DB: PostgreSQL via Drizzle ORM (Neon). Nutrition data: Nutritionix API. AI: OpenAI (chat & nutrition analysis) with optional local Python fallback. OCR: Tesseract.js. Sessions: Postgres-backed express-session. Build tooling: Vite, esbuild, drizzle-kit for migrations."
    }
  };

  const techStack = [
    { name: "React", category: "Frontend" },
    { name: "Vite", category: "Build" },
    { name: "TypeScript", category: "Language" },
    { name: "TailwindCSS", category: "Styling" },
    { name: "Node.js / Express", category: "Backend" },
    { name: "Drizzle ORM", category: "ORM" },
    { name: "PostgreSQL (Neon)", category: "Database" },
    { name: "Nutritionix API", category: "Data" },
    { name: "OpenAI API", category: "AI" },
    { name: "Tesseract.js", category: "OCR" },
    { name: "Radix UI", category: "UI" },
    { name: "Framer Motion", category: "Animations" },
    { name: "@tanstack/react-query", category: "Data fetching" },
    { name: "Recharts", category: "Charts" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-500 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              Meet the Developer – Kasak
            </h1>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              Creating innovative health solutions through AI and community-driven design
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Developer Introduction Section */}
        <Card className="mb-12 overflow-hidden shadow-2xl border-0">
          <CardContent className="p-0">
            <div className="grid md:grid-cols-2 gap-0">
              {/* Photo Section */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center p-12">
                <div className="text-center">
                  <div className="w-48 h-48 mx-auto mb-6 rounded-full bg-white/20 flex items-center justify-center shadow-2xl">
                    <User className="w-24 h-24 text-white/80" />
                  </div>
                  <div className="text-white">
                    <h2 className="text-3xl font-bold mb-2">Kasak</h2>
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                      Lead Developer
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Info Section */}
              <div className="p-8 md:p-12 bg-white dark:bg-gray-800">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                      Student Details
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Program</p>
                          <p className="text-gray-600 dark:text-gray-300">B.Tech Artificial Intelligence and Data Science (4th Year)</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Roll Number</p>
                          <p className="text-gray-600 dark:text-gray-300">02715611922</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Supervision</p>
                          <p className="text-gray-600 dark:text-gray-300">Prof. Dr. Archana Kumar, Mr. Ritesh Kumar (Assistant Professor), and Ms. Meenu</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className="flex gap-4 pt-4">
                    <Button asChild variant="outline" size="sm" className="hover:bg-green-50 hover:border-green-300">
                      <a href="https://www.linkedin.com/in/kasak-batra/" target="_blank" rel="noopener noreferrer">
                        <Linkedin className="w-4 h-4 mr-2" />
                        LinkedIn
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="hover:bg-green-50 hover:border-green-300">
                      <a href="https://github.com/KASAKBATRA" target="_blank" rel="noopener noreferrer">
                        <Github className="w-4 h-4 mr-2" />
                        GitHub
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Information Tabs */}
        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-green-500 to-green-400 text-white">
            <CardTitle className="text-2xl text-center">NutriCare++ Project Information</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Tab Navigation */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 overflow-x-auto">
                <TabsList className="grid w-full grid-cols-5 bg-white dark:bg-gray-700 rounded-lg p-1">
                  {Object.entries(tabData).map(([key, data]) => (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="flex items-center gap-2 text-sm data-[state=active]:bg-green-500 data-[state=active]:text-white transition-all duration-300"
                    >
                      {data.icon}
                      <span className="hidden sm:inline">{data.title}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* Tab Content */}
              <div className="p-8">
                {Object.entries(tabData).map(([key, data]) => (
                  <TabsContent
                    key={key}
                    value={key}
                    className="mt-0 focus:outline-none"
                  >
                    <div className="animate-in fade-in-50 duration-500">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          {React.cloneElement(data.icon, { className: "w-6 h-6 text-green-600 dark:text-green-400" })}
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {data.title}
                        </h3>
                      </div>
                      <div className="prose prose-lg max-w-none dark:prose-invert">
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-justify">
                          {data.content.split(', ').map((sentence, index) => (
                            <span key={index}>
                              {sentence}
                              {index < data.content.split(', ').length - 1 && (
                                <>
                                  <br />
                                  <span className="inline-block w-4"></span>•{' '}
                                </>
                              )}
                            </span>
                          ))}
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Tech Stack Visual */}
        {activeTab === 'tech' && (
          <Card className="mt-8 shadow-xl border-0">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              <CardTitle className="text-xl text-center">Technology Stack Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {techStack.map((tech, index) => (
                  <div
                    key={index}
                    className="text-center p-4 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:shadow-md transition-all duration-300 hover:scale-105"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Code className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                      {tech.name}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {tech.category}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg p-6">
            <p className="text-lg font-medium mb-2">
              Developed as part of B.Tech AI & DS Final Year Project
            </p>
            <p className="opacity-90">
              A comprehensive health and nutrition platform designed to bridge technology and wellness
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <Button asChild variant="secondary" size="sm">
                <a href="https://www.linkedin.com/in/kasak-batra/" target="_blank" rel="noopener noreferrer">
                  <Linkedin className="w-4 h-4 mr-2" />
                  Connect on LinkedIn
                  <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <a href="https://github.com/KASAKBATRA" target="_blank" rel="noopener noreferrer">
                  <Github className="w-4 h-4 mr-2" />
                  View on GitHub
                  <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;