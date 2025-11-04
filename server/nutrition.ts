import { z } from "zod";

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
  cookingIntensity: z.enum(["Less Oil", "Normal", "More Oil", "Extra Ghee"]).optional().default("Normal"),
});

export type AddMealData = z.infer<typeof addMealSchema>;

class NutritionService {
  private apiKey?: string;
  private appId?: string;
  private baseUrl = "https://trackapi.nutritionix.com/v2";

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
   */
  async getNutrition(foodName: string, quantity: number, unit: string): Promise<NutritionData> {
    try {
      this.initializeCredentials();
      const makeNutrientsRequest = async (queryText: string) => {
        const resp = await fetch(`${this.baseUrl}/natural/nutrients`, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({ query: queryText }),
        });
        return resp;
      };

      // First try using the raw provided name
      let response = await makeNutrientsRequest(`${quantity} ${unit} ${foodName}`);

      if (!response.ok) {
        // capture body for debugging
        let bodyText = '';
        try {
          bodyText = await response.text();
        } catch (e) {
          bodyText = '<failed to read body>';
        }
        console.error(`Nutritionix API returned ${response.status} ${response.statusText}: ${bodyText}`);

        // If Nutritionix couldn't match the food, attempt a search lookup and retry with the common name
        try {
          const searchResults = await this.searchFoods(foodName);
          const common = searchResults?.common?.[0];
          if (common && common.food_name) {
            const altQuery = `${quantity} ${unit} ${common.food_name}`;
            console.info(`Nutritionix: retrying nutrients request with common name: ${altQuery}`);
            response = await makeNutrientsRequest(altQuery);
          }
        } catch (searchErr) {
          console.warn('Nutritionix search fallback failed:', searchErr);
        }
      }

      // If still not OK after fallback attempts, log and return zeros
      if (!response.ok) {
        let bodyText = '';
        try { bodyText = await response.text(); } catch (e) { bodyText = '<failed to read body>'; }
        console.error(`Nutritionix nutrients final failure: ${response.status} ${response.statusText}: ${bodyText}`);
        return {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
          sodium: 0,
        } as NutritionData;
      }

      const data = await response.json();
      const food = data.foods?.[0] as NutritionixFood;

      if (!food) {
        throw new Error("Food not found in nutrition database. Please try a different food name.");
      }

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
      console.error("Error getting nutrition data:", error);
      if (error instanceof Error && error.message.includes("credentials not configured")) {
        throw error; // Re-throw credential errors with original message
      }
      throw new Error("Failed to get nutrition data. Please try again later.");
    }
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