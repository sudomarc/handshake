// Public Expo variable: contains a URL only, never a secret.
const raw = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? "";

export const API_BASE_URL: string | null = raw ? raw.replace(/\/+$/, "") : null;
export const REQUEST_TIMEOUT_MS = 15_000;
