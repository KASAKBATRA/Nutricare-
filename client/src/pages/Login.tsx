import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { FloatingElements } from '@/components/FloatingElements';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<'user' | 'nutritionist'>('user');

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ ...data, role }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Login failed');
      }

      toast({
        title: "Welcome back!",
        description: "Login successful. Redirecting to dashboard...",
      });

      // Invalidate auth queries to refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      // Redirect to dashboard
      setTimeout(() => {
        setLocation('/');
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const email = form.getValues('email');
    if (!email) {
      toast({ title: 'Email required', description: 'Please enter your email to resend verification code.', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'registration' }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to resend code');

      // Persist pending email and redirect to verification
      try {
        localStorage.setItem('pending_email', email.toLowerCase());
        localStorage.setItem('pending_type', 'registration');
      } catch (e) {}

      toast({ title: 'OTP Sent', description: 'Verification code resent. Please check your email.' });
      setLocation(`/verify-otp?email=${encodeURIComponent(email)}&type=registration`);
    } catch (err: any) {
      toast({ title: 'Resend Failed', description: err.message || 'Please try again later.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-nutricare-green/10 via-white to-nutricare-light/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <FloatingElements />
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-nutricare-green to-nutricare-light rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-leaf text-white text-3xl"></i>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-nutricare-green to-nutricare-forest bg-clip-text text-transparent">
            NutriCare++
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome back to your health journey</p>
        </div>

        {/* Role Selection Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-white dark:bg-gray-700 rounded-full shadow p-1 flex border border-nutricare-green">
            <button
              type="button"
              className={`px-6 py-2 rounded-full font-semibold focus:outline-none transition-colors duration-200 ${role === 'user' ? 'bg-nutricare-green text-white' : 'text-nutricare-green'}`}
              onClick={() => setRole('user')}
            >
              User
            </button>
            <button
              type="button"
              className={`px-6 py-2 rounded-full font-semibold focus:outline-none transition-colors duration-200 ${role === 'nutritionist' ? 'bg-nutricare-green text-white' : 'text-nutricare-green'}`}
              onClick={() => setRole('nutritionist')}
            >
              Nutritionist
            </button>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Sign In
          </h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="john@example.com" 
                        {...field}
                        className="h-12"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field}
                        className="h-12"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-nutricare-green hover:bg-nutricare-dark text-white py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 h-12"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Signing In...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 space-y-4">
            <div className="text-center">
              <button
                onClick={() => setLocation('/forgot-password')}
                className="text-nutricare-green hover:text-nutricare-dark font-medium transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <div className="text-center">
              <button
                onClick={handleResendVerification}
                className="text-nutricare-green hover:text-nutricare-dark font-medium transition-colors"
              >
                Resend verification code
              </button>
            </div>
            
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <button
                  onClick={() => setLocation('/register')}
                  className="text-nutricare-green hover:text-nutricare-dark font-semibold transition-colors"
                >
                  Register here
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}