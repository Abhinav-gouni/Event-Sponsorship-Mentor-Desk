import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to parse CLI flags: node import_cloud_db.js --host=xxx --user=xxx ...
const args = {};
process.argv.slice(2).forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    args[key] = value;
  }
});

const host = args.host || process.env.DB_HOST;
const port = parseInt(args.port || process.env.DB_PORT || '3306', 10);
const user = args.user || process.env.DB_USER;
const password = args.password || process.env.DB_PASSWORD;
const database = args.database || process.env.DB_NAME;

if (!host || !user || !password) {
  console.log(`
Usage:
  node database/import_cloud_db.js --host=<host> --port=<port> --user=<user> --password=<pass> --database=<dbname>

Example:
  node database/import_cloud_db.js --host=gateway01.us-east-1.prod.aws.tidbcloud.com --port=4000 --user=xxxx.root --password=secret --database=c34_sponsorship_desk
`);
  process.exit(1);
}

async function runImport() {
  console.log(`[Cloud DB Import] Connecting to ${host}:${port} as ${user}...`);

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database: database || undefined,
    multipleStatements: true,
    ssl: { rejectUnauthorized: false }
  });

  try {
    if (database) {
      console.log(`[Cloud DB Import] Ensuring database '${database}' exists...`);
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await connection.query(`USE \`${database}\`;`);
    }

    // 1. Schema
    const schemaFile = path.resolve(__dirname, 'schema.sql');
    console.log(`[Cloud DB Import] Executing ${schemaFile}...`);
    const schemaSql = fs.readFileSync(schemaFile, 'utf8');
    await connection.query(schemaSql);
    console.log('✓ Tables created successfully.');

    // 2. Seed Data
    const seedFile = path.resolve(__dirname, 'seed.sql');
    console.log(`[Cloud DB Import] Executing ${seedFile}...`);
    const seedSql = fs.readFileSync(seedFile, 'utf8');
    await connection.query(seedSql);
    console.log('✓ Seed data populated successfully.');

    // 3. Migration 002 (Conversations & Committee Contacts)
    const migrationFile = path.resolve(__dirname, 'migrations/002_conversations_and_committees.sql');
    if (fs.existsSync(migrationFile)) {
      console.log(`[Cloud DB Import] Executing ${migrationFile}...`);
      const migrationSql = fs.readFileSync(migrationFile, 'utf8');
      await connection.query(migrationSql);
      console.log('✓ Migration 002 executed successfully.');
    }

    console.log('\n======================================================');
    console.log('🎉 SUCCESS! Your Cloud Database is fully initialized!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Import failed:', err.message);
  } finally {
    await connection.end();
  }
}

runImport();
