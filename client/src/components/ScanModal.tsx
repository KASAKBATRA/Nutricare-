import React, { useRef, ChangeEvent, useState } from 'react';
import { createPortal } from 'react-dom';
import Tesseract from 'tesseract.js';
import { useScan } from '@/context/ScanContext';

// Comprehensive nutrition extraction from OCR text - extracts from actual food label
function parseNutritionFacts(text: string) {
  console.log('🔍 Starting nutrition extraction from OCR text...');
  console.log('📄 Full OCR text:\n', text);
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let calories = 0, protein = 0, carbs = 0, fat = 0, saturatedFat = 0;
  let fiber = 0, sugar = 0, sodium = 0;
  let servingInfo = '';
  
  console.log(`📋 Processing ${lines.length} lines...`);
  
  // More aggressive number extraction - get ALL numbers from the line
  const extractAllNumbers = (line: string): number[] => {
    const matches = line.match(/\d+\.?\d*/g);
    return matches ? matches.map(m => parseFloat(m)) : [];
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    const numbers = extractAllNumbers(line);
    
    console.log(`Line ${i}: "${line}" → Numbers: [${numbers.join(', ')}]`);
    
    // Detect serving information
    if ((lowerLine.includes('per') && lowerLine.includes('100')) || 
        lowerLine.includes('serving') || 
        lowerLine.includes('nutritive value')) {
      servingInfo = line;
      console.log(`  ✓ Serving info: "${line}"`);
    }
    
    // Energy/Calories - take the largest number on the line
    if ((lowerLine.includes('energy') || lowerLine.includes('calor')) && numbers.length > 0) {
      // If kJ mentioned, convert to kcal, otherwise use largest number
      if (lowerLine.includes('kj')) {
        const kjValue = Math.max(...numbers);
        calories = Math.round(kjValue / 4.184);
        console.log(`  ✓ Energy (kJ→kcal): ${kjValue} → ${calories}`);
      } else {
        calories = Math.max(...numbers);
        console.log(`  ✓ Calories: ${calories}`);
      }
    }
    
    // Protein
    if (lowerLine.includes('protein') && numbers.length > 0) {
      protein = numbers[numbers.length - 1]; // Usually last number is the value
      console.log(`  ✓ Protein: ${protein}g`);
    }
    
    // Carbohydrates (avoid "of which" lines)
    if (lowerLine.includes('carb') && !lowerLine.includes('of which') && numbers.length > 0) {
      carbs = numbers[numbers.length - 1];
      console.log(`  ✓ Carbs: ${carbs}g`);
    }
    
    // Total Fat (avoid saturated/trans fat lines)
    if (lowerLine.includes('fat') && 
        !lowerLine.includes('saturated') && 
        !lowerLine.includes('trans') && 
        numbers.length > 0) {
      fat = numbers[numbers.length - 1];
      console.log(`  ✓ Fat: ${fat}g`);
    }
    
    // Saturated Fat
    if (lowerLine.includes('saturated') && numbers.length > 0) {
      saturatedFat = numbers[numbers.length - 1];
      console.log(`  ✓ Saturated Fat: ${saturatedFat}g`);
    }
    
    // Sugar
    if (lowerLine.includes('sugar') && numbers.length > 0) {
      sugar = numbers[numbers.length - 1];
      console.log(`  ✓ Sugar: ${sugar}g`);
    }
    
    // Fiber
    if ((lowerLine.includes('fiber') || lowerLine.includes('fibre')) && numbers.length > 0) {
      fiber = numbers[numbers.length - 1];
      console.log(`  ✓ Fiber: ${fiber}g`);
    }
    
    // Sodium/Salt
    if ((lowerLine.includes('sodium') || lowerLine.includes('salt')) && numbers.length > 0) {
      const value = numbers[numbers.length - 1];
      // If value is small (< 10), it's probably in grams, convert to mg
      sodium = value < 10 ? value * 1000 : value;
      console.log(`  ✓ Sodium: ${sodium}mg`);
    }
  }
  
  console.log('📊 FINAL EXTRACTED VALUES:', { 
    calories, protein, carbs, fat, saturatedFat, fiber, sugar, sodium, servingInfo 
  });
  
  return {
    calories,
    protein,
    carbs,
    fat,
    saturatedFat,
    fiber,
    sugar,
    sodium,
    servingInfo
  };
}

function extractProductName(txt: string) {
  if (!txt) return '';
  const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^[^0-9]{3,}$/i.test(line) && line.length < 60) return line;
  }
  return lines[0] || '';
}

export function ScanModal() {
  const { isOpen, close, setLastStatus } = useScan();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [nutrition, setNutrition] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'ocr' | 'usda'>('ocr');

  const onChoose = () => fileRef.current?.click();

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!(e.target.files && e.target.files[0])) return;
    const file = e.target.files[0];
    setImage(file);
    setOcrText('');
    setNutrition(null);
    setAnalysis(null);
    setAlternatives([]);
    setLoading(true);

    try {
      // Step 1: OCR to extract text from food wrapper
      console.log('🔄 Starting OCR...');
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      console.log('✅ OCR Complete');
      setOcrText(text || '');
      
      // Step 2: Extract nutrition values from OCR text
      const extractedNutrition = parseNutritionFacts(text || '');
      const productName = extractProductName(text || '');

      console.log('📦 Product:', productName);
      console.log('📊 Extracted Nutrition:', extractedNutrition);

      // Step 3: Only use USDA if ALL OCR values are 0
      const hasOcrData = extractedNutrition.calories > 0 || 
                         extractedNutrition.protein > 0 || 
                         extractedNutrition.carbs > 0 || 
                         extractedNutrition.fat > 0;

      if (hasOcrData) {
        console.log('✅ Using OCR-extracted nutrition values');
        setSource('ocr');
        
        // Use OCR data directly
        const finalNutrition = {
          calories: extractedNutrition.calories,
          protein: extractedNutrition.protein,
          carbs: extractedNutrition.carbs,
          fat: extractedNutrition.fat,
          fiber: extractedNutrition.fiber,
          sugar: extractedNutrition.sugar,
          sodium: extractedNutrition.sodium,
          saturatedFat: extractedNutrition.saturatedFat,
          servingInfo: extractedNutrition.servingInfo
        };
        
        setNutrition(finalNutrition);
        
        // Calculate health classification
        const healthAnalysis = classifyFood(finalNutrition);
        setAnalysis(healthAnalysis);
        setLastStatus(healthAnalysis.status);
        
        // Get alternatives if unhealthy
        if (healthAnalysis.status === 'Unhealthy') {
          const alts = await fetchAlternatives(productName);
          setAlternatives(alts);
        }
      } else if (productName) {
        // Fallback to USDA only if OCR failed completely
        console.log('⚠️ No OCR nutrition data found, trying USDA API...');
        try {
          const response = await fetch('/api/analyze-scanned-food', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ foodName: productName })
          });

          if (response.ok) {
            const data = await response.json();
            setNutrition(data.nutrition);
            setAnalysis(data.analysis);
            setAlternatives(data.alternatives || []);
            setSource('usda');
            setLastStatus(data.analysis?.status);
          }
        } catch (error) {
          console.error('❌ USDA API failed:', error);
        }
      }

    } catch (err) {
      console.error('❌ OCR failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Classify food based on extracted nutrition
  function classifyFood(nutrition: any) {
    const { calories, sugar, fat, sodium, protein, fiber } = nutrition;
    
    const issues: string[] = [];
    const positives: string[] = [];
    
    // Check unhealthy indicators
    if (sugar > 15) issues.push(`High sugar (${sugar.toFixed(1)}g)`);
    if (fat > 20) issues.push(`High fat (${fat.toFixed(1)}g)`);
    if (sodium > 400) issues.push(`High sodium (${sodium.toFixed(0)}mg)`);
    
    // Check healthy indicators
    if (protein >= 8) positives.push(`Good protein (${protein.toFixed(1)}g)`);
    if (fiber >= 5) positives.push(`High fiber (${fiber.toFixed(1)}g)`);
    if (sugar <= 5) positives.push(`Low sugar (${sugar.toFixed(1)}g)`);
    
    // Classification based on requirements
    let status: 'Healthy' | 'Moderate' | 'Unhealthy';
    let explanation: string;
    let recommendation: string;
    
    if (calories > 300 || sugar > 15 || fat > 20) {
      status = 'Unhealthy';
      explanation = issues.length > 0 ? issues.join(', ') : 'High in calories, sugar, or fat';
      recommendation = 'Consider healthier alternatives or limit consumption';
    } else if (calories >= 150 && calories <= 300) {
      status = 'Moderate';
      explanation = 'Moderate calorie content';
      recommendation = 'Okay in moderation. Balance with healthier options';
    } else {
      status = 'Healthy';
      explanation = positives.length > 0 ? positives.join(', ') : 'Low calorie, balanced nutrition';
      recommendation = 'Good choice! Enjoy in appropriate portions';
    }
    
    return {
      status,
      explanation,
      recommendation,
      issues,
      positives
    };
  }

  // Fetch healthy alternatives
  async function fetchAlternatives(productName: string) {
    try {
      const response = await fetch('/api/get-healthy-alternatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productName })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.alternatives || [];
      }
    } catch (error) {
      console.error('Failed to fetch alternatives:', error);
    }
    
    // Fallback alternatives
    return [
      {
        name: 'Fresh Fruits',
        reason: 'Natural sweetness, high in vitamins and fiber',
        examples: ['Apple', 'Banana', 'Orange', 'Berries'],
        nutrition: { calories: 50, protein: 0.5, fat: 0.2, sugar: 10 }
      },
      {
        name: 'Roasted Chana',
        reason: 'High protein, crunchy snack alternative',
        examples: ['Roasted chickpeas', 'Roasted makhana'],
        nutrition: { calories: 120, protein: 8, fat: 2, sugar: 1 }
      },
      {
        name: 'Air-popped Popcorn',
        reason: 'Low calorie, whole grain snack',
        examples: ['Plain popcorn', 'Lightly salted popcorn'],
        nutrition: { calories: 31, protein: 1, fat: 0.4, sugar: 0 }
      }
    ];
  }

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm" style={{ zIndex: 99999 }}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-auto" style={{ width: '70%', maxWidth: '900px', height: '80%', maxHeight: '700px', zIndex: 100000 }}>
        <div className="p-4 flex items-center justify-between border-b dark:border-gray-700 bg-gradient-to-r from-nutricare-green/10 to-transparent">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">🔍</span>
            Scan Food Label
          </h3>
          <button onClick={close} className="text-gray-600 hover:text-gray-900 dark:text-gray-300 px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            ✕ Close
          </button>
        </div>
        
        <div className="p-6 flex flex-col md:flex-row gap-6 overflow-auto" style={{ maxHeight: 'calc(100% - 60px)' }}>
          {/* Left: Image Upload */}
          <div className="md:w-2/5 flex flex-col items-center gap-4">
            <div className="w-full">
              <button 
                onClick={onChoose} 
                className="w-full px-6 py-3 bg-gradient-to-r from-nutricare-green to-green-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                📤 Upload Image
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
            
            {image && (
              <div className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <img src={URL.createObjectURL(image)} alt="preview" className="w-full h-auto" />
              </div>
            )}
            
            {loading && (
              <div className="flex items-center gap-2 text-nutricare-green">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-nutricare-green"></div>
                <span>Processing image...</span>
              </div>
            )}
          </div>

          {/* Right: Results */}
          <div className="md:w-3/5 overflow-auto space-y-4">
            {/* Extracted Text */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span>📄</span> Extracted Text
              </h4>
              <pre className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300 max-h-32 overflow-auto bg-white dark:bg-gray-800 p-2 rounded">
                {ocrText || 'No text extracted yet...'}
              </pre>
            </div>

            {/* Nutrition Facts */}
            {nutrition && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span>📊</span> Nutrition Facts 
                  <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                    {source === 'usda' ? '🌐 USDA API' : '📸 From Label'}
                  </span>
                </h4>
                {nutrition.servingInfo && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 italic">
                    {nutrition.servingInfo}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white dark:bg-gray-800 p-2 rounded">
                    <span className="text-gray-600 dark:text-gray-400">Calories:</span>
                    <strong className="ml-2">{nutrition.calories} kcal</strong>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded">
                    <span className="text-gray-600 dark:text-gray-400">Protein:</span>
                    <strong className="ml-2">{nutrition.protein}g</strong>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded">
                    <span className="text-gray-600 dark:text-gray-400">Carbs:</span>
                    <strong className="ml-2">{nutrition.carbs}g</strong>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded">
                    <span className="text-gray-600 dark:text-gray-400">Fat:</span>
                    <strong className="ml-2">{nutrition.fat}g</strong>
                  </div>
                  {nutrition.saturatedFat > 0 && (
                    <div className="bg-white dark:bg-gray-800 p-2 rounded">
                      <span className="text-gray-600 dark:text-gray-400 text-xs">Saturated Fat:</span>
                      <strong className="ml-2">{nutrition.saturatedFat}g</strong>
                    </div>
                  )}
                  <div className="bg-white dark:bg-gray-800 p-2 rounded">
                    <span className="text-gray-600 dark:text-gray-400">Fiber:</span>
                    <strong className="ml-2">{nutrition.fiber}g</strong>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded">
                    <span className="text-gray-600 dark:text-gray-400">Sugar:</span>
                    <strong className="ml-2">{nutrition.sugar}g</strong>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded col-span-2">
                    <span className="text-gray-600 dark:text-gray-400">Sodium:</span>
                    <strong className="ml-2">{nutrition.sodium}mg</strong>
                  </div>
                </div>
                
                {/* Macro Distribution */}
                {(nutrition.protein > 0 || nutrition.carbs > 0 || nutrition.fat > 0) && (
                  <div className="mt-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                    <div className="text-xs font-semibold mb-2">Macro Distribution:</div>
                    <div className="flex gap-2 text-xs">
                      {nutrition.protein > 0 && (
                        <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                          Protein: {Math.round((nutrition.protein * 4 / nutrition.calories) * 100)}%
                        </span>
                      )}
                      {nutrition.carbs > 0 && (
                        <span className="bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                          Carbs: {Math.round((nutrition.carbs * 4 / nutrition.calories) * 100)}%
                        </span>
                      )}
                      {nutrition.fat > 0 && (
                        <span className="bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">
                          Fat: {Math.round((nutrition.fat * 9 / nutrition.calories) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Health Analysis */}
            {analysis && (
              <div className={`rounded-lg p-4 ${
                analysis.status === 'Healthy' 
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20' 
                  : analysis.status === 'Unhealthy'
                  ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20'
                  : 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20'
              }`}>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <span>{analysis.status === 'Healthy' ? '✅' : analysis.status === 'Unhealthy' ? '⚠️' : '⚖️'}</span>
                  Health Result: <span className={`${
                    analysis.status === 'Healthy' ? 'text-green-700 dark:text-green-400' 
                    : analysis.status === 'Unhealthy' ? 'text-red-700 dark:text-red-400'
                    : 'text-yellow-700 dark:text-yellow-400'
                  }`}>{analysis.status}</span>
                </h4>
                <p className="text-sm mb-2">{analysis.explanation}</p>
                <p className="text-xs italic text-gray-600 dark:text-gray-400">{analysis.recommendation}</p>
                
                {analysis.issues && analysis.issues.length > 0 && (
                  <div className="mt-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                    <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">⚠️ Issues:</div>
                    <ul className="text-xs space-y-1">
                      {analysis.issues.map((issue: string, idx: number) => (
                        <li key={idx} className="text-red-700 dark:text-red-300">• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.positives && analysis.positives.length > 0 && (
                  <div className="mt-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                    <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">✅ Positives:</div>
                    <ul className="text-xs space-y-1">
                      {analysis.positives.map((positive: string, idx: number) => (
                        <li key={idx} className="text-green-700 dark:text-green-300">• {positive}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Healthy Alternatives */}
            {alternatives && alternatives.length > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span>💡</span> Healthier Alternatives
                </h4>
                <div className="space-y-3">
                  {alternatives.map((alt, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-3">
                      <div className="font-medium text-green-700 dark:text-green-400">{alt.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">{alt.reason}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        Examples: {alt.examples.join(', ')}
                      </div>
                      <div className="text-xs mt-2 flex gap-2 flex-wrap">
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">🔥 {alt.nutrition.calories} kcal</span>
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">🥩 {alt.nutrition.protein}g</span>
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">🍬 {alt.nutrition.sugar}g sugar</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ScanModal;
