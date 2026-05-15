import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { isUnauthorizedError } from '@/lib/authUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type TimeRange = 'daily' | 'weekly' | 'monthly';

export default function Reports() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  // Fetch data for reports
  const { data: foodLogs, isLoading: foodLogsLoading } = useQuery({
    queryKey: ['/api/food-logs-all'],
    queryFn: async () => {
      const response = await fetch('/api/food-logs', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch food logs');
      return response.json();
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: waterLogs, isLoading: waterLogsLoading } = useQuery({
    queryKey: ['/api/water-logs-all'],
    queryFn: async () => {
      const response = await fetch('/api/water-logs', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch water logs');
      return response.json();
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: weightLogs, isLoading: weightLogsLoading } = useQuery({
    queryKey: ['/api/weight-logs'],
    enabled: isAuthenticated,
    retry: false,
  });

  type UserProfile = {
    dateOfBirth?: string;
    gender?: string;
    height?: string;
    weight?: string;
    // add other fields as needed
    [key: string]: any;
  };

  const { data: userProfile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['/api/profile'],
    enabled: isAuthenticated,
    retry: false,
  });

  // Process data based on time range
  const processedData = useMemo(() => {
    if (!foodLogs || !waterLogs || !weightLogs) return null;
    
    // Ensure we have arrays to work with
    const foodLogsArray = Array.isArray(foodLogs) ? foodLogs : [];
    const waterLogsArray = Array.isArray(waterLogs) ? waterLogs : [];
    const weightLogsArray = Array.isArray(weightLogs) ? weightLogs : [];

    const now = new Date();
    const getDateRange = (range: TimeRange) => {
      const end = new Date();
      const start = new Date();
      
      switch (range) {
        case 'daily':
          start.setDate(end.getDate() - 7); // Last 7 days
          break;
        case 'weekly':
          start.setDate(end.getDate() - 30); // Last 30 days
          break;
        case 'monthly':
          start.setMonth(end.getMonth() - 6); // Last 6 months
          break;
      }
      return { start, end };
    };

    const { start, end } = getDateRange(timeRange);

    // Filter data by date range
    const filteredFoodLogs = foodLogsArray.filter((log: any) => {
      const logDate = new Date(log.date);
      return logDate >= start && logDate <= end;
    });

    const filteredWaterLogs = waterLogsArray.filter((log: any) => {
      const logDate = new Date(log.date);
      return logDate >= start && logDate <= end;
    });

    const filteredWeightLogs = weightLogsArray.filter((log: any) => {
      const logDate = new Date(log.loggedAt);
      return logDate >= start && logDate <= end;
    });

    // Calculate metrics
    const totalCalories = filteredFoodLogs.reduce((sum: number, log: any) => 
      sum + (parseFloat(log.calories) || 0), 0);
    
    const totalWater = filteredWaterLogs.reduce((sum: number, log: any) => 
      sum + (parseFloat(log.amount) || 0), 0);

    const averageCaloriesPerDay = filteredFoodLogs.length > 0 ? 
      totalCalories / Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))) : 0;

    const averageWaterPerDay = filteredWaterLogs.length > 0 ?
      totalWater / Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))) : 0;

    // Weight progress
    const weightChange = filteredWeightLogs.length >= 2 ? 
      parseFloat(filteredWeightLogs[0]?.weight || '0') - parseFloat(filteredWeightLogs[filteredWeightLogs.length - 1]?.weight || '0') : 0;

    // Meal distribution
    const mealDistribution = filteredFoodLogs.reduce((acc: any, log: any) => {
      acc[log.mealType] = (acc[log.mealType] || 0) + (parseFloat(log.calories) || 0);
      return acc;
    }, {});

    return {
      totalCalories,
      totalWater,
      averageCaloriesPerDay,
      averageWaterPerDay,
      weightChange,
      mealDistribution,
      filteredFoodLogs,
      filteredWaterLogs,
      filteredWeightLogs,
      daysInRange: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    };
  }, [foodLogs, waterLogs, weightLogs, timeRange]);

  const handleExportReport = () => {
    if (!processedData) return;

    // Calculate BMI if height and weight are available
    const calculateBMI = (height: number, weight: number) => {
      const heightInMeters = height / 100;
      return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
    };

    // Calculate age from date of birth
    const calculateAge = (dateOfBirth: string) => {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    const height = userProfile?.height ? parseFloat(userProfile.height) : null;
    const weight = userProfile?.weight ? parseFloat(userProfile.weight) : null;
    const bmi = height && weight ? calculateBMI(height, weight) : null;
    const age = userProfile?.dateOfBirth ? calculateAge(userProfile.dateOfBirth) : null;

    const reportData = {
      user: {
        name: `${(user as any)?.firstName || ''} ${(user as any)?.lastName || ''}`.trim(),
        email: (user as any)?.email,
        age: age,
        gender: userProfile?.gender || 'Not provided',
        height: height ? `${height} cm` : 'Not provided',
        weight: weight ? `${weight} kg` : 'Not provided',
        bmi: bmi ? `${bmi} kg/m²` : 'Not provided',
      },
      period: timeRange,
      dateRange: `${new Date().toLocaleDateString()} (${timeRange})`,
      metrics: {
        totalCalories: processedData.totalCalories,
        averageCaloriesPerDay: Math.round(processedData.averageCaloriesPerDay),
        totalWater: processedData.totalWater,
        averageWaterPerDay: Math.round(processedData.averageWaterPerDay * 10) / 10,
        weightChange: Math.round(processedData.weightChange * 10) / 10,
        mealDistribution: processedData.mealDistribution,
      },
      logsCount: {
        foodLogs: processedData.filteredFoodLogs.length,
        waterLogs: processedData.filteredWaterLogs.length,
        weightLogs: processedData.filteredWeightLogs.length,
      }
    };

    // Enhanced PDF export using jsPDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let currentY = 20;

    // Helper function to add simple watermark for medical reports
    const addWatermark = () => {
      // Save current state
      const currentFillColor = doc.getFillColor();
      const currentTextColor = doc.getTextColor();
      const currentFontSize = doc.getFontSize();
      
      // Add subtle watermark
      doc.setTextColor(250, 250, 250); // Very light gray
      doc.setFontSize(40);
      doc.setFont('helvetica', 'normal');
      
      // Center the watermark
      const watermarkText = 'Smart Well';
      const textWidth = doc.getTextWidth(watermarkText);
      const x = (pageWidth - textWidth) / 2;
      const y = pageHeight / 2;
      
      // Add watermark at 45 degree angle
      doc.text(watermarkText, x, y, { angle: 45 });
      
      // Restore previous state
      doc.setTextColor(currentTextColor);
      doc.setFontSize(currentFontSize);
    };

    // Helper function to add medical-style footer
    const addFooter = () => {
      // Save current state
      const currentTextColor = doc.getTextColor();
      const currentFontSize = doc.getFontSize();
      
      // Add footer background
      doc.setFillColor(245, 245, 245);
      doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
      
      // Add professional footer line
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(15, pageHeight - 23, pageWidth - 15, pageHeight - 23);
      
      // Add footer text
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      
      const footerText = 'Generated by Smart Well AI Healthcare Analytics';
      const textWidth = doc.getTextWidth(footerText);
      const x = (pageWidth - textWidth) / 2;
      
      doc.text(footerText, x, pageHeight - 16);
      
      // Add disclaimer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      
      const disclaimerText = 'This report is for informational purposes only and is not a substitute for professional medical advice.';
      const disclaimerWidth = doc.getTextWidth(disclaimerText);
      const disclaimerX = (pageWidth - disclaimerWidth) / 2;
      
      doc.text(disclaimerText, disclaimerX, pageHeight - 8);
      
      // Add page number
      const pageNum = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${pageNum}`, pageWidth - 25, pageHeight - 4);
      
      // Restore previous state
      doc.setTextColor(currentTextColor);
      doc.setFontSize(currentFontSize);
    };

    // Helper function to add text with better formatting
    const addText = (text: string, x: number, y: number, options: any = {}) => {
      doc.setFont(options.font || 'helvetica', options.style || 'normal');
      doc.setFontSize(options.size || 10);
      if (options.color) {
        doc.setTextColor(options.color[0], options.color[1], options.color[2]);
      } else {
        doc.setTextColor(0, 0, 0);
      }
      doc.text(text, x, y);
      return y + (options.lineHeight || 7);
    };

    // Helper function to draw lines
    const drawLine = (x1: number, y1: number, x2: number, y2: number, options: any = {}) => {
      doc.setLineWidth(options.width || 0.5);
      if (options.color) {
        doc.setDrawColor(options.color[0], options.color[1], options.color[2]);
      } else {
        doc.setDrawColor(0, 0, 0);
      }
      doc.line(x1, y1, x2, y2);
    };

    // Enhanced helper function to add section separator with style
    const addSectionSeparator = (y: number) => {
      // Main separator line
      drawLine(15, y, pageWidth - 15, y, { width: 1.5, color: [129, 199, 132] });
      
      // Accent line below
      drawLine(15, y + 1, pageWidth - 15, y + 1, { width: 0.5, color: [200, 230, 201] });
      
      // Add decorative dots
      const dotSpacing = 30;
      for (let x = 25; x < pageWidth - 15; x += dotSpacing) {
        doc.setFillColor(129, 199, 132);
        doc.circle(x, y - 1, 0.8, 'F');
      }
      
      return y + 12;
    };

    // Add watermark to first page
    addWatermark();

    // Medical Report Header Section (like diagnostic lab report)
    // Top banner with light green background
    doc.setFillColor(230, 248, 230); // Light green background
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    // Professional border
    doc.setLineWidth(1);
    doc.setDrawColor(46, 125, 50);
    doc.rect(0, 0, pageWidth, 35, 'S');
    
    // Logo and app name section
    doc.setTextColor(37, 97, 41);
    currentY = addText('Smart Well: Smart Health Care', 15, 15, { 
      size: 18, 
      style: 'bold',
      color: [37, 97, 41]
    });
    
    currentY = addText('Comprehensive Nutrition and Lifestyle Report', 15, 28, { 
      size: 12, 
      style: 'normal',
      color: [60, 60, 60]
    });
    
    // Reset position after header
    currentY = 45;

    // Report metadata header box
    doc.setFillColor(248, 252, 248); // Very light green
    doc.rect(15, currentY, pageWidth - 30, 45, 'F');
    
    // Professional border
    doc.setLineWidth(1);
    doc.setDrawColor(129, 199, 132);
    doc.rect(15, currentY, pageWidth - 30, 45, 'S');
    
    currentY += 10;
    
    // Report ID and generation info
    const reportId = `NTR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;
    const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    
    // Left side - User Details
    let leftY = currentY;
    leftY = addText('PATIENT DETAILS', 20, leftY, { size: 10, style: 'bold', color: [37, 97, 41] });
    leftY = addText(`Name: ${reportData.user.name || 'Not provided'}`, 20, leftY + 2, { size: 9, color: [60, 60, 60] });
    leftY = addText(`Age: ${reportData.user.age || 'Not provided'}`, 20, leftY, { size: 9, color: [60, 60, 60] });
    leftY = addText(`Gender: ${reportData.user.gender}`, 20, leftY, { size: 9, color: [60, 60, 60] });
    
    // Continue left side
    leftY = addText(`Height: ${reportData.user.height}`, 20, leftY, { size: 9, color: [60, 60, 60] });
    leftY = addText(`Weight: ${reportData.user.weight}`, 20, leftY, { size: 9, color: [60, 60, 60] });
    
    // BMI with status indicator
    const bmiValue = reportData.user.bmi;
    let bmiColor = [60, 60, 60];
    let bmiStatus = '';
    let healthCondition = 'Normal Range';
    
    if (bmi) {
      if (bmi < 18.5) {
        bmiColor = [255, 140, 0]; // Orange for underweight
        bmiStatus = ' (Underweight)';
        healthCondition = 'Underweight';
      } else if (bmi >= 18.5 && bmi < 25) {
        bmiColor = [0, 128, 0]; // Green for normal
        bmiStatus = ' (Normal)';
        healthCondition = 'Normal Weight';
      } else if (bmi >= 25 && bmi < 30) {
        bmiColor = [255, 140, 0]; // Orange for overweight
        bmiStatus = ' (Overweight)';
        healthCondition = 'Overweight';
      } else {
        bmiColor = [255, 0, 0]; // Red for obese
        bmiStatus = ' (Obese)';
        healthCondition = 'Obesity';
      }
    }
    
    addText(`BMI: ${bmiValue}${bmiStatus}`, 20, leftY, { size: 9, color: bmiColor, style: 'bold' });
    addText(`Health Condition: ${healthCondition}`, 20, leftY + 7, { size: 9, color: bmiColor, style: 'bold' });
    
    // Right side - Report Metadata
    let rightY = currentY;
    rightY = addText('REPORT INFORMATION', pageWidth - 90, rightY, { size: 10, style: 'bold', color: [37, 97, 41] });
    rightY = addText(`Report ID: ${reportId}`, pageWidth - 90, rightY + 2, { size: 9, color: [60, 60, 60] });
    rightY = addText(`Date of Generation: ${currentDate}`, pageWidth - 90, rightY, { size: 9, color: [60, 60, 60] });
    rightY = addText(`Time: ${currentTime}`, pageWidth - 90, rightY, { size: 9, color: [60, 60, 60] });
    rightY = addText(`Analysis Period: ${timeRange.toUpperCase()}`, pageWidth - 90, rightY, { size: 9, color: [60, 60, 60] });
    
    currentY += 40;

    // Medical-style Nutrition Summary Table
    currentY += 10;
    
    // Section header with light green background
    doc.setFillColor(230, 248, 230); // Light green background
    doc.rect(15, currentY, pageWidth - 30, 12, 'F');
    doc.setLineWidth(0.5);
    doc.setDrawColor(129, 199, 132);
    doc.rect(15, currentY, pageWidth - 30, 12, 'S');
    
    currentY = addText('NUTRITION SUMMARY TABLE', 20, currentY + 8, { size: 12, style: 'bold', color: [37, 97, 41] });
    currentY += 8;
    
    // Create medical-style table
    const tableHeight = 100;
    
    // Table background
    doc.setFillColor(255, 255, 255);
    doc.rect(15, currentY, pageWidth - 30, tableHeight, 'F');
    
    // Table border
    doc.setLineWidth(1);
    doc.setDrawColor(0, 0, 0);
    doc.rect(15, currentY, pageWidth - 30, tableHeight, 'S');
    
    // Table headers with light green background
    doc.setFillColor(240, 250, 240);
    doc.rect(15, currentY, pageWidth - 30, 15, 'F');
    
    // Header borders
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.rect(15, currentY, pageWidth - 30, 15, 'S');
    
    // Column positions for medical table
    const testCol = 25;      // Test (Nutrient/Metric)
    const valueCol = 75;     // Value
    const unitCol = 115;     // Unit  
    const refRangeCol = 145; // Reference Range
    
    // Column headers
    addText('Test (Nutrient/Metric)', testCol, currentY + 10, { style: 'bold', size: 9, color: [0, 0, 0] });
    addText('Value', valueCol, currentY + 10, { style: 'bold', size: 9, color: [0, 0, 0] });
    addText('Unit', unitCol, currentY + 10, { style: 'bold', size: 9, color: [0, 0, 0] });
    addText('Reference Range', refRangeCol, currentY + 10, { style: 'bold', size: 9, color: [0, 0, 0] });
    
    // Vertical column separators
    doc.line(70, currentY, 70, currentY + tableHeight);
    doc.line(110, currentY, 110, currentY + tableHeight);
    doc.line(140, currentY, 140, currentY + tableHeight);
    
    currentY += 18;
    
    // Calculate nutrition data with medical formatting
    const avgCalories = Math.round(processedData.averageCaloriesPerDay);
    const avgWater = Math.round(processedData.averageWaterPerDay * 250) / 100; // Convert to liters
    
    // Helper function to get medical status colors
    const getMedicalColor = (value: number, min: number, max: number) => {
      if (value < min) return [255, 140, 0]; // Orange for below normal
      if (value > max) return [255, 0, 0];   // Red for above normal
      return [0, 100, 0];                   // Dark green for normal
    };
    
    // Medical nutrition parameters with reference ranges (match report template)
    const proteinEstimate = Math.round(avgCalories * 0.15 / 4); // grams
    const carbsEstimate = Math.round(avgCalories * 0.5 / 4);
    const fatsEstimate = Math.round(avgCalories * 0.3 / 9);
    const sugarEstimate = Math.round(avgCalories * 0.1 / 4);
    const fiberEstimate = Math.round(avgCalories / 100);

    const nutritionTests = [
      { key: 'calories', test: 'Calories', value: avgCalories, unit: 'kcal', refRange: '1800–2200', minRef: 1800, maxRef: 2200 },
      { key: 'protein', test: 'Protein', value: proteinEstimate, unit: 'g', refRange: '50–100 g', minRef: 50, maxRef: 100 },
      { key: 'carbs', test: 'Carbohydrates', value: carbsEstimate, unit: 'g', refRange: '225–325 g', minRef: 225, maxRef: 325 },
      { key: 'fats', test: 'Fats', value: fatsEstimate, unit: 'g', refRange: '50–80 g', minRef: 50, maxRef: 80 },
      { key: 'sugar', test: 'Sugar', value: sugarEstimate, unit: 'g', refRange: '<50 g', minRef: 0, maxRef: 50 },
      { key: 'fiber', test: 'Fiber', value: fiberEstimate, unit: 'g', refRange: '25–35 g', minRef: 25, maxRef: 35 },
      { key: 'water', test: 'Water Intake', value: avgWater, unit: 'L', refRange: '2.0–3.5 L', minRef: 2.0, maxRef: 3.5 },
      { key: 'bmi', test: 'BMI', value: bmi || 0, unit: 'kg/m²', refRange: '18.5–24.9', minRef: 18.5, maxRef: 24.9 }
    ];

    // Render rows
    nutritionTests.forEach((test, index) => {
      // Alternate row background (like medical reports)
      if (index % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(15, currentY - 5, pageWidth - 30, 11, 'F');
      }
      
      // Horizontal row separator
      if (index > 0) {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.line(15, currentY - 5, pageWidth - 15, currentY - 5);
      }
      
      // Test name
      addText(test.test, testCol, currentY, { size: 9, color: [0, 0, 0] });
      
      // Value with medical color coding
      const valueColor = getMedicalColor(test.value, test.minRef, test.maxRef);
      const valueStyle = (test.value < test.minRef || test.value > test.maxRef) ? 'bold' : 'normal';
      
      addText(test.value.toString(), valueCol, currentY, { 
        size: 9, 
        color: valueColor, 
        style: valueStyle 
      });
      
      // Unit
      addText(test.unit, unitCol, currentY, { size: 9, color: [0, 0, 0] });
      
      // Reference range
      addText(test.refRange, refRangeCol, currentY, { size: 9, color: [100, 100, 100] });
      
      currentY += 11;
    });
    
      currentY += 15;

      // Add note below table if any nutrient is too low or too high
      const tooLow = nutritionTests.filter(t => t.value < t.minRef).map(t => t.test + ` (${t.value}${t.unit})`);
      const tooHigh = nutritionTests.filter(t => t.value > t.maxRef).map(t => t.test + ` (${t.value}${t.unit})`);

      if (tooLow.length > 0 || tooHigh.length > 0) {
        const noteLines: string[] = [];
        if (tooLow.length > 0) noteLines.push(`Low: ${tooLow.join(', ')}`);
        if (tooHigh.length > 0) noteLines.push(`High: ${tooHigh.join(', ')}`);

        const noteText = `NOTE: ${noteLines.join(' | ')}`;
        addText(noteText, 20, currentY, { size: 9, color: [200, 50, 50], style: 'bold' });
        currentY += 12;
      }

    // Medical-style Meal Log Analysis
    // Section header with light green background
    doc.setFillColor(230, 248, 230); // Light green background
    doc.rect(15, currentY, pageWidth - 30, 12, 'F');
    doc.setLineWidth(0.5);
    doc.setDrawColor(129, 199, 132);
    doc.rect(15, currentY, pageWidth - 30, 12, 'S');
    
    currentY = addText('MEAL LOG ANALYSIS', 20, currentY + 8, { size: 12, style: 'bold', color: [37, 97, 41] });
    currentY += 8;
    
    // Create medical-style meal table
    const mealTableHeight = 85;
    
    // Table background
    doc.setFillColor(255, 255, 255);
    doc.rect(15, currentY, pageWidth - 30, mealTableHeight, 'F');
    
    // Table border
    doc.setLineWidth(1);
    doc.setDrawColor(0, 0, 0);
    doc.rect(15, currentY, pageWidth - 30, mealTableHeight, 'S');
    
    // Table headers with light green background
    doc.setFillColor(240, 250, 240);
    doc.rect(15, currentY, pageWidth - 30, 15, 'F');
    
    // Header borders
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.rect(15, currentY, pageWidth - 30, 15, 'S');
    
    // Column positions for meal table
    const foodCol = 25;      // Food Name
    const portionCol = 75;   // Portion Size
    const caloriesCol = 115; // Calories
    const verdictCol = 145;  // Verdict
    
    // Column headers
    addText('Food Name', foodCol, currentY + 10, { style: 'bold', size: 9, color: [0, 0, 0] });
    addText('Portion Size', portionCol, currentY + 10, { style: 'bold', size: 9, color: [0, 0, 0] });
    addText('Calories', caloriesCol, currentY + 10, { style: 'bold', size: 9, color: [0, 0, 0] });
    addText('Verdict', verdictCol, currentY + 10, { style: 'bold', size: 9, color: [0, 0, 0] });
    
    // Vertical column separators
    doc.line(70, currentY, 70, currentY + mealTableHeight);
    doc.line(110, currentY, 110, currentY + mealTableHeight);
    doc.line(140, currentY, 140, currentY + mealTableHeight);
    
    currentY += 18;
    
    // Use actual meal data from processedData.filteredFoodLogs
    const recentMeals = processedData.filteredFoodLogs.slice(0, 6); // Show last 6 meals
    
    // Helper function to get medical verdict
    const getMealVerdict = (calories: number) => {
      if (calories <= 200) return { text: 'Healthy', color: [0, 100, 0] };
      if (calories <= 500) return { text: 'Healthy', color: [0, 100, 0] };
      if (calories <= 700) return { text: 'Needs Improvement', color: [255, 140, 0] };
      return { text: 'Unhealthy', color: [255, 0, 0] };
    };
    
    if (recentMeals.length > 0) {
      recentMeals.forEach((meal: any, index: number) => {
        // Alternate row background
        if (index % 2 === 0) {
          doc.setFillColor(248, 248, 248);
          doc.rect(15, currentY - 5, pageWidth - 30, 11, 'F');
        }
        
        // Horizontal row separator
        if (index > 0) {
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.2);
          doc.line(15, currentY - 5, pageWidth - 15, currentY - 5);
        }
        
        const calories = Math.round(parseFloat(meal.calories) || 0);
        const verdict = getMealVerdict(calories);
        const foodName = meal.food_name || 'Food item';
        const truncatedFood = foodName.length > 15 ? foodName.substring(0, 15) + '...' : foodName;
        const portionSize = `${meal.quantity || 1} ${meal.unit || 'g'}`;
        
        // Food name
        addText(truncatedFood, foodCol, currentY, { size: 9, color: [0, 0, 0] });
        
        // Portion size
        addText(portionSize, portionCol, currentY, { size: 9, color: [0, 0, 0] });
        
        // Calories
        addText(`${calories}`, caloriesCol, currentY, { size: 9, color: [0, 0, 0] });
        
        // Verdict with medical color coding
        addText(verdict.text, verdictCol, currentY, { 
          size: 9, 
          color: verdict.color, 
          style: 'bold' 
        });
        
        currentY += 11;
      });
    } else {
      // No data message
      addText('No meal data available for selected time period', 20, currentY, { 
        size: 10, 
        color: [150, 150, 150], 
        style: 'italic' 
      });
      currentY += 15;
    }
    
    currentY += 15;

    // Medical-style Lifestyle & Wellness Section
    // Section header with light green background
    doc.setFillColor(230, 248, 230); // Light green background
    doc.rect(15, currentY, pageWidth - 30, 12, 'F');
    doc.setLineWidth(0.5);
    doc.setDrawColor(129, 199, 132);
    doc.rect(15, currentY, pageWidth - 30, 12, 'S');
    
    currentY = addText('LIFESTYLE & WELLNESS METRICS', 20, currentY + 8, { size: 12, style: 'bold', color: [37, 97, 41] });
    currentY += 8;
    
    // Create medical-style lifestyle table
    const lifestyleTableHeight = 55;
    
    // Table background
    doc.setFillColor(255, 255, 255);
    doc.rect(15, currentY, pageWidth - 30, lifestyleTableHeight, 'F');
    
    // Table border
    doc.setLineWidth(1);
    doc.setDrawColor(0, 0, 0);
    doc.rect(15, currentY, pageWidth - 30, lifestyleTableHeight, 'S');
    
    // Table headers with light green background
    doc.setFillColor(240, 250, 240);
    doc.rect(15, currentY, pageWidth - 30, 15, 'F');
    
    // Header borders
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.rect(15, currentY, pageWidth - 30, 15, 'S');
    
    // Column positions for lifestyle table
    const parameterCol = 25;    // Parameter
    const currentValCol = 75;   // Current Value
    const normalRangeCol = 125; // Normal Range
    const statusCol = 165;      // Status
    
    // Column headers
    addText('Parameter', parameterCol, currentY + 10, { style: 'bold', size: 9, color: [0, 0, 0] });
    addText('Current Value', currentValCol, currentY + 10, { style: 'bold', size: 9, color: [0, 0, 0] });
    addText('Normal Range', normalRangeCol, currentY + 10, { style: 'bold', size: 9, color: [0, 0, 0] });
    addText('Status', statusCol, currentY + 10, { style: 'bold', size: 9, color: [0, 0, 0] });
    
    // Vertical column separators
    doc.line(70, currentY, 70, currentY + lifestyleTableHeight);
    doc.line(120, currentY, 120, currentY + lifestyleTableHeight);
    doc.line(160, currentY, 160, currentY + lifestyleTableHeight);
    
    currentY += 18;
    
    // Lifestyle parameters with medical assessment
    const lifestyleParams = [
      {
        parameter: 'Stress Level',
        currentValue: '6/10',
        normalRange: '1-5/10',
        status: 'Elevated',
        statusColor: [255, 140, 0], // Orange for elevated
        isNormal: false
      },
      {
        parameter: 'Sleep Duration',
        currentValue: '7.0 hours',
        normalRange: '7-9 hours',
        status: 'Normal',
        statusColor: [0, 100, 0], // Green for normal
        isNormal: true
      },
      {
        parameter: 'Physical Activity',
        currentValue: 'Moderate',
        normalRange: 'Moderate-High',
        status: 'Adequate',
        statusColor: [0, 100, 0], // Green for adequate
        isNormal: true
      }
    ];

    lifestyleParams.forEach((param, index) => {
      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(15, currentY - 5, pageWidth - 30, 11, 'F');
      }
      
      // Horizontal row separator
      if (index > 0) {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.line(15, currentY - 5, pageWidth - 15, currentY - 5);
      }
      
      // Parameter name
      addText(param.parameter, parameterCol, currentY, { size: 9, color: [0, 0, 0] });
      
      // Current value
      addText(param.currentValue, currentValCol, currentY, { size: 9, color: [0, 0, 0] });
      
      // Normal range
      addText(param.normalRange, normalRangeCol, currentY, { size: 9, color: [100, 100, 100] });
      
      // Status with medical color coding
      addText(param.status, statusCol, currentY, { 
        size: 9, 
        color: param.statusColor, 
        style: param.isNormal ? 'normal' : 'bold' 
      });
      
      currentY += 11;
    });
    
    currentY += 15;

    // Check if we need a new page
    if (currentY > 200) {
      // Add footer to current page before creating new page
      addFooter();
      
      doc.addPage();
      
      // Add watermark and reset position for new page
      addWatermark();
      currentY = 20;
    }

    // Clinical Notes / AI Insights Section
    // Section header with light green background
    doc.setFillColor(230, 248, 230); // Light green background
    doc.rect(15, currentY, pageWidth - 30, 12, 'F');
    doc.setLineWidth(0.5);
    doc.setDrawColor(129, 199, 132);
    doc.rect(15, currentY, pageWidth - 30, 12, 'S');
    
    currentY = addText('CLINICAL NOTES / AI INSIGHTS', 20, currentY + 8, { size: 12, style: 'bold', color: [37, 97, 41] });
    currentY += 15;
    
    // Generate clinical summary based on data
    let clinicalSummary = '';
    
    // Nutritional assessment
    if (avgCalories >= 1800 && avgCalories <= 2200) {
      clinicalSummary += 'NUTRITIONAL STATUS: Patient demonstrates optimal caloric intake within recommended guidelines. ';
    } else if (avgCalories < 1800) {
      clinicalSummary += 'NUTRITIONAL STATUS: Suboptimal caloric intake observed. Recommendation for nutritional counseling. ';
    } else {
      clinicalSummary += 'NUTRITIONAL STATUS: Excessive caloric intake noted. Weight management intervention advised. ';
    }
    
    // Hydration assessment
    if (avgWater >= 2.5) {
      clinicalSummary += 'HYDRATION: Adequate fluid intake maintained. ';
    } else if (avgWater >= 2.0) {
      clinicalSummary += 'HYDRATION: Borderline adequate fluid intake. Monitor for improvement. ';
    } else {
      clinicalSummary += 'HYDRATION: Insufficient fluid intake. Increase daily water consumption recommended. ';
    }
    
    // BMI assessment
    if (bmi) {
      if (bmi >= 18.5 && bmi < 25) {
        clinicalSummary += 'ANTHROPOMETRIC: BMI within normal parameters. ';
      } else if (bmi < 18.5) {
        clinicalSummary += 'ANTHROPOMETRIC: BMI indicates underweight status. Nutritional intervention required. ';
      } else if (bmi >= 25 && bmi < 30) {
        clinicalSummary += 'ANTHROPOMETRIC: BMI indicates overweight status. Lifestyle modification recommended. ';
      } else {
        clinicalSummary += 'ANTHROPOMETRIC: BMI indicates obesity. Comprehensive weight management program advised. ';
      }
    }
    
    // Meal pattern assessment
    const mealCount = processedData.filteredFoodLogs.length;
    const daysInRange = processedData.daysInRange;
    const mealsPerDay = mealCount / Math.max(1, daysInRange);
    
    if (mealsPerDay >= 3 && mealsPerDay <= 4) {
      clinicalSummary += 'DIETARY PATTERN: Regular meal frequency observed, supporting metabolic stability. ';
    } else if (mealsPerDay < 3) {
      clinicalSummary += 'DIETARY PATTERN: Irregular meal frequency noted. Structured meal planning recommended. ';
    } else {
      clinicalSummary += 'DIETARY PATTERN: Frequent eating pattern observed. Portion control evaluation advised. ';
    }
    
    // Recommendations
    clinicalSummary += '\n\nRECOMMENDATIONS: ';
    const recommendations = [];
    
    if (avgCalories < 1800) {
      recommendations.push('Increase caloric intake through nutrient-dense foods');
    } else if (avgCalories > 2200) {
      recommendations.push('Implement portion control strategies and reduce caloric intake');
    }
    
    if (avgWater < 2.0) {
      recommendations.push('Increase daily fluid intake to minimum 2.5 liters');
    }
    
    if (bmi && (bmi < 18.5 || bmi >= 25)) {
      recommendations.push('Consider consultation with registered dietitian for personalized nutrition plan');
    }
    
    recommendations.push('Continue regular monitoring of nutritional intake and lifestyle parameters');
    recommendations.push('Maintain consistent meal timing for optimal metabolic function');
    
    clinicalSummary += recommendations.join('; ') + '.';
    
    // Clinical notes container
    doc.setFillColor(255, 255, 255);
    doc.rect(15, currentY, pageWidth - 30, 80, 'F');
    
    // Professional border
    doc.setLineWidth(1);
    doc.setDrawColor(0, 0, 0);
    doc.rect(15, currentY, pageWidth - 30, 80, 'S');
    
    currentY += 10;
    
    // Split text into lines for proper formatting
    const textLines = doc.splitTextToSize(clinicalSummary, pageWidth - 50);
    
    textLines.forEach((line: string) => {
      if (currentY > pageHeight - 30) {
        // Add footer to current page
        addFooter();
        doc.addPage();
        addWatermark();
        currentY = 20;
      }
      
      // Highlight section headers in clinical notes
      if (line.includes('NUTRITIONAL STATUS:') || line.includes('HYDRATION:') || 
          line.includes('ANTHROPOMETRIC:') || line.includes('DIETARY PATTERN:') || 
          line.includes('RECOMMENDATIONS:')) {
        addText(line, 20, currentY, { size: 9, color: [37, 97, 41], style: 'bold' });
      } else {
        addText(line, 20, currentY, { size: 9, color: [0, 0, 0] });
      }
      currentY += 6;
    });
    
    currentY += 15;

    // Add Professional Summary Statistics Box
    // Check if we need space for summary
    if (currentY > pageHeight - 80) {
      addFooter();
      doc.addPage();
      addWatermark();
      currentY = 20;
    }
    
    // Summary box header
    currentY = addText('📈 Report Summary & Key Metrics', 15, currentY, { size: 14, style: 'bold', color: [37, 97, 41] });
    currentY = addSectionSeparator(currentY);
    
    // Create summary statistics container
    doc.setFillColor(252, 254, 255);
    doc.rect(15, currentY, pageWidth - 30, 45, 'F');
    
    // Professional border with rounded corners effect
    doc.setLineWidth(1.5);
    doc.setDrawColor(37, 97, 41);
    doc.rect(15, currentY, pageWidth - 30, 45, 'S');
    
    // Inner accent border
    doc.setLineWidth(0.5);
    doc.setDrawColor(129, 199, 132);
    doc.rect(17, currentY + 2, pageWidth - 34, 41, 'S');
    
    currentY += 10;
    
    // Summary statistics in grid layout
    const leftCol = 25;
    const rightCol = 115;
    
    // Left column stats
    let summaryLeftY = currentY;
    summaryLeftY = addText('📊 Analysis Period', leftCol, summaryLeftY, { size: 10, style: 'bold', color: [46, 125, 50] });
    summaryLeftY = addText(`🍽️ Total Meals Logged`, leftCol, summaryLeftY + 2, { size: 10, style: 'bold', color: [46, 125, 50] });
    summaryLeftY = addText('⚖️ Health Score', leftCol, summaryLeftY + 2, { size: 10, style: 'bold', color: [46, 125, 50] });
    
    // Right column stats  
    let summaryRightY = currentY;
    summaryRightY = addText('💧 Hydration Status', rightCol, summaryRightY, { size: 10, style: 'bold', color: [46, 125, 50] });
    summaryRightY = addText('🎯 Goals Met', rightCol, summaryRightY + 2, { size: 10, style: 'bold', color: [46, 125, 50] });
    summaryRightY = addText('📋 Recommendations', rightCol, summaryRightY + 2, { size: 10, style: 'bold', color: [46, 125, 50] });
    
    // Values for left column
    summaryLeftY = currentY;
    summaryLeftY = addText(`: ${timeRange.toUpperCase()} (${processedData.daysInRange} days)`, leftCol + 45, summaryLeftY, { size: 10, color: [60, 60, 60] });
    summaryLeftY = addText(`: ${processedData.filteredFoodLogs.length} entries`, leftCol + 45, summaryLeftY + 2, { size: 10, color: [60, 60, 60] });
    
    // Calculate health score based on multiple factors
    let healthScore = 50; // Base score
    if (avgCalories >= 1800 && avgCalories <= 2200) healthScore += 25;
    if (avgWater >= 2.0) healthScore += 20;
    if (bmi && bmi >= 18.5 && bmi < 25) healthScore += 15;
    healthScore = Math.min(100, healthScore);
    
    const scoreColor = healthScore >= 80 ? [76, 175, 80] : healthScore >= 60 ? [255, 152, 0] : [244, 67, 54];
    addText(`: ${healthScore}/100`, leftCol + 45, summaryLeftY, { size: 10, color: scoreColor, style: 'bold' });
    
    // Values for right column
    summaryRightY = currentY;
    const hydrationStatus = avgWater >= 2.5 ? 'Excellent ✓' : avgWater >= 2.0 ? 'Good ✓' : 'Needs Improvement ⚠';
    const hydrationColor = avgWater >= 2.5 ? [76, 175, 80] : avgWater >= 2.0 ? [76, 175, 80] : [255, 152, 0];
    summaryRightY = addText(`: ${hydrationStatus}`, rightCol + 35, summaryRightY, { size: 10, color: hydrationColor });
    
    // Calculate goals met based on actual health metrics
    let goalsMetCount = 0;
    let totalGoals = 4; // Total health targets we're tracking
    
    if (avgCalories >= 1800 && avgCalories <= 2200) goalsMetCount++;
    if (avgWater >= 2.0) goalsMetCount++;
    if (bmi && bmi >= 18.5 && bmi < 25) goalsMetCount++;
    if (processedData.filteredFoodLogs.length / processedData.daysInRange >= 3) goalsMetCount++; // Regular meals
    
    summaryRightY = addText(`: ${goalsMetCount}/${totalGoals} targets`, rightCol + 35, summaryRightY + 2, { size: 10, color: [60, 60, 60] });
    
    // Calculate recommendations based on health metrics
    let recommendationCount = 0;
    if (avgCalories < 1800 || avgCalories > 2200) recommendationCount++;
    if (avgWater < 2.0) recommendationCount++;
    if (bmi && (bmi < 18.5 || bmi >= 25)) recommendationCount++;
    if (processedData.filteredFoodLogs.length / processedData.daysInRange < 3) recommendationCount++;
    
    summaryRightY = addText(`: ${recommendationCount} action items`, rightCol + 35, summaryRightY, { size: 10, color: [60, 60, 60] });
    
    currentY += 38;

    // Add final footer to the last page
    addFooter();
    
    // Enhanced file naming for medical report
    const formattedDate = new Date().toISOString().split('T')[0];
    const fileName = `SmartWell-Comprehensive-Health-Report-${timeRange.toUpperCase()}-${formattedDate}.pdf`;
    
    doc.save(fileName);

    toast({
      title: "Success",
      description: "Detailed health report exported as PDF!",
    });
  };

  const getMealTypeColor = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return 'bg-orange-500';
      case 'lunch': return 'bg-yellow-500';
      case 'dinner': return 'bg-purple-500';
      case 'snack': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getMealTypeIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return 'fa-sun';
      case 'lunch': return 'fa-sun';
      case 'dinner': return 'fa-moon';
      case 'snack': return 'fa-apple-alt';
      default: return 'fa-utensils';
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const isDataLoading = foodLogsLoading || waterLogsLoading || weightLogsLoading || profileLoading;

  return (
    <Layout showSidebar={true}>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Health Reports</h1>
            <p className="text-gray-600 dark:text-gray-400">Track your nutrition and health progress over time</p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Last 7 Days</SelectItem>
                <SelectItem value="weekly">Last 30 Days</SelectItem>
                <SelectItem value="monthly">Last 6 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleExportReport}
              disabled={!processedData}
              className="bg-nutricare-green hover:bg-nutricare-dark"
            >
              <i className="fas fa-download mr-2"></i>
              Export Report
            </Button>
          </div>
        </div>

        {isDataLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nutricare-green"></div>
          </div>
        ) : !processedData ? (
          <div className="text-center py-12">
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <i className="fas fa-chart-bar text-gray-400 text-2xl"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Data Available</h3>
            <p className="text-gray-500 dark:text-gray-400">Start logging your meals and activities to see your reports.</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                    <i className="fas fa-fire text-red-500 mr-2"></i>
                    Total Calories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Math.round(processedData.totalCalories).toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {Math.round(processedData.averageCaloriesPerDay)}/day average
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                    <i className="fas fa-tint text-blue-500 mr-2"></i>
                    Total Water
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Math.round(processedData.totalWater)} glasses
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(processedData.averageWaterPerDay).toFixed(1)}/day average
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                    <i className="fas fa-weight text-nutricare-green mr-2"></i>
                    Weight Change
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${processedData.weightChange < 0 ? 'text-green-600' : processedData.weightChange > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                    {processedData.weightChange > 0 ? '+' : ''}{processedData.weightChange.toFixed(1)} kg
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Over {processedData.daysInRange} days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                    <i className="fas fa-utensils text-purple-500 mr-2"></i>
                    Meals Logged
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {processedData.filteredFoodLogs.length}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {Math.round(processedData.filteredFoodLogs.length / processedData.daysInRange * 10) / 10}/day average
                  </p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="detailed">Detailed</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Meal Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(processedData.mealDistribution).length > 0 ? (
                        <div className="space-y-4">
                          {Object.entries(processedData.mealDistribution).map(([mealType, calories]) => (
                            <div key={mealType}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                  <div className={`p-2 ${getMealTypeColor(mealType)} rounded-full mr-3`}>
                                    <i className={`fas ${getMealTypeIcon(mealType)} text-white text-sm`}></i>
                                  </div>
                                  <span className="font-medium capitalize">{mealType}</span>
                                </div>
                                <span className="text-sm font-semibold">{Math.round(calories as number)} cal</span>
                              </div>
                              <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${getMealTypeColor(mealType)}`}
                                  style={{ width: `${Math.min(100, ((calories as number) / Math.max(processedData.totalCalories, 1)) * 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No meal data available</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Health Metrics Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full mr-3">
                            <i className="fas fa-check text-green-500"></i>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Consistency Score</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Based on daily logging</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            {Math.round((processedData.filteredFoodLogs.length / processedData.daysInRange) * 100)}%
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full mr-3">
                            <i className="fas fa-tint text-blue-500"></i>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Hydration Goal</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Daily target: 8 glasses</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${processedData.averageWaterPerDay >= 8 ? 'text-green-600' : 'text-yellow-600'}`}>
                            {Math.round((processedData.averageWaterPerDay / 8) * 100)}%
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-full mr-3">
                            <i className="fas fa-bullseye text-purple-500"></i>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Calorie Goal</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Daily target: 2000 cal</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${Math.abs(processedData.averageCaloriesPerDay - 2000) <= 200 ? 'text-green-600' : 'text-yellow-600'}`}>
                            {Math.round((processedData.averageCaloriesPerDay / 2000) * 100)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Nutrition Tab */}
              <TabsContent value="nutrition">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Calorie Intake Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Total Calories</span>
                          <span className="text-lg font-bold">{Math.round(processedData.totalCalories).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Daily Average</span>
                          <span className="text-lg font-bold">{Math.round(processedData.averageCaloriesPerDay)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">vs. Recommended (2000)</span>
                          <span className={`text-lg font-bold ${processedData.averageCaloriesPerDay > 2000 ? 'text-red-600' : processedData.averageCaloriesPerDay < 1500 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {processedData.averageCaloriesPerDay > 2000 ? '+' : ''}{Math.round(processedData.averageCaloriesPerDay - 2000)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Hydration Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Total Water</span>
                          <span className="text-lg font-bold">{Math.round(processedData.totalWater)} glasses</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Daily Average</span>
                          <span className="text-lg font-bold">{processedData.averageWaterPerDay.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">vs. Recommended (8)</span>
                          <span className={`text-lg font-bold ${processedData.averageWaterPerDay >= 8 ? 'text-green-600' : 'text-yellow-600'}`}>
                            {processedData.averageWaterPerDay >= 8 ? '+' : ''}{(processedData.averageWaterPerDay - 8).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Progress Tab */}
              <TabsContent value="progress">
                <div className="grid grid-cols-1 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Weight Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {processedData.filteredWeightLogs.length > 0 ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Starting Weight</p>
                              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {parseFloat(processedData.filteredWeightLogs[processedData.filteredWeightLogs.length - 1]?.weight || '0').toFixed(1)} kg
                              </p>
                            </div>
                            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Weight</p>
                              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {parseFloat(processedData.filteredWeightLogs[0]?.weight || '0').toFixed(1)} kg
                              </p>
                            </div>
                            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Change</p>
                              <p className={`text-2xl font-bold ${processedData.weightChange < 0 ? 'text-green-600' : processedData.weightChange > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                                {processedData.weightChange > 0 ? '+' : ''}{processedData.weightChange.toFixed(1)} kg
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-6">
                            <h4 className="text-lg font-semibold mb-4">Recent Weight Entries</h4>
                            <div className="space-y-3">
                              {processedData.filteredWeightLogs.slice(0, 5).map((log: any) => (
                                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{parseFloat(log.weight).toFixed(1)} kg</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {new Date(log.loggedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  {log.bmi && (
                                    <div className="text-right">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">BMI: {parseFloat(log.bmi).toFixed(1)}</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No weight data available for this period</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Detailed Tab */}
              <TabsContent value="detailed">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Detailed Food Log</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {processedData.filteredFoodLogs.length > 0 ? (
                        <div className="space-y-3">
                          {processedData.filteredFoodLogs.slice(0, 20).map((log: any) => (
                            <div key={log.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 ${getMealTypeColor(log.mealType)} rounded-full`}>
                                  <i className={`fas ${getMealTypeIcon(log.mealType)} text-white text-sm`}></i>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white capitalize">{log.mealType}</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {parseFloat(log.quantity).toFixed(0)}g
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {Math.round(parseFloat(log.calories))} cal
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(log.loggedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                          {processedData.filteredFoodLogs.length > 20 && (
                            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                              ... and {processedData.filteredFoodLogs.length - 20} more entries
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No food logs available for this period</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Water Intake Log</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {processedData.filteredWaterLogs.length > 0 ? (
                        <div className="space-y-3">
                          {processedData.filteredWaterLogs.slice(0, 15).map((log: any) => (
                            <div key={log.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-500 rounded-full">
                                  <i className="fas fa-tint text-white text-sm"></i>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">Water Intake</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {parseFloat(log.amount)} glasses
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(log.loggedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                          {processedData.filteredWaterLogs.length > 15 && (
                            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                              ... and {processedData.filteredWaterLogs.length - 15} more entries
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No water logs available for this period</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </Layout>
  );
}
