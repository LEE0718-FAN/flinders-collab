# Mobile Testing Guide

Date: 2026-03-11

## Current State

- Capacitor is installed in `client`
- Native projects exist:
  - `client/android`
  - `client/ios`
- Mobile-safe wrappers were added for:
  - geolocation
  - clipboard
- Build command is ready:
  - `npm run mobile:build`

## What Was Prepared

- Web app build output is synced into the native shells
- Android location permissions were added
- iOS location usage descriptions were added
- Frontend now supports environment-based API and socket URLs

## What You Need On Your Mac To Run It

### iPhone Simulator / iOS device

- Full Xcode installed from the App Store
- Xcode selected as active developer directory

Commands after Xcode install:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
npm run mobile:open:ios
```

### Android emulator / Android device

- Java JDK installed
- Android Studio installed
- Android SDK configured

Command after Java + Android Studio install:

```bash
npm run mobile:open:android
```

## Environment Variables

Set these in your local `.env` before mobile testing:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=https://your-backend-url
VITE_SOCKET_URL=https://your-backend-url
```

## Important Architecture Note

This app is not Supabase-only.

You still need:

- Supabase for database/auth/storage
- A deployed Node backend for:
  - `/api/*`
  - Socket.IO chat
  - Socket.IO location updates

## Best Test Path

1. Deploy backend first
2. Put backend public URL into `VITE_API_BASE_URL` and `VITE_SOCKET_URL`
3. Run `npm run mobile:build`
4. Open Android or iOS project
5. Test signup, login, room create/join, event create, file upload, chat, location

## Local Network Test Path

If you want to test on your own phone before deploying the backend, you can use your Mac's LAN IP.

Example:

```bash
VITE_API_BASE_URL=http://192.168.0.10:3001
VITE_SOCKET_URL=http://192.168.0.10:3001
CLIENT_URL=http://localhost:5173,capacitor://localhost,http://localhost
```

Then:

1. Start the backend on your Mac
2. Make sure your phone and Mac are on the same Wi‑Fi
3. Run `npm run mobile:build`
4. Open the native project and run it on your phone

## Commands

```bash
npm run mobile:build
npm run mobile:open:android
npm run mobile:open:ios
```

## Known Limits Right Now

- iOS build was not run on this machine because full Xcode is not installed
- Android build was not run on this machine because Java runtime is missing
- Backend still needs deployment before the mobile app can fully function outside local web dev
