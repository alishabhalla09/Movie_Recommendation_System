const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:password@127.0.0.1:5432/mediahub' });

async function fixSequences() {
  const tables = ['users', 'items', 'interactions', 'reviews', 'watchlist'];
  for (const table of tables) {
    try {
      await pool.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), coalesce(max(id),0) + 1, false) FROM "${table}";`);
      console.log(`Fixed sequence for ${table}`);
    } catch (e) {
      console.log(`Failed to fix sequence for ${table}:`, e.message);
    }
  }
  pool.end();
}

fixSequences();
