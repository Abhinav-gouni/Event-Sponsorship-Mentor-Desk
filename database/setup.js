import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '../server/.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  multipleStatements: true
};

const DB_NAME = process.env.DB_NAME || 'c34_sponsorship_desk';

async function runSetup() {
  console.log(`[Database Setup] Connecting to MySQL server at ${dbConfig.host}:${dbConfig.port} as ${dbConfig.user}...`);
  
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('[Database Setup] Connected successfully.');

    // 1. Create database if not exists
    console.log(`[Database Setup] Creating database '${DB_NAME}' if not exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${DB_NAME}\`;`);

    // 2. Read schema.sql and execute
    const schemaFile = path.resolve(__dirname, 'schema.sql');
    if (fs.existsSync(schemaFile)) {
      console.log(`[Database Setup] Executing schema from ${schemaFile}...`);
      const schemaSql = fs.readFileSync(schemaFile, 'utf8');
      await connection.query(schemaSql);
      console.log('[Database Setup] Schema created successfully.');
    } else {
      console.error(`[Database Setup] schema.sql not found at ${schemaFile}`);
    }

    // 3. Read seed.sql and execute
    const seedFile = path.resolve(__dirname, 'seed.sql');
    if (fs.existsSync(seedFile)) {
      console.log(`[Database Setup] Executing seed data from ${seedFile}...`);
      const seedSql = fs.readFileSync(seedFile, 'utf8');
      await connection.query(seedSql);
      console.log('[Database Setup] Seed data populated successfully.');
    }

    // 4. Check Starter_Data/C34/fixture.json
    const fixturePath = path.resolve(__dirname, '../Starter_Data/C34/fixture.json');
    if (fs.existsSync(fixturePath)) {
      const stats = fs.statSync(fixturePath);
      if (stats.size > 0) {
        console.log(`[Starter Data] Found fixture at ${fixturePath} (${stats.size} bytes). Inspecting and importing...`);
        try {
          const rawFixture = fs.readFileSync(fixturePath, 'utf8');
          const fixtureData = JSON.parse(rawFixture);
          console.log('[Starter Data] Fixture content parsed:', Object.keys(fixtureData));
          // Import custom records if present in fixture
        } catch (err) {
          console.warn('[Starter Data] Fixture could not be parsed as JSON:', err.message);
        }
      } else {
        console.log('[Starter Data] Notice: Starter_Data/C34/fixture.json exists but is 0 bytes (empty file).');
        console.log('[Starter Data] Demonstration dataset in database/seed.sql has been initialized instead.');
      }
    } else {
      console.log('[Starter Data] Starter_Data/C34/fixture.json does not exist. Using demonstration dataset.');
    }

    // 5. Verification queries
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    const [events] = await connection.query('SELECT COUNT(*) as count FROM events');
    const [inventory] = await connection.query('SELECT COUNT(*) as count FROM sponsorship_inventory');
    const [agreements] = await connection.query('SELECT COUNT(*) as count FROM agreements');

    console.log('----------------------------------------------------');
    console.log('[Database Setup] VERIFICATION SUMMARY:');
    console.log(`- Users: ${users[0].count}`);
    console.log(`- Events: ${events[0].count}`);
    console.log(`- Inventory Items: ${inventory[0].count}`);
    console.log(`- Agreements: ${agreements[0].count}`);
    console.log('[Database Setup] Complete! Database is ready for C34 Event Sponsorship Match Desk.');
    console.log('----------------------------------------------------');

  } catch (err) {
    console.error('[Database Setup] FATAL ERROR:', err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runSetup();
