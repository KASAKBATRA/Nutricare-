# NutriCare++ (Nutricare)

A nutrition tracking web application with user accounts and lightweight AI chat features.

This README documents how the project is organized, how to run it locally, key implementation details (especially the OTP email verification flow), and developer notes for common tasks.

---

## Table of Contents

- Project overview
- Architecture & folders
- Key features
- Authentication & OTP flow (detailed)
- Database & migrations (Drizzle)
- Environment variables
- Local development (run & test)
- Important files & where to look
- Troubleshooting
- Developer notes & conventions
- Next steps / Improvements

---

## Project overview

NutriCare++ is a personal nutrition and health-tracking app with features such as:

- User registration (with email OTP verification)
- Login & sessions (express-session, Postgres sessions)
- Password reset via OTP
- Food logging and daily nutrition summary
- User profiles and calibration (utensil mapping)
- Community posts and interactions
- Simple AI-powered chatbot and conversation storage

The app aims for a smooth UX around sign-up verification so users don't get stuck between "already exists" and "please verify" states.

---

## Architecture & folders

Top-level structure (relevant):

- `client/` - frontend application
  - `src/pages` - `Register.tsx`, `Login.tsx`, `VerifyOTP.tsx`, etc.
  - `src/components` - UI components and shared UI primitives
- `server/` - backend API
  - `auth.ts` - registration, login, OTP helper functions
  - `routes.ts` - Express routes wiring
  - `storage.ts` - Drizzle-based DB access layer
  - `email.ts` - `sendOTPEmail` and helpers
  - `db.ts` - Drizzle DB initialization / connection
- `shared/` - Drizzle schema (`schema.ts`) and shared types
- `drizzle/` - SQL migration files (drizzle-kit output)
- `package.json` - scripts and deps

---

## Key features (short)

- OTP-based email verification with 5-minute expiry
- Max 3 resend attempts per active OTP record
- Resend overwrites unexpired OTPs (instead of cluttering DB)
- `is_verified` boolean on users; login blocked until verified
- Frontend stores `pending_email` in `localStorage` during verification to avoid deadlocks on refresh/back
- API endpoints for register, verify-otp, resend-otp, login, forgot/reset password

---

## Authentication & OTP flow (detailed)

High level
- Users register via `/api/auth/register`.
- New users are created with `is_verified = false` and an OTP is created and emailed.
- Users verify with `/api/auth/verify-otp` which marks the OTP used and sets `users.is_verified = true`.
- Login (`/api/auth/login`) is only allowed if `is_verified` is `true`.
- If a user attempts to register with an existing email that is unverified, the server now resends the OTP (instead of returning "user already exists"). This prevents the "already exists" / "please verify" deadlock.

Key server behavior (where to look)
- `server/auth.ts`
  - `registerUser` – creates a user, sends OTP. If user exists and `isVerified === false`, it resends OTP and returns a `resent` indicator.
  - `verifyOTP` – validates the OTP via `storage.getValidOTP()` and, on success, marks OTP used and sets the user's `isVerified`.
  - `resendOTP` – normalizes email and uses `storage.createOTP()` to generate/send a fresh code.
  - `loginUser` – rejects login if `user.isVerified` is false.
- `server/routes.ts` wires the endpoints to these functions.

Storage & DB logic (where to look)
- `server/storage.ts` contains DB functions implemented with Drizzle. Important methods:
  - `createOTP(InsertOtp)`
    - Normalizes email to lower-case when inserting/looking up
    - Deletes expired OTPs for the same email/type before creating/updating
    - If an active OTP exists, it overwrites the OTP (new value), updates `expires_at`, increments `resend_count` (max 3 enforced in logic), and returns the updated row
    - Otherwise inserts a new OTP record with `resend_count = 1`
  - `getValidOTP(email, otp, type)` — returns OTP only when not used and `expiresAt > now`
  - `markOTPUsed(id)` — sets `is_used = true`
  - `cleanupExpiredOTPs()` — deletes expired OTP rows (also used proactively in `createOTP`)

Security & UX constraints
- OTP lifetime: 5 minutes
- Max resend attempts per active OTP: 3 (server enforced)
- Expired OTPs are cleaned up/deleted so stale rows don't interfere
- Emails are normalized (trim + toLowerCase) for consistent lookup

Frontend UX decisions
- When a user registers, `pending_email` and `pending_type` are saved to `localStorage`. The Verify OTP page reads from URL params first and falls back to localStorage.
- Resend OTP from both Verify page and Login (for unverified users) is available. Resend updates `pending_email` in localStorage and redirects to verification.
- Clear `pending_email` once verification succeeds.

---

## Database & migrations (Drizzle)

This project uses Drizzle ORM with `drizzle-kit` to manage schema & migrations.

- Schema is in: `shared/schema.ts`
- Drizzle config: `drizzle.config.ts` (uses `process.env.DATABASE_URL`)
- Migration folder: `drizzle/`

I added a migration to add `resend_count` to `otp_verifications`:
- `drizzle/20251027_add_resend_count.sql`

To apply migrations locally (PowerShell):

```powershell
# Ensure DATABASE_URL is set in .env or environment
npm run db:push
```

This runs `drizzle-kit push` and applies any pending migrations.

If you need to manually add columns or run SQL, connect to your Postgres database and run the SQL in the migration file:

```sql
ALTER TABLE otp_verifications
  ADD COLUMN IF NOT EXISTS resend_count integer DEFAULT 0;
```

Important existing fields
- `users.is_verified` (boolean) — users are created with `is_verified = false`.
- `otp_verifications` includes `email, otp, type, expires_at, is_used, resend_count, created_at`.

---

## Environment variables

Create a `.env` in project root with at least the following variables (example names):

```
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Session
SESSION_SECRET=some-very-secret-value

# Email (SMTP) for OTP emails
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=sender@example.com
EMAIL_PASS=supersecret
EMAIL_FROM="NutriCare <noreply@example.com>"

# Optional
NODE_ENV=development
```

The server reads `DATABASE_URL` via `drizzle.config.ts` and the `server` code.

---

## Local development (run & test)

1) Install dependencies

```powershell
npm install
```

2) Ensure DB is running and `DATABASE_URL` environment variable points to it.

3) Apply migrations

```powershell
npm run db:push
```

4) Run the dev server (backend + frontend concurrently)

- Backend (server runs via `tsx`):

```powershell
npm run dev
```

This script sets `NODE_ENV=development` and runs `server/index.ts` (see `package.json`). The frontend should be served by Vite (configured in the server runtime).

5) Open the app in the browser at the configured port (see server logs). Test flows:
- Register → check email (or debug email endpoint in non-production)
- Verify OTP → should mark account verified and log the user in or redirect to calibration
- Try login for verified & unverified users

Testing OTP via curl (PowerShell example):

```powershell
# Verify OTP
curl -X POST http://localhost:3000/api/auth/verify-otp `
  -H "Content-Type: application/json" `
  -d '{"email":"user@example.com","otp":"123456"}'
```

```powershell
# Resend OTP
curl -X POST http://localhost:3000/api/auth/resend-otp `
  -H "Content-Type: application/json" `
  -d '{"email":"user@example.com","type":"registration"}'
```

---

## Important files & endpoints

- Backend
  - `server/auth.ts` — registration/login/OTP logic
  - `server/routes.ts` — attaches endpoints such as:
    - `POST /api/auth/register`
    - `POST /api/auth/verify-otp`
    - `POST /api/auth/resend-otp`
    - `POST /api/auth/login`
    - `POST /api/auth/forgot-password`
    - `POST /api/auth/reset-password`
  - `server/storage.ts` — Drizzle DB helper methods (createOTP, getValidOTP, markOTPUsed, getUserByEmail, createUser, verifyUser, etc.)
  - `server/email.ts` — sendOTPEmail & email helpers (SMTP via nodemailer)
  - `shared/schema.ts` — Drizzle schema definitions
- Frontend
  - `client/src/pages/Register.tsx` — registration UI and client logic
  - `client/src/pages/VerifyOTP.tsx` — verify UI (reads URL param or localStorage `pending_email`)
  - `client/src/pages/Login.tsx` — login UI and "Resend verification code" button

---

## Troubleshooting

- Error: `column "resend_count" does not exist` — run `npm run db:push` to apply the migration. (A migration `drizzle/20251027_add_resend_count.sql` was added.)

- OTP not verifying:
  - Confirm the OTP row exists in DB: inspect `otp_verifications` for `email` (lowercased), `otp` value, `expires_at` and `is_used = false`.
  - Make sure the OTP has not expired (expires_at > now). OTP expiry is 5 minutes by default.
  - Email normalization: emails are stored and compared in lowercase; ensure you submit the same normalized email.

- Too many resend attempts:
  - Resend attempts are limited to 3 for a single active OTP. If you hit that limit, wait for the OTP to expire or create a new flow to allow an admin reset.

- TypeScript `npm run check` failures:
  - There are some pre-existing client-side typing issues unrelated to the auth flow. If you need a green `tsc` run, we can address those typing issues separately.

---

## Developer notes & conventions

- Use `drizzle-kit` via `npm run db:push` to apply migrations — `drizzle.config.ts` points to `shared/schema.ts` and `drizzle/` migration output.
- Emails are normalized (trim + lowercase) everywhere to avoid case-related mismatches.
- OTPs are single-use (`is_used`), expire after 5 minutes, and resend increments `resend_count`.
- Frontend saves `pending_email` + `pending_type` in `localStorage` so the verification screen can recover after refresh/back navigation.
- Keep UI messages informative and avoid dead-ends — the backend resends OTP for unverified existing emails instead of returning a blocking "already exists" error.

Files to check when changing auth flows:
- `server/auth.ts`, `server/storage.ts`, `server/routes.ts`, `shared/schema.ts`, `drizzle/*.sql`, and client pages `client/src/pages/{Register,VerifyOTP,Login}.tsx`.

---

## Next steps / Improvements (suggested)

- Add `GET /api/auth/check-email-status?email={email}` to proactively tell the Register UI whether the email is unverified and can continue verification (UX improvement).
- Add periodic job to call `storage.cleanupExpiredOTPs()` to keep the `otp_verifications` table compact.
- Add integration tests for registration → resend → verify → login flows.
- Improve server responses with structured error codes (e.g., `UNVERIFIED`, `MAX_RESENDS`) to simplify frontend handling.
- Consider rate-limiting resend endpoints IP/email-based to prevent abuse.

---

If you want, I can also:
- Add more diagrams or an architecture PNG showing request flows.
- Create `README.dev.md` with developer onboarding steps and a checklist for first setup on a new machine.

If you'd like any section expanded or translated to Hindi, tell me which sections and I will update the README accordingly.