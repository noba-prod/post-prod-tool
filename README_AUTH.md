# Authentication Flow - noba* Post Production Tool

## Overview

This project implements a passwordless authentication system using OTP (One-Time Password) via email, built with Supabase Auth and Shadcn UI.

## Features

- **Passwordless Authentication**: OTP-based login via email
- **Email Verification**: Users must verify their email before requesting OTP
- **Invitation System**: External users can only access if invited to a Collection
- **Internal Users**: noba* internal users can access without being part of a collection
- **Role-Based Access**: Admin, Editor, and Viewer roles per collection

## Setup

### 1. Supabase Configuration

1. Create a Supabase project at https://supabase.com
2. Copy your project URL and anon key from Settings > API
3. Copy your service role key from Settings > API (keep this secret!)
4. Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SITE_URL=http://localhost:3000
```

### 2. Database Migrations

Run the SQL migrations in `supabase/migrations/`:

1. `001_initial_schema.sql` - Creates tables (profiles, collections, collection_members, invitations) and RLS policies
2. `002_rpc_functions.sql` - Creates RPC function for email precheck

You can run these in the Supabase SQL Editor or via the Supabase CLI.

### 3. Supabase Auth Configuration

In your Supabase dashboard:

1. Go to Authentication > Settings
2. Enable "Email" provider
3. Configure email templates for OTP
4. Set up email verification settings
5. Disable password-based authentication if desired

### 4. Email Configuration

Configure SMTP settings in Supabase:
- Go to Settings > Auth > Email Templates
- Customize OTP and verification emails
- Set up SMTP provider (SendGrid, AWS SES, etc.) for production

## Routes

### `/auth/login`
- Email input form
- Prechecks if email is allowed (internal or invited)
- Validates email is verified before allowing OTP request
- Sends OTP via Supabase Auth

### `/auth/otp`
- OTP input (6 digits)
- Verifies OTP and creates session
- Resend OTP functionality
- Redirects to dashboard on success

### `/auth/activate?token=...`
- Activates invitation token
- Creates user account if needed
- Adds user to collection
- Guides user to verify email if needed

## Database Schema

### `profiles`
- `id` (UUID, PK, references auth.users)
- `email` (TEXT, unique)
- `full_name` (TEXT, nullable)
- `is_internal` (BOOLEAN, default false)
- `created_at`, `updated_at`

### `collections`
- `id` (UUID, PK)
- `name` (TEXT)
- `created_at`, `updated_at`

### `collection_members`
- `collection_id` (UUID, FK)
- `user_id` (UUID, FK)
- `role` (enum: owner, admin, member)
- Composite PK

### `invitations`
- `id` (UUID, PK)
- `collection_id` (UUID, FK)
- `email` (TEXT)
- `token` (TEXT, unique)
- `status` (enum: pending, accepted, expired, revoked)
- `expires_at` (TIMESTAMPTZ)
- `accepted_at`, `accepted_by_user_id`

## Security

- **Row Level Security (RLS)**: All tables have RLS enabled
- **Server Actions**: Sensitive operations use server-side code
- **Service Role Key**: Only used server-side, never exposed to client
- **Email Verification**: Required before OTP can be requested
- **Token Expiration**: Invitation tokens have expiration dates

## Usage

### Creating an Internal User

1. Create user in Supabase Auth (via Admin API or dashboard)
2. Set `is_internal = true` in `profiles` table
3. User can now request OTP (after email verification)

### Inviting an External User

1. Create invitation via server action or admin function
2. Generate unique token
3. Send invitation email with activation link
4. User clicks link → activates → verifies email → can request OTP

### Requesting OTP Flow

1. User enters email on `/auth/login`
2. System checks:
   - Is user internal? → Allow if verified
   - Has pending invitation? → Allow if verified
   - Otherwise → Reject
3. If allowed and verified → Send OTP
4. User enters OTP → Verify → Session created

## Components Used

- `Button`, `Input`, `Label` from Shadcn UI
- `Card` for layout
- `Alert` for error/success messages
- `Toaster` (Sonner) for toast notifications
- Icons from `lucide-react`

## Assets

- `/public/auth-right.png` - Right panel image for auth pages (from Figma)

## Next Steps

- Implement dashboard/home page after successful login
- Add middleware for protected routes
- Implement collection management UI
- Add user profile management
- Set up email templates in Supabase




