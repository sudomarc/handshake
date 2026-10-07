# Handshake Personal Mobile

Mobile app for Handshake Personal - verify who's really on the other end of the call.

## Quick Start

```bash
cd mobile
npm install
npm start
```

## Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Set `EXPO_PUBLIC_API_BASE_URL` to your backend URL (local IP for development, production URL for production).

## Build Android APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project (first time)
eas build:configure

# Build APK for testing
eas build --platform android --profile preview
```

## Project Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout (shield provider + overlay)
│   ├── (tabs)/             # Tab navigation
│   │   ├── _layout.tsx     # Tab bar config
│   │   ├── index.tsx       # Shield home (global status + contextual action)
│   │   └── trusted.tsx     # Trust Ledger
│   ├── verify/[pairId].tsx # Trust Ping + person management
│   ├── codes/[pairId].tsx  # Caller code screen
├── components/
│   ├── ActiveShield.tsx    # Contextual shield overlay
│   ├── StatusRing.tsx      # Global status indicator
│   ├── TrustPing.tsx       # Conversational verification flow
│   ├── CodeDisplay.tsx     # Rotating code display
│   ├── CreatePairForm.tsx  # Trusted person creation
│   └── PageShell.tsx
├── hooks/
│   ├── useLiveCode.ts      # Live code polling hook
│   └── usePairs.ts         # Trusted pairs management
├── lib/
│   ├── shield/
│   │   ├── capabilities.ts # Programmatic verification APIs
│   │   └── engine.tsx      # Global shield state engine
│   ├── api.ts              # API client
│   ├── apiTypes.ts         # Zod schemas & types
│   └── storage.ts          # SecureStore wrapper
├── app.json                # Expo config
├── eas.json                # EAS build profiles
├── tsconfig.json
├── package.json
└── .env.example
```

## Key Features

- **Protection home**: simple READY / CHECKING / VERIFY states with one primary verification action
- **Identity verification**: shared rotating-code verification that ends in Verified or Verification failed
- **Risk escalation**: high-pressure text analysis can trigger a personal identity question
- **Call warnings**: optional Android overlay for phone activity and companion use over third-party calling apps
- **Caller code**: large rotating code display for reading aloud
- Live code polling with server-anchored countdown
- Rate limiting handled on server
- Secure storage for pair IDs using expo-secure-store

## Environment Variables

| Variable                   | Required | Purpose                                                   |
| -------------------------- | -------- | --------------------------------------------------------- |
| `EXPO_PUBLIC_API_BASE_URL` | Yes      | Backend API base URL (e.g., `http://192.168.100.35:3000`) |

## Development

```bash
# Start dev server
npm start

# Type check
npm run typecheck

# Lint
npm run lint

# Format
npm run format
```

## Build

```bash
# Preview APK (for testing)
eas build --platform android --profile preview

# Production AAB (for Play Store)
eas build --platform android --profile production
```

## Call surfaces

Handshake does not replace the system Phone app and does not place users into a Handshake-only call.
The Android build can observe carrier call state and show an optional overlay above the phone or another app.
For WhatsApp and similar apps, use **Check a call** manually and keep warnings enabled if overlay permission is granted.
Handshake does not automatically receive private two-way audio from those third-party calls.
