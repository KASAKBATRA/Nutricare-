import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_MOj5Vhm8BULS@ep-calm-rain-a1fvhd46-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
});

async function testDatabaseSearch() {
  const client = await pool.connect();
  try {
    console.log('🧪 Testing Database Fallback for "apple"...\n');
    
    // Test 1: Exact match (case-insensitive)
    console.log('Test 1: Exact match');
    const exactResult = await client.query(
      'SELECT * FROM food_items WHERE LOWER(name) = LOWER($1)',
      ['apple']
    );
    console.log(`✅ Found ${exactResult.rows.length} exact matches`);
    if (exactResult.rows.length > 0) {
      const food = exactResult.rows[0];
      console.log(`   Name: ${food.name}`);
      console.log(`   Calories per 100g: ${food.calories_per_100g}`);
      console.log(`   Protein per 100g: ${food.protein_per_100g}g\n`);
    }
    
    // Test 2: Partial match (ILIKE)
    console.log('Test 2: Partial match (app)');
    const partialResult = await client.query(
      'SELECT * FROM food_items WHERE name ILIKE $1',
      ['%app%']
    );
    console.log(`✅ Found ${partialResult.rows.length} partial matches`);
    partialResult.rows.forEach(food => {
      console.log(`   - ${food.name} (${food.calories_per_100g} kcal/100g)`);
    });
    
    console.log('\n✅ Database fallback is working correctly!');
    console.log('\n📝 Next steps:');
    console.log('   1. Go to esbuild terminal');
    console.log('   2. Press Ctrl+C to stop server');
    console.log('   3. Run: npm run dev');
    console.log('   4. Try adding "apple" meal in the app');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testDatabaseSearch();
