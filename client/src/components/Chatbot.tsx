import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/context/LanguageContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export function Chatbot({ isOpen, onClose }: ChatbotProps) {
  const { isAuthenticated } = useAuth();
  const { language, t } = useLanguage();
  const [input, setInput] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Get or create conversation
  const { data: conversations } = useQuery<{ id: string }[]>({
    queryKey: ['/api/chat/conversations'],
    enabled: isAuthenticated,
  });

  const { data: messages } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat/conversations', currentConversationId, 'messages'],
    enabled: isAuthenticated && !!currentConversationId,
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/chat/conversations', {
        title: 'New Chat',
        language,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentConversationId(data.id);
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', `/api/chat/conversations/${currentConversationId}/messages`, {
        content: message,
        language,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/chat/conversations', currentConversationId, 'messages'],
      });
      setInput('');
    },
  });

  // Initialize conversation when chatbot opens
  useEffect(() => {
    if (isOpen && isAuthenticated && !currentConversationId) {
      if (conversations && conversations.length > 0) {
        setCurrentConversationId(conversations[0].id);
      } else {
        createConversationMutation.mutate();
      }
    }
  }, [isOpen, isAuthenticated, conversations, currentConversationId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentConversationId) return;

    sendMessageMutation.mutate(input);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 left-4 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-nutricare-green to-nutricare-light rounded-full flex items-center justify-center">
            <i className="fas fa-robot text-white text-sm"></i>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('chatbot.title')}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      <div className="h-64 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/50">
        <div className="space-y-3">
          {/* Initial message */}
          {(!messages || messages.length === 0) && (
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-nutricare-green to-nutricare-light rounded-full flex items-center justify-center mt-1">
                <i className="fas fa-robot text-white text-xs"></i>
              </div>
              <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm max-w-56">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {t('chatbot.initial')}
                </p>
              </div>
            </div>
          )}
          
          {/* Chat messages */}
          {messages?.map((message: ChatMessage) => (
            <div
              key={message.id}
              className={`flex items-start space-x-2 ${
                message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-6 h-6 bg-gradient-to-r from-nutricare-green to-nutricare-light rounded-full flex items-center justify-center mt-1">
                  <i className="fas fa-robot text-white text-xs"></i>
                </div>
              )}
              {message.role === 'user' && (
                <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center mt-1">
                  <i className="fas fa-user text-white text-xs"></i>
                </div>
              )}
              <div
                className={`p-3 rounded-lg shadow-sm max-w-56 ${
                  message.role === 'user'
                    ? 'bg-nutricare-green text-white'
                    : 'bg-white dark:bg-gray-700'
                }`}
              >
                <p
                  className={`text-sm ${
                    message.role === 'user'
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {message.content}
                </p>
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {sendMessageMutation.status === 'pending' && (
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-nutricare-green to-nutricare-light rounded-full flex items-center justify-center mt-1">
                <i className="fas fa-robot text-white text-xs"></i>
              </div>
              <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
  <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('chatbot.placeholder')}
            disabled={!isAuthenticated || sendMessageMutation.status === 'pending'}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-nutricare-green text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || !isAuthenticated || sendMessageMutation.status === 'pending'}
            className="px-4 py-2 bg-nutricare-green text-white rounded-lg hover:bg-nutricare-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  );
}
