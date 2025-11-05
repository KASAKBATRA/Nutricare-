
import React, { useEffect, useState } from 'react';

// OCR/label-scan removed per request

// Handle file upload
// (Removed duplicate handleLabelImageChange to avoid redeclaration error)

// --- API Response Types ---
interface Meal {
  id: string;
  mealName: string;
  mealType: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedAt: string;
}

interface DailyNutrition {
  meals: Meal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalWater: number;
}

interface WeightLog {
  weight: number;
  bmi: number;
  createdAt: string;
}

interface CommunityPostUser {
  firstName: string;
  lastName: string;
}

interface CommunityPost {
  user: CommunityPostUser;
  createdAt: string;
  imageUrl?: string;
  content: string;
  likesCount: number;
  commentsCount: number;
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  nutritionist: string;
}

interface Friend {
  id: string;
  name: string;
}
import { useLocation } from 'wouter';
import { Layout } from '@/components/Layout';
import { MealModal } from '@/components/MealModal';
import { WaterModal } from '@/components/WaterModal';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isUnauthorizedError } from '@/lib/authUtils';
import { apiRequest } from '@/lib/queryClient';
import { calculateNutritionRequirements, getGenderSpecificTips, getGenderSpecificFoods } from '@/lib/nutritionCalculator';
import { GenderSpecificMicronutrients } from '@/components/GenderSpecificMicronutrients';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

export default function Dashboard() {
  // OCR/label-scan removed per request
  // Define a User type with at least firstName property
  interface User {
    firstName?: string;
    lastName?: string;
    // add other properties as needed
  }
  const { user, isAuthenticated, isLoading } = useAuth() as { user: User; isAuthenticated: boolean; isLoading: boolean };
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<any>(null);
  const queryClient = useQueryClient();

  // Delete meal mutation
  const deleteMealMutation = useMutation({
    mutationFn: async (mealId: string) => {
      const response = await fetch(`/api/food-logs/${mealId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to delete meal');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-log'] });
      queryClient.invalidateQueries({ queryKey: ['/api/food-logs'] });
      toast({
        title: "Success",
        description: "Meal deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete meal",
        variant: "destructive",
      });
    },
  });

  const handleDeleteMeal = (mealId: string, mealName: string) => {
    if (confirm(`Are you sure you want to delete "${mealName}"?`)) {
      deleteMealMutation.mutate(mealId);
    }
  };

  const handleEditMeal = (meal: any) => {
    console.log('Edit button clicked for meal:', meal);
    setEditingMeal(meal);
    setIsMealModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsMealModalOpen(false);
    setEditingMeal(null);
  };

  const [, setLocation] = useLocation();
  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
      return;
    }
  }, [isAuthenticated, isLoading, setLocation]);

  


  const { data: foodLogs } = useQuery<Meal[]>({
    queryKey: ['/api/food-logs'],
    enabled: isAuthenticated,
    retry: false,
  });

  // Get daily nutrition summary with enhanced data
  const { data: dailyNutrition } = useQuery<DailyNutrition>({
    queryKey: ['/api/daily-log'],
    enabled: isAuthenticated,
    retry: false,
  });

  // Example: Add similar types to other queries if needed
  // const { data: weightLogs } = useQuery<WeightLog[]>({ ... });
  // const { data: communityPosts } = useQuery<CommunityPost[]>({ ... });
  // const { data: appointments } = useQuery<Appointment[]>({ ... });
  // const { data: friends } = useQuery<Friend[]>({ ... });

  const { data: waterLogs } = useQuery({
    queryKey: ['/api/water-logs'],
    enabled: isAuthenticated,
    retry: false,
  });

  // Get user profile for nutrition calculations
  const { data: userProfile } = useQuery({
    queryKey: ['/api/user/profile'],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: weightLogs } = useQuery<WeightLog[]>({
    queryKey: ['/api/weight-logs'],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: communityPosts } = useQuery<CommunityPost[]>({
    queryKey: ['/api/community/posts'],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments'],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: friends } = useQuery<Friend[]>({
    queryKey: ['/api/friends'],
    enabled: isAuthenticated,
    retry: false,
  });

  // Calculate daily totals using enhanced nutrition data
  const todayFoodLogs = dailyNutrition?.meals || [];
  
  const todayWaterLogs = (Array.isArray(waterLogs) ? waterLogs : []).filter((log: any) => {
    const logDate = new Date(log.date);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  });

  // Use enhanced nutrition data from daily-log endpoint
  const totalCalories = dailyNutrition?.totalCalories || 0;
  const totalProtein = dailyNutrition?.totalProtein || 0;
  const totalCarbs = dailyNutrition?.totalCarbs || 0;
  const totalFat = dailyNutrition?.totalFat || 0;
  const totalWater = todayWaterLogs.reduce((sum: number, log: any) => sum + (parseFloat(log.amount) || 0), 0);
  const latestWeight = weightLogs?.[0]?.weight || 0;
  const latestBMI = weightLogs?.[0]?.bmi || 0;

  // Calculate gender-specific nutrition requirements
  const getUserNutritionRequirements = () => {
    if (!user || !userProfile) {
      // Fallback to sensible default user data so we also get micronutrient targets
      const defaultUser = {
        gender: 'female',
        age: 30,
        weight: 70,
        height: 170,
        activityLevel: 'moderately_active',
        goal: 'maintenance'
      } as any;

      return calculateNutritionRequirements(defaultUser);
    }

    const userData = {
      gender: (user as any)?.gender || (userProfile as any)?.gender || 'female',
      age: (user as any)?.age || new Date().getFullYear() - new Date((userProfile as any)?.dateOfBirth || '1990-01-01').getFullYear() || 25,
      weight: parseFloat((userProfile as any)?.weight?.toString() || latestWeight?.toString() || '70'),
      height: parseFloat((userProfile as any)?.height?.toString() || '170'),
      activityLevel: (userProfile as any)?.activityLevel || 'moderately_active',
      goal: (userProfile as any)?.healthGoals || 'maintenance'
    };

    return calculateNutritionRequirements(userData);
  };

  const nutritionRequirements = getUserNutritionRequirements();
  
  // Nutrition goals based on gender and profile
  const calorieGoal = nutritionRequirements.calories;
  const proteinGoal = nutritionRequirements.protein;
  const carbsGoal = nutritionRequirements.carbs;
  const fatGoal = nutritionRequirements.fats;
  const waterGoal = nutritionRequirements.water;
  
  // Progress calculations
  const calorieProgress = Math.min((totalCalories / calorieGoal) * 100, 100);
  const proteinProgress = Math.min((totalProtein / proteinGoal) * 100, 100);
  const carbsProgress = Math.min((totalCarbs / carbsGoal) * 100, 100);
  const fatProgress = Math.min((totalFat / fatGoal) * 100, 100);
  const waterProgress = Math.min((totalWater / waterGoal) * 100, 100);

  // Calculate estimated micronutrients based on consumed food
  const calculateMicronutrients = () => {
    const meals = dailyNutrition?.meals || [];
    
    // Simple estimation based on common food types and portions
    // This is a basic approximation - in a real app, you'd have a comprehensive food database
    let estimatedIron = 0;
    let estimatedCalcium = 0;
    let estimatedZinc = 0;
    let estimatedMagnesium = 0;
    let estimatedPotassium = 0;
    let estimatedVitaminB12 = 0;
    
    meals.forEach((meal: any) => {
      const mealName = meal.mealName?.toLowerCase() || '';
      const quantity = parseFloat(meal.quantity) || 1;
      
      // Basic estimation based on meal names and types
      if (mealName.includes('spinach') || mealName.includes('meat') || mealName.includes('chicken')) {
        estimatedIron += quantity * 2.5; // mg per serving
      }
      if (mealName.includes('milk') || mealName.includes('cheese') || mealName.includes('yogurt')) {
        estimatedCalcium += quantity * 150; // mg per serving
        estimatedVitaminB12 += quantity * 0.5; // mcg per serving
      }
      if (mealName.includes('nuts') || mealName.includes('seeds') || mealName.includes('meat')) {
        estimatedZinc += quantity * 1.5; // mg per serving
        estimatedMagnesium += quantity * 50; // mg per serving
      }
      if (mealName.includes('banana') || mealName.includes('potato') || mealName.includes('vegetables')) {
        estimatedPotassium += quantity * 200; // mg per serving
      }
      
      // Base values for any meal (very conservative estimates)
      estimatedIron += quantity * 0.5;
      estimatedCalcium += quantity * 20;
      estimatedZinc += quantity * 0.3;
      estimatedMagnesium += quantity * 15;
      estimatedPotassium += quantity * 50;
      estimatedVitaminB12 += quantity * 0.1;
    });
    
    return {
      iron: Math.round(estimatedIron * 10) / 10,
      calcium: Math.round(estimatedCalcium),
      zinc: Math.round(estimatedZinc * 10) / 10,
      magnesium: Math.round(estimatedMagnesium),
      potassium: Math.round(estimatedPotassium),
      vitaminB12: Math.round(estimatedVitaminB12 * 10) / 10,
      vitaminD: Math.round((totalCalories / 2000) * 5 * 10) / 10, // Very rough estimate
      folate: Math.round((totalCalories / 2000) * 200) // Very rough estimate
    };
  };

  const currentMicronutrients = calculateMicronutrients();

  // Simple food hints for macros to show actionable foods to increase a given macro
  const genderForFoods = (user as any)?.gender || (userProfile as any)?.gender || 'female';
  const macroFoodHints: Record<string, string[]> = {
    calories: genderForFoods === 'female'
      ? ['Nuts & nut butter', 'Full-fat dairy', 'Avocado']
      : ['Nuts & nut butter', 'Granola', 'Olive oil'],
    protein: ['Eggs', 'Chicken / Fish', 'Greek yogurt', 'Tofu', 'Lentils'],
    carbs: ['Oats', 'Brown rice', 'Sweet potato', 'Bananas', 'Whole grain bread'],
    fat: ['Avocado', 'Olive oil', 'Walnuts', 'Chia seeds', 'Fatty fish'],
    water: ['Plain water', 'Coconut water', 'Soups', 'Watermelon', 'Herbal tea']
  };

  const getBMIStatus = (bmi: number) => {
    if (bmi < 18.5) return { status: 'Underweight', color: 'text-blue-500' };
    if (bmi < 25) return { status: t('dashboard.normal'), color: 'text-green-500' };
    if (bmi < 30) return { status: 'Overweight', color: 'text-yellow-500' };
    return { status: 'Obese', color: 'text-red-500' };
  };

  const bmiStatus = getBMIStatus(parseFloat(latestBMI?.toString() || '0'));

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout showSidebar={true}>
      <div className="p-6 lg:p-8">
        {/* Scan feature removed */}

        {/* Dashboard Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('dashboard.welcome')}, {user?.firstName || 'User'}!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">{t('dashboard.journey')}</p>
        </div>

        {/* Dashboard Cards - All 5 in one row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Calorie Intake Card */}
          <Popover>
            <PopoverTrigger asChild>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                    <i className="fas fa-fire text-red-500 text-xl"></i>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.today')}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('dashboard.calories')}</h3>
                <div className="flex items-end space-x-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(totalCalories)}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">/ {calorieGoal}</span>
                </div>
                <div className="mt-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: `${calorieProgress}%` }}></div>
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent side="top" sideOffset={8}>
              <div className="text-sm text-gray-700 dark:text-gray-200">
                <div className="font-semibold mb-2">Increase calories</div>
                <ul className="list-disc ml-5 space-y-1">
                  {macroFoodHints.calories.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-popover border border-gray-200 dark:border-gray-700"></div>
            </PopoverContent>
          </Popover>

          {/* Hydration Card */}
          <Popover>
            <PopoverTrigger asChild>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                    <i className="fas fa-tint text-blue-500 text-xl"></i>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.today')}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('dashboard.water')}</h3>
                <div className="flex items-end space-x-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{totalWater}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">/ {waterGoal} {t('dashboard.glasses')}</span>
                </div>
                <div className="mt-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${waterProgress}%` }}></div>
                </div>
                <button 
                  onClick={() => setIsWaterModalOpen(true)}
                  className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors duration-200 text-sm font-medium"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Add Water
                </button>
              </div>
            </PopoverTrigger>
            <PopoverContent side="top" sideOffset={8}>
              <div className="text-sm text-gray-700 dark:text-gray-200">
                <div className="font-semibold mb-2">Increase hydration</div>
                <ul className="list-disc ml-5 space-y-1">
                  {macroFoodHints.water.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-popover border border-gray-200 dark:border-gray-700"></div>
            </PopoverContent>
          </Popover>

          {/* Protein Card */}
          <Popover>
            <PopoverTrigger asChild>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                    <i className="fas fa-dumbbell text-blue-500 text-xl"></i>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.today')}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('dashboard.protein')}</h3>
                <div className="flex items-end space-x-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(totalProtein)}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">/ {proteinGoal}{t('units.g')}</span>
                </div>
                <div className="mt-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${proteinProgress}%` }}></div>
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent side="top" sideOffset={8}>
              <div className="text-sm text-gray-700 dark:text-gray-200">
                <div className="font-semibold mb-2">Increase protein</div>
                <ul className="list-disc ml-5 space-y-1">
                  {macroFoodHints.protein.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-popover border border-gray-200 dark:border-gray-700"></div>
            </PopoverContent>
          </Popover>

          {/* Carbs Card */}
          <Popover>
            <PopoverTrigger asChild>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                    <i className="fas fa-seedling text-orange-500 text-xl"></i>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.today')}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('dashboard.carbs')}</h3>
                <div className="flex items-end space-x-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(totalCarbs)}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">/ {carbsGoal}{t('units.g')}</span>
                </div>
                <div className="mt-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${carbsProgress}%` }}></div>
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent side="top" sideOffset={8}>
              <div className="text-sm text-gray-700 dark:text-gray-200">
                <div className="font-semibold mb-2">Increase carbs</div>
                <ul className="list-disc ml-5 space-y-1">
                  {macroFoodHints.carbs.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-popover border border-gray-200 dark:border-gray-700"></div>
            </PopoverContent>
          </Popover>

          {/* Fat Card */}
          <Popover>
            <PopoverTrigger asChild>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                    <i className="fas fa-tint text-purple-500 text-xl"></i>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.today')}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('dashboard.fat')}</h3>
                <div className="flex items-end space-x-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(totalFat)}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">/ {fatGoal}{t('units.g')}</span>
                </div>
                <div className="mt-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${fatProgress}%` }}></div>
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent side="top" sideOffset={8}>
              <div className="text-sm text-gray-700 dark:text-gray-200">
                <div className="font-semibold mb-2">Increase healthy fats</div>
                <ul className="list-disc ml-5 space-y-1">
                  {macroFoodHints.fat.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-popover border border-gray-200 dark:border-gray-700"></div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Two-column layout: left = nutrients, right = meals + expanded tips */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-6">
          {/* Left: Nutrient cards */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="mr-2">{(user as any)?.gender === 'male' ? '♂️' : '♀️'}</span>
                {(user as any)?.gender === 'male' ? 'Male Key Nutrients' : 'Female Key Nutrients'}
              </h3>

              <div className="grid grid-cols-2 gap-4 auto-rows-fr">
                {(() => {
                  const gender = (user as any)?.gender || (userProfile as any)?.gender || 'female';
                  const micronutrientRequirements = nutritionRequirements.micronutrients;
                  
                  if (gender === 'male') {
                    return [
                      { name: 'Zinc', current: currentMicronutrients.zinc, target: micronutrientRequirements.zinc, unit: 'mg', icon: '🔵', color: 'blue', description: 'Supports testosterone and immune function' },
                      { name: 'Magnesium', current: currentMicronutrients.magnesium, target: micronutrientRequirements.magnesium, unit: 'mg', icon: '💜', color: 'purple', description: 'Essential for muscle and heart health' },
                      { name: 'Potassium', current: currentMicronutrients.potassium, target: micronutrientRequirements.potassium, unit: 'mg', icon: '⚡', color: 'orange', description: 'Supports muscle function and blood pressure' },
                      { name: 'Vitamin B12', current: currentMicronutrients.vitaminB12, target: micronutrientRequirements.vitaminB12, unit: 'mcg', icon: '💙', color: 'indigo', description: 'Boosts energy and metabolism' }
                    ];
                  } else {
                    return [
                      { name: 'Iron', current: currentMicronutrients.iron, target: micronutrientRequirements.iron, unit: 'mg', icon: '🔴', color: 'red', description: 'Essential for oxygen transport' },
                      { name: 'Calcium', current: currentMicronutrients.calcium, target: micronutrientRequirements.calcium, unit: 'mg', icon: '🤍', color: 'gray', description: 'Builds strong bones and teeth' },
                      { name: 'Vitamin D', current: currentMicronutrients.vitaminD, target: micronutrientRequirements.vitaminD, unit: 'IU', icon: '☀️', color: 'yellow', description: 'Supports bone health and immunity' },
                      { name: 'Folate', current: currentMicronutrients.folate, target: micronutrientRequirements.folate, unit: 'mcg', icon: '💚', color: 'green', description: 'Important for cell division' }
                    ];
                  }
                })().map((nutrient, index) => {
                  const progress = Math.min((nutrient.current / (nutrient.target || 1)) * 100, 100);
                  const isLow = progress < 30;
                  const gender = (user as any)?.gender || (userProfile as any)?.gender || 'female';
                  const focusFoods = getGenderSpecificFoods(gender).focus || [];
                  const matched = focusFoods.filter((f: string) => f.toLowerCase().includes(nutrient.name.toLowerCase()));
                  const foodsToShow = matched.length > 0 ? matched : focusFoods.slice(0, 2);

                  return (
                    <div key={index} className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 h-28 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-lg">{nutrient.icon}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${isLow ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'}`}>
                          {isLow ? 'Low' : 'Good'}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{nutrient.name}</h4>
                        <div className="flex items-end space-x-1 mb-1">
                          <span className="text-lg font-bold text-gray-900 dark:text-white">{nutrient.current}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">/ {nutrient.target}{nutrient.unit}</span>
                        </div>
                        <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-1">
                          <div className={`h-1.5 rounded-full transition-all duration-300 ${isLow ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${progress}%` }} />
                        </div>
                      </div>

                      {/* Hover popover showing foods for this nutrient */}
                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 w-44 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150">
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                          <div className="font-medium mb-1">Foods high in {nutrient.name}</div>
                          <ul className="list-disc list-inside">
                            {foodsToShow.map((f: string, i: number) => (
                              <li key={i}>{f}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Meals + Nutrition Tips (expanded) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Today's Meals (moved to right column) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  <i className="fas fa-utensils text-nutricare-green mr-2"></i>
                  {t('meals.title')}
                </h3>
                <button 
                  onClick={() => setIsMealModalOpen(true)}
                  className="px-4 py-2 bg-nutricare-green text-white rounded-lg hover:bg-nutricare-dark transition-colors text-sm"
                >
                  <i className="fas fa-plus mr-1"></i>
                  {t('meals.add')}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {todayFoodLogs.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {todayFoodLogs.slice(0, 8).map((meal: any) => {
                      const mealTypeIcons = {
                        breakfast: { icon: 'fa-sun', color: 'bg-orange-500' },
                        lunch: { icon: 'fa-sun', color: 'bg-yellow-500' },
                        dinner: { icon: 'fa-moon', color: 'bg-purple-500' },
                        snack: { icon: 'fa-apple-alt', color: 'bg-green-500' },
                      };
                      const mealIcon = mealTypeIcons[meal.mealType as keyof typeof mealTypeIcons] || mealTypeIcons.snack;

                      return (
                        <div key={meal.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 flex flex-col relative">
                          <div className="flex items-center justify-between mb-2">
                            <div className={`p-1.5 ${mealIcon.color} rounded-full`}>
                              <i className={`fas ${mealIcon.icon} text-white text-xs`}></i>
                            </div>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{meal.calories} cal</span>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white capitalize truncate">{meal.mealName}</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{meal.quantity} {meal.unit}</p>
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                              <span>P:{meal.protein}g</span>
                              <span>C:{meal.carbs}g</span>
                              <span>F:{meal.fat}g</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(meal.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <i className="fas fa-utensils text-gray-400 text-xl"></i>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No meals logged today</p>
                    <button 
                      onClick={() => setIsMealModalOpen(true)}
                      className="px-4 py-2 bg-nutricare-green text-white rounded-lg hover:bg-nutricare-dark transition-colors"
                    >
                      {t('meals.add')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Nutrition Tips removed (moved to header popover) */}
          </div>
        </div>

      </div>

      {/* Meal Modal */}
      <MealModal 
        isOpen={isMealModalOpen}
        onClose={() => {
          setIsMealModalOpen(false);
          setEditingMeal(null);
        }}
        onMealAdded={() => {
          // Refresh the food logs data when a meal is added
          // The modal will handle the query invalidation
        }}
        editingMeal={editingMeal}
      />

      {/* Water Modal */}
      <WaterModal
        isOpen={isWaterModalOpen}
        onClose={() => setIsWaterModalOpen(false)}
      />
    </Layout>
  );
}
