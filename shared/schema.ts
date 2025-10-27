import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// OTP verification table
export const otpVerifications = pgTable("otp_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  otp: varchar("otp").notNull(),
  type: varchar("type").notNull(), // registration, password_reset
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  password: varchar("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  age: integer("age"),
  gender: varchar("gender"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"), // user, nutritionist
  isVerified: boolean("is_verified").default(false),
  language: varchar("language").default("en"),
  theme: varchar("theme").default("light"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
});

// User profiles with health data
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  height: decimal("height", { precision: 5, scale: 2 }), // in cm
  weight: decimal("weight", { precision: 5, scale: 2 }), // in kg
  dateOfBirth: timestamp("date_of_birth"),
  gender: varchar("gender"),
  activityLevel: varchar("activity_level"),
  healthGoals: text("health_goals"),
  dietaryRestrictions: text("dietary_restrictions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Daily nutrition goals
export const nutritionGoals = pgTable("nutrition_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  dailyCalories: integer("daily_calories").default(2000),
  dailyWater: integer("daily_water").default(8), // glasses
  dailyProtein: decimal("daily_protein", { precision: 5, scale: 2 }),
  dailyCarbs: decimal("daily_carbs", { precision: 5, scale: 2 }),
  dailyFats: decimal("daily_fats", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Food items database
export const foodItems = pgTable("food_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  brand: varchar("brand"),
  barcode: varchar("barcode"),
  caloriesPer100g: decimal("calories_per_100g", { precision: 8, scale: 2 }),
  proteinPer100g: decimal("protein_per_100g", { precision: 8, scale: 2 }),
  carbsPer100g: decimal("carbs_per_100g", { precision: 8, scale: 2 }),
  fatsPer100g: decimal("fats_per_100g", { precision: 8, scale: 2 }),
  fiberPer100g: decimal("fiber_per_100g", { precision: 8, scale: 2 }),
  sugarPer100g: decimal("sugar_per_100g", { precision: 8, scale: 2 }),
  sodiumPer100g: decimal("sodium_per_100g", { precision: 8, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Daily food logs
export const foodLogs = pgTable("food_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  foodItemId: varchar("food_item_id").references(() => foodItems.id),
  mealName: varchar("meal_name").notNull(), // The name of the food logged
  mealType: varchar("meal_type").notNull(), // breakfast, lunch, dinner, snack
  quantity: decimal("quantity", { precision: 8, scale: 2 }).notNull(),
  unit: varchar("unit").default("grams"),
  calories: decimal("calories", { precision: 8, scale: 2 }),
  protein: decimal("protein", { precision: 8, scale: 2 }),
  carbs: decimal("carbs", { precision: 8, scale: 2 }),
  fat: decimal("fat", { precision: 8, scale: 2 }),
  cookingIntensity: varchar("cooking_intensity"),
  oilType: varchar("oil_type"),
  milkType: varchar("milk_type"),
  sugarType: varchar("sugar_type"),
  category: varchar("category"),
  ingredients: jsonb("ingredients"),
  spiceLevel: varchar("spice_level"),
  utensilType: varchar("utensil_type"),
  adjustedCalories: decimal("adjusted_calories", { precision: 10, scale: 2 }),
  loggedAt: timestamp("logged_at").defaultNow(),
  date: timestamp("date").notNull(),
});

// Per-user per-meal personalized baselines (auto-learned)
export const userMealBaselines = pgTable("user_meal_baselines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  mealName: varchar("meal_name").notNull(),
  baselineCalories: decimal("baseline_calories", { precision: 10, scale: 2 }).notNull(),
  sampleCount: integer("sample_count").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mood tracking logs (linked to meals)
export const moodLogs = pgTable("mood_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  foodLogId: varchar("food_log_id").references(() => foodLogs.id),
  mood: varchar("mood").notNull(), // very-good, good, neutral, bad, very-bad
  reason: text("reason"), // Optional reason for the mood
  loggedAt: timestamp("logged_at").defaultNow(),
});

// Water intake logs
export const waterLogs = pgTable("water_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 5, scale: 2 }).notNull(), // in glasses
  loggedAt: timestamp("logged_at").defaultNow(),
  date: timestamp("date").notNull(),
});

// Weight tracking
export const weightLogs = pgTable("weight_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull(),
  bmi: decimal("bmi", { precision: 4, scale: 2 }),
  notes: text("notes"),
  loggedAt: timestamp("logged_at").defaultNow(),
});

// Nutritionists
export const nutritionists = pgTable("nutritionists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  specialization: varchar("specialization"),
  experience: integer("experience"), // years
  qualifications: text("qualifications"),
  bio: text("bio"),
  consultationFee: decimal("consultation_fee", { precision: 8, scale: 2 }),
  rating: decimal("rating", { precision: 3, scale: 2 }).default(sql`0`),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Appointments
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  nutritionistId: varchar("nutritionist_id").references(() => nutritionists.id).notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(60), // minutes
  status: varchar("status").default("pending"), // pending, confirmed, completed, cancelled
  notes: text("notes"),
  feedback: text("feedback"),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Community posts
export const communityPosts = pgTable("community_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  imageUrl: varchar("image_url"),
  tags: text("tags"), // JSON array as string
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  sharesCount: integer("shares_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Post likes
export const postLikes = pgTable("post_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  postId: varchar("post_id").references(() => communityPosts.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Post comments
export const postComments = pgTable("post_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  postId: varchar("post_id").references(() => communityPosts.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Friends/Following system
export const friendships = pgTable("friendships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").references(() => users.id).notNull(),
  followingId: varchar("following_id").references(() => users.id).notNull(),
  status: varchar("status").default("pending"), // pending, accepted, blocked
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type").notNull(), // food_reminder, friend_activity, community_post, appointment
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"), // Additional data as JSON
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat conversations for AI chatbot
export const chatConversations = pgTable("chat_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title"),
  language: varchar("language").default("en"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => chatConversations.id).notNull(),
  role: varchar("role").notNull(), // user, assistant
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User utensil calibration mapping
export const userUtensilMapping = pgTable("user_utensil_mapping", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  utensilType: varchar("utensil_type").notNull(), // 'spoon', 'bowl', 'cup'
  gramsPerUnit: decimal("grams_per_unit", { precision: 8, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});


// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  nutritionGoals: one(nutritionGoals, {
    fields: [users.id],
    references: [nutritionGoals.userId],
  }),
  foodLogs: many(foodLogs),
  waterLogs: many(waterLogs),
  weightLogs: many(weightLogs),
  appointments: many(appointments),
  communityPosts: many(communityPosts),
  notifications: many(notifications),
  chatConversations: many(chatConversations),
}));

export const nutritionistsRelations = relations(nutritionists, ({ one, many }) => ({
  user: one(users, {
    fields: [nutritionists.userId],
    references: [users.id],
  }),
  appointments: many(appointments),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  user: one(users, {
    fields: [appointments.userId],
    references: [users.id],
  }),
  nutritionist: one(nutritionists, {
    fields: [appointments.nutritionistId],
    references: [nutritionists.id],
  }),
}));

export const communityPostsRelations = relations(communityPosts, ({ one, many }) => ({
  user: one(users, {
    fields: [communityPosts.userId],
    references: [users.id],
  }),
  likes: many(postLikes),
  comments: many(postComments),
}));

export const foodLogsRelations = relations(foodLogs, ({ one, many }) => ({
  user: one(users, {
    fields: [foodLogs.userId],
    references: [users.id],
  }),
  foodItem: one(foodItems, {
    fields: [foodLogs.foodItemId],
    references: [foodItems.id],
  }),
  moodLogs: many(moodLogs),
}));

export const moodLogsRelations = relations(moodLogs, ({ one }) => ({
  user: one(users, {
    fields: [moodLogs.userId],
    references: [users.id],
  }),
  foodLog: one(foodLogs, {
    fields: [moodLogs.foodLogId],
    references: [foodLogs.id],
  }),
}));

export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [chatConversations.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFoodLogSchema = createInsertSchema(foodLogs).omit({
  id: true,
  loggedAt: true,
});

export const insertMoodLogSchema = createInsertSchema(moodLogs).omit({
  id: true,
  loggedAt: true,
});

export const insertWaterLogSchema = createInsertSchema(waterLogs).omit({
  id: true,
  loggedAt: true,
});

export const insertWeightLogSchema = createInsertSchema(weightLogs).omit({
  id: true,
  loggedAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityPostSchema = createInsertSchema(communityPosts).omit({
  id: true,
  createdAt: true,
  likesCount: true,
  commentsCount: true,
  sharesCount: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertOtpSchema = createInsertSchema(otpVerifications).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type OtpVerification = typeof otpVerifications.$inferSelect;
export type InsertOtp = z.infer<typeof insertOtpSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type FoodLog = typeof foodLogs.$inferSelect;
export type InsertFoodLog = z.infer<typeof insertFoodLogSchema>;
export type MoodLog = typeof moodLogs.$inferSelect;
export type InsertMoodLog = z.infer<typeof insertMoodLogSchema>;
export type WaterLog = typeof waterLogs.$inferSelect;
export type InsertWaterLog = z.infer<typeof insertWaterLogSchema>;
export type WeightLog = typeof weightLogs.$inferSelect;
export type InsertWeightLog = z.infer<typeof insertWeightLogSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type ChatConversation = typeof chatConversations.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Nutritionist = typeof nutritionists.$inferSelect;
export type FoodItem = typeof foodItems.$inferSelect;
export type UserUtensilMapping = typeof userUtensilMapping.$inferSelect;
export type InsertUserUtensilMapping = z.infer<typeof insertUserUtensilMappingSchema>;

// Insert schema for user utensil mapping
export const insertUserUtensilMappingSchema = createInsertSchema(userUtensilMapping).omit({
  id: true,
  createdAt: true,
});
