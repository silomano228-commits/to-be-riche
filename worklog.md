---
Task ID: 1
Agent: main
Task: Integrate OTP email verification for registration, fix admin@berich.com email bounce, remove emojis

Work Log:
- Read existing OTP system files (email.ts, auth.ts, otp route, forgot-password route, register route, login route, schema)
- Identified that admin@berich.com domain doesn't exist, causing email bounces when OTP is sent to admin
- Added `emailVerified` boolean field to User schema (default: false)
- Updated login route to skip OTP for admin users (auto-login directly)
- Updated register route to NOT auto-login; instead creates user with emailVerified=false and sends OTP for email_verification
- Updated OTP route to accept `purpose` parameter for both send and verify actions (supports login, email_verification, password_reset)
- When OTP is verified with purpose=email_verification, sets emailVerified=true on the user
- Updated AuthScreen in page.tsx with otpPurpose state, handles email_verification flow after registration
- Registration now shows "Vérification email" OTP step before logging in
- Updated all admin seed locations to include emailVerified: true
- Set emailVerified=true for all existing users (backwards compatibility)
- Removed 👋 emoji from ChatScreen quick reply "Bonjour ! 👋" → "Bonjour !"
- Removed ✅ emoji from EnterpriseScreen button "✅ Réclamer" → "Réclamer"
- Changed ✅ to 👍 in GuideScreen MARKET_MOODS (more appropriate for data display)
- Kept emojis in FloatingGift.tsx (descriptive/story messages, appropriate per user request)
- Verified all API endpoints work: registration returns requires_verification, admin login skips OTP, forgot-password still works

Stage Summary:
- Email verification with OTP now required for new user registration
- Forgot password already used OTP system (no changes needed)
- Admin login no longer sends OTP to non-existent admin@berich.com domain
- Unnecessary emojis removed from UI elements (👋, ✅ from buttons/labels)
- Descriptive emojis kept in appropriate places (FloatingGift stories, market data display)
