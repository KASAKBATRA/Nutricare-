import React, { useRef, ChangeEvent, useState } from 'react';
import { createPortal } from 'react-dom';
import Tesseract from 'tesseract.js';
import { useScan } from '@/context/ScanContext';

// Reusable parse and classify helpers
function parseNutritionFacts(text: string) {
  const getVal = (regex: RegExp) => {
    const match = text.match(regex);
    return match ? parseFloat(match[1]) : undefined;
  };
  return {
    calories: getVal(/calories[^\d]*(\d+)/i),
    sugar: getVal(/sugar[^\d]*(\d+)/i),
    fat: getVal(/fat[^\d]*(\d+)/i),
    protein: getVal(/protein[^\d]*(\d+)/i),
    sodium: getVal(/sodium[^\d]*(\d+)/i),
    fiber: getVal(/fiber[^\d]*(\d+)/i),
  };
}

function classifyByNutrition(n: any) {
  if (!n) return { status: 'Unknown', explanation: 'No nutrition data available.' };
  const offenders: string[] = [];
  if (n.sugar && n.sugar >= 15) offenders.push(`sugar ${n.sugar}g`);
  if (n.sodium && n.sodium >= 400) offenders.push(`sodium ${n.sodium}mg`);
  if (n.fat && n.fat >= 20) offenders.push(`fat ${n.fat}g`);
  if (n.calories && n.calories >= 500) offenders.push(`calories ${n.calories}kcal`);
  if (offenders.length > 0) return { status: 'Unhealthy', explanation: `High in ${offenders.join(', ')}` };
  if ((n.protein ?? 0) >= 8 && (n.fiber ?? 0) >= 3 && (n.sugar ?? 0) <= 10) return { status: 'Healthy', explanation: 'Good protein & fiber, low sugar' };
  return { status: 'Moderate', explanation: 'Moderate nutrition profile' };
}

export function ScanModal() {
  const { isOpen, close, setLastStatus } = useScan();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [nutrition, setNutrition] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const onChoose = () => fileRef.current?.click();

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!(e.target.files && e.target.files[0])) return;
    const file = e.target.files[0];
    setImage(file);
    setOcrText('');
    setNutrition(null);
    setHealth(null);
    setLoading(true);

    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng');
      setOcrText(text || '');
      const facts = parseNutritionFacts(text || '');
      setNutrition(facts);

      // try to extract product name from OCR text
      const extractProductName = (txt: string) => {
        if (!txt) return '';
        const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          if (/^[^0-9]{3,}$/i.test(line) && line.length < 60) return line;
        }
        return lines[0] || '';
      };

      const product = extractProductName(text || '');

      let result = classifyByNutrition({ ...facts, calories: facts.calories });

      if (product) {
        try {
          const params = new URLSearchParams({ q: product, quantity: '1', unit: 'pieces' });
          const resp = await fetch(`/api/estimate-calories?${params.toString()}`, { credentials: 'include' });
          if (resp.ok) {
            const json = await resp.json();
            const serverNutrition = {
              calories: json.base_calories ?? json.calories ?? (facts as any).calories,
              protein: json.protein ?? (facts as any).protein,
              carbs: json.carbs ?? (facts as any).carbs,
              fat: json.fat ?? (facts as any).fat,
              fiber: json.fiber ?? (facts as any).fiber,
              sugar: json.sugar ?? (facts as any).sugar,
              sodium: json.sodium ?? (facts as any).sodium,
            };
            setNutrition(serverNutrition);
            result = classifyByNutrition(serverNutrition);
          }
        } catch (err) {
          console.warn('estimate-calories failed', err);
        }
      }

      setHealth(result);
      // set badge/status in header
      setLastStatus(result.status === 'Healthy' || result.status === 'Moderate' || result.status === 'Unhealthy' ? result.status : null);
    } catch (err) {
      console.error('OCR failed', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm" style={{ zIndex: 99999 }}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-auto" style={{ width: '60%', height: '70%', zIndex: 100000 }}>
        <div className="p-4 flex items-center justify-between border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold">Scan Food Label</h3>
          <div>
            <button onClick={close} className="text-gray-600 hover:text-gray-900 dark:text-gray-300">Close</button>
          </div>
        </div>
        <div className="p-4 flex flex-col md:flex-row gap-4 h-full">
          <div className="md:w-1/2 flex flex-col items-center justify-start gap-4">
            <div className="w-full flex items-center justify-center">
              <button onClick={onChoose} className="px-4 py-2 bg-nutricare-green text-white rounded">Upload Image</button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
            {image && <img src={URL.createObjectURL(image)} alt="preview" className="max-h-60 rounded shadow" />}
            {loading && <div className="text-sm text-gray-500">Processing image...</div>}
          </div>
          <div className="md:w-1/2 overflow-auto">
            <div className="mb-2">
              <strong>Extracted Text</strong>
              <pre className="whitespace-pre-wrap text-xs max-h-28 overflow-auto">{ocrText || '-'}</pre>
            </div>
            <div className="mb-2">
              <strong>Nutrition</strong>
              <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(nutrition || {}, null, 2)}</pre>
            </div>
            <div>
              <strong>Health Result</strong>
              <div className="mt-1 p-2 rounded" style={{ background: health?.status === 'Healthy' ? 'rgba(16,185,129,0.08)' : health?.status === 'Unhealthy' ? 'rgba(239,68,68,0.06)' : 'rgba(253,224,71,0.06)', color: health?.status === 'Healthy' ? '#059669' : health?.status === 'Unhealthy' ? '#dc2626' : '#b45309' }}>
                {health ? `${health.status}: ${health.explanation}` : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ScanModal;
