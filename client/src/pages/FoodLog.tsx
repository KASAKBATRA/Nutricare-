import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function FoodLog() {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMeal, setNewMeal] = useState({
    mealType: 'breakfast',
    quantity: '',
    calories: '',
    foodName: '',
  });

  // Scan/OCR removed per request

  const { data: foodLogs, isLoading } = useQuery<any[]>({
    queryKey: ['/api/food-logs', selectedDate],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: foodItems } = useQuery<any[]>({
    queryKey: ['/api/food-items'],
    enabled: isAuthenticated,
    retry: false,
  });

  const addFoodLogMutation = useMutation({
    mutationFn: async (logData: any) => {
      const response = await apiRequest('POST', '/api/food-logs', logData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/food-logs'] });
      setShowAddForm(false);
      setNewMeal({ mealType: 'breakfast', quantity: '', calories: '', foodName: '' });
      toast({
        title: "Success",
        description: "Food log added successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add food log. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddMeal = () => {
    if (!newMeal.foodName || !newMeal.quantity || !newMeal.calories) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    addFoodLogMutation.mutate({
      ...newMeal,
      date: new Date(selectedDate),
      quantity: parseFloat(newMeal.quantity),
      calories: parseFloat(newMeal.calories),
    });
  };

  // OCR/scan handlers removed

  const groupedLogs = foodLogs?.reduce((acc: any, log: any) => {
    if (!acc[log.mealType]) {
      acc[log.mealType] = [];
    }
    acc[log.mealType].push(log);
    return acc;
  }, {}) || {};

  const mealTypes = [
    { value: 'breakfast', label: t('meals.breakfast'), icon: 'fa-sun', color: 'orange' },
    { value: 'lunch', label: t('meals.lunch'), icon: 'fa-sun', color: 'yellow' },
    { value: 'dinner', label: t('meals.dinner'), icon: 'fa-moon', color: 'purple' },
    { value: 'snack', label: t('meals.snack'), icon: 'fa-apple-alt', color: 'green' },
  ];

  const getTotalCalories = () => {
    return foodLogs?.reduce((sum: number, log: any) => sum + (parseFloat(log.calories) || 0), 0) || 0;
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout showSidebar={true}>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Food Log</h1>
            <p className="text-gray-600 dark:text-gray-400">Track your daily nutrition intake</p>
          </div>
          <Button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-nutricare-green hover:bg-nutricare-dark"
          >
            <i className="fas fa-plus mr-2"></i>
            Add Food
          </Button>
          {/* Scan Food Label removed */}
        </div>

        {/* Date Selector */}
        <div className="mb-6">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
        </div>

        {/* Daily Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Calories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(getTotalCalories())}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">kcal consumed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Meals Logged</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {foodLogs?.length || 0}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">food items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Goal Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round((getTotalCalories() / 2000) * 100)}%
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">of daily goal</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Food Form */}
        {showAddForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Add Food Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Food Name</label>
                  <Input
                    value={newMeal.foodName}
                    onChange={(e) => setNewMeal({ ...newMeal, foodName: e.target.value })}
                    placeholder="Enter food name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Meal Type</label>
                  <Select value={newMeal.mealType} onValueChange={(value) => setNewMeal({ ...newMeal, mealType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mealTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Quantity (grams)</label>
                  <Input
                    type="number"
                    value={newMeal.quantity}
                    onChange={(e) => setNewMeal({ ...newMeal, quantity: e.target.value })}
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Calories</label>
                  <Input
                    type="number"
                    value={newMeal.calories}
                    onChange={(e) => setNewMeal({ ...newMeal, calories: e.target.value })}
                    placeholder="200"
                  />
                </div>
              </div>
              <div className="flex space-x-4">
                <Button 
                  onClick={handleAddMeal}
                  disabled={addFoodLogMutation.status === 'pending'}
                  className="bg-nutricare-green hover:bg-nutricare-dark"
                >
                  {addFoodLogMutation.status === 'pending' ? 'Adding...' : 'Add Food'}
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Food Logs by Meal Type */}
        <div className="space-y-6">
          {mealTypes.map((mealType) => (
            <Card key={mealType.value}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className={`p-2 bg-${mealType.color}-500 rounded-full mr-3`}>
                    <i className={`fas ${mealType.icon} text-white text-sm`}></i>
                  </div>
                  {mealType.label}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({groupedLogs[mealType.value]?.length || 0} items)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {groupedLogs[mealType.value] && groupedLogs[mealType.value].length > 0 ? (
                  <div className="space-y-3">
                    {groupedLogs[mealType.value].map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            Food Item
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {parseFloat(log.quantity)} grams
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {Math.round(parseFloat(log.calories))} cal
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(log.loggedAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className={`p-4 bg-${mealType.color}-100 dark:bg-${mealType.color}-900/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center`}>
                      <i className={`fas ${mealType.icon} text-${mealType.color}-500 text-xl`}></i>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      No {mealType.label.toLowerCase()} logged yet
                    </p>
                    <Button 
                      onClick={() => {
                        setNewMeal({ ...newMeal, mealType: mealType.value });
                        setShowAddForm(true);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Add {mealType.label}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Scan UI removed */}

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nutricare-green"></div>
          </div>
        )}
      </div>
    </Layout>
  );
}
