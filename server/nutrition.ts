import { z } from "zod";
import { db } from "./db";
import { foodItems } from "@shared/schema";
import { sql, or } from "drizzle-orm";

// Nutritionix API types
export interface NutritionixFood {
  food_name: string;
  serving_qty: number;
  serving_unit: string;
  nf_calories: number;
  nf_total_fat: number;
  nf_total_carbohydrate: number;
  nf_protein: number;
  nf_dietary_fiber: number;
  nf_sugars: number;
  nf_sodium: number;
}

export interface NutritionixSearchResult {
  common: Array<{
    food_name: string;
    serving_unit: string;
    tag_name: string;
    serving_qty: number;
    common_type: string | null;
    tag_id: string;
    photo: {
      thumb: string;
    };
  }>;
}

// USDA FoodData Central API types
export interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  value: number;
}

export interface USDAFoodNutrient {
  type: string;
  nutrient: {
    id: number;
    number: string;
    name: string;
    rank: number;
    unitName: string;
  };
  amount: number;
}

export interface USDAFood {
  fdcId: number;
  description: string;
  foodNutrients: USDAFoodNutrient[];
}

export interface USDASearchResult {
  foods: USDAFood[];
  totalHits: number;
  currentPage: number;
  totalPages: number;
}

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

// Input validation schemas
export const addMealSchema = z.object({
  mealName: z.string().min(1, "Meal name is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.enum(["grams", "ml", "cups", "pieces", "oz", "tbsp", "tsp"]),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  cookingIntensity: z.enum([
    "Boiled/Steamed",
    "Lightly Fried",
    "Normal",
    "Deep Fried",
    "Less Oil",
    "More Oil",
    "Extra Ghee" // Added more options to match client
  ]).optional().default("Normal"),
  oilType: z.string().optional().default("No Oil"),
  milkType: z.string().optional().default("None"),
  sugarType: z.string().optional().default("No Sugar"),
  spiceLevel: z.string().optional().default("Normal"),
  utensilType: z.string().optional().default("Medium Bowl (~150ml)"),
});

export type AddMealData = z.infer<typeof addMealSchema>;

class NutritionService {
  private apiKey?: string;
  private appId?: string;
  private baseUrl = "https://trackapi.nutritionix.com/v2";
  private usdaApiKey?: string;
  private usdaBaseUrl = "https://api.nal.usda.gov/fdc/v1";

  constructor() {
    // Lazy initialization - don't throw errors on construction
  }

  private initializeCredentials() {
    if (!this.apiKey || !this.appId) {
      this.apiKey = process.env.NUTRITIONIX_API_KEY;
      this.appId = process.env.NUTRITIONIX_APP_ID;
    }
    
    if (!this.apiKey || !this.appId) {
      throw new Error("Nutritionix API credentials not configured. Please contact your administrator to set up nutrition tracking functionality.");
    }
  }

  private initializeUsdaCredentials() {
    if (!this.usdaApiKey) {
      this.usdaApiKey = process.env.USDA_API_KEY;
    }
    
    if (!this.usdaApiKey) {
      throw new Error("USDA API credentials not configured. Please contact your administrator to set up nutrition tracking functionality.");
    }
  }

  private getHeaders() {
    this.initializeCredentials();
    return {
      "Content-Type": "application/json",
      "x-app-id": this.appId!,
      "x-app-key": this.apiKey!,
    };
  }

  /**
   * Search for food items in Nutritionix database
   */
  async searchFoods(query: string): Promise<NutritionixSearchResult> {
    try {
      this.initializeCredentials();
      const response = await fetch(`${this.baseUrl}/search/instant?query=${encodeURIComponent(query)}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Nutritionix API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error searching foods:", error);
      if (error instanceof Error && error.message.includes("credentials not configured")) {
        throw error; // Re-throw credential errors with original message
      }
      throw new Error("Failed to search foods. Please try again later.");
    }
  }

  /**
   * Get detailed nutrition information for a specific food
   * Fallback chain: Nutritionix → Neon Database → USDA API
   * 
   * 1. First tries Nutritionix API
   * 2. If Nutritionix fails, searches Neon PostgreSQL database
   * 3. If database has no match, falls back to USDA FoodData Central API
   */
  async getNutrition(foodName: string, quantity: number, unit: string): Promise<NutritionData> {
    try {
      this.initializeCredentials();
      const response = await fetch(`${this.baseUrl}/natural/nutrients`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          query: `${quantity} ${unit} ${foodName}`,
        }),
      });

      if (!response.ok) {
        // capture body for debugging
        let bodyText = '';
        try {
          bodyText = await response.text();
        } catch (e) {
          bodyText = '<failed to read body>';
        }
        console.error(`❌ Nutritionix API returned ${response.status} ${response.statusText}: ${bodyText}`);
        
        // Try database fallback first
        console.log("🔄 Attempting Neon database fallback...");
        try {
          return await this.getNutritionFromDatabase(foodName, quantity, unit);
        } catch (dbError) {
          console.error("❌ Database fallback failed, trying USDA...");
          return await this.getNutritionFromUSDA(foodName, quantity, unit);
        }
      }

      const data = await response.json();
      const food = data.foods?.[0] as NutritionixFood;

      if (!food) {
        console.log("🔄 Food not found in Nutritionix, trying database fallback...");
        try {
          return await this.getNutritionFromDatabase(foodName, quantity, unit);
        } catch (dbError) {
          console.error("❌ Database fallback failed, trying USDA...");
          return await this.getNutritionFromUSDA(foodName, quantity, unit);
        }
      }

      console.log(`✅ Found food in Nutritionix: ${food.food_name}`);
      return {
        calories: Math.round(food.nf_calories || 0),
        protein: Math.round((food.nf_protein || 0) * 100) / 100,
        carbs: Math.round((food.nf_total_carbohydrate || 0) * 100) / 100,
        fat: Math.round((food.nf_total_fat || 0) * 100) / 100,
        fiber: Math.round((food.nf_dietary_fiber || 0) * 100) / 100,
        sugar: Math.round((food.nf_sugars || 0) * 100) / 100,
        sodium: Math.round((food.nf_sodium || 0) * 100) / 100,
      };
    } catch (error) {
      console.error("❌ Error getting nutrition data from Nutritionix:", error);
      
      // Try database fallback first
      try {
        console.log("🔄 Attempting Neon database fallback...");
        return await this.getNutritionFromDatabase(foodName, quantity, unit);
      } catch (dbError) {
        console.error("❌ Database fallback failed:", dbError);
        
        // Finally try USDA fallback
        try {
          console.log("🔄 Attempting USDA FoodData Central API fallback...");
          return await this.getNutritionFromUSDA(foodName, quantity, unit);
        } catch (usdaError) {
          console.error("❌ All fallback methods failed:", usdaError);
          if (error instanceof Error && error.message.includes("credentials not configured")) {
            throw error; // Re-throw credential errors with original message
          }
          throw new Error("Failed to get nutrition data from all sources (Nutritionix, Database, and USDA). Please try again later.");
        }
      }
    }
  }

  /**
   * Get nutrition information from Neon PostgreSQL database
   * Searches food_items table using Drizzle ORM
   */
  private async getNutritionFromDatabase(foodName: string, quantity: number, unit: string): Promise<NutritionData> {
    try {
      console.log(`🔍 Searching database for: "${foodName}"`);
      
      // First try exact match (case-insensitive)
      let results = await db
        .select()
        .from(foodItems)
        .where(sql`LOWER(${foodItems.name}) = LOWER(${foodName})`)
        .limit(1);

      // If no exact match, try partial match (ILIKE)
      if (results.length === 0) {
        console.log(`No exact match found, trying partial match for: "${foodName}"`);
        results = await db
          .select()
          .from(foodItems)
          .where(sql`${foodItems.name} ILIKE ${`%${foodName}%`}`)
          .limit(1);
      }

      if (results.length === 0) {
        console.error(`❌ Food "${foodName}" not found in database`);
        throw new Error(`Food "${foodName}" not found in database`);
      }

      const food = results[0];
      console.log(`✅ Found food in database: "${food.name}"`);

      // Extract nutrition data per 100g from database
      const caloriesPer100g = parseFloat(food.caloriesPer100g || "0");
      const proteinPer100g = parseFloat(food.proteinPer100g || "0");
      const carbsPer100g = parseFloat(food.carbsPer100g || "0");
      const fatsPer100g = parseFloat(food.fatsPer100g || "0");
      const fiberPer100g = parseFloat(food.fiberPer100g || "0");
      const sugarPer100g = parseFloat(food.sugarPer100g || "0");
      const sodiumPer100g = parseFloat(food.sodiumPer100g || "0");

      console.log(`📊 Nutrition per 100g - Calories: ${caloriesPer100g}, Protein: ${proteinPer100g}g, Carbs: ${carbsPer100g}g, Fat: ${fatsPer100g}g`);

      // Calculate scale factor based on quantity and unit
      const scaleFactor = this.getScaleFactor(quantity, unit);
      console.log(`📏 Scale factor for ${quantity} ${unit}: ${scaleFactor.toFixed(2)}`);

      const result = {
        calories: Math.round(caloriesPer100g * scaleFactor),
        protein: Math.round(proteinPer100g * scaleFactor * 100) / 100,
        carbs: Math.round(carbsPer100g * scaleFactor * 100) / 100,
        fat: Math.round(fatsPer100g * scaleFactor * 100) / 100,
        fiber: Math.round(fiberPer100g * scaleFactor * 100) / 100,
        sugar: Math.round(sugarPer100g * scaleFactor * 100) / 100,
        sodium: Math.round(sodiumPer100g * scaleFactor * 100) / 100,
      };

      console.log(`✅ Final nutrition for ${quantity} ${unit}: Calories: ${result.calories}, Protein: ${result.protein}g`);
      return result;
    } catch (error) {
      console.error("❌ Error getting nutrition data from database:", error);
      throw error;
    }
  }

  /**
   * Get nutrition information from USDA FoodData Central API
   * Extracts calories from "Energy" nutrient with "kcal" unit
   * Made public to support scan food label feature
   */
  async getNutritionFromUSDA(foodName: string, quantity: number, unit: string): Promise<NutritionData> {
    try {
      this.initializeUsdaCredentials();
      
      // Search for the food item
      const searchUrl = `${this.usdaBaseUrl}/foods/search?api_key=${this.usdaApiKey}&query=${encodeURIComponent(foodName)}&pageSize=1`;
      const searchResponse = await fetch(searchUrl);

      if (!searchResponse.ok) {
        throw new Error(`USDA API error: ${searchResponse.status} ${searchResponse.statusText}`);
      }

      const searchData = await searchResponse.json() as USDASearchResult;
      
      if (!searchData.foods || searchData.foods.length === 0) {
        throw new Error("Food not found in USDA database. Please try a different food name.");
      }

      const food = searchData.foods[0];
      const nutrients = food.foodNutrients || [];

      // Extract calories from "Energy" nutrient with "kcal" unit
      let calories = 0;
      const energyNutrient = nutrients.find(n => 
        n?.nutrient?.name?.toLowerCase().includes('energy') && 
        n?.nutrient?.unitName?.toLowerCase() === 'kcal'
      );
      
      if (energyNutrient) {
        calories = energyNutrient.amount;
      }

      // Extract other nutrients by name matching
      const proteinNutrient = nutrients.find(n => 
        n?.nutrient?.name?.toLowerCase().includes('protein')
      );
      const fatNutrient = nutrients.find(n => 
        n?.nutrient?.name?.toLowerCase().includes('total lipid') || 
        n?.nutrient?.name?.toLowerCase().includes('fat, total')
      );
      const carbsNutrient = nutrients.find(n => 
        n?.nutrient?.name?.toLowerCase().includes('carbohydrate')
      );
      const fiberNutrient = nutrients.find(n => 
        n?.nutrient?.name?.toLowerCase().includes('fiber')
      );
      const sugarNutrient = nutrients.find(n => 
        n?.nutrient?.name?.toLowerCase().includes('sugars, total')
      );
      const sodiumNutrient = nutrients.find(n => 
        n?.nutrient?.name?.toLowerCase().includes('sodium')
      );

      // Keep sodium in mg (USDA already provides in mg)
      const sodiumValue = sodiumNutrient?.amount || 0;

      // Scale nutrients based on quantity and unit
      const scaleFactor = this.getScaleFactor(quantity, unit);

      console.log(`📊 USDA Raw nutrition (per 100g): Calories: ${calories}, Protein: ${proteinNutrient?.amount || 0}g, Fat: ${fatNutrient?.amount || 0}g, Carbs: ${carbsNutrient?.amount || 0}g, Fiber: ${fiberNutrient?.amount || 0}g, Sugar: ${sugarNutrient?.amount || 0}g, Sodium: ${sodiumValue}mg`);

      return {
        calories: Math.round((calories || 0) * scaleFactor),
        protein: Math.round((proteinNutrient?.amount || 0) * scaleFactor * 100) / 100,
        carbs: Math.round((carbsNutrient?.amount || 0) * scaleFactor * 100) / 100,
        fat: Math.round((fatNutrient?.amount || 0) * scaleFactor * 100) / 100,
        fiber: Math.round((fiberNutrient?.amount || 0) * scaleFactor * 100) / 100,
        sugar: Math.round((sugarNutrient?.amount || 0) * scaleFactor * 100) / 100,
        sodium: Math.round(sodiumValue * scaleFactor * 100) / 100,
      };
    } catch (error) {
      console.error("Error getting nutrition data from USDA:", error);
      if (error instanceof Error && error.message.includes("credentials not configured")) {
        throw error;
      }
      throw new Error("Failed to get nutrition data from USDA API. Please try again later.");
    }
  }

  /**
   * Calculate scale factor for unit conversion
   * USDA data is typically per 100g, so we need to scale appropriately
   */
  private getScaleFactor(quantity: number, unit: string): number {
    // Basic unit conversions to grams
    const conversions: { [key: string]: number } = {
      grams: 1,
      g: 1,
      ml: 1, // Approximation for most liquids
      oz: 28.35,
      tbsp: 15,
      tsp: 5,
      cups: 240,
      cup: 240,
      pieces: 100, // Default assumption
      piece: 100,
    };

    const gramsPerUnit = conversions[unit.toLowerCase()] || 1;
    const totalGrams = quantity * gramsPerUnit;
    
    // USDA data is typically per 100g
    return totalGrams / 100;
  }

  /**
   * Convert units to grams for consistent storage
   */
  convertToGrams(quantity: number, unit: string, foodName: string): number {
    // Basic unit conversions - can be enhanced with more specific conversions
    const conversions: { [key: string]: number } = {
      grams: 1,
      ml: 1, // Approximation for most liquids
      oz: 28.35,
      tbsp: 15, // grams
      tsp: 5, // grams
      cups: 240, // grams (varies by food type)
      pieces: 100, // Default assumption, varies greatly
    };

    return quantity * (conversions[unit] || 1);
  }
}

export const nutritionService = new NutritionService();