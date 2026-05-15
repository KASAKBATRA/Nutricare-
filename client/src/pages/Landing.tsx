import React from 'react';
import { useLocation } from 'wouter';
import { Layout } from '@/components/Layout';
import { useLanguage } from '@/context/LanguageContext';

export default function Landing() {
  const { t } = useLanguage();

  const handleLogin = () => {
    setLocation('/login');
  };

  const [, setLocation] = useLocation();

  return (
    <Layout showSidebar={false}>
      <div className="min-h-screen flex items-center justify-center p-3">
        <div className="max-w-5xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-6">
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 bg-gradient-to-r from-nutricare-green to-nutricare-light rounded-full flex items-center justify-center">
                <i className="fas fa-leaf text-white text-2xl"></i>
              </div>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="bg-gradient-to-r from-nutricare-green to-nutricare-forest bg-clip-text text-transparent">
                Smart Well
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              A NUTRITION AND WELLNESS MANAGEMENT SYSTEM
            </p>
            
            <p className="text-base text-gray-500 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
              Track your nutrition, connect with nutritionists, join a health-focused community, 
              and get personalized AI guidance in multiple languages.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                <i className="fas fa-utensils text-red-500 text-sm"></i>
              </div>
              <h3 className="text-sm font-semibold mb-1 text-gray-900 dark:text-white">Smart Food Logging</h3>
              <p className="text-gray-600 dark:text-gray-300 text-xs">
                Track meals with AI-powered nutrition analysis
              </p>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                <i className="fas fa-user-md text-blue-500 text-sm"></i>
              </div>
              <h3 className="text-sm font-semibold mb-1 text-gray-900 dark:text-white">Expert Consultations</h3>
              <p className="text-gray-600 dark:text-gray-300 text-xs">
                Book appointments with certified nutritionists
              </p>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                <i className="fas fa-users text-green-500 text-sm"></i>
              </div>
              <h3 className="text-sm font-semibold mb-1 text-gray-900 dark:text-white">Health Community</h3>
              <p className="text-gray-600 dark:text-gray-300 text-xs">
                Connect with like-minded health enthusiasts
              </p>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                <i className="fas fa-robot text-purple-500 text-sm"></i>
              </div>
              <h3 className="text-sm font-semibold mb-1 text-gray-900 dark:text-white">AI Assistant</h3>
              <p className="text-gray-600 dark:text-gray-300 text-xs">
                Get instant nutrition answers in your language
              </p>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                <i className="fas fa-chart-line text-orange-500 text-sm"></i>
              </div>
              <h3 className="text-sm font-semibold mb-1 text-gray-900 dark:text-white">Progress Tracking</h3>
              <p className="text-gray-600 dark:text-gray-300 text-xs">
                Monitor health metrics with detailed reports
              </p>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                <i className="fas fa-globe text-indigo-500 text-sm"></i>
              </div>
              <h3 className="text-sm font-semibold mb-1 text-gray-900 dark:text-white">Multi-Language Support</h3>
              <p className="text-gray-600 dark:text-gray-300 text-xs">
                Use in Hindi, Urdu, Punjabi, Marathi, Gujarati, English
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-nutricare-green to-nutricare-light p-6 rounded-xl text-white">
            <h2 className="text-xl font-bold mb-2">Ready to start your health journey?</h2>
            <p className="text-base mb-4 opacity-90">
              Join thousands of users living healthier lives with Smart Well
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={handleLogin}
                className="bg-white text-nutricare-green px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Get Started Free
              </button>
              
              <button
                onClick={() => setLocation('/register')}
                className="bg-transparent border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-nutricare-green transition-all duration-200"
              >
                Create Account
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">&copy; 2024 Smart Well. Empowering healthy lifestyles worldwide.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
