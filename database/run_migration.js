import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  database: process.env.DB_NAME || 'c34_sponsorship_desk',
  multipleStatements: true
};

async function run() {
  console.log('[Migration Runner] Connecting to database:', dbConfig.database);
  const connection = await mysql.createConnection(dbConfig);
  try {
    const migrationFile = path.resolve(__dirname, 'migrations/002_conversations_and_committees.sql');
    console.log('[Migration Runner] Reading migration:', migrationFile);
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log('[Migration Runner] Executing statements...');
    await connection.query(sql);
    console.log('[Migration Runner] Successfully executed migration 002.');

    const [tables] = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? 
        AND table_name IN ('event_committee_contacts', 'conversation_threads', 'conversation_messages', 'conversation_sponsor_requirements', 'conversation_approval_audit_logs')
    `, [dbConfig.database]);
    console.log('[Migration Runner] Verified tables present:', tables.map(t => t.TABLE_NAME || t.table_name));

    const [seededContacts] = await connection.query('SELECT committee_type, contact_person, is_verified FROM event_committee_contacts WHERE event_id = 1');
    console.log('[Migration Runner] Seeded contacts for Event 1:');
    console.table(seededContacts);

  } catch (err) {
    console.error('[Migration Runner] Error executing migration:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

run();
