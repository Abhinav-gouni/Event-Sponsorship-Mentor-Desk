import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Look for .env in server folder or current working directory
const serverEnv = path.resolve(process.cwd(), 'server/.env');
const rootEnv = path.resolve(process.cwd(), '.env');

if (fs.existsSync(serverEnv)) {
  dotenv.config({ path: serverEnv });
} else if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '1234',
  database: process.env.DB_NAME || 'c34_sponsorship_desk',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  charset: 'utf8mb4',
  decimalNumbers: true
});

pool.on('error', (err) => {
  console.error('[MySQL Pool Error]', err);
});

export default pool;
