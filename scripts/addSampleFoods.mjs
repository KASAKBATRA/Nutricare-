import pg from 'pg';
const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_MOj5Vhm8BULS@ep-calm-rain-a1fvhd46-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
});

// Sample food items
const sampleFoods = [
  {
    name: 'apple',
    calories: 52,
    protein: 0.3,
    carbs: 14,
    fats: 0.2,
    fiber: 2.4,
    sugar: 10.4,
    sodium: 0.001
  },
  {
    name: 'banana',
    calories: 89,
    protein: 1.1,
    carbs: 23,
    fats: 0.3,
    fiber: 2.6,
    sugar: 12.2,
    sodium: 0.001
  },
  {
    name: 'rice',
    calories: 130,
    protein: 2.7,
    carbs: 28,
    fats: 0.3,
    fiber: 0.4,
    sugar: 0.1,
    sodium: 0.001
  },
  {
    name: 'chicken breast',
    calories: 165,
    protein: 31,
    carbs: 0,
    fats: 3.6,
    fiber: 0,
    sugar: 0,
    sodium: 0.074
  },
  {
    name: 'egg',
    calories: 155,
    protein: 13,
    carbs: 1.1,
    fats: 11,
    fiber: 0,
    sugar: 1.1,
    sodium: 0.124
  },
  {
    name: 'milk',
    calories: 42,
    protein: 3.4,
    carbs: 5,
    fats: 1,
    fiber: 0,
    sugar: 5,
    sodium: 0.044
  },
  {
    name: 'roti',
    calories: 297,
    protein: 11,
    carbs: 51,
    fats: 7,
    fiber: 4.5,
    sugar: 2.7,
    sodium: 0.412
  },
  {
    name: 'dal',
    calories: 116,
    protein: 9,
    carbs: 20,
    fats: 0.4,
    fiber: 8,
    sugar: 2,
    sodium: 0.005
  }
];

async function addSampleFoods() {
  const client = await pool.connect();
  try {
    console.log('🔄 Adding sample food items to database...\n');
    
    for (const food of sampleFoods) {
      // Check if food already exists
      const checkResult = await client.query(
        'SELECT id FROM food_items WHERE LOWER(name) = LOWER($1)',
        [food.name]
      );
      
      if (checkResult.rows.length > 0) {
        console.log(`⏭️  "${food.name}" already exists, skipping...`);
        continue;
      }
      
      // Insert new food item
      await client.query(
        `INSERT INTO food_items (name, calories_per_100g, protein_per_100g, carbs_per_100g, fats_per_100g, fiber_per_100g, sugar_per_100g, sodium_per_100g)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [food.name, food.calories, food.protein, food.carbs, food.fats, food.fiber, food.sugar, food.sodium]
      );
      
      console.log(`✅ Added "${food.name}" - ${food.calories} kcal/100g, ${food.protein}g protein`);
    }
    
    console.log('\n✅ Sample foods added successfully!');
    
    // Show total count
    const countResult = await client.query('SELECT COUNT(*) FROM food_items');
    console.log(`\n📊 Total food items in database: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error adding sample foods:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addSampleFoods();
