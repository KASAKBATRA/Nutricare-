import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/context/LanguageContext';
import { MoodTrackerModal } from '@/components/MoodTrackerModal';

// Form validation schema (extended with advanced cooking details)
const addMealSchema = z.object({
  mealName: z.string().min(1, "Meal name is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.enum(["grams", "ml", "cups", "pieces", "oz", "tbsp", "tsp"]),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  // Keep backwards-compatible cookingIntensity but accept new, more granular values via advanced options
  cookingIntensity: z.enum([
    "Boiled/Steamed",
    "Lightly Fried",
    "Normal",
    "Deep Fried",
    "Extra Ghee",
    "Less Oil",
    "More Oil",
    "Extra Ghee"
  ]).optional().default("Normal"),
  oilType: z.enum(["No Oil", "Refined", "Mustard", "Olive", "Desi Ghee", "Butter"]).optional().default("No Oil"),
  milkType: z.enum(["None", "Cow Milk", "Buffalo Milk", "Skimmed Milk", "Plant Milk"]).optional().default("None"),
  sugarType: z.enum(["No Sugar","Regular","Honey","Sweetener"]).optional().default("No Sugar"),
  spiceLevel: z.enum(["Mild", "Normal", "Spicy", "Very Spicy"]).optional().default("Normal"),
  utensilType: z.enum(["Small Bowl (~100ml)", "Medium Bowl (~150ml)", "Large Bowl (~250ml)", "Plate (~300ml)", "Glass (~200ml)", "Custom" ]).optional().default("Medium Bowl (~150ml)"),
});

type AddMealFormData = z.infer<typeof addMealSchema>;

interface MealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMealAdded?: () => void;
  editingMeal?: any;
}

interface FoodSearchResult {
  food_name: string;
  serving_unit: string;
  serving_qty: number;
  photo: {
    thumb: string;
  };
}

interface NutritionResponse {
  message: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export function MealModal({ isOpen, onClose, onMealAdded, editingMeal }: MealModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [nutritionResult, setNutritionResult] = useState<NutritionResponse['nutrition'] | null>(null);
  const [showMoodTracker, setShowMoodTracker] = useState(false);
  const [cookingIntensity, setCookingIntensity] = useState<string>("Normal");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [oilType, setOilType] = useState<string>('No Oil');
  const [milkType, setMilkType] = useState<string>('None');
  const [sugarType, setSugarType] = useState<string>('No Sugar');
  const [spiceLevel, setSpiceLevel] = useState<string>('Normal');
  const [utensilType, setUtensilType] = useState<string>('Medium Bowl (~150ml)');
  const [detectedCategory, setDetectedCategory] = useState<string | null>(null);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [ingredientOptions, setIngredientOptions] = useState<string[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [lastLoggedFoodId, setLastLoggedFoodId] = useState<string | null>(null);
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState<boolean>(false);
  const [correctionPercent, setCorrectionPercent] = useState<number>(0);
  const [lastBaseCalories, setLastBaseCalories] = useState<number | null>(null);
  const [lastAdjustedCalories, setLastAdjustedCalories] = useState<number | null>(null);
  const [showAdjustment, setShowAdjustment] = useState<boolean>(false);
  const [estimatedBaseCalories, setEstimatedBaseCalories] = useState<number>(0);
  const [estimatedAdjustedCalories, setEstimatedAdjustedCalories] = useState<number>(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    trigger,
  } = useForm<AddMealFormData>({
    resolver: zodResolver(addMealSchema),
    defaultValues: {
      quantity: 1,
      unit: "grams",
      mealType: "snack",
    },
  });

  // Pre-fill form when editing
  useEffect(() => {
    console.log('MealModal editingMeal changed:', editingMeal);
    if (editingMeal) {
      setValue('mealName', editingMeal.food_name);
      setValue('quantity', editingMeal.quantity);
      setValue('unit', editingMeal.unit);
      setValue('mealType', editingMeal.meal_type);
      setSearchQuery(editingMeal.food_name);
      // if editingMeal contains advanced fields, prefill
      if (editingMeal.oilType) setOilType(editingMeal.oilType);
      if (editingMeal.milkType) setMilkType(editingMeal.milkType);
      if (editingMeal.sugarType) setSugarType(editingMeal.sugarType);
      if (editingMeal.category) setDetectedCategory(editingMeal.category);
      if (editingMeal.spiceLevel) setSpiceLevel(editingMeal.spiceLevel);
      if (editingMeal.utensilType) setUtensilType(editingMeal.utensilType);
    } else {
      reset({
        quantity: 1,
        unit: "grams",
        mealType: "snack",
        cookingIntensity: 'Normal',
      });
      setSearchQuery('');
      setSelectedFood(null);
      setNutritionResult(null);
    }
  }, [editingMeal, setValue, reset]);

  // Detect category from meal name and set which fields are visible
  useEffect(() => {
    let mounted = true;
    const name = (watch('mealName') as string) || '';
    if (!name || name.length < 2) {
      setDetectedCategory(null);
      setVisibleFields({});
      return;
    }

    const t = setTimeout(async () => {
      try {
        const resp = await fetch('/api/detect-category', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (!resp.ok) return;
        const json = await resp.json();
        if (!mounted) return;
        setDetectedCategory(json.category || null);
        setVisibleFields(json.visible || {});
        setIngredientOptions(json.ingredients || []);

        // Apply smart defaults when fields are shown
        if (json.visible) {
          if (json.visible.oilType && !oilType) setOilType('No Oil');
          if (json.visible.milkType && !milkType) setMilkType('None');
          if (json.visible.spiceLevel && !spiceLevel) setSpiceLevel('Normal');
          if (json.visible.sugarType && !sugarType) setSugarType('No Sugar');
        }
      } catch (err) {
        // ignore
      }
    }, 300);

    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [watch('mealName')]);

  // Food search query
  const { data: searchResults } = useQuery({
    queryKey: ['/api/food-search', searchQuery],
    enabled: searchQuery.length >= 2,
    queryFn: async () => {
      const response = await fetch(`/api/food-search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
  });

  // Add/Update meal mutation
  const addMealMutation = useMutation({
    mutationFn: async (data: AddMealFormData) => {
      const url = editingMeal ? `/api/food-logs/${editingMeal.id}` : '/api/add-meal';
      const method = editingMeal ? 'PUT' : 'POST';
      // include advanced options in the payload
      const payload = {
        ...data,
        oilType,
        milkType,
        sugarType,
        spiceLevel,
        utensilType,
        cookingIntensity,
        category: detectedCategory,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${editingMeal ? 'update' : 'add'} meal`);
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      // Server may return nutrition or base/adjusted calories
      if (data.nutrition) {
        setNutritionResult(data.nutrition);
        toast({
          title: editingMeal ? "Meal Updated Successfully!" : "Meal Added Successfully!",
          description: `${data.nutrition.calories} calories logged`,
        });
      } else {
        const base = data.base_calories || 0;
        const adjusted = data.adjusted_calories || 0;
        setNutritionResult({ calories: adjusted, protein: 0, carbs: 0, fat: 0 });
        toast({
          title: editingMeal ? "Meal Updated Successfully!" : "Meal Added Successfully!",
          description: `Estimated ${adjusted} kcal (base ${base} kcal)`,
        });

        // Keep last logged id for feedback corrections
        if (data.meal && data.meal.id) setLastLoggedFoodId(data.meal.id);
        setLastBaseCalories(data.base_calories || null);
        setLastAdjustedCalories(data.adjusted_calories || null);
        // Show a small feedback prompt so user can confirm accuracy
        setShowFeedbackPrompt(true);
      }
      
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/food-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-log'] });
      
      if (onMealAdded) onMealAdded();
      
      // Show mood tracker for new meals only (not when editing)
      if (!editingMeal) {
        setTimeout(() => {
          setShowMoodTracker(true);
        }, 1500);
      } else {
        // For edits, close normally
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    reset();
    setSearchQuery('');
    setSelectedFood(null);
    setNutritionResult(null);
    setIsSearchOpen(false);
    setShowMoodTracker(false);
    onClose();
  };

  const handleMoodSubmit = async (mood: string, reason?: string) => {
    try {
      // Save mood data to backend
      const requestBody: any = { mood };
      if (reason) {
        requestBody.reason = reason;
      }
      // Don't include foodLogId if we don't have one
      
      const response = await fetch('/api/mood-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to save mood');
      }
      
      toast({
        title: "Thank you!",
        description: "Your feedback has been recorded.",
      });
      
      // Close everything after mood is logged
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (error) {
      console.error('Error saving mood:', error);
      toast({
        title: "Error",
        description: "Failed to save your mood. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCorrectionSubmit = async (percentChange: number) => {
    if (!lastLoggedFoodId) return;
    try {
      // percentChange can be positive or negative (e.g., -10 means reduce by 10%)
      const resp = await fetch(`/api/food-logs/${lastLoggedFoodId}/correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentChange }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.message || 'Failed to save correction');
      }
      toast({ title: 'Thanks — correction saved', description: 'We will adapt future estimates.' });
      setShowFeedbackPrompt(false);
      // Refresh food logs
      queryClient.invalidateQueries({ queryKey: ['/api/food-logs'] });
      setTimeout(() => handleClose(), 800);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save correction', variant: 'destructive' });
    }
  };

  const onSubmit = (data: AddMealFormData) => {
    // include cooking intensity and advanced fields
    const payload = {
      ...data,
      cookingIntensity: cookingIntensity as any,
      oilType,
      milkType,
      sugarType,
      spiceLevel,
      utensilType,
      category: detectedCategory,
      ingredients: selectedIngredients,
    } as any;
    addMealMutation.mutate(payload);
  };

  const handleFoodSelect = (food: FoodSearchResult) => {
    setSelectedFood(food);
    setValue('mealName', food.food_name);
    setValue('quantity', food.serving_qty);
    setValue('unit', food.serving_unit as any);
    setIsSearchOpen(false);
    trigger(['mealName', 'quantity', 'unit']);
  };

  // Estimate calories whenever relevant inputs change (debounced)
  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(async () => {
      const mealName = (watch('mealName') as string) || '';
      const quantity = (watch('quantity') as number) || 0;
      const unit = (watch('unit') as string) || 'grams';
      if (!mealName || quantity <= 0) {
        if (mounted) {
          setEstimatedBaseCalories(0);
          setEstimatedAdjustedCalories(0);
        }
        return;
      }

      try {
  const params = new URLSearchParams({ q: mealName, quantity: String(quantity), unit, intensity: cookingIntensity, oil_type: oilType, milk_type: milkType, spice_level: spiceLevel, utensil_type: utensilType, sugar_type: sugarType, category: detectedCategory || '' });
        const resp = await fetch(`/api/estimate-calories?${params.toString()}`);
        if (!resp.ok) return;
        const json = await resp.json();
        if (!mounted) return;
        setEstimatedBaseCalories(json.base_calories || 0);
        setEstimatedAdjustedCalories(json.adjusted_calories || 0);
      } catch (err) {
        // ignore
      }
    }, 350);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [watch('mealName'), watch('quantity'), watch('unit'), cookingIntensity]);

  const unitOptions = [
    { value: "grams", label: "Grams" },
    { value: "ml", label: "Milliliters" },
    { value: "cups", label: "Cups" },
    { value: "pieces", label: "Pieces" },
    { value: "oz", label: "Ounces" },
    { value: "tbsp", label: "Tablespoons" },
    { value: "tsp", label: "Teaspoons" },
  ];

  const mealTypeOptions = [
    { value: "breakfast", label: "Breakfast", icon: "☀️" },
    { value: "lunch", label: "Lunch", icon: "🌞" },
    { value: "dinner", label: "Dinner", icon: "🌙" },
    { value: "snack", label: "Snack", icon: "🍎" },
  ];

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <i className="fas fa-utensils text-nutricare-green"></i>
            {editingMeal ? 'Edit Meal' : 'Add Meal'}
          </DialogTitle>
        </DialogHeader>

        {nutritionResult ? (
          // Show nutrition results after successful submission
          <div className="space-y-4 text-center">
            <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-green-500 rounded-full">
                  <i className="fas fa-check text-white text-xl"></i>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Meal Logged Successfully!
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-gray-600 dark:text-gray-400">Calories</p>
                  <p className="text-xl font-bold text-nutricare-green">{nutritionResult.calories}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 dark:text-gray-400">Protein</p>
                  <p className="text-xl font-bold text-blue-500">{nutritionResult.protein}g</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 dark:text-gray-400">Carbs</p>
                  <p className="text-xl font-bold text-orange-500">{nutritionResult.carbs}g</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 dark:text-gray-400">Fat</p>
                  <p className="text-xl font-bold text-purple-500">{nutritionResult.fat}g</p>
                </div>
              </div>
              {showFeedbackPrompt && lastBaseCalories !== null && lastAdjustedCalories !== null && (
                <div className="mt-4">
                  <p className="text-sm text-gray-700 mb-2">Estimated calories: <strong>{lastAdjustedCalories} kcal</strong> (<span className="text-gray-500">base {lastBaseCalories} kcal</span>)</p>
                  <p className="text-sm text-gray-600 mb-3">Does this look accurate?</p>
                  <div className="flex items-center justify-center gap-3">
                    <Button variant="ghost" onClick={() => { setShowFeedbackPrompt(false); handleClose(); }}>
                      ✅ Yes
                    </Button>
                    <Button variant="outline" onClick={() => { setShowAdjustment(true); }}>
                      ❌ No (Adjust)
                    </Button>
                  </div>

                  {showAdjustment && (
                    <div className="mt-3 space-y-3">
                      <p className="text-sm text-gray-600">Adjust the estimate (±10–30%)</p>
                      <div className="flex items-center gap-2">
                        <select
                          value={correctionPercent}
                          onChange={(e) => setCorrectionPercent(parseInt(e.target.value))}
                          className="border rounded-md p-2 bg-white text-sm"
                        >
                          <option value={-30}>-30%</option>
                          <option value={-20}>-20%</option>
                          <option value={-10}>-10%</option>
                          <option value={0}>0%</option>
                          <option value={10}>+10%</option>
                          <option value={20}>+20%</option>
                          <option value={30}>+30%</option>
                        </select>
                        <Button onClick={() => handleCorrectionSubmit(correctionPercent)}>Save Correction</Button>
                      </div>
                      <p className="text-xs text-gray-500">This correction helps personalize future estimates for this meal.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Show meal logging form
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Food Name with Search */}
            <div className="space-y-2">
              <Label htmlFor="mealName">Food Name</Label>
              <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Input
                      {...register('mealName')}
                      placeholder="Search for food (e.g., banana, rice, chicken)"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setValue('mealName', e.target.value);
                        if (e.target.value.length >= 2) {
                          setIsSearchOpen(true);
                        }
                      }}
                      className="pr-10"
                    />
                    <i className="fas fa-search absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <Command>
                    <CommandList>
                      {searchResults?.common?.length === 0 && searchQuery.length >= 2 && (
                        <CommandEmpty>No foods found. Try a different search term.</CommandEmpty>
                      )}
                      {searchResults?.common?.length > 0 && (
                        <CommandGroup heading="Suggested Foods">
                          {searchResults.common.slice(0, 8).map((food: FoodSearchResult, index: number) => (
                            <CommandItem
                              key={index}
                              onSelect={() => handleFoodSelect(food)}
                              className="flex items-center gap-3 cursor-pointer"
                            >
                              <img 
                                src={food.photo.thumb} 
                                alt={food.food_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              <div>
                                <p className="font-medium capitalize">{food.food_name}</p>
                                <p className="text-sm text-gray-500">
                                  {food.serving_qty} {food.serving_unit}
                                </p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.mealName && (
                <p className="text-sm text-red-500">{errors.mealName.message}</p>
              )}
            </div>

            {/* Quantity and Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  {...register('quantity', { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="1"
                />
                {errors.quantity && (
                  <p className="text-sm text-red-500">{errors.quantity.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select onValueChange={(value) => setValue('unit', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unit && (
                  <p className="text-sm text-red-500">{errors.unit.message}</p>
                )}
              </div>
            </div>

            {/* Meal Type */}
            <div className="space-y-2">
              <Label htmlFor="mealType">Meal Type</Label>
              <Select onValueChange={(value) => setValue('mealType', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select meal type" />
                </SelectTrigger>
                <SelectContent>
                  {mealTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <span>{option.icon}</span>
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.mealType && (
                <p className="text-sm text-red-500">{errors.mealType.message}</p>
              )}
            </div>

            {/* Cooking Type & Advanced Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="cooking-type">Cooking Intensity</Label>
                <button
                  type="button"
                  className="text-sm text-nutricare-green underline"
                  onClick={() => setShowAdvanced(s => !s)}
                >
                  {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <select
                  id="cooking-type"
                  name="cooking_intensity"
                  value={cookingIntensity}
                  onChange={(e) => setCookingIntensity(e.target.value)}
                  className="border rounded-md p-2 bg-white text-sm w-full"
                >
                  <option value="Boiled/Steamed">🍲 Boiled / Steamed</option>
                  <option value="Lightly Fried">🌤️ Lightly Fried</option>
                  <option value="Normal">🍛 Normal</option>
                  <option value="Deep Fried">� Deep Fried</option>
                  <option value="Extra Ghee">🧈 Extra Ghee</option>
                </select>
              </div>

              {showAdvanced && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {/* If detection hasn't run yet, show defaults for backward compatibility */}
                  {Object.keys(visibleFields).length === 0 ? (
                    <>
                      <div className="space-y-2">
                        <Label>Oil / Fat Type</Label>
                        <select
                          value={oilType}
                          onChange={(e) => setOilType(e.target.value)}
                          className="border rounded-md p-2 bg-white text-sm w-full"
                        >
                          <option>No Oil</option>
                          <option>Refined</option>
                          <option>Mustard</option>
                          <option>Olive</option>
                          <option>Desi Ghee</option>
                          <option>Butter</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>Dairy Base</Label>
                        <select
                          value={milkType}
                          onChange={(e) => setMilkType(e.target.value)}
                          className="border rounded-md p-2 bg-white text-sm w-full"
                        >
                          <option>None</option>
                          <option>Cow Milk</option>
                          <option>Buffalo Milk</option>
                          <option>Skimmed Milk</option>
                          <option>Plant Milk</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>Spice Level</Label>
                        <select
                          value={spiceLevel}
                          onChange={(e) => setSpiceLevel(e.target.value)}
                          className="border rounded-md p-2 bg-white text-sm w-full"
                        >
                          <option>Mild</option>
                          <option>Normal</option>
                          <option>Spicy</option>
                          <option>Very Spicy</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>Utensil</Label>
                        <select
                          value={utensilType}
                          onChange={(e) => setUtensilType(e.target.value)}
                          className="border rounded-md p-2 bg-white text-sm w-full"
                        >
                          <option>Small Bowl (~100ml)</option>
                          <option>Medium Bowl (~150ml)</option>
                          <option>Large Bowl (~250ml)</option>
                          <option>Plate (~300ml)</option>
                          <option>Glass (~200ml)</option>
                          <option>Custom</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      {visibleFields.oilType && (
                        <div className="space-y-2">
                          <Label>Oil / Fat Type</Label>
                          <select
                            value={oilType}
                            onChange={(e) => setOilType(e.target.value)}
                            className="border rounded-md p-2 bg-white text-sm w-full"
                          >
                            <option>No Oil</option>
                            <option>Refined</option>
                            <option>Mustard</option>
                            <option>Olive</option>
                            <option>Desi Ghee</option>
                            <option>Butter</option>
                          </select>
                        </div>
                      )}

                      {visibleFields.milkType && (
                        <div className="space-y-2">
                          <Label>Dairy / Milk</Label>
                          <select
                            value={milkType}
                            onChange={(e) => setMilkType(e.target.value)}
                            className="border rounded-md p-2 bg-white text-sm w-full"
                          >
                            <option>None</option>
                            <option>Cow Milk</option>
                            <option>Buffalo Milk</option>
                            <option>Skimmed Milk</option>
                            <option>Plant Milk</option>
                          </select>
                        </div>
                      )}

                      {visibleFields.sugarType && (
                        <div className="space-y-2">
                          <Label>Sugar</Label>
                          <select
                            value={sugarType}
                            onChange={(e) => setSugarType(e.target.value)}
                            className="border rounded-md p-2 bg-white text-sm w-full"
                          >
                            <option>No Sugar</option>
                            <option>Regular</option>
                            <option>Honey</option>
                            <option>Sweetener</option>
                          </select>
                        </div>
                      )}

                          {ingredientOptions.length > 0 && (
                            <div className="col-span-2 space-y-2">
                              <Label>Ingredients</Label>
                              <div className="flex flex-wrap gap-2">
                                {ingredientOptions.map((ing) => (
                                  <label key={ing} className="inline-flex items-center gap-2 bg-gray-50 border rounded px-2 py-1">
                                    <input
                                      type="checkbox"
                                      checked={selectedIngredients.includes(ing)}
                                      onChange={(e) => {
                                        if (e.target.checked) setSelectedIngredients(prev => [...prev, ing]);
                                        else setSelectedIngredients(prev => prev.filter(x => x !== ing));
                                      }}
                                    />
                                    <span className="text-sm">{ing}</span>
                                  </label>
                                ))}
                              </div>
                              <p className="text-xs text-gray-500">Select ingredients used (helps refine estimates)</p>
                            </div>
                          )}

                      {visibleFields.spiceLevel && (
                        <div className="space-y-2">
                          <Label>Spice Level</Label>
                          <select
                            value={spiceLevel}
                            onChange={(e) => setSpiceLevel(e.target.value)}
                            className="border rounded-md p-2 bg-white text-sm w-full"
                          >
                            <option>Mild</option>
                            <option>Normal</option>
                            <option>Spicy</option>
                            <option>Very Spicy</option>
                          </select>
                        </div>
                      )}

                      {visibleFields.utensil && (
                        <div className="space-y-2">
                          <Label>Utensil</Label>
                          <select
                            value={utensilType}
                            onChange={(e) => setUtensilType(e.target.value)}
                            className="border rounded-md p-2 bg-white text-sm w-full"
                          >
                            <option>Small Bowl (~100ml)</option>
                            <option>Medium Bowl (~150ml)</option>
                            <option>Large Bowl (~250ml)</option>
                            <option>Plate (~300ml)</option>
                            <option>Glass (~200ml)</option>
                            <option>Custom</option>
                          </select>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div id="calorie-display" className="text-sm text-gray-700 mt-1">
                Estimated Calories: <span id="calorie-value" className="font-semibold">{estimatedAdjustedCalories}</span> kcal
              </div>

              <div className="w-full bg-white/60 rounded-full h-3 overflow-hidden mt-2 border">
                <div
                  className="calorie-bar h-full transition-all duration-300"
                  style={{
                    width: `${(estimatedAdjustedCalories / Math.max(estimatedBaseCalories || 1, 1)) * 100}%`,
                    background: estimatedAdjustedCalories <= estimatedBaseCalories ? '#34D399' : estimatedAdjustedCalories <= estimatedBaseCalories * 1.2 ? '#FB923C' : '#EF4444'
                  }}
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-nutricare-green hover:bg-nutricare-dark"
                disabled={addMealMutation.isPending}
              >
                {addMealMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Adding...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus mr-2"></i>
                    Add Meal
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
    
    {/* Mood Tracker Modal */}
    <MoodTrackerModal
      isOpen={showMoodTracker}
      onClose={() => setShowMoodTracker(false)}
      onSubmit={handleMoodSubmit}
    />
  </>
  );
}