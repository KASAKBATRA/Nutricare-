import React, { useState } from 'react';
import { NutritionistRegisterForm } from './NutritionistRegisterForm';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { FloatingElements } from '@/components/FloatingElements';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  age: z.number().min(13, 'Must be at least 13 years old').max(120, 'Invalid age'),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<'user' | 'nutritionist'>('user');

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      age: 25,
      gender: 'prefer_not_to_say',
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      // Ensure age is a number before sending
      const payload = { ...data, age: Number(data.age) };
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      // Persist pending email/type so user can continue verification even after navigation/back
      try {
        localStorage.setItem('pending_email', data.email.toLowerCase());
        localStorage.setItem('pending_type', 'registration');
      } catch (e) {
        // ignore localStorage errors
      }

      toast({
        title: (result.resent ? 'Continue Verification' : 'Registration Successful!'),
        description: result.message || "Please check your email for the verification code.",
      });

      // Redirect to OTP verification with email
      setLocation(`/verify-otp?email=${encodeURIComponent(data.email)}&type=registration`);
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-nutricare-green/10 via-white to-nutricare-light/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <FloatingElements />
  <div className="w-full max-w-3xl relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-nutricare-green to-nutricare-light rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-leaf text-white text-3xl"></i>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-nutricare-green to-nutricare-forest bg-clip-text text-transparent">
            NutriCare++
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Create your health journey account</p>
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

        {/* Registration Form */}
  <div className="bg-transparent backdrop-blur-3xl rounded-3xl shadow-2xl border border-white/30 p-16" style={{ boxShadow: '0 20px 80px 0 rgba(31, 38, 135, 0.60)', border: '2.5px solid rgba(255,255,255,0.30)', backgroundClip: 'padding-box' }}>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            {role === 'user' ? 'Create User Account' : 'Create Nutritionist Account'}
          </h2>

          {/* Render User or Nutritionist form based on role */}
          {role === 'user' ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* ...existing user form fields... */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl><Input placeholder="John" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl><Input placeholder="Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="age" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl><Input type="number" placeholder="25" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="gender" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={isLoading} className="w-full bg-nutricare-green hover:bg-nutricare-dark text-white py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105">
                  {isLoading ? (<div className="flex items-center justify-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>Creating Account...</div>) : ('Create Account')}
                </Button>
              </form>
            </Form>
          ) : (
            // Nutritionist Registration Form with OTP flow
            <NutritionistRegisterForm setLocation={setLocation} toast={toast} isLoading={isLoading} setIsLoading={setIsLoading} />
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <button
                onClick={() => setLocation('/login')}
                className="text-nutricare-green hover:text-nutricare-dark font-semibold transition-colors"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}