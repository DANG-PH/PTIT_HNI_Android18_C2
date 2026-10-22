import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { JSONWebKeySet } from 'jose';

const envFile = resolve(process.cwd(), '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

export const env = {
  port: Number(process.env.PORT ?? 3101),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
  dbPath: process.env.DB_PATH ?? resolve(process.cwd(), 'data/needtoknow.db'),
  tidecloakConfigPath:
    process.env.TIDECLOAK_CONFIG ?? resolve(process.cwd(), '../frontend/tidecloak.json'),
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  geminiFallbackModels: (
    process.env.GEMINI_FALLBACK_MODELS ?? 'gemini-3-flash-preview,gemini-3.5-flash-lite,gemini-3.1-flash-lite'
  )
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean),
};

/** The subset of the TideCloak adapter export (tidecloak.json) the API needs. */
export interface TideAdapterConfig {
  realm: string;
  'auth-server-url': string;
  resource: string;
  jwk?: JSONWebKeySet;
}

/** CLIENT_ADAPTER (deployment) wins over the file, same convention as the Tide SDK. */
export function loadTideConfig(): TideAdapterConfig {
  const raw = process.env.CLIENT_ADAPTER ?? readFileSync(env.tidecloakConfigPath, 'utf8');
  return JSON.parse(raw) as TideAdapterConfig;
}
