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
│   ├── _layout.tsx         # Root layout
│   ├── (tabs)/             # Tab navigation
│   │   ├── _layout.tsx     # Tab bar config
│   │   ├── index.tsx       # Home screen
│   │   └── trusted.tsx     # My trusted people
│   ├── verify/[pairId].tsx # Verify screen (receiver)
│   └── codes/[pairId].tsx  # Caller code screen
├── components/             # Reusable UI components
│   ├── CodeDisplay.tsx     # Rotating code display
│   ├── VerifyForm.tsx      # Code verification form
│   └── CreatePairForm.tsx  # Trusted person creation
├── components/PageShell.tsx
├── hooks/
│   ├── useLiveCode.ts      # Live code polling hook
│   └── usePairs.ts         # Trusted pairs management
├── lib/
│   ├── api.ts              # API client
│   ├── apiTypes.ts         # Zod schemas & types
│   └── storage.ts          # SecureStore wrapper
├── hooks/
│   └── useLiveCode.ts
├── components/
│   ├── PageShell.tsx
│   ├── CodeDisplay.tsx
│   ├── VerifyForm.tsx
│   └── CreatePairForm.tsx
├── app.json                # Expo config
├── eas.json                # EAS build profiles
├── tsconfig.json
├── package.json
└── .env.example
```

## Key Features

- **Verify a Person**: Real-time TOTP code verification against backend
- **My Trusted People**: Manage trusted relationships
- **Caller Code**: Large code display for reading aloud
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
