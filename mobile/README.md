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
│   │   ├── index.tsx       # Home (protection status + trusted people)
│   │   └── trusted.tsx     # Trusted people management
│   ├── verify/[pairId].tsx # Pre-call trust management for one person
│   └── trusted/[pairId].tsx # Trusted person detail + device management
├── components/
│   ├── ActiveShield.tsx    # Contextual shield overlay
│   ├── StatusRing.tsx      # Global status indicator
│   ├── CreatePairForm.tsx  # Trusted person creation
│   └── PageShell.tsx
├── hooks/
│   └── usePairs.ts         # Trusted pairs management
├── lib/
│   ├── shield/
│   │   ├── capabilities.ts # Risk analysis APIs
│   │   └── engine.tsx      # Shield state engine
│   ├── trust/              # Trusted-call protocol
│   │   ├── api.ts          # Trust API client
│   │   ├── callState.ts    # Call state derivation
│   │   ├── deviceIdentity.ts # Device ID + secret management
│   │   ├── orchestrator.ts # Call detection → trust → overlay bridge
│   │   ├── proof.ts        # Client-side proof computation
│   │   └── session.ts      # In-call trust orchestration
│   ├── audio/
│   │   └── pipeline.ts     # Real-time audio analysis (Handshake-controlled only)
│   ├── callOverlay.ts      # Android overlay bridge
│   ├── overlayIntent.ts    # Overlay launch-intent consumer
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

- **Protection home**: calm trust centre showing protection status and trusted people
- **Trusted people**: add, review, and revoke trusted people before a call
- **Automatic trust**: during a call, both Handshake installations authenticate each other automatically — no codes read aloud, nothing typed
- **Call warnings**: optional Android overlay showing honest call state (Trusted / Verify / Risk)
- **Real-time audio analysis**: for Handshake-controlled calls only (audio → VAD → STT → risk engine)
- **Device enrollment**: per-device identity with secure storage and server-side revocation
- Rate limiting handled on server
- Secure storage for pair IDs and device keys using expo-secure-store

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
The overlay shows honest state: **Trusted** (both phones confirmed the relationship), **Verify** (cannot confirm), or **Risk** (pressure detected).
Handshake does not automatically receive private two-way audio from carrier calls or third-party calling apps such as WhatsApp.
Real-time audio analysis is only available for Handshake-controlled calls where the app legitimately owns the audio stream.
