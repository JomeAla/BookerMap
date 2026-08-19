# BookerMap Customer App — Expo Run & Test Guide

React Native customer app (`apps/mobile`) — Expo SDK 57, React Native 0.86, React 19.2, TypeScript 5.7.3. Native-only (Expo Go / EAS build). Web export is NOT supported (no `react-native-web` / `react-dom`).

## Prerequisites

- Node.js v24 (fnm): `C:\Users\jomea\AppData\Roaming\fnm\node-versions\v24.16.0\installation\node.exe`
- Expo Go app installed on your phone (SDK 57 from the Play Store / App Store)
- Phone and PC on the **same Wi-Fi network**
- Backend running: API must be on `:4000` (start via `node swc-build.js` then `node dist/main.js` in `apps/api`)

## Run

```powershell
cd "C:\Users\jomea\booking software\apps\mobile"
npm start
```

- Scan the QR code with Expo Go (Android) or the Camera app (iOS).
- The API base URL auto-resolves to your PC's LAN IP from Expo's `hostUri` (see `src/lib/api.ts`). No config needed.
- If the QR/metro connection fails: press `s` to switch to Expo Go, or use tunnel mode: `npm start -- --tunnel` (slow, but works across networks).

## Test

```powershell
npm run typecheck   # tsc --noEmit
npm test            # jest (jest-expo preset)
```

21 tests across `src/__tests__`: format helpers, API client, Button, Input, Card components.

## Manual flow script (customer)

1. **Home** — browse active businesses (`GET /public/tenants`).
2. **TenantServices** — tap a business → service list + booking CTA.
3. **BookingFlow** — pick date/time, enter name/phone/details, confirm.
4. **BookingConfirmation** — shows booking reference (format `BM-XXXXXXX`).
5. **PhoneLogin** — enter phone → OTP sent (SMS and/or email per tenant config). In dev (`NODE_ENV != production`) the API returns `devCode` — display it in the snackbar to enter manually.
6. **OtpVerify** — enter code → 30-day customer JWT stored in AsyncStorage.
7. **MyBookings** — OTP-gated: lists the customer's bookings (requires a logged-in customer).
8. **BookingLookup** — public lookup by reference (`GET /public/:slug/bookings/:reference`).
9. **AiChat** — chat with the business's rule-based agent (`POST /ai/chat`).

## Notes

- Token: customer JWT in AsyncStorage (`auth_token`); 401 responses reset navigation to Main.
- Anti-bot honeypot: hidden `website_url` field rides along on OTP/booking requests — harmless for real users, traps bots server-side.
- Theme accent: `#059669` (see `src/theme.ts`).
