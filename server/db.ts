import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

// Create connection with SSL enabled for Supabase
const connectionString = process.env.DATABASE_URL as string;
const client = postgres(connectionString, {
  ssl: 'require',
});

export const db = drizzle(client, { schema });
