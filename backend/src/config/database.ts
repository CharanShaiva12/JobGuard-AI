/**
 * JobGuard AI - MySQL 8.4 Database Connection Pool & Client
 * Module: backend.src.config.database
 * Purpose: Manages persistent connection pooling to MySQL 8.4 with strict parameterization.
 */

import mysql from 'mysql2/promise';
import { config } from './env.js';

let pool: mysql.Pool | null = null;

export function getDbPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: config.db.connectionLimit,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
  }
  return pool;
}

export async function testDbConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    const db = getDbPool();
    const [rows] = await db.query('SELECT 1 as test');
    return { connected: true, message: 'MySQL 8.4 connected successfully.' };
  } catch (error: any) {
    return { connected: false, message: `MySQL 8.4 connection error: ${error.message}` };
  }
}

/**
 * Executes a parameterized SQL query safely against MySQL 8.4.
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T> {
  const db = getDbPool();
  const [results] = await db.execute(sql, params);
  return results as T;
}
