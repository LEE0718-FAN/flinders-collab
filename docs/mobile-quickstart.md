# Mobile Quickstart

Local network IP detected on this Mac: `10.14.45.29`

## Current setup

The project is already prepared for Capacitor mobile testing.

- Android project: `client/android`
- iOS project: `client/ios`
- Mobile build command: `npm run mobile:build`

## Before testing

You still need real Supabase credentials in `.env`:

```bash
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

The local API and socket URLs are already set to:

```bash
VITE_API_BASE_URL=http://10.14.45.29:3001
VITE_SOCKET_URL=http://10.14.45.29:3001
```

## Test on your own phone

1. Make sure your Mac and phone are on the same Wi‑Fi.
2. Start the backend on your Mac.
3. Run `npm run mobile:build`.
4. Open the native project.

iOS:

```bash
npm run mobile:open:ios
```

Android:

```bash
npm run mobile:open:android
```

## Current machine blockers

- iOS cannot be built yet because full Xcode is not installed
- Android cannot be built yet because Java is not installed

## What to install

iOS:

- Xcode from the App Store

Android:

- Java JDK
- Android Studio

## After installation

iOS:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
npm run mobile:open:ios
```

Android:

```bash
npm run mobile:open:android
```
