import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';

// Create connection pool
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL
});

// Create Drizzle instance
export const db = drizzle({ client: pool, schema });