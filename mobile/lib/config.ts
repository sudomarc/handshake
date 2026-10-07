// Public Expo variable: contains a URL only, never a secret.
const raw = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? "";

export const API_BASE_URL: string | null = raw ? raw.replace(/\/+$/, "") : null;
// Pressure analyses depend on an LLM call that can take >15 s server-side;
// keep the client timeout above the server timeout so errors stay server-reported.
export const REQUEST_TIMEOUT_MS = 30_000;
