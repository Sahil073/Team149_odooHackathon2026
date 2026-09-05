import 'dotenv/config';
import { z } from 'zod';

/**
 * Every environment variable the server needs, validated once at boot.
 * If something is missing or malformed, we fail immediately with a clear
 * error instead of crashing later mid-request with a confusing stack trace.
 */
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),

    // Database
    DATABASE_URL: z
        .string()
        .url({ message: 'DATABASE_URL must be a valid Postgres connection string' }),

    // Redis
    REDIS_URL: z
        .string()
        .url({ message: 'REDIS_URL must be a valid redis:// connection string' })
        .default('redis://localhost:6379'),

    // Staff auth (Rep / Manager / Finance / Admin)
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('1d'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    // Portal auth — deliberately a SEPARATE secret from staff auth.
    // Customer.portal_login is a lower-privilege, scoped-down session; if it shared
    // JWT_SECRET with staff auth, a leaked portal token would be indistinguishable
    // from a staff token to any middleware that only checks the signature.
    PORTAL_JWT_SECRET: z.string().min(32, 'PORTAL_JWT_SECRET must be at least 32 characters'),
    PORTAL_JWT_EXPIRES_IN: z.string().default('12h'),

    // CORS — the Next.js frontend origin
    CORS_ORIGIN: z.string().default('http://localhost:3000'),

    // Smart layer (Team B) — read-only endpoints this server proxies to
    SMART_LAYER_BASE_URL: z.string().url().optional(),
    // ICD §5 Fallback Contract: if discount-risk-engine doesn't respond within this
    // window, Team A treats it as requiresApproval:true (fail-safe, not fail-open).
    // This constant is what that timeout actually reads from — keep it in sync with the ICD.
    SMART_LAYER_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),

    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error('❌ Invalid environment variables:');
        console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
        process.exit(1);
    }

    return parsed.data;
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';