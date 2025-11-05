import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { FloatingElements } from '@/components/FloatingElements';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
});

type OTPForm = z.infer<typeof otpSchema>;

export default function VerifyOTP() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [email, setEmail] = useState('');
  const [type, setType] = useState('registration');

  const form = useForm<OTPForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: '',
    },
  });

  useEffect(() => {
    // Get email and type from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    const typeParam = urlParams.get('type');
    
    // Prefer URL param, fallback to localStorage saved during registration/login flows
    const storedEmail = localStorage.getItem('pending_email');
    const storedType = localStorage.getItem('pending_type');

    if (emailParam) setEmail(emailParam);
    else if (storedEmail) setEmail(storedEmail);
    if (typeParam) setType(typeParam);
    else if (storedType) setType(storedType);
    
    if (!emailParam) {
      toast({
        title: "Error",
        description: "Email parameter missing. Redirecting to login.",
        variant: "destructive",
      });
      setLocation('/login');
    }
  }, [setLocation, toast]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const onSubmit = async (data: OTPForm) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp: data.otp,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'OTP verification failed');
      }

      toast({
        title: "Verification Successful!",
        description: type === 'registration'
          ? "Your account has been verified. Please complete your calibration."
          : "Email verified. You can now reset your password.",
      });

        // Clear pending email/type on success
        try {
          localStorage.removeItem('pending_email');
          localStorage.removeItem('pending_type');
        } catch (e) {}

      // Redirect based on type
      if (type === 'registration') {
        setLocation('/calibration');
      } else {
        setLocation(`/reset-password?email=${encodeURIComponent(email)}`);
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Please check your OTP and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setIsResending(true);
    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          type,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to resend OTP');
      }

      // Ensure email is saved in localStorage so verification continues
      try {
        localStorage.setItem('pending_email', email);
        localStorage.setItem('pending_type', type);
      } catch (e) {}

      toast({
        title: "OTP Sent",
        description: "A new verification code has been sent to your email.",
      });

      setCountdown(60); // 60 second cooldown
      form.reset({ otp: '' });
    } catch (error: any) {
      toast({
        title: "Resend Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-nutricare-green/10 via-white to-nutricare-light/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <FloatingElements />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-nutricare-green to-nutricare-light rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-shield-alt text-white text-3xl"></i>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-nutricare-green to-nutricare-forest bg-clip-text text-transparent">
            Verify Your Email
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            We've sent a 6-digit code to
          </p>
          <p className="text-nutricare-green font-semibold">{email}</p>
        </div>

        {/* OTP Form */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Enter Verification Code
          </h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-center block">6-Digit Code</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        placeholder="123456"
                        className="h-16 text-center text-2xl font-bold tracking-widest"
                        maxLength={6}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading || form.watch('otp').length !== 6}
                className="w-full bg-nutricare-green hover:bg-nutricare-dark text-white py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 h-12"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  'Verify Code'
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center space-y-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Didn't receive the code?
            </p>
            
            <Button
              onClick={handleResendOTP}
              disabled={countdown > 0 || isResending}
              variant="outline"
              className="w-full"
            >
              {isResending ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-nutricare-green mr-2"></div>
                  Sending...
                </div>
              ) : countdown > 0 ? (
                `Resend in ${countdown}s`
              ) : (
                'Resend Code'
              )}
            </Button>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setLocation('/login')}
                className="text-gray-500 hover:text-nutricare-green transition-colors text-sm"
              >
                ← Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}