import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

// Extend express-session types to include userId
declare module "express-session" {
  interface SessionData {
    userId?: string | number;
  }
}
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { desc } from "drizzle-orm";
import { sendMail } from "./email";
import { generateChatResponse } from "./openai";
import { nutritionService, addMealSchema, type AddMealData } from "./nutrition";
import { 
  registerUser, 
  verifyOTP, 
  loginUser, 
  initiatePasswordReset, 
  resetPassword, 
  resendOTP,
  registerSchema,
  loginSchema,
  otpVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from "./auth";
import { z } from "zod";

// Mood logging schema
const moodLogSchema = z.object({
  mood: z.enum(["very-good", "good", "neutral", "bad", "very-bad"]),
  reason: z.string().optional(),
  foodLogId: z.string().optional(),
});

// Session configuration
const PgSession = connectPgSimple(session);

function getUserId(req: any) {
  return req.session?.userId;
}

function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Validate required environment variables
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required for secure sessions");
  }

  // Session middleware
  app.use(session({
    store: new PgSession({
      pool,
      tableName: 'sessions',
      createTableIfMissing: true,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  }));

  // Development-only debug endpoints to test email sending
  if (process.env.NODE_ENV !== 'production') {
    app.post('/api/debug/send-test-email', async (req: any, res) => {
      try {
        const { email } = req.body || {};
        if (!email) return res.status(400).json({ message: 'email is required in body' });
        // send a simple test email
        await sendMail({
          to: email,
          subject: 'NutriCare++ Test Email',
          text: `This is a test email sent at ${new Date().toISOString()}`,
          html: `<p>This is a <strong>test</strong> email sent at ${new Date().toISOString()}</p>`,
        });
        res.json({ message: `Test email sent to ${email}` });
      } catch (err: any) {
  console.error('Debug test email failed:', String(err), err);
  res.status(500).json({ message: 'Failed to send test email', error: String(err) });
      }
    });

    app.get('/api/debug/email-user', (req, res) => {
      const user = (process.env.EMAIL_USER || '').replace(/^"|"$/g, '').trim();
      const masked = user ? user.replace(/^(.).+(@.+)$/, (m, p1, p2) => `${p1}***${p2}`) : 'not-set';
      res.json({ emailUserMasked: masked });
    });
  }

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await registerUser(validatedData);
      // If registerUser returned a 'resent' result, that's an existing unverified user
      if ((result as any).resent) {
        return res.json({ message: (result as any).message || 'Please verify your email. OTP resent.', email: (result as any).email, resent: true });
      }

      res.json({ 
        message: "Registration successful. Please check your email for verification code.",
        email: result.email 
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ 
        message: error.message || "Registration failed",
        errors: error.errors || []
      });
    }
  });

  app.post('/api/auth/verify-otp', async (req: any, res) => {
    try {
      const { email, otp } = otpVerificationSchema.parse(req.body);
      const result = await verifyOTP(email, otp, 'registration');

      // If registration verification, auto-login the user
      if (result.userId) {
        req.session.userId = result.userId;
        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      res.json({
        message: "Email verified successfully. You can now log in.",
        userId: result.userId
      });
    } catch (error: any) {
      console.error("OTP verification error:", error);
      res.status(400).json({ message: error.message || "OTP verification failed" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      console.log('🔑 LOGIN ATTEMPT for email:', email);
      const user = await loginUser(email, password);
      console.log('🔑 LOGIN SUCCESS - User ID:', user.id, 'Name:', user.firstName, user.lastName);
      
      req.session.userId = user.id;
      console.log('🔑 SESSION SET - User ID:', req.session.userId, 'Session ID:', req.session.id);
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ 
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          }
        });
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ message: error.message || "Login failed" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    console.log('🔓 LOGOUT REQUEST - Session:', req.session?.id, 'User ID:', req.session?.userId);
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie('connect.sid');
      console.log('🔓 LOGOUT COMPLETE - Session destroyed');
      res.json({ message: "Logout successful" });
    });
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      await initiatePasswordReset(email);
      res.json({ message: "Password reset code sent to your email" });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(400).json({ message: error.message || "Failed to send reset code" });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { email, otp, newPassword } = resetPasswordSchema.parse(req.body);
      await resetPassword(email, otp, newPassword);
      res.json({ message: "Password reset successful. You can now log in with your new password." });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(400).json({ message: error.message || "Password reset failed" });
    }
  });

  app.post('/api/auth/resend-otp', async (req, res) => {
    try {
      const { email, type } = req.body;
      await resendOTP(email, type);
      res.json({ message: "New verification code sent to your email" });
    } catch (error: any) {
      console.error("Resend OTP error:", error);
      res.status(400).json({ message: error.message || "Failed to resend code" });
    }
  });

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Don't send password in response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User profile routes
  app.get('/api/profile', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getUserProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post('/api/profile', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const profileData = { ...req.body, userId };
      const profile = await storage.upsertUserProfile(profileData);
      res.json(profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Food logging routes
  app.get('/api/food-logs', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      console.log('🍽️ FETCHING food logs for user:', userId);
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      const logs = await storage.getFoodLogs(userId, date);
      console.log('🍽️ FOUND', logs.length, 'food logs for user:', userId);
      if (logs.length > 0) {
        console.log('🍽️ FIRST LOG belongs to user:', logs[0].userId, 'Meal:', logs[0].mealName);
      }
      res.json(logs);
    } catch (error) {
      console.error("Error fetching food logs:", error);
      res.status(500).json({ message: "Failed to fetch food logs" });
    }
  });

  app.post('/api/food-logs', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const logData = { ...req.body, userId };
      const log = await storage.createFoodLog(logData);
      res.json(log);
    } catch (error) {
      console.error("Error creating food log:", error);
      res.status(500).json({ message: "Failed to create food log" });
    }
  });

  // Delete food log endpoint
  app.delete('/api/food-logs/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const logId = req.params.id;
      
      // Delete the food log (you'll need to implement this in storage)
      await storage.deleteFoodLog(logId, userId);
      
      res.json({ message: "Food log deleted successfully" });
    } catch (error) {
      console.error("Error deleting food log:", error);
      res.status(500).json({ message: "Failed to delete food log" });
    }
  });

  // Update food log endpoint
  app.put('/api/food-logs/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const logId = req.params.id;
      const mealData = addMealSchema.parse(req.body);
      
      // Get nutrition data from Nutritionix API
      const nutrition = await nutritionService.getNutrition(
        mealData.mealName,
        mealData.quantity,
        mealData.unit
      );

      // Update the food log
      await storage.updateFoodLog(logId, userId, {
        mealName: mealData.mealName,
        mealType: mealData.mealType,
        quantity: mealData.quantity.toString(),
        unit: mealData.unit,
        calories: nutrition.calories.toString(),
        protein: nutrition.protein.toString(),
        carbs: nutrition.carbs.toString(),
        fat: nutrition.fat.toString(),
      });

      res.json({
        message: "Meal updated successfully",
        nutrition: {
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          fat: nutrition.fat,
        },
      });
    } catch (error: any) {
      console.error("Error updating meal:", error);
      res.status(400).json({ 
        message: error.message || "Failed to update meal",
        errors: error.errors || []
      });
    }
  });

  // Correction endpoint - user feedback to adjust estimated calories
  app.post('/api/food-logs/:id/correction', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const logId = req.params.id;
      const { percentChange } = req.body; // e.g., -10 or 20

      if (typeof percentChange !== 'number') return res.status(400).json({ message: 'percentChange number required' });

      const logs = await storage.getFoodLogs(userId);
      const found = logs.find(l => l.id === logId);
      if (!found) return res.status(404).json({ message: 'Food log not found' });

      const currentAdjusted = parseFloat((found as any).adjustedCalories || found.calories || '0');
      const corrected = Math.round(currentAdjusted * (1 + percentChange / 100));

      // Update the food log adjustedCalories
      await storage.updateFoodLog(logId, userId, { adjustedCalories: corrected.toString() });

      // Recompute per-user baseline for this meal
      const sameMealLogs = logs.filter(l => l.mealName && (l.mealName as string).toLowerCase() === (found.mealName || '').toLowerCase());
      const numericAdjusted = sameMealLogs.map(l => parseFloat((l as any).adjustedCalories || l.calories || '0'));
      const avg = Math.round((numericAdjusted.reduce((a,b)=>a+b,0) + corrected) / (numericAdjusted.length + 1));
      await storage.upsertUserMealBaseline(userId, found.mealName, avg, (sameMealLogs.length + 1)).catch(() => null);

      res.json({ message: 'Correction applied', corrected });
    } catch (err: any) {
      console.error('Correction error:', err);
      res.status(500).json({ message: 'Failed to apply correction' });
    }
  });

  app.get('/api/food-items', requireAuth, async (req, res) => {
    try {
      const search = req.query.search as string;
      const items = await storage.getFoodItems(search);
      res.json(items);
    } catch (error) {
      console.error("Error fetching food items:", error);
      res.status(500).json({ message: "Failed to fetch food items" });
    }
  });

  // New meal logging endpoints with nutrition calculation
  // Multipliers used across endpoints
  const OIL_MULTIPLIERS: Record<string, number> = {
    "No Oil": 1.0,
    "Refined": 1.1,
    "Mustard": 1.15,
    "Olive": 1.05,
    "Desi Ghee": 1.3,
    "Butter": 1.25,
  };

  const INTENSITY_MULTIPLIERS: Record<string, number> = {
    "Boiled/Steamed": 0.8,
    "Lightly Fried": 0.95,
    "Normal": 1.0,
    "Deep Fried": 1.25,
    "Extra Ghee": 1.3,
  };

  const MILK_MULTIPLIERS: Record<string, number> = {
    "None": 1.0,
    "Cow Milk": 1.1,
    "Buffalo Milk": 1.25,
    "Skimmed Milk": 0.9,
    "Plant Milk": 0.8,
  };

  // Simple keyword-based food category mapping (can be extended)
  const FOOD_CATEGORY_MAP: Record<string, string> = {
    milk: 'dairy',
    tea: 'beverage',
    coffee: 'beverage',
    paneer: 'protein',
    rice: 'grain',
    chicken: 'protein',
    poha: 'cooked',
    roti: 'cooked',
    curd: 'dairy',
    fruit: 'raw',
    dal: 'cooked',
    sabzi: 'cooked',
    egg: 'protein',
  };

  // Ingredient suggestions per keyword. Keys are keywords to match in food name.
  const FOOD_INGREDIENTS_MAP: Record<string, string[]> = {
    poha: ['Onion', 'Green Chili', 'Peanuts', 'Mustard Seeds', 'Coriander'],
    sabzi: ['Onion', 'Garlic', 'Tomato', 'Green Chili', 'Ginger'],
    dal: ['Onion', 'Garlic', 'Ghee', 'Tomato', 'Cumin'],
    'chicken': ['Onion', 'Garlic', 'Ginger', 'Tomato', 'Green Chili'],
    roti: ['Atta (Chakki Fresh)', 'Atta (Maida Mix)', 'Multi-grain'],
    tea: ['Sugar', 'Milk'],
    coffee: ['Sugar', 'Milk'],
    milk: ['Full Cream', 'Toned', 'Skimmed'],
    paneer: ['Paneer Cubes', 'Oil/Ghee', 'Spices'],
    salad: ['Lettuce', 'Tomato', 'Onion', 'Olive Oil'],
  };

  function detectCategoryFromName(name: string) {
    if (!name) return 'unknown';
    const lower = name.toLowerCase();
    for (const key of Object.keys(FOOD_CATEGORY_MAP)) {
      if (lower.includes(key)) return FOOD_CATEGORY_MAP[key];
    }
    // heuristics: if contains words like curry, fry -> cooked
    if (/(curry|fry|stew|sabzi|bhaji)/.test(lower)) return 'cooked';
    if (/(juice|shake|smoothie)/.test(lower)) return 'beverage';
    return 'raw';
  }

  // API endpoint to detect category and return which fields should be visible
  app.post('/api/detect-category', requireAuth, async (req: any, res) => {
    try {
      const { name } = req.body || {};
      if (!name) return res.status(400).json({ message: 'name is required' });
      const category = detectCategoryFromName(String(name));

      // Decide visible fields based on category
      const visible: Record<string, boolean> = {
        dairyBase: false,
        milkType: false,
        oilType: false,
        cookingIntensity: false,
        spiceLevel: false,
        utensil: false,
        sugarType: false,
      };

      // compute ingredient suggestions
      const ingredientSuggestions: string[] = [];
      const lower = String(name || '').toLowerCase();
      for (const key of Object.keys(FOOD_INGREDIENTS_MAP)) {
        if (lower.includes(key)) {
          ingredientSuggestions.push(...FOOD_INGREDIENTS_MAP[key]);
        }
      }
      // dedupe
      const uniqueIngredients = Array.from(new Set(ingredientSuggestions));

      if (category === 'dairy') {
        visible.dairyBase = true;
        visible.milkType = true;
      } else if (category === 'beverage') {
        visible.milkType = true;
        visible.sugarType = true;
      } else if (category === 'cooked') {
        visible.oilType = true;
        visible.cookingIntensity = true;
        visible.spiceLevel = true;
        visible.utensil = true;
      } else if (category === 'protein') {
        visible.oilType = true;
        visible.cookingIntensity = true;
      } else if (category === 'raw' || category === 'grain') {
        // hide cooking options
      }

  res.json({ category, visible, ingredients: uniqueIngredients });
    } catch (err: any) {
      console.error('Detect category error:', err);
      res.status(500).json({ message: 'Failed to detect category' });
    }
  });

  app.post('/api/add-meal', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const mealData = addMealSchema.parse(req.body);
  // Check if user has a personalized baseline for this meal
      let baseCalories: number;
      const baseline = await storage.getUserMealBaseline(userId, mealData.mealName).catch(() => undefined);

      if (baseline && baseline.sampleCount >= 5) {
        // Use personalized baseline when enough samples are present
        baseCalories = parseFloat(baseline.baselineCalories || 0);
      } else {
        // Fetch from Nutritionix
        const nutrition = await nutritionService.getNutrition(
          mealData.mealName,
          mealData.quantity,
          mealData.unit
        );
        baseCalories = nutrition.calories;
      }

  // Determine multiplier using oil, intensity and milk
  const oilKey = (mealData as any).oilType || 'No Oil';
  const milkKey = (mealData as any).milkType || 'None';
  const intensityKey = (mealData as any).cookingIntensity || 'Normal';

  const oilMul = OIL_MULTIPLIERS[oilKey] || 1.0;
  const milkMul = MILK_MULTIPLIERS[milkKey] || 1.0;
  const intensityMul = INTENSITY_MULTIPLIERS[intensityKey] || 1.0;

  const finalMultiplier = oilMul * milkMul * intensityMul;

  const adjustedCalories = Math.round(baseCalories * finalMultiplier);

      // Try to fetch nutrition info (macros) for storing food item when baseline not used
      let nutritionForItem: any = { calories: baseCalories, protein: 0, carbs: 0, fat: 0 };
      try {
        const n = await nutritionService.getNutrition(mealData.mealName, mealData.quantity, mealData.unit);
        nutritionForItem = n;
      } catch (err) {
        // If Nutritionix fails, continue with calorie-only baseline
      }

      // Create or get food item in database
      const foodItem = await storage.createOrGetFoodItem(mealData.mealName, {
        calories: nutritionForItem.calories,
        protein: nutritionForItem.protein,
        carbs: nutritionForItem.carbs,
        fats: nutritionForItem.fat,
        fiber: nutritionForItem.fiber || 0,
        sugar: nutritionForItem.sugar || 0,
        sodium: nutritionForItem.sodium || 0,
      });

      // Convert utensil-based quantity to grams if user selected a utensil (apply calibration)
      // If the mealData unit is not gram-based and a utensilType was provided, attempt conversion
      let usedUtensilConversion = false;
      try {
        const utensilType = (mealData as any).utensilType;
        if (utensilType) {
          // Try to find user calibration or fallbacks
          const calibration = await storage.getUtensilCalibration(userId).catch(() => []);
          let gramsPerUnit: number | undefined;
          if (calibration && calibration.length > 0) {
            const found = calibration.find(c => c.utensilType === utensilType);
            if (found) gramsPerUnit = parseFloat(found.gramsPerUnit || '0');
          }

          // default fallbacks
          const defaults: Record<string, number> = {
            'Small Bowl (~100ml)': 100,
            'Medium Bowl (~150ml)': 150,
            'Large Bowl (~250ml)': 250,
            'Plate (~300ml)': 300,
            'Glass (~200ml)': 200,
          };

          if (!gramsPerUnit) gramsPerUnit = defaults[utensilType as string];
          // If we found a grams per unit and the unit provided is a utensil-like unit, convert
          if (gramsPerUnit && mealData.unit && ['pieces'].includes(mealData.unit) || mealData.unit === 'grams' || mealData.unit === 'ml') {
            // If unit is 'pieces' interpret as count of utensilType
            if (mealData.unit === 'pieces') {
              // convert count * gramsPerUnit
              const grams = Number(mealData.quantity) * gramsPerUnit;
              // Replace baseCalories by refetching nutrition per grams
              try {
                const n = await nutritionService.getNutrition(mealData.mealName, grams, 'grams');
                baseCalories = n.calories;
              } catch (err) {
                // ignore, keep existing baseCalories
              }
              usedUtensilConversion = true;
            }
          }
        }
      } catch (err) {
        // ignore utensil conversion failures
      }

      // Create food log entry (store base calories and adjusted)
      let foodLog: any;
      try {
        foodLog = await storage.createFoodLog({
          userId,
          foodItemId: foodItem.id,
          mealName: mealData.mealName,
          mealType: mealData.mealType,
          quantity: mealData.quantity.toString(),
          unit: mealData.unit,
          calories: baseCalories.toString(),
          protein: (nutritionForItem.protein || 0).toString(),
          carbs: (nutritionForItem.carbs || 0).toString(),
          fat: (nutritionForItem.fat || 0).toString(),
          cookingIntensity: mealData.cookingIntensity || 'Normal',
          oilType: (mealData as any).oilType || null,
          milkType: (mealData as any).milkType || null,
          sugarType: (mealData as any).sugarType || null,
          ingredients: (mealData as any).ingredients ? JSON.stringify((mealData as any).ingredients) : null,
          spiceLevel: (mealData as any).spiceLevel || null,
          utensilType: (mealData as any).utensilType || null,
          category: (mealData as any).category || null,
          adjustedCalories: adjustedCalories.toString(),
          date: new Date(),
        });
      } catch (err: any) {
        // Fallback for databases that don't have the new columns yet (e.g., oil_type)
        const errStr = String(err || '');
        if (errStr.includes('does not exist') || err.code === '42703') {
          console.warn('Database missing cooking detail columns, retrying insert without advanced fields');
          // Retry without advanced fields so meal can still be logged
          foodLog = await storage.createFoodLog({
            userId,
            foodItemId: foodItem.id,
            mealName: mealData.mealName,
            mealType: mealData.mealType,
            quantity: mealData.quantity.toString(),
            unit: mealData.unit,
            calories: baseCalories.toString(),
            protein: (nutritionForItem.protein || 0).toString(),
            carbs: (nutritionForItem.carbs || 0).toString(),
            fat: (nutritionForItem.fat || 0).toString(),
            cookingIntensity: mealData.cookingIntensity || 'Normal',
            // Advanced fields omitted in fallback insert to support older DBs
            adjustedCalories: adjustedCalories.toString(),
            date: new Date(),
          });
        } else {
          throw err;
        }
      }

      // Auto-learn: compute average adjusted calories for same meal for this user
      const logs = await storage.getFoodLogs(userId);
      const sameMealLogs = logs.filter(l => l.mealName && (l.mealName as string).toLowerCase() === mealData.mealName.toLowerCase());
      if (sameMealLogs.length >= 5) {
        const numericAdjusted = sameMealLogs.map(l => parseFloat((l as any).adjustedCalories || l.calories || 0));
        const avg = Math.round(numericAdjusted.reduce((a,b)=>a+b,0) / numericAdjusted.length);
        await storage.upsertUserMealBaseline(userId, mealData.mealName, avg, sameMealLogs.length).catch(() => null);
      }

      res.json({
        message: "Meal logged successfully",
        meal: foodLog,
        base_calories: baseCalories,
        adjusted_calories: adjustedCalories,
        used_utensil_conversion: usedUtensilConversion || false,
      });
    } catch (error: any) {
      console.error("Error adding meal:", error);
      res.status(400).json({ 
        message: error.message || "Failed to add meal",
        errors: error.errors || []
      });
    }
  });

  // Estimate calories endpoint (for frontend dynamic estimate)
  app.get('/api/estimate-calories', requireAuth, async (req, res) => {
    try {
      const { q, quantity, unit, intensity, oil_type, milk_type, spice_level, utensil_type } = req.query as any;
      if (!q || !quantity || !unit) return res.status(400).json({ message: 'q, quantity and unit are required' });

      // If utensil_type is provided and unit is 'pieces', attempt to convert quantity to grams using user calibration if available
      let usedBaseline = false;
      let nutr: any;
      try {
        let qty = parseFloat(quantity);
        let useUnit = unit;
        if (utensil_type && unit === 'pieces') {
          // try to get user calibration (we don't have userId here? we do via session)
          const userId = getUserId(req);
          let gramsPerUnit: number | undefined;
          try {
            const calibration = await storage.getUtensilCalibration(userId).catch(() => []);
            const found = calibration.find((c: any) => c.utensilType === utensil_type);
            if (found) gramsPerUnit = parseFloat(found.gramsPerUnit || '0');
          } catch (err) {
            // ignore
          }
          const defaults: Record<string, number> = {
            'Small Bowl (~100ml)': 100,
            'Medium Bowl (~150ml)': 150,
            'Large Bowl (~250ml)': 250,
            'Plate (~300ml)': 300,
            'Glass (~200ml)': 200,
          };
          if (!gramsPerUnit) gramsPerUnit = defaults[utensil_type as string];
          if (gramsPerUnit) {
            qty = qty * gramsPerUnit;
            useUnit = 'grams';
          }
        }

        nutr = await nutritionService.getNutrition(q, qty, useUnit);
      } catch (err) {
        // If Nutritionix fails, try to use baseline
        const baseline = await storage.getUserMealBaseline(getUserId(req), (q || '').toString()).catch(() => undefined);
        if (baseline && baseline.baselineCalories) {
          usedBaseline = true;
          const baseCalories = parseFloat(baseline.baselineCalories || '0');
          nutr = { calories: baseCalories, protein: 0, carbs: 0, fat: 0 };
        } else {
          throw err;
        }
      }

      // Apply multipliers
      const oilMul = (oil_type && OIL_MULTIPLIERS && (OIL_MULTIPLIERS as any)[oil_type]) || 1.0;
      const milkMul = (milk_type && MILK_MULTIPLIERS && (MILK_MULTIPLIERS as any)[milk_type]) || 1.0;
      const intensityMul = (intensity && INTENSITY_MULTIPLIERS && (INTENSITY_MULTIPLIERS as any)[intensity]) || 1.0;
      const adjusted = Math.round(nutr.calories * oilMul * milkMul * intensityMul);
      // Return expanded nutrition info so frontend can classify healthiness more reliably
      res.json({
        base_calories: nutr.calories,
        adjusted_calories: adjusted,
        used_baseline: usedBaseline,
        protein: nutr.protein || 0,
        carbs: nutr.carbs || 0,
        fat: nutr.fat || 0,
        fiber: nutr.fiber || 0,
        sugar: nutr.sugar || 0,
        sodium: nutr.sodium || 0,
      });
    } catch (err: any) {
      console.error('Estimate calories error:', err);
      res.status(500).json({ message: 'Failed to estimate calories' });
    }
  });

  // Mood logging endpoint
  app.post('/api/mood-log', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const moodData = moodLogSchema.parse(req.body);
      
      // Create mood log entry
      const moodLog = await storage.createMoodLog({
        userId,
        foodLogId: moodData.foodLogId || null,
        mood: moodData.mood,
        reason: moodData.reason || null,
      });

      res.json({
        message: "Mood logged successfully",
        moodLog,
      });
    } catch (error: any) {
      console.error("Error logging mood:", error);
      res.status(400).json({ 
        message: error.message || "Failed to log mood",
        errors: error.errors || []
      });
    }
  });

  app.get('/api/daily-log', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      
      const dailySummary = await storage.getDailyNutritionSummary(userId, date);
      
      res.json({
        date: date.toISOString().split('T')[0],
        totalCalories: Math.round(dailySummary.totalCalories),
        totalProtein: Math.round(dailySummary.totalProtein * 100) / 100,
        totalCarbs: Math.round(dailySummary.totalCarbs * 100) / 100,
        totalFat: Math.round(dailySummary.totalFats * 100) / 100,
        meals: dailySummary.meals.map(meal => ({
          id: meal.id,
          mealName: meal.mealName,
          mealType: meal.mealType,
          quantity: parseFloat(meal.quantity || "0"),
          unit: meal.unit,
          calories: Math.round(parseFloat(meal.calories || "0")),
          protein: Math.round((parseFloat(meal.protein || "0")) * 100) / 100,
          carbs: Math.round((parseFloat(meal.carbs || "0")) * 100) / 100,
          fat: Math.round((parseFloat(meal.fat || "0")) * 100) / 100,
          loggedAt: meal.loggedAt,
        })),
      });
    } catch (error) {
      console.error("Error fetching daily log:", error);
      res.status(500).json({ message: "Failed to fetch daily log" });
    }
  });

  // Food search endpoint for meal modal
  app.get('/api/food-search', requireAuth, async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json({ common: [] });
      }
      
      const searchResults = await nutritionService.searchFoods(query);
      res.json(searchResults);
    } catch (error) {
      console.error("Error searching foods:", error);
      res.status(500).json({ message: "Failed to search foods" });
    }
  });

  // Water logging routes
  app.get('/api/water-logs', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      const logs = await storage.getWaterLogs(userId, date);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching water logs:", error);
      res.status(500).json({ message: "Failed to fetch water logs" });
    }
  });

  app.post('/api/water-logs', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { date, ...rest } = req.body;
      const logData = { 
        ...rest, 
        userId,
        date: new Date(date)
      };
      const log = await storage.createWaterLog(logData);
      res.json(log);
    } catch (error) {
      console.error("Error creating water log:", error);
      res.status(500).json({ message: "Failed to create water log" });
    }
  });

  // Weight tracking routes
  app.get('/api/weight-logs', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const logs = await storage.getWeightLogs(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching weight logs:", error);
      res.status(500).json({ message: "Failed to fetch weight logs" });
    }
  });

  app.post('/api/weight-logs', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const logData = { ...req.body, userId };
      const log = await storage.createWeightLog(logData);
      res.json(log);
    } catch (error) {
      console.error("Error creating weight log:", error);
      res.status(500).json({ message: "Failed to create weight log" });
    }
  });

  // Appointment routes
  app.get('/api/appointments', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const appointments = await storage.getAppointments(userId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      console.error("Error creating appointment:", error);
      const msg = (error && (error as any).message) ? (error as any).message : 'Failed to create appointment';
      res.status(500).json({ message: msg });
    }
  });

  app.post('/api/appointments', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const appointmentData = { ...req.body, userId };
      const appointment = await storage.createAppointment(appointmentData);

      // Fetch user and nutritionist info
      const user = await storage.getUser(userId);
      // Find nutritionist userId from nutritionists table
      const nutritionistProfile = await storage.getNutritionists();
      const nutritionist = nutritionistProfile.find(n => n.id === appointmentData.nutritionistId);
      let nutritionistUser: any = null;
      if (nutritionist) {
        nutritionistUser = await storage.getUser(nutritionist.userId);
      }
      if (user && nutritionistUser && nutritionistUser.email) {
        // Fetch health data
        const [foodLogs, waterLogs, weightLogs, profile] = await Promise.all([
          storage.getFoodLogs(userId),
          storage.getWaterLogs(userId),
          storage.getWeightLogs(userId),
          storage.getUserProfile(userId),
        ]);
        // Build report
        const report = {
          user: {
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            email: user.email,
            age: user.age,
            gender: user.gender,
            profile,
          },
          createdAt: new Date().toISOString(),
          foodLogs,
          waterLogs,
          weightLogs,
        };
        // Send email with JSON attachment
        await sendMail({
          to: nutritionistUser.email,
          subject: `New Appointment: ${user.firstName || ''} ${user.lastName || ''}`,
          text: `A new appointment has been booked. The user's health report is attached.`,
          attachments: [
            {
              filename: `health-report-${userId}.json`,
              content: Buffer.from(JSON.stringify(report, null, 2)),
              contentType: 'application/json',
            },
          ],
        });
      }
      res.json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

    // Nutritionist: get appointments assigned to them (default: pending)
    app.get('/api/nutritionist/appointments', requireAuth, async (req: any, res) => {
      try {
        const userId = getUserId(req);
        // Find nutritionist profile for this user
        const nutritionistsList = await storage.getNutritionists();
        const nutritionist = (nutritionistsList || []).find((n: any) => String(n.userId) === String(userId));
        if (!nutritionist) return res.status(403).json({ message: 'Not a nutritionist' });

        const appointments = await storage.getNutritionistAppointments(nutritionist.id);
        // By default, return pending first
        const pendingFirst = (appointments || []).sort((a: any, b: any) => {
          const order = { pending: 0, confirmed: 1, completed: 2, cancelled: 3 } as any;
          return (order[a.status] || 9) - (order[b.status] || 9) || new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        });
        res.json(pendingFirst);
      } catch (error) {
        console.error('Error fetching nutritionist appointments:', error);
        res.status(500).json({ message: 'Failed to fetch appointments' });
      }
    });

    // Nutritionist decision endpoint: accept or reject an appointment
    app.post('/api/nutritionist/appointments/:id/decision', requireAuth, async (req: any, res) => {
      try {
        const userId = getUserId(req);
        const appointmentId = req.params.id;
        const { action } = req.body || {}; // expected 'accept' or 'reject'

        if (!action || !['accept', 'reject', 'cancel'].includes(action)) {
          return res.status(400).json({ message: 'Invalid action' });
        }

        // Find nutritionist profile for this user
        const nutritionistsList = await storage.getNutritionists();
        const nutritionist = (nutritionistsList || []).find((n: any) => String(n.userId) === String(userId));
        if (!nutritionist) return res.status(403).json({ message: 'Not a nutritionist' });

        // Fetch the appointment and ensure it belongs to this nutritionist
        const appts = await storage.getNutritionistAppointments(nutritionist.id);
        const appointment = (appts || []).find((a: any) => String(a.id) === String(appointmentId));
        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

        let newStatus = 'pending';
        if (action === 'accept') newStatus = 'confirmed';
        if (action === 'reject' || action === 'cancel') newStatus = 'cancelled';

        await storage.updateAppointmentStatus(appointmentId, newStatus);

        // Notify the user
        try {
          await storage.createNotification({
            userId: appointment.userId,
            type: 'appointment',
            title: `Appointment ${newStatus}`,
            message: `Your appointment scheduled on ${new Date(appointment.scheduledAt).toLocaleString()} has been ${newStatus}.`,
            data: { appointmentId },
          });
        } catch (nerr) {
          console.warn('Failed to create notification for appointment decision:', nerr);
        }

        // Send email to the user informing about the decision
        try {
          const user = await storage.getUser(appointment.userId);
          if (user && user.email) {
            await sendMail({
              to: user.email,
              subject: `Your appointment has been ${newStatus}`,
              text: `Hello ${user.firstName || ''},\n\nYour appointment scheduled on ${new Date(appointment.scheduledAt).toLocaleString()} has been ${newStatus} by the nutritionist.\n\nRegards,\nNutriCare++`,
            });
          }
        } catch (e) {
          console.warn('Failed to send email for appointment decision:', e);
        }

        res.json({ message: 'OK', status: newStatus });
      } catch (error) {
        console.error('Error processing nutritionist decision:', error);
        res.status(500).json({ message: 'Failed to process decision' });
      }
    });

  app.get('/api/nutritionists', requireAuth, async (req, res) => {
    try {
      const nutritionists = await storage.getNutritionists();
      res.json(nutritionists);
    } catch (error) {
      console.error("Error fetching nutritionists:", error);
      res.status(500).json({ message: "Failed to fetch nutritionists" });
    }
  });

  // User: reschedule an appointment (request change) -> sets status to 'pending' and notifies nutritionist
  app.post('/api/appointments/:id/reschedule', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const appointmentId = req.params.id;
      const { scheduledAt } = req.body || {};
      if (!scheduledAt) return res.status(400).json({ message: 'scheduledAt is required' });

      const appt = await storage.getAppointmentById(appointmentId);
      if (!appt) return res.status(404).json({ message: 'Appointment not found' });

      // Allow reschedule by the user who booked OR by the assigned nutritionist user
      const nutritionistsList = await storage.getNutritionists();
      const nutritionist = (nutritionistsList || []).find((n: any) => String(n.id) === String(appt.nutritionistId));
      const actorIsNutritionist = nutritionist && String(nutritionist.userId) === String(userId);
      const actorIsOwner = String(appt.userId) === String(userId);
      if (!actorIsOwner && !actorIsNutritionist) return res.status(403).json({ message: 'Not allowed' });

      // Coerce scheduledAt
      const newDate = new Date(scheduledAt);
      if (isNaN(newDate.getTime())) return res.status(400).json({ message: 'Invalid date' });

      await storage.updateAppointmentSchedule(appointmentId, newDate);

      // Notify the opposite party depending on who initiated the change
      try {
        if (actorIsOwner && nutritionist) {
          // user initiated -> notify nutritionist
          await storage.createNotification({
            userId: nutritionist.userId,
            type: 'appointment',
            title: 'Reschedule Request',
            message: `User requested to reschedule appointment ${appointmentId} to ${newDate.toLocaleString()}`,
            data: { appointmentId },
          });

          const nutrUser = await storage.getUser(nutritionist.userId);
          if (nutrUser && nutrUser.email) {
            await sendMail({
              to: nutrUser.email,
              subject: 'Reschedule request for appointment',
              text: `User has requested to reschedule appointment on ${newDate.toLocaleString()}. Please review and accept or reject the request.`,
            }).catch(()=>{});
          }
        } else if (actorIsNutritionist) {
          // nutritionist initiated -> notify user
          await storage.createNotification({
            userId: appt.userId,
            type: 'appointment',
            title: 'Appointment time updated',
            message: `Your appointment ${appointmentId} has been moved to ${newDate.toLocaleString()} by the nutritionist.`,
            data: { appointmentId },
          });

          const user = await storage.getUser(appt.userId);
          if (user && user.email) {
            const subject = `Your appointment time was updated — ${newDate.toLocaleString()}`;
            const html = `
              <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:20px;">
                <div style="text-align:center; margin-bottom:20px;">
                  <div style="background:linear-gradient(135deg,#10B981,#34D399); width:72px; height:72px; border-radius:50%; margin:0 auto 12px; display:flex; align-items:center; justify-content:center;">
                    <span style="color:white; font-size:30px;">🌿</span>
                  </div>
                  <h2 style="color:#065f46; margin:0;">Your appointment time has been updated</h2>
                </div>
                <div style="background:#f8fffe; border:1px solid #d1fae5; border-radius:12px; padding:18px;">
                  <p style="color:#374151; line-height:1.6;">Hi ${user.firstName || 'there'},</p>
                  <p style="color:#374151; line-height:1.6;">The nutritionist has updated your consultation to <strong>${newDate.toLocaleString()}</strong>. This appointment will be an <strong>offline (in-person)</strong> consultation — please be prepared to attend at the scheduled location.</p>
                  <p style="color:#374151; line-height:1.6;">If this time doesn't work for you, you may reschedule from your Appointments page.</p>
                </div>
                <div style="text-align:center; margin-top:18px; color:#9ca3af; font-size:12px;">© ${new Date().getFullYear()} NutriCare++. Healthy eating, happier you.</div>
              </div>
            `;
            sendMail({ to: user.email, subject, html }).catch((e) => {
              console.warn('Failed to send nutritionist-initiated reschedule email to user:', e);
            });
          }
        }
      } catch (nerr) {
        console.warn('Failed to create notifications about reschedule:', nerr);
      }

      res.json({ message: 'Reschedule requested' });
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      res.status(500).json({ message: 'Failed to reschedule' });
    }
  });

  // Community routes
  app.get('/api/community/posts', requireAuth, async (req, res) => {
    try {
      const posts = await storage.getCommunityPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching community posts:", error);
      res.status(500).json({ message: "Failed to fetch community posts" });
    }
  });

  app.post('/api/community/posts', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const postData = { ...req.body, userId };
      const post = await storage.createCommunityPost(postData);
      res.json(post);
    } catch (error) {
      console.error("Error creating community post:", error);
      res.status(500).json({ message: "Failed to create community post" });
    }
  });

  app.post('/api/community/posts/:id/like', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const postId = req.params.id;
      await storage.togglePostLike(userId, postId);
      res.json({ message: "Like toggled successfully" });
    } catch (error) {
      console.error("Error toggling like:", error);
      res.status(500).json({ message: "Failed to toggle like" });
    }
  });

  // Friends routes
  app.get('/api/friends', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const friends = await storage.getFriends(userId);
      res.json(friends);
    } catch (error) {
      console.error("Error fetching friends:", error);
      res.status(500).json({ message: "Failed to fetch friends" });
    }
  });

  // Send friend request by email
  app.post('/api/friends/request', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { email } = req.body || {};
      if (!email) return res.status(400).json({ message: 'email is required' });
      const target = await storage.getUserByEmail(String(email).trim().toLowerCase());
      if (!target) return res.status(404).json({ message: 'User not found' });
      if (target.id === userId) return res.status(400).json({ message: "Cannot add yourself" });

      await storage.sendFriendRequest(userId, target.id);
      res.json({ message: 'Friend request sent' });
    } catch (err: any) {
      console.error('Error sending friend request:', err);
      res.status(500).json({ message: 'Failed to send friend request' });
    }
  });

  // Accept a friend request (followerId is the id of the requester)
  app.post('/api/friends/accept', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { followerId } = req.body || {};
      if (!followerId) return res.status(400).json({ message: 'followerId is required' });

      await storage.acceptFriendRequest(String(followerId), userId);
      res.json({ message: 'Friend request accepted' });
    } catch (err: any) {
      console.error('Error accepting friend request:', err);
      res.status(500).json({ message: 'Failed to accept friend request' });
    }
  });

  // Remove friendship (either direction)
  app.delete('/api/friends', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { userId: otherId } = req.body || {};
      if (!otherId) return res.status(400).json({ message: 'userId is required in body' });

      await storage.removeFriendship(userId, String(otherId));
      res.json({ message: 'Friend removed' });
    } catch (err: any) {
      console.error('Error removing friendship:', err);
      res.status(500).json({ message: 'Failed to remove friendship' });
    }
  });

  // Discover candidates
  app.get('/api/friends/discover', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const candidates = await storage.getDiscoverCandidates(userId);
      res.json(candidates);
    } catch (err: any) {
      console.error('Error fetching discover candidates:', err);
      res.status(500).json({ message: 'Failed to fetch candidates' });
    }
  });

  // Debug endpoint to inspect raw discover candidates (for development)
  app.get('/api/friends/discover-debug', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      // For debugging, return the raw users table rows (recent) and the candidate list
      const recentUsers = await db.select().from(users).orderBy(desc(users.createdAt)).limit(100);
      const candidates = await storage.getDiscoverCandidates(userId);
      res.json({ recentCount: recentUsers.length, recentUsers: recentUsers.slice(0, 20), candidatesCount: candidates.length, candidates: candidates.slice(0, 50) });
    } catch (err: any) {
      console.error('Discover debug error:', err);
      res.status(500).json({ message: 'Discover debug failed' });
    }
  });

  app.get('/api/friends/activity', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const activity = await storage.getFriendActivity(userId);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching friend activity:", error);
      res.status(500).json({ message: "Failed to fetch friend activity" });
    }
  });

  // Notifications routes
  app.get('/api/notifications', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post('/api/notifications/:id/read', requireAuth, async (req: any, res) => {
    try {
      const id = req.params.id;
      await storage.markNotificationRead(id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Chat routes
  app.get('/api/chat/conversations', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const conversations = await storage.getChatConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/chat/conversations', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { title, language } = req.body;
      const conversation = await storage.createChatConversation(userId, title, language);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get('/api/chat/conversations/:id/messages', requireAuth, async (req, res) => {
    try {
      const conversationId = req.params.id;
      const messages = await storage.getChatMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/chat/conversations/:id/messages', requireAuth, async (req: any, res) => {
    try {
      const conversationId = req.params.id;
      const { content, language = "en" } = req.body;
      
      // Save user message
      const userMessage = await storage.createChatMessage({
        conversationId,
        role: "user",
        content,
      });

      // Get conversation history
      const messages = await storage.getChatMessages(conversationId);
      const chatHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Generate AI response
      let assistantContent = '';

      // Prefer Python NLP chatbot service if available (no OpenAI required)
      const pythonChatUrl = process.env.PYTHON_CHATBOT_URL || 'http://localhost:9000';
      try {
        const resp = await fetch(`${pythonChatUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: req.session?.userId || null, message: content, lang: language }),
        });
        if (resp.ok) {
          const json = await resp.json();
          assistantContent = json.reply || json.message || '';
        } else {
          console.warn('Python chatbot returned non-OK:', resp.status);
        }
      } catch (err) {
  console.warn('Python chatbot not reachable, falling back to OpenAI backend:', String(err));
      }

      // Fallback to OpenAI-based generator if python service didn't provide an answer
      if (!assistantContent) {
        const aiResponse = await generateChatResponse(chatHistory, language);
        assistantContent = aiResponse.message;
      }

      // Save AI response
      const assistantMessage = await storage.createChatMessage({
        conversationId,
        role: "assistant",
        content: assistantContent,
      });

      res.json({
        userMessage,
        assistantMessage,
      });
    } catch (error) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // User preferences routes
  app.patch('/api/user/preferences', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { language, theme } = req.body;

      const updatedUser = await storage.upsertUser({
        language,
        theme,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // Calibration routes
  app.post('/api/calibration/save', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { calibrationData } = req.body;

      if (!Array.isArray(calibrationData) || calibrationData.length === 0) {
        return res.status(400).json({ message: "Invalid calibration data" });
      }

      // Verify user is verified
      const user = await storage.getUser(userId);
      if (!user || !user.isVerified) {
        return res.status(403).json({ message: "User not verified" });
      }

      // Validate and save each utensil calibration
      for (const utensil of calibrationData) {
        if (!utensil.utensilType || typeof utensil.gramsPerUnit !== 'number') {
          return res.status(400).json({ message: "Invalid utensil data format" });
        }

        // Validate positive values
        if (utensil.gramsPerUnit <= 0) {
          return res.status(400).json({ message: "Grams per unit must be positive" });
        }

        await storage.saveUtensilCalibration(
          userId,
          utensil.utensilType,
          utensil.gramsPerUnit
        );
      }

      res.json({
        status: "success",
        message: "Calibration saved successfully"
      });
    } catch (error) {
      console.error("Error saving calibration:", error);
      res.status(500).json({ message: "Failed to save calibration" });
    }
  });

  app.get('/api/calibration', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const calibration = await storage.getUtensilCalibration(userId);

      // If no calibration exists, return defaults
      if (calibration.length === 0) {
        return res.json({
          calibration: [
            { utensilType: 'spoon', gramsPerUnit: 5 },
            { utensilType: 'bowl', gramsPerUnit: 150 },
            { utensilType: 'cup', gramsPerUnit: 240 }
          ],
          isDefault: true
        });
      }

      res.json({
        calibration: calibration.map(c => ({
          utensilType: c.utensilType,
          gramsPerUnit: parseFloat(c.gramsPerUnit || '0')
        })),
        isDefault: false
      });
    } catch (error) {
      console.error("Error fetching calibration:", error);
      res.status(500).json({ message: "Failed to fetch calibration" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
