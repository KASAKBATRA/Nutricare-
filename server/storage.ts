import {
  users,
  otpVerifications,
  userProfiles,
  nutritionGoals,
  foodLogs,
  moodLogs,
  waterLogs,
  weightLogs,
  nutritionists,
  nutritionistSchedule,
  appointments,
  communityPosts,
  postLikes,
  postComments,
  friendships,
  notifications,
  consultationNotes,
  appointmentFeedback,
  auditLogs,
  chatConversations,
  chatMessages,
  foodItems,
  userMealBaselines,
  userUtensilMapping,
  type User,
  type UpsertUser,
  type OtpVerification,
  type InsertOtp,
  type UserProfile,
  type InsertUserProfile,
  type FoodLog,
  type InsertFoodLog,
  type MoodLog,
  type InsertMoodLog,
  type WaterLog,
  type InsertWaterLog,
  type WeightLog,
  type InsertWeightLog,
  type Appointment,
  type InsertAppointment,
  type CommunityPost,
  type InsertCommunityPost,
  type Notification,
  type InsertNotification,
  type ChatConversation,
  type ChatMessage,
  type InsertChatMessage,
  type Nutritionist,
  type FoodItem,
  type UserUtensilMapping,
  type InsertUserUtensilMapping,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, gte, lte, count, sql, gt } from "drizzle-orm";
import bcrypt from 'bcryptjs';

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    age: number;
    gender: string;
    role?: string;
  }): Promise<User>;
  verifyUser(userId: string): Promise<void>;
  updateUserPassword(userId: string, newPassword: string): Promise<void>;
  
  // OTP operations
  createOTP(otpData: InsertOtp): Promise<OtpVerification>;
  getValidOTP(email: string, otp: string, type: string): Promise<OtpVerification | undefined>;
  markOTPUsed(id: string): Promise<void>;
  cleanupExpiredOTPs(): Promise<void>;
  
  // User profile operations
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  
  // Food logging
  getFoodLogs(userId: string, date?: Date): Promise<FoodLog[]>;
  createFoodLog(foodLog: InsertFoodLog): Promise<FoodLog>;
  deleteFoodLog(logId: string, userId: string): Promise<void>;
  updateFoodLog(logId: string, userId: string, updateData: Partial<InsertFoodLog>): Promise<void>;
  getFoodItems(search?: string): Promise<FoodItem[]>;
  createOrGetFoodItem(name: string, nutritionPer100g: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  }): Promise<FoodItem>;
  getDailyNutritionSummary(userId: string, date?: Date): Promise<{
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    meals: FoodLog[];
  }>;
  
  // Mood logging
  createMoodLog(moodLog: InsertMoodLog): Promise<MoodLog>;
  getMoodLogs(userId: string, foodLogId?: string): Promise<MoodLog[]>;
  
  // Water logging
  getWaterLogs(userId: string, date?: Date): Promise<WaterLog[]>;
  createWaterLog(waterLog: InsertWaterLog): Promise<WaterLog>;
  
  // Weight tracking
  getWeightLogs(userId: string, limit?: number): Promise<WeightLog[]>;
  createWeightLog(weightLog: InsertWeightLog): Promise<WeightLog>;
  
  // Appointments
  getAppointments(userId: string): Promise<Appointment[]>;
  getNutritionistAppointments(nutritionistId: string): Promise<Appointment[]>;
  getAppointmentById(id: string): Promise<Appointment | undefined>;
  updateAppointmentSchedule(id: string, scheduledAt: Date): Promise<void>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(id: string, status: string): Promise<void>;
  getNutritionists(): Promise<Nutritionist[]>;
  createNutritionist(nutritionist: any): Promise<Nutritionist>;

  // Scheduling & consultations
  createScheduleSlot(nutritionistId: string, date: Date, startTime: Date, endTime: Date): Promise<any>;
  getNutritionistSchedule(nutritionistId: string, fromDate?: Date): Promise<any[]>;
  getAvailableSlots(nutritionistId: string, fromDate?: Date, days?: number): Promise<any[]>;
  bookAppointment(appointmentData: any): Promise<any>;
  addConsultationNotes(appointmentId: string, nutritionistId: string, summary: string, recommendations?: string): Promise<any>;
  addAppointmentFeedback(appointmentId: string, rating: number, reviewText?: string): Promise<any>;
  logAudit(userId: string | null, action: string, meta?: any): Promise<void>;
  
  // Community
  getCommunityPosts(limit?: number): Promise<(CommunityPost & { user: User; isLiked?: boolean })[]>;
  createCommunityPost(post: InsertCommunityPost): Promise<CommunityPost>;
  togglePostLike(userId: string, postId: string): Promise<void>;
  getPostComments(postId: string): Promise<any[]>;
  createPostComment(userId: string, postId: string, content: string): Promise<void>;
  
  // Friends
  getFriends(userId: string): Promise<User[]>;
  sendFriendRequest(followerId: string, followingId: string): Promise<void>;
  acceptFriendRequest(followerId: string, followingId: string): Promise<void>;
  getFriendActivity(userId: string): Promise<any[]>;
  removeFriendship(userA: string, userB: string): Promise<void>;
  getMutualFriends(userId: string): Promise<User[]>;
  getDiscoverCandidates(userId: string): Promise<any[]>;
  
  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;
  
  // Chat
  getChatConversations(userId: string): Promise<ChatConversation[]>;
  createChatConversation(userId: string, title?: string, language?: string): Promise<ChatConversation>;
  getChatMessages(conversationId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Utensil calibration
  saveUtensilCalibration(userId: string, utensilType: string, gramsPerUnit: number): Promise<UserUtensilMapping>;
  getUtensilCalibration(userId: string): Promise<UserUtensilMapping[]>;
  // Personal baselines
  getUserMealBaseline(userId: string, mealName: string): Promise<any | undefined>;
  upsertUserMealBaseline(userId: string, mealName: string, baselineCalories: number, sampleCount?: number): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    age: number;
    gender: string;
    role?: string;
  }): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        age: userData.age,
        gender: userData.gender,
        role: userData.role || 'user',
        profileImageUrl: null, // Set to null by default
        isVerified: false,
      })
      .returning();
    return user;
  }

  async verifyUser(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ isVerified: true, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // OTP operations
  async createOTP(otpData: InsertOtp): Promise<OtpVerification> {
    const now = new Date();
    const normalizedEmail = String(otpData.email || '').trim().toLowerCase();

    // Cleanup expired OTPs for this email/type first
    await db
      .delete(otpVerifications)
      .where(
        and(
          eq(otpVerifications.email, normalizedEmail),
          eq(otpVerifications.type, otpData.type),
          lte(otpVerifications.expiresAt, now)
        )
      );

    // Look for an existing active OTP for this email and type
    const [existing] = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.email, normalizedEmail),
          eq(otpVerifications.type, otpData.type),
          eq(otpVerifications.isUsed, false),
          gt(otpVerifications.expiresAt, now)
        )
      )
      .orderBy(desc(otpVerifications.createdAt))
      .limit(1);

    if (existing) {
      const maxResends = 3;
      const currentResends = Number(existing.resendCount || 0);
      if (currentResends >= maxResends) {
        throw new Error('Maximum resend attempts reached. Please try again later.');
      }

      // Update existing OTP record with a new code and increment resend count
      const [updated] = await db
        .update(otpVerifications)
        .set({
          otp: otpData.otp,
          expiresAt: otpData.expiresAt,
          resendCount: sql`${otpVerifications.resendCount} + 1`,
          createdAt: new Date(),
          isUsed: false,
        })
        .where(eq(otpVerifications.id, existing.id))
        .returning();

      return updated;
    }

    // Create a fresh OTP record
    const [otp] = await db.insert(otpVerifications).values({
      ...otpData,
      email: normalizedEmail,
      resendCount: 1,
    }).returning();

    return otp;
  }

  async getValidOTP(email: string, otp: string, type: string): Promise<OtpVerification | undefined> {
    const [otpRecord] = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.email, email),
          eq(otpVerifications.otp, otp),
          eq(otpVerifications.type, type),
          eq(otpVerifications.isUsed, false),
          gt(otpVerifications.expiresAt, new Date())
        )
      );
    return otpRecord;
  }

  async markOTPUsed(id: string): Promise<void> {
    await db
      .update(otpVerifications)
      .set({ isUsed: true })
      .where(eq(otpVerifications.id, id));
  }

  async cleanupExpiredOTPs(): Promise<void> {
    await db
      .delete(otpVerifications)
      .where(lte(otpVerifications.expiresAt, new Date()));
  }

  // User profile operations
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile;
  }

  async upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [userProfile] = await db
      .insert(userProfiles)
      .values(profile)
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          ...profile,
          updatedAt: new Date(),
        },
      })
      .returning();
    return userProfile;
  }

  // Food logging
  async getFoodLogs(userId: string, date?: Date): Promise<FoodLog[]> {
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      return await db
        .select()
        .from(foodLogs)
        .where(
          and(
            eq(foodLogs.userId, userId),
            gte(foodLogs.date, startOfDay),
            lte(foodLogs.date, endOfDay)
          )
        )
        .orderBy(desc(foodLogs.loggedAt));
    }

    return await db
      .select()
      .from(foodLogs)
      .where(eq(foodLogs.userId, userId))
      .orderBy(desc(foodLogs.loggedAt));
  }

  async createFoodLog(foodLog: InsertFoodLog): Promise<FoodLog> {
    const [log] = await db.insert(foodLogs).values(foodLog).returning();
    return log;
  }

  async deleteFoodLog(logId: string, userId: string): Promise<void> {
    await db.delete(foodLogs)
      .where(and(eq(foodLogs.id, logId), eq(foodLogs.userId, userId)));
  }

  async updateFoodLog(logId: string, userId: string, updateData: Partial<InsertFoodLog>): Promise<void> {
    await db.update(foodLogs)
      .set(updateData)
      .where(and(eq(foodLogs.id, logId), eq(foodLogs.userId, userId)));
  }

  async getFoodItems(search?: string): Promise<FoodItem[]> {
    if (search) {
      return await db.select().from(foodItems)
        .where(
          or(
            sql`${foodItems.name} ILIKE ${`%${search}%`}`,
            sql`${foodItems.brand} ILIKE ${`%${search}%`}`
          )
        )
        .limit(50);
    }
    
    return await db.select().from(foodItems).limit(50);
  }

  // Personal baselines
  async getUserMealBaseline(userId: string, mealName: string): Promise<any | undefined> {
    try {
      const [row] = await db.select().from(userMealBaselines).where(
        and(
          eq(userMealBaselines.userId, userId),
          sql`${userMealBaselines.mealName} ILIKE ${mealName}`
        )
      ).limit(1);
      return row;
    } catch (error: any) {
      if (error.code === '42P01') {
        // table doesn't exist yet
        return undefined;
      }
      throw error;
    }
  }

  async upsertUserMealBaseline(userId: string, mealName: string, baselineCalories: number, sampleCount = 0): Promise<any> {
    // Try to find existing
    const [existing] = await db.select().from(userMealBaselines).where(
      and(
        eq(userMealBaselines.userId, userId),
        sql`${userMealBaselines.mealName} ILIKE ${mealName}`
      )
    ).limit(1);

    if (existing) {
      const [updated] = await db.update(userMealBaselines)
        .set({ baselineCalories: baselineCalories.toString(), sampleCount, updatedAt: new Date() })
        .where(eq(userMealBaselines.id, existing.id))
        .returning();
      return updated;
    } else {
      const [inserted] = await db.insert(userMealBaselines).values({
        userId,
        mealName: mealName.toLowerCase(),
        baselineCalories: baselineCalories.toString(),
        sampleCount,
      }).returning();
      return inserted;
    }
  }

  async createOrGetFoodItem(name: string, nutritionPer100g: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  }): Promise<FoodItem> {
    // Try to find existing food item by name
    const [existingItem] = await db
      .select()
      .from(foodItems)
      .where(sql`${foodItems.name} ILIKE ${name.toLowerCase()}`)
      .limit(1);

    if (existingItem) {
      return existingItem;
    }

    // Create new food item if not found
    const [newItem] = await db
      .insert(foodItems)
      .values({
        name: name.toLowerCase(),
        caloriesPer100g: nutritionPer100g.calories.toString(),
        proteinPer100g: nutritionPer100g.protein.toString(),
        carbsPer100g: nutritionPer100g.carbs.toString(),
        fatsPer100g: nutritionPer100g.fats.toString(),
        fiberPer100g: nutritionPer100g.fiber?.toString() || "0",
        sugarPer100g: nutritionPer100g.sugar?.toString() || "0",
        sodiumPer100g: nutritionPer100g.sodium?.toString() || "0",
      })
      .returning();

    return newItem;
  }

  async getDailyNutritionSummary(userId: string, date?: Date): Promise<{
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    meals: FoodLog[];
  }> {
    const meals = await this.getFoodLogs(userId, date);
    
    const totals = meals.reduce((acc, meal) => {
      const calories = parseFloat(meal.calories || "0");
      const protein = parseFloat(meal.protein || "0");
      const carbs = parseFloat(meal.carbs || "0");
      const fat = parseFloat(meal.fat || "0");
      
      return {
        totalCalories: acc.totalCalories + calories,
        totalProtein: acc.totalProtein + protein,
        totalCarbs: acc.totalCarbs + carbs,
        totalFats: acc.totalFats + fat,
      };
    }, {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFats: 0,
    });

    return {
      ...totals,
      meals,
    };
  }

  // Mood logging
  async createMoodLog(moodLog: InsertMoodLog): Promise<MoodLog> {
    try {
      const [log] = await db.insert(moodLogs).values(moodLog).returning();
      return log;
    } catch (error: any) {
      // If mood_logs table doesn't exist, create a mock response
      if (error.code === '42P01') {
        console.warn('mood_logs table does not exist yet. Mood logging will be skipped.');
        return {
          id: 'mock-id',
          userId: moodLog.userId,
          foodLogId: moodLog.foodLogId,
          mood: moodLog.mood,
          reason: moodLog.reason,
          loggedAt: new Date(),
        } as MoodLog;
      }
      throw error;
    }
  }

  async getMoodLogs(userId: string, foodLogId?: string): Promise<MoodLog[]> {
    try {
      if (foodLogId) {
        return await db
          .select()
          .from(moodLogs)
          .where(
            and(
              eq(moodLogs.userId, userId),
              eq(moodLogs.foodLogId, foodLogId)
            )
          )
          .orderBy(desc(moodLogs.loggedAt));
      }

      return await db
        .select()
        .from(moodLogs)
        .where(eq(moodLogs.userId, userId))
        .orderBy(desc(moodLogs.loggedAt));
    } catch (error: any) {
      // If mood_logs table doesn't exist, return empty array
      if (error.code === '42P01') {
        console.warn('mood_logs table does not exist yet. Returning empty mood logs.');
        return [];
      }
      throw error;
    }
  }

  // Water logging
  async getWaterLogs(userId: string, date?: Date): Promise<WaterLog[]> {
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      return await db
        .select()
        .from(waterLogs)
        .where(
          and(
            eq(waterLogs.userId, userId),
            gte(waterLogs.date, startOfDay),
            lte(waterLogs.date, endOfDay)
          )
        )
        .orderBy(desc(waterLogs.loggedAt));
    }

    return await db
      .select()
      .from(waterLogs)
      .where(eq(waterLogs.userId, userId))
      .orderBy(desc(waterLogs.loggedAt));
  }

  async createWaterLog(waterLog: InsertWaterLog): Promise<WaterLog> {
    const [log] = await db.insert(waterLogs).values(waterLog).returning();
    return log;
  }

  // Weight tracking
  async getWeightLogs(userId: string, limit = 30): Promise<WeightLog[]> {
    return await db
      .select()
      .from(weightLogs)
      .where(eq(weightLogs.userId, userId))
      .orderBy(desc(weightLogs.loggedAt))
      .limit(limit);
  }

  async createWeightLog(weightLog: InsertWeightLog): Promise<WeightLog> {
    const [log] = await db.insert(weightLogs).values(weightLog).returning();
    return log;
  }

  // Appointments
  async getAppointments(userId: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.userId, userId))
      .orderBy(desc(appointments.scheduledAt));
  }

  async getNutritionistAppointments(nutritionistId: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.nutritionistId, nutritionistId))
      .orderBy(desc(appointments.scheduledAt));
  }

  async getAppointmentById(id: string): Promise<Appointment | undefined> {
    const [appt] = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    return appt;
  }

  async updateAppointmentSchedule(id: string, scheduledAt: Date): Promise<void> {
    await db.update(appointments).set({ scheduledAt, status: 'pending' }).where(eq(appointments.id, id));
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    // Ensure scheduledAt is a JS Date for the DB driver
    const toInsert = { ...appointment } as any;
    function coerceToDate(val: any): Date | null {
      if (!val && val !== 0) return null;
      if (val instanceof Date) return val;
      if (typeof val === 'number') return new Date(val);
      if (typeof val === 'string') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      }
      // Firebase-like timestamp { seconds, nanoseconds }
      if (val && typeof val === 'object' && (val.seconds || val._seconds)) {
        const secs = val.seconds ?? val._seconds;
        return new Date(Number(secs) * 1000);
      }
      // moment-like
      if (val && typeof val.toDate === 'function') {
        try {
          const d = val.toDate();
          if (d instanceof Date) return d;
        } catch (e) {}
      }
      // Last-ditch attempt
      try {
        const d = new Date((val as any).toString());
        return isNaN(d.getTime()) ? null : d;
      } catch (e) {
        return null;
      }
    }

    const coerced = coerceToDate(toInsert.scheduledAt);
    if (coerced) toInsert.scheduledAt = coerced;
    else if (toInsert.scheduledAt != null) {
      console.warn('createAppointment: could not coerce scheduledAt to Date:', toInsert.scheduledAt);
    }

    const [appt] = await db.insert(appointments).values(toInsert).returning();
    return appt;
  }

  async updateAppointmentStatus(id: string, status: string): Promise<void> {
    await db
      .update(appointments)
      .set({ status })
      .where(eq(appointments.id, id));
  }

  async getNutritionists(): Promise<Nutritionist[]> {
    return await db
      .select()
      .from(nutritionists)
      .where(eq(nutritionists.isAvailable, true))
      .orderBy(desc(nutritionists.rating));
  }

  async createNutritionist(nutritionist: any): Promise<Nutritionist> {
    const [created] = await db.insert(nutritionists).values({
      userId: nutritionist.userId,
      qualifications: nutritionist.qualifications,
      experience: nutritionist.experience,
      specialization: nutritionist.specialization,
      bio: nutritionist.bio,
      consultationFee: nutritionist.consultationFee,
    }).returning();
    return created;
  }

  // Scheduling & consultations
  async createScheduleSlot(nutritionistId: string, date: Date, startTime: Date, endTime: Date): Promise<any> {
    const [slot] = await db.insert(nutritionistSchedule).values({
      nutritionistId,
      date,
      startTime,
      endTime,
      status: 'Available',
    }).returning();
    return slot;
  }

  async getNutritionistSchedule(nutritionistId: string, fromDate?: Date): Promise<any[]> {
    if (fromDate) {
      return await db
        .select()
        .from(nutritionistSchedule)
        .where(and(eq(nutritionistSchedule.nutritionistId, nutritionistId), gte(nutritionistSchedule.date, fromDate)))
        .orderBy(desc(nutritionistSchedule.date));
    }

    return await db
      .select()
      .from(nutritionistSchedule)
      .where(eq(nutritionistSchedule.nutritionistId, nutritionistId))
      .orderBy(desc(nutritionistSchedule.date))
      .limit(100);
  }

  async getAvailableSlots(nutritionistId: string, fromDate = new Date(), days = 7): Promise<any[]> {
    const endDate = new Date(fromDate);
    endDate.setDate(endDate.getDate() + days);
    return await db.select().from(nutritionistSchedule)
      .where(and(eq(nutritionistSchedule.nutritionistId, nutritionistId), eq(nutritionistSchedule.status, 'Available'), gte(nutritionistSchedule.date, fromDate), lte(nutritionistSchedule.date, endDate)))
      .orderBy(nutritionistSchedule.date);
  }

  async bookAppointment(appointmentData: any): Promise<any> {
    // Prevent double booking: check slot status
    const slotId = appointmentData.slotId;
    if (slotId) {
      const [slot] = await db.select().from(nutritionistSchedule).where(eq(nutritionistSchedule.id, slotId)).limit(1);
      if (!slot) throw new Error('Slot not found');
      if (slot.status !== 'Available') throw new Error('Slot not available');

      // Mark slot booked
      await db.update(nutritionistSchedule).set({ status: 'Booked', updatedAt: new Date() }).where(eq(nutritionistSchedule.id, slotId));
    }

    function coerceToDate(val: any): Date | null {
      if (!val && val !== 0) return null;
      if (val instanceof Date) return val;
      if (typeof val === 'number') return new Date(val);
      if (typeof val === 'string') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      }
      if (val && typeof val === 'object' && (val.seconds || val._seconds)) {
        const secs = val.seconds ?? val._seconds;
        return new Date(Number(secs) * 1000);
      }
      if (val && typeof val.toDate === 'function') {
        try { const d = val.toDate(); if (d instanceof Date) return d; } catch (e) {}
      }
      try { const d = new Date((val as any).toString()); return isNaN(d.getTime()) ? null : d; } catch (e) { return null; }
    }

    const scheduledAt = coerceToDate(appointmentData.scheduledAt) ?? appointmentData.scheduledAt;

    const [appt] = await db.insert(appointments).values({
      userId: appointmentData.userId,
      nutritionistId: appointmentData.nutritionistId,
      scheduledAt,
      duration: appointmentData.duration || 60,
      status: 'pending',
      notes: appointmentData.note || null,
      createdAt: new Date(),
    }).returning();

    // Log audit
    await db.insert(auditLogs).values({ userId: appointmentData.userId, action: 'book_appointment', meta: appointmentData }).catch(()=>null);

    return appt;
  }

  async addConsultationNotes(appointmentId: string, nutritionistId: string, summary: string, recommendations?: string): Promise<any> {
    const [note] = await db.insert(consultationNotes).values({ appointmentId, nutritionistId, summary, recommendations }).returning();
    return note;
  }

  async addAppointmentFeedback(appointmentId: string, rating: number, reviewText?: string): Promise<any> {
    const [fb] = await db.insert(appointmentFeedback).values({ appointmentId, rating, reviewText }).returning();
    // update appointment rating fields if desired
    await db.update(appointments).set({ rating }).where(eq(appointments.id, appointmentId));
    return fb;
  }

  async logAudit(userId: string | null, action: string, meta?: any): Promise<void> {
    await db.insert(auditLogs).values({ userId, action, meta }).catch(()=>null);
  }

  // Community
  async getCommunityPosts(limit = 20): Promise<(CommunityPost & { user: User; isLiked?: boolean })[]> {
    const posts = await db
      .select({
        post: communityPosts,
        user: users,
      })
      .from(communityPosts)
      .innerJoin(users, eq(communityPosts.userId, users.id))
      .orderBy(desc(communityPosts.createdAt))
      .limit(limit);

    return posts.map(({ post, user }) => ({ ...post, user }));
  }

  async createCommunityPost(post: InsertCommunityPost): Promise<CommunityPost> {
    const [newPost] = await db.insert(communityPosts).values(post).returning();
    return newPost;
  }

  async togglePostLike(userId: string, postId: string): Promise<void> {
    const existingLike = await db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.userId, userId), eq(postLikes.postId, postId)))
      .limit(1);

    if (existingLike.length > 0) {
      await db
        .delete(postLikes)
        .where(and(eq(postLikes.userId, userId), eq(postLikes.postId, postId)));
      
      await db
        .update(communityPosts)
        .set({ likesCount: sql`${communityPosts.likesCount} - 1` })
        .where(eq(communityPosts.id, postId));
    } else {
      await db.insert(postLikes).values({ userId, postId });
      
      await db
        .update(communityPosts)
        .set({ likesCount: sql`${communityPosts.likesCount} + 1` })
        .where(eq(communityPosts.id, postId));
    }
  }

  async getPostComments(postId: string): Promise<any[]> {
    return await db
      .select({
        comment: postComments,
        user: users,
      })
      .from(postComments)
      .innerJoin(users, eq(postComments.userId, users.id))
      .where(eq(postComments.postId, postId))
      .orderBy(desc(postComments.createdAt));
  }

  async createPostComment(userId: string, postId: string, content: string): Promise<void> {
    await db.insert(postComments).values({ userId, postId, content });
    
    await db
      .update(communityPosts)
      .set({ commentsCount: sql`${communityPosts.commentsCount} + 1` })
      .where(eq(communityPosts.id, postId));
  }

  // Friends
  async getFriends(userId: string): Promise<User[]> {
    // Return users that the given user is following with accepted status (legacy behavior)
    const friends = await db
      .select({ user: users })
      .from(friendships)
      .innerJoin(users, eq(friendships.followingId, users.id))
      .where(and(eq(friendships.followerId, userId), eq(friendships.status, "accepted")));

    return friends.map(f => f.user);
  }

  async sendFriendRequest(followerId: string, followingId: string): Promise<void> {
    // Avoid duplicate requests or existing accepted connections
    const [existing] = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.followerId, followerId),
          eq(friendships.followingId, followingId)
        )
      )
      .limit(1);

    if (existing) {
      // If already pending or accepted, do nothing
      return;
    }

    await db.insert(friendships).values({
      followerId,
      followingId,
      status: "pending",
    });
  }

  async acceptFriendRequest(followerId: string, followingId: string): Promise<void> {
    // Mark the original request as accepted
    await db
      .update(friendships)
      .set({ status: "accepted" })
      .where(and(eq(friendships.followerId, followerId), eq(friendships.followingId, followingId)));

    // Ensure reciprocal accepted row exists so both users see each other as friends
    const [reciprocal] = await db
      .select()
      .from(friendships)
      .where(and(eq(friendships.followerId, followingId), eq(friendships.followingId, followerId)))
      .limit(1);

    if (!reciprocal) {
      await db.insert(friendships).values({
        followerId: followingId,
        followingId: followerId,
        status: 'accepted',
      });
    } else if (reciprocal && reciprocal.status !== 'accepted') {
      await db
        .update(friendships)
        .set({ status: 'accepted' })
        .where(eq(friendships.id, reciprocal.id));
    }
  }

  async removeFriendship(userA: string, userB: string): Promise<void> {
    // Delete any friendship rows in either direction
    await db
      .delete(friendships)
      .where(
        or(
          and(eq(friendships.followerId, userA), eq(friendships.followingId, userB)),
          and(eq(friendships.followerId, userB), eq(friendships.followingId, userA))
        )
      );
  }

  async getMutualFriends(userId: string): Promise<User[]> {
    // For now, reuse getFriends (legacy) — this can be updated to enforce two-way mutual checks if desired
    const friends = await this.getFriends(userId);
    return friends;
  }

  async getFriendActivity(userId: string): Promise<any[]> {
    // Get recent activities from accepted friends
    const activities = await db
      .select({ user: users, post: communityPosts })
      .from(communityPosts)
      .innerJoin(users, eq(communityPosts.userId, users.id))
      .where(sql`${communityPosts.userId} IN (SELECT following_id FROM friendships WHERE follower_id = ${userId} AND status = 'accepted')`)
      .orderBy(desc(communityPosts.createdAt))
      .limit(20);

    return activities;
  }

  async getDiscoverCandidates(userId: string): Promise<any[]> {
    // More robust approach: fetch recent users (excluding current), then filter out already-followed ids
    const recentUsers = await db
      .select()
      .from(users)
      .where(sql`${users.id} != ${userId}`)
      .orderBy(desc(users.createdAt))
      .limit(100);

    // Fetch the list of IDs the current user already follows
    const followingRows = await db
      .select({ fid: friendships.followingId })
      .from(friendships)
      .where(eq(friendships.followerId, userId));

    const followingIds = new Set(followingRows.map((r: any) => r.fid));

    const candidates = recentUsers
      .filter((u: any) => !followingIds.has(u.id))
      .slice(0, 50);

    // Enrich with mutual friends count (simple count of shared followings)
    const results = await Promise.all(candidates.map(async (u: any) => {
      const [mutualRow] = await db
        .select({ cnt: sql`COUNT(*)` })
        .from(friendships)
        .where(
          and(
            eq(friendships.followingId, u.id),
            sql`${friendships.followerId} IN (SELECT following_id FROM friendships WHERE follower_id = ${userId} AND status = 'accepted')`
          )
        );
      const mutual = (mutualRow && (mutualRow as any).cnt) || 0;
      return { ...u, mutualCount: Number(mutual) };
    }));

    return results;
  }

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [notif] = await db.insert(notifications).values(notification).returning();
    return notif;
  }

  async markNotificationRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  // Chat
  async getChatConversations(userId: string): Promise<ChatConversation[]> {
    return await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.userId, userId))
      .orderBy(desc(chatConversations.updatedAt));
  }

  async createChatConversation(userId: string, title?: string, language = "en"): Promise<ChatConversation> {
    const [conversation] = await db
      .insert(chatConversations)
      .values({
        userId,
        title: title || "New Chat",
        language,
      })
      .returning();
    return conversation;
  }

  async getChatMessages(conversationId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [msg] = await db.insert(chatMessages).values(message).returning();

    // Update conversation timestamp
    await db
      .update(chatConversations)
      .set({ updatedAt: new Date() })
      .where(eq(chatConversations.id, message.conversationId));

    return msg;
  }

  // Utensil calibration
  async saveUtensilCalibration(userId: string, utensilType: string, gramsPerUnit: number): Promise<UserUtensilMapping> {
    // Check if calibration already exists
    const [existing] = await db
      .select()
      .from(userUtensilMapping)
      .where(
        and(
          eq(userUtensilMapping.userId, userId),
          eq(userUtensilMapping.utensilType, utensilType)
        )
      );

    if (existing) {
      // Update existing calibration
      const [updated] = await db
        .update(userUtensilMapping)
        .set({ gramsPerUnit: gramsPerUnit.toString() })
        .where(eq(userUtensilMapping.id, existing.id))
        .returning();
      return updated;
    } else {
      // Insert new calibration
      const [calibration] = await db
        .insert(userUtensilMapping)
        .values({
          userId,
          utensilType,
          gramsPerUnit: gramsPerUnit.toString(),
        })
        .returning();
      return calibration;
    }
  }

  async getUtensilCalibration(userId: string): Promise<UserUtensilMapping[]> {
    return await db
      .select()
      .from(userUtensilMapping)
      .where(eq(userUtensilMapping.userId, userId));
  }
}

export const storage = new DatabaseStorage();
