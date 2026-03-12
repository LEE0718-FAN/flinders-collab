# Mobile Quick-Start Guide

Get the Flinders Collab app running on web and Android.

## Prerequisites

- Node.js 18+
- npm 9+
- Android Studio (for Android builds only)

## 1. Install Dependencies

From the project root:

```bash
npm install
```

This installs both `client` and `server` workspaces.

## 2. Start the Backend

```bash
npm run dev:server
```

The Express server starts on `http://localhost:3001` (default) with Socket.IO for real-time features.

## 3. Start the Web Client

```bash
npm run dev:client
```

Vite serves the React app at `http://localhost:5173`. The dev proxy forwards `/api` requests to the backend.

## 4. Core Flows to Verify

1. **Sign up / Log in** — use a `@flinders.edu.au` email.
2. **Create a room** — tap "Create Room" on the dashboard, fill in name and optional course name.
3. **Copy the invite code** — shown after room creation.
4. **Join a room** — tap "Join Room", paste the invite code. No room UUID needed.
5. **Navigate** — rooms appear in the sidebar and on the dashboard cards.

## 5. Android (Capacitor)

The project uses Capacitor for native Android builds.

```bash
cd client
npx cap sync android
npx cap open android
```

Build and run from Android Studio. The web app runs inside a WebView. All API calls route through the same backend — make sure the device/emulator can reach your dev server.

> **Tip:** On an emulator, use `10.0.2.2` instead of `localhost` to reach the host machine.

## 6. iOS (Future)

iOS support is planned but not yet configured. The Capacitor setup will extend to iOS when ready — no code changes are expected on the web or backend side.

## Troubleshooting

| Issue | Fix |
|---|---|
| "Failed to fetch rooms" on dashboard | Ensure the backend is running and the Vite proxy is configured. |
| Invalid invite code | Codes are case-insensitive and 8 characters (e.g. `A1B2C3D4`). Check for trailing spaces. |
| Android WebView blank screen | Run `npx cap sync android` after any client build to copy assets. |
| CORS errors in browser | The Vite dev server proxies `/api` — don't call the backend directly from the browser. |
