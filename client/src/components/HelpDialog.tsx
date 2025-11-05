import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/context/LanguageContext';

interface HelpDialogProps {
  children: React.ReactNode;
}

export function HelpDialog({ children }: HelpDialogProps) {
  const { t } = useLanguage();

  const helpSections = [
    {
      title: "Dashboard",
      icon: "fas fa-tachometer-alt",
      color: "bg-blue-500",
      features: [
        "Daily nutrition tracking and calorie monitoring",
        "BMI calculator and weight logging",
        "Meal suggestions and planning",
        "Quick access to all app features",
        "Visual charts and progress tracking"
      ]
    },
    {
      title: "Food Log",
      icon: "fas fa-utensils",
      color: "bg-green-500",
      features: [
        "Log meals with detailed nutrition information",
          "Photo-based portion estimation",
        "Food database search",
        "Meal history and analytics"
      ]
    },
    {
      title: "Stress Management",
      icon: "fas fa-heart",
      color: "bg-red-500",
      features: [
        "Stress level tracking and monitoring",
        "Mindfulness and meditation guides",
        "Stress-nutrition correlation analysis",
        "Activity suggestions for stress relief",
        "AI-powered stress advisor"
      ]
    },
    {
      title: "Community",
      icon: "fas fa-users",
      color: "bg-purple-500",
      features: [
        "Share your health journey with others",
        "Connect with like-minded individuals",
        "Share photos and progress updates",
        "Get motivation from community members",
        "Join health challenges and discussions"
      ]
    },
    {
      title: "Appointments",
      icon: "fas fa-calendar-check",
      color: "bg-orange-500",
      features: [
        "Schedule consultations with nutritionists",
        "Manage your appointment calendar",
        "Get personalized nutrition advice",
        "Track appointment history",
        "Receive reminders and notifications"
      ]
    },
    {
      title: "Friends",
      icon: "fas fa-user-friends",
      color: "bg-pink-500",
      features: [
        "Connect with friends on their health journey",
        "Share progress and achievements",
        "Challenge friends to health goals",
        "Support each other's wellness goals",
        "Private messaging and encouragement"
      ]
    },
    {
      title: "Reports",
      icon: "fas fa-chart-line",
      color: "bg-indigo-500",
      features: [
        "Comprehensive health analytics",
        "Weekly and monthly progress reports",
        "Nutrition trend analysis",
        "Goal achievement tracking",
        "Downloadable health summaries"
      ]
    }
  ];

  const smartFeatures = [
    {
      title: "AI Chatbot",
      description: "Get instant nutrition advice and meal suggestions from our AI assistant",
      icon: "fas fa-robot"
    },
    {
      title: "Portion Estimation",
      description: "Use your phone camera to estimate portion sizes accurately",
      icon: "fas fa-expand-arrows-alt"
    },
    {
      title: "Multi-language Support",
      description: "Available in Hindi, Urdu, Punjabi, Marathi, Gujarati, and English",
      icon: "fas fa-globe"
    },
    {
      title: "Dark Mode",
      description: "Switch between light and dark themes for comfortable viewing",
      icon: "fas fa-moon"
    }
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <i className="fas fa-question-circle text-nutricare-green"></i>
            NutriCare++ Help & Features
          </DialogTitle>
          <DialogDescription>
            Complete guide to all features and capabilities of NutriCare++
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* App Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="fas fa-leaf text-nutricare-green"></i>
                About NutriCare++
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                NutriCare++ is a comprehensive smart health and nutrition companion designed to help you achieve your wellness goals. 
                Our platform combines AI-powered insights, community support, and professional guidance to make healthy living easier and more enjoyable.
              </p>
            </CardContent>
          </Card>

          {/* Main Features */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <i className="fas fa-star text-yellow-500"></i>
              Main Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {helpSections.map((section, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className={`w-8 h-8 ${section.color} rounded-full flex items-center justify-center text-white text-sm`}>
                        <i className={section.icon}></i>
                      </div>
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {section.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-2 text-sm">
                          <i className="fas fa-check text-green-500 mt-1 text-xs"></i>
                          <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Smart Features */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <i className="fas fa-magic text-purple-500"></i>
              Smart Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {smartFeatures.map((feature, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-nutricare-green to-nutricare-light rounded-full flex items-center justify-center text-white">
                        <i className={feature.icon}></i>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{feature.title}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Getting Started */}
          <Card className="bg-gradient-to-r from-nutricare-green/10 to-nutricare-light/10 border-nutricare-green/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="fas fa-rocket text-nutricare-green"></i>
                Getting Started
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Quick Start Guide:</h4>
                  <ol className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">1</Badge>
                      <span>Complete your profile and set health goals</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">2</Badge>
                      <span>Start logging your meals and water intake</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">3</Badge>
                      <span>Explore the AI chatbot for personalized advice</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">4</Badge>
                      <span>Connect with the community for motivation</span>
                    </li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Pro Tips:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <i className="fas fa-lightbulb text-yellow-500 mt-1"></i>
                      <span>Use quick add to log nutrition facts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <i className="fas fa-lightbulb text-yellow-500 mt-1"></i>
                      <span>Set daily reminders to stay consistent</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <i className="fas fa-lightbulb text-yellow-500 mt-1"></i>
                      <span>Check your reports weekly to track progress</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <i className="fas fa-lightbulb text-yellow-500 mt-1"></i>
                      <span>Book nutritionist appointments for expert guidance</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="fas fa-headset text-blue-500"></i>
                Need More Help?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-4 border rounded-lg">
                  <i className="fas fa-robot text-2xl text-nutricare-green mb-2"></i>
                  <h4 className="font-semibold">AI Assistant</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Ask our AI chatbot for instant help</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <i className="fas fa-users text-2xl text-blue-500 mb-2"></i>
                  <h4 className="font-semibold">Community</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Get help from other users</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <i className="fas fa-user-md text-2xl text-green-500 mb-2"></i>
                  <h4 className="font-semibold">Nutritionist</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Book professional consultation</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}