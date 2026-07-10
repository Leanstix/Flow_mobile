# Flow Mobile

Flow Mobile is the native Android and iOS client for the Flow university social network. It uses the same Django REST Framework and Django Channels contracts as the production web client while adapting the experience for mobile navigation, secure local storage, unreliable networks, native media, and realtime communication.

## Product surface

- Account registration, activation, login, secure session restoration, access-token refresh, logout, and required profile onboarding.
- Campus feed with publishing, optimistic likes, reposts, reporting, deletion, comments, and replies to comments.
- Student and post discovery, Flow requests, accepted connections, and direct-conversation creation.
- Realtime messaging with JWT-authenticated WebSockets, typing events, unread state, reconnect backoff, active-chat read handling, and REST fallback.
- Realtime in-app notification centre with mark-one and mark-all read actions.
- Profile display/editing, native profile-image selection/upload, password changes, and persisted app preferences.
- Authenticated WebRTC audio/video rooms with configurable TURN credentials.
- Explicit integration states for Events, Groups, and staff moderation until matching backend domains are available.
- Marketplace expansion is intentionally excluded from this release.

## Architecture

- **Expo SDK 56 + Expo Router** for native file-based navigation and deep links.
- **TypeScript** with strict checking.
- **TanStack Query** for server state, network-aware retries, optimistic updates, cache invalidation, and selective offline persistence.
- **Zustand** for authenticated identity, unified UI feedback, and persisted user preferences.
- **Expo SecureStore** for access/refresh tokens and account identity.
- **Axios** with a single-flight refresh interceptor and normalized API errors.
- **expo-image** and **expo-video** for memory/disk-cached media.
- **react-native-webrtc** for native audio/video calls.

Messages and notifications are deliberately excluded from the persisted query cache. Secure session data is stored in SecureStore rather than AsyncStorage.

## Requirements

- Node.js 22.13+
- Android Studio for local Android builds
- macOS/Xcode or EAS Build for iOS builds
- A development build. Expo Go cannot load `react-native-webrtc`.
- The backend changes from `Leanstix/Flow` PRs #1 and #2

## Setup

```bash
git clone https://github.com/Leanstix/Flow_mobile.git
cd Flow_mobile
cp .env.example .env
npm ci --legacy-peer-deps
npx expo prebuild --clean
npm run android
```

Environment variables:

```dotenv
EXPO_PUBLIC_API_URL=https://your-backend.example.com/api
EXPO_PUBLIC_WS_URL=wss://your-backend.example.com
EXPO_PUBLIC_TURN_URL=turn:turn.example.com:3478
EXPO_PUBLIC_TURN_USERNAME=flow
EXPO_PUBLIC_TURN_CREDENTIAL=replace-me
```

For a physical device on a local network, do not use `127.0.0.1`. Set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WS_URL` to the development machine's LAN address.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test:coverage
npx expo install --check
npm audit --omit=dev --audit-level=high
```

The test suite covers secure session persistence, authentication state, API route contracts, normalized errors, persisted preferences, and unified feedback modal behavior.

## Native builds

Initialize the EAS project once:

```bash
npx eas-cli init
```

Then create development clients or store builds:

```bash
npx eas-cli build --profile development --platform android
npx eas-cli build --profile development --platform ios
npx eas-cli build --profile production --platform all
```

## Backend deployment requirements

- Redis-backed Channels layer in production.
- The deployed mobile origin/scheme and WebSocket host permitted by backend security settings.
- HTTPS/WSS in production.
- TURN credentials for reliable calls across carrier networks, school Wi-Fi, and restrictive NATs.
- A future push-token endpoint is required before background push notifications can be enabled. Current notifications are realtime while the app is active.
