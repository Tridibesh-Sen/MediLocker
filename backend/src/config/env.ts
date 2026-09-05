import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CORS_ORIGIN: z.string().default('*'),

  // Database
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/medilocker?sslmode=disable'),

  // AI (Mistral multi-key pool)
  MISTRAL_API_KEY: z.string().default(''),
  MISTRAL_API_KEY_2: z.string().default(''),
  GEMINI_API_KEY: z.string().default(''),

  // Cloudinary (Optional fallback to local)
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),

  // Supabase (Storage & Platform)
  SUPABASE_URL: z.string().default(''),
  SUPABASE_KEY: z.string().default(''),
  SUPABASE_ANON_KEY: z.string().default(''),
  SUPABASE_BUCKET: z.string().default('medical-records'),

  // Redis (Optional)
  UPSTASH_REDIS_REST_URL: z.string().default(''),
  UPSTASH_REDIS_REST_TOKEN: z.string().default(''),

  // Security & WebAuthn
  JWT_SECRET: z.string().default('medilocker-super-secret-jwt-key-change-in-production-32-chars'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  CRON_SECRET: z.string().default('medilocker-cron-secret-2026'),
  WEBAUTHN_RP_NAME: z.string().default('MediLocker'),
  WEBAUTHN_RP_ID: z.string().default('localhost'),
  WEBAUTHN_ORIGIN: z.string().default('http://localhost:5500'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
