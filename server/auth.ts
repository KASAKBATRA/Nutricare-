import bcrypt from 'bcryptjs';
import { storage } from './storage';
import { sendOTPEmail, generateOTP } from './email';
import { z } from 'zod';

// Validation schemas
export const registerSchema = z.object({
  role: z.enum(['user', 'nutritionist']).default('user'),
  // Common fields
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  // User fields
  age: z.number().min(13, 'Must be at least 13 years old').max(120, 'Invalid age').optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  // Nutritionist fields
  qualification: z.string().optional(),
  experience: z.number().min(0, 'Experience must be 0 or more').optional(),
  specialization: z.string().optional(),
  licenseNumber: z.string().optional(),
  consultationMode: z.string().optional(),
  availableSlots: z.string().optional(),
  consultationFee: z.number().min(0, 'Fee must be 0 or more').optional(),
  bio: z.string().optional(),
  languages: z.array(z.string()).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const otpVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function registerUser(userData: z.infer<typeof registerSchema>) {
  // Check if user already exists
  const existingUser = await storage.getUserByEmail(userData.email);
  if (existingUser) {
    // If user exists but not verified, resend OTP and instruct to verify
    if (!existingUser.isVerified) {
      const otp = generateOTP();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes expiry

      await storage.createOTP({
        email: userData.email.toLowerCase(),
        otp,
        type: 'registration',
        expiresAt,
      });

      await sendOTPEmail(userData.email, otp, 'registration');

      return { email: existingUser.email, resent: true, message: 'Please verify your email. OTP resent.' };
    }

    // Already verified
    throw new Error('User already exists.');
  }

  let user;
  if (userData.role === 'nutritionist') {
    // Create user with role nutritionist
    user = await storage.createUser({
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      age: 0, // Not required for nutritionist
      gender: '', // Not required for nutritionist
      role: 'nutritionist',
    });
    // Add nutritionist profile
    await storage.createNutritionist({
      userId: user.id,
      qualifications: userData.qualification || '',
      experience: userData.experience || 0,
      specialization: userData.specialization || '',
      licenseNumber: userData.licenseNumber || '',
      consultationMode: userData.consultationMode || '',
      availableSlots: userData.availableSlots || '',
      consultationFee: userData.consultationFee || 0,
      bio: userData.bio || '',
      languages: userData.languages ? userData.languages.join(',') : '',
    });
  } else {
    // Create regular user
    user = await storage.createUser({
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      age: userData.age || 0,
      gender: userData.gender || '',
      role: 'user',
    });
  }

  // Generate and send OTP
  const otp = generateOTP();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes expiry

  await storage.createOTP({
    email: userData.email.toLowerCase(),
    otp,
    type: 'registration',
    expiresAt,
  });

  await sendOTPEmail(userData.email, otp, 'registration');

  return { userId: user.id, email: user.email };
}

export async function verifyOTP(email: string, otp: string, type: string) {
  // Always trim and lowercase email, trim OTP
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otp.trim();
  const cleanType = type.trim().toLowerCase();
  const otpRecord = await storage.getValidOTP(cleanEmail, cleanOtp, cleanType);

  if (!otpRecord) {
    throw new Error('Invalid or expired OTP');
  }

  await storage.markOTPUsed(otpRecord.id);

  if (cleanType === 'registration') {
    const user = await storage.getUserByEmail(cleanEmail);
    if (user) {
      await storage.verifyUser(user.id);
      return { success: true, userId: user.id };
    }
  }

  return { success: true };
}

export async function loginUser(email: string, password: string) {
  const user = await storage.getUserByEmail(email);
  
  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (!user.isVerified) {
    throw new Error('Please verify your email before logging in');
  }

  if (!user.password) {
    throw new Error('Invalid account setup');
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  return user;
}

export async function initiatePasswordReset(email: string) {
  const user = await storage.getUserByEmail(email);
  
  if (!user) {
    throw new Error('No account found with this email address');
  }

  // Generate and send OTP
  const otp = generateOTP();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes expiry

  await storage.createOTP({
    email,
    otp,
    type: 'password_reset',
    expiresAt,
  });

  await sendOTPEmail(email, otp, 'password_reset');

  return { success: true };
}

export async function resetPassword(email: string, otp: string, newPassword: string) {
  const otpRecord = await storage.getValidOTP(email, otp, 'password_reset');
  
  if (!otpRecord) {
    throw new Error('Invalid or expired OTP');
  }

  const user = await storage.getUserByEmail(email);
  if (!user) {
    throw new Error('User not found');
  }

  await storage.markOTPUsed(otpRecord.id);
  await storage.updateUserPassword(user.id, newPassword);

  return { success: true };
}

export async function resendOTP(email: string, type: string) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = await storage.getUserByEmail(normalizedEmail);

  if (!user) {
    throw new Error('No account found with this email address');
  }

  // Generate new OTP
  const otp = generateOTP();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5);

  await storage.createOTP({
    email: normalizedEmail,
    otp,
    type,
    expiresAt,
  });

  await sendOTPEmail(normalizedEmail, otp, type as 'registration' | 'password_reset');

  return { success: true };
}