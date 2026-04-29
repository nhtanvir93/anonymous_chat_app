import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './src/database/schema',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.HOST || 'localhost',
    port: Number(process.env.POSTGRES_HOST_PORT) || 5432,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'anonymous_chat',
    ssl: false,
  },
});
