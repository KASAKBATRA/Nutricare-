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
  appointments,
  communityPosts,
  postLikes,
  postComments,
  friendships,
  notifications,
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
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(id: string, status: string): Promise<void>;
  getNutritionists(): Promise<Nutritionist[]>;
  createNutritionist(nutritionist: any): Promise<Nutritionist>;
  
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
    const [otp] = await db.insert(otpVerifications).values(otpData).returning();
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

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [appt] = await db.insert(appointments).values(appointment).returning();
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
    const friends = await db
      .select({
        user: users,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.followingId, users.id))
      .where(
        and(
          eq(friendships.followerId, userId),
          eq(friendships.status, "accepted")
        )
      );

    return friends.map(f => f.user);
  }

  async sendFriendRequest(followerId: string, followingId: string): Promise<void> {
    await db.insert(friendships).values({
      followerId,
      followingId,
      status: "pending",
    });
  }

  async acceptFriendRequest(followerId: string, followingId: string): Promise<void> {
    await db
      .update(friendships)
      .set({ status: "accepted" })
      .where(
        and(
          eq(friendships.followerId, followerId),
          eq(friendships.followingId, followingId)
        )
      );
  }

  async getFriendActivity(userId: string): Promise<any[]> {
    // Get recent activities from friends
    const activities = await db
      .select({
        user: users,
        post: communityPosts,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.followingId, users.id))
      .leftJoin(communityPosts, eq(users.id, communityPosts.userId))
      .where(
        and(
          eq(friendships.followerId, userId),
          eq(friendships.status, "accepted")
        )
      )
      .orderBy(desc(communityPosts.createdAt))
      .limit(10);

    return activities;
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
