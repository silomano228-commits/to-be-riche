---
Task ID: 1
Agent: Main Agent
Task: Implement referral (parrainage) system for Be Rich app

Work Log:
- Added referralCode, referredByCode, and referralCount fields to User model in Prisma schema
- Ran db:push --force-reset to apply schema changes
- Updated /api/auth/register to generate unique referral codes (BR-XXXXXX format) and accept optional referralCode input
- Updated /api/auth/session to compute completedWithdrawals, requiredReferrals, and needsReferral
- Updated /api/withdrawal to check referral requirements before allowing withdrawal
- Updated seed script and login auto-seed to include referralCode
- Updated store.ts AppUser interface with referral fields
- Added referral code input field to registration form
- Added referral code display card in profile screen with copy and share buttons
- Added referral requirement warnings in wallet screen and withdrawal screen
- Updated withdrawal button to be disabled when referral is required
- Added dedicated ReferralScreen with share, copy, stats, rules, and status display
- Added 'referral' page routing in BeRichApp
- Added 'Filleuls' count to profile info section

Stage Summary:
- Referral system fully implemented with BR-XXXXXX format codes
- Rules: After 3rd withdrawal, 1 referral required; every 2nd withdrawal after that requires 1 more referral
- Formula: requiredReferrals = ceil((nextWithdrawalNumber - 2) / 2) for nextWithdrawalNumber >= 3
- Registration accepts optional referral code that increments referrer's referralCount
- Withdrawal API blocks requests when referral requirement not met
- UI shows warnings and referral code prominently in wallet, withdrawal, and profile screens
- Dedicated ReferralScreen accessible from multiple points in the app
