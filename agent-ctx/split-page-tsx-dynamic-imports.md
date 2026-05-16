# Task: Split monolithic page.tsx using next/dynamic lazy loading

## Summary
Successfully split the monolithic `page.tsx` (1207 lines, 91KB) into separate files using `next/dynamic` lazy loading to resolve memory issues during compilation.

## Files Created/Modified

### Modified
- `/src/app/page.tsx` - Reduced from 1207 lines to 395 lines. Now uses `next/dynamic` to lazy-load heavy screen components. Keeps inline: SplashScreen, AuthScreen, HomeScreen, WalletScreen, BottomNav, BeRichApp (main router), CSS keyframes.
- `/src/components/shared.tsx` - Updated to include constants (INVEST_LEVELS, ENTERPRISE_TYPES, AI_TIPS, ENTERPRISE_NAMES) and updated Header component with `leftElement` prop.

### Created
- `/src/components/screens/InvestHubScreen.tsx` (169 lines) - Invest hub with investments, levels, claims
- `/src/components/screens/TradingScreen.tsx` (127 lines) - Trading with trades, directions, durations
- `/src/components/screens/EnterpriseScreen.tsx` (142 lines) - Enterprises/projects with types, claims
- `/src/components/screens/ProfileScreen.tsx` (77 lines) - Profile with settings, chat, logout
- `/src/components/screens/AnalyticsScreen.tsx` (64 lines) - Analytics dashboard
- `/src/components/screens/WithdrawScreen.tsx` (43 lines) - Withdrawal
- `/src/components/screens/AdminScreen.tsx` (126 lines) - Admin panel

### Deleted (old unused files)
- `/src/components/screens/AuthScreen.tsx`
- `/src/components/screens/WalletScreen.tsx`
- `/src/components/screens/AddProjectScreen.tsx`
- `/src/components/screens/InvestScreen.tsx`
- `/src/components/screens/ChatScreen.tsx`
- `/src/components/screens/HomeScreen.tsx`
- `/src/components/screens/WithdrawalScreen.tsx`

## Verification Results

1. **Homepage**: `GET /` returns **200** (compile: 752ms first time, 3-4ms subsequent)
2. **Login API**: `POST /api/auth/login` returns **200** (compile: 224ms first time, 30ms subsequent)
3. **Homepage after login**: `GET /` returns **200** (22ms)
4. **Lint**: Only 3 pre-existing errors (not related to this change):
   - `.dev-server.js` - 2x `require()` import
   - `src/app/api/auth/forgot-password/route.ts` - `require()` import

## Architecture
- Small screens (SplashScreen, AuthScreen, HomeScreen, WalletScreen, BottomNav) remain inline in page.tsx for immediate loading
- Heavy screens (InvestHub, Trading, Enterprise, Profile, Analytics, Withdraw, Admin) are lazy-loaded with `next/dynamic` + `ssr: false`
- Shared constants and components (Header, LogoImg, Modal, ToastContainer, NotificationContainer) are in shared.tsx
- Each screen file imports only what it needs from `@/components/shared` and `@/lib/store`
