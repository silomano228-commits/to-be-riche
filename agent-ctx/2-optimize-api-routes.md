# Task 2: Optimize API Routes with Promise.all

## Agent: Code Optimizer

## Changes Made

### 1. `/src/app/api/auth/session/route.ts`
- **Added module-level `initialized` flag** with `ensureInitialized()` function to avoid redundant admin-seed and `ensureSiteConfig()` checks on every request. The flag resets on server restart, so re-initialization happens correctly.
- **Parallelized 5 independent DB queries** using `Promise.all`:
  - `db.transaction.findMany(...)`
  - `db.investment.findMany(...)`
  - `db.trade.count(...)`
  - `db.enterprise.count(...)`
  - `db.withdrawal.count(...)`
- Replaced the sequential `await` chain with a single `await Promise.all([...])` call.
- All existing logic, response format, cookie handling, and imports preserved.

### 2. `/src/app/api/auth/login/route.ts`
- **Parallelized the same 5 independent DB queries** using `Promise.all`.
- Replaced the sequential `await` chain with a single `await Promise.all([...])` call.
- All existing logic, response format, cookie handling, and imports preserved.

## Verification
- Lint passes (only pre-existing errors in unrelated files)
- No changes to response shapes, cookie logic, or `export const dynamic = 'force-dynamic'`
- The `initialized` flag correctly resets on server restart since it's a module-level variable
