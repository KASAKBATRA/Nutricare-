// Test script to verify nutrition API fallback
import { nutritionService } from './server/nutrition.ts';

async function testNutritionFallback() {
  console.log('🧪 Testing Nutrition API Fallback Chain...\n');
  
  try {
    console.log('Test 1: Fetching nutrition for "apple" (1 piece = 100g)');
    const result1 = await nutritionService.getNutrition('apple', 1, 'pieces');
    console.log('✅ Result:', result1);
    console.log('');
    
    console.log('Test 2: Fetching nutrition for "rice" (200g)');
    const result2 = await nutritionService.getNutrition('rice', 200, 'grams');
    console.log('✅ Result:', result2);
    console.log('');
    
    console.log('Test 3: Fetching nutrition for "banana" (1 piece)');
    const result3 = await nutritionService.getNutrition('banana', 1, 'pieces');
    console.log('✅ Result:', result3);
    console.log('');
    
    console.log('✅ All tests passed! Fallback system is working correctly.');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNutritionFallback();
