
## RBAC & Team Management

- [x] Extend Drizzle schema: add `profiles` table (id uuid PK, email, name, role enum owner/admin/member)
- [x] Run pnpm db:push to apply migration
- [x] Create Supabase RLS policies for transactions table (member=SELECT, admin=SELECT+INSERT+UPDATE, owner=all)
- [x] Create Supabase RLS policies for categories table (same pattern)
- [x] Create Supabase RLS policies for accounts table (same pattern)
- [x] Build Express team API: /api/team/me, /api/team/members, /api/team/enroll, /api/team/members/:id/role, /api/team/members/:id (DELETE)
- [x] Auto-create profile row on first login via Supabase trigger (handle_new_user)
- [x] Extend useAuth hook to expose user role, isOwner, isAdmin, canWrite, canDelete from profiles table
- [x] Build TeamSettings page: role cards, Enroll Member form, Manage Roles table
- [x] Add Team Settings link to AppShell sidebar (owner + admin visible)
- [x] Restrict UI edit/delete buttons by role (member=read-only, admin=no delete, owner=full)
- [x] Disable public sign-up (invite-only: only owner can create accounts via enrollMember)
- [x] Show role badge in sidebar user info section
- [x] Show read-only banner for member role
- [x] Write vitest tests for team API endpoints (16 tests passing: auth.logout, supabase.credentials, team API)

## Password Reset & Account Settings

- [x] Add /reset-password route that handles Supabase password reset token from email link
- [x] Add /account-settings route with change password form (for logged-in users)
- [x] Add "Change Password" link in sidebar user section (key icon next to sign out)
- [x] Add "Forgot password" link on sign-in page

## RLS Fix — Shared Dashboard

- [x] Fix RLS policies: remove per-user (user_id) filtering, allow all authenticated users to access shared data based on role only
- [x] Update profiles owner seed to use the Google OAuth UUID (243b65e1) so Amin's existing data is visible

## Restore Google OAuth Sign-In

- [x] Add "Sign in with Google" button back to Auth.tsx sign-in page
- [x] Verify Google provider is enabled in Supabase Auth settings (was already enabled — aminh@airfoil.studio uses Google OAuth)

## Team Settings Redesign & Admin Permissions

- [x] Redesign role cards section: 3-column horizontal grid (Owner/Admin/Member) with badge labels
- [x] Redesign Enroll form: 2-column grid (Name+Email, Password+Role), clean card layout
- [x] Redesign members table: avatar initials, Name+Email stacked, Role dropdown, Delete icon per row
- [x] Admin can enroll new members (member role only, cannot set admin)
- [x] Admin can remove members (member role only, cannot remove admins)
- [x] Admin cannot change any roles (role dropdown disabled for admin)
- [x] Only owner can change roles, promote/demote, remove anyone
- [x] Update server-side team API to enforce new admin permission rules (22 tests passing)

## Team Settings Layout Fix

- [x] Fix role cards: render as 3-column horizontal grid (not stacked full-width)
- [x] Fix enroll form: 2-column grid (Name+Email on one row, Password+Role on next row)
- [x] Fix members table layout: Name+Email stacked in one cell, Role badge/dropdown aligned right
- [x] Fix members table grid: use inline style gridTemplateColumns '1fr 160px 48px' to right-align Role and Delete columns

## Enroll Form Button Fix

- [x] Fix Enroll Member button: should be on its own row, right-aligned below the form fields (not floating beside hint text awkwardly)

## Team Settings Refactor — Compact Admin Panel Layout

- [x] Reduce role cards: compact height ~100-120px, 2-3 bullet points max, lighter borders, smaller padding (12-16px)
- [x] Tighten container: max-width 1100-1200px, vertical section gaps 16-20px, card padding 16-20px
- [x] Enroll form: 2-col grid (Name|Email, Password|Role), tight label spacing, button right-aligned
- [x] Member list: convert to proper HTML table (Name | Email | Role | Actions), compact rows ~48-56px, no card-per-row
- [x] Remove excessive empty space, reduce border emphasis, increase information density

## Role Persistence & Tab Refocus Fix

- [x] Diagnose role fetch flow in AuthContext (login, reload, tab focus)
- [x] Fix role persistence: cache role in localStorage, load immediately on app start
- [x] Prevent "no role" flash during fetch by seeding from localStorage
- [x] Identify what triggers tab refocus reload (Supabase auth listener / window focus / tRPC refetch)
- [x] Disable unnecessary data refetch on window focus (AppContext skips fetchData if user ID unchanged)
- [x] Ensure tab switch does not reset auth/role state
- [x] Validate: role cached in localStorage, profile seeded immediately on load, no re-fetch on TOKEN_REFRESHED for same user

## Sidebar Cleanup — Remove USD/MYR Toggle & Reposition AI Assistant

- [x] Remove USD/MYR CurrencyPicker from sidebar (desktop + mobile) — no data logic changes
- [x] Move AI Assistant button to directly above user profile section
- [x] Remove CurrencyPicker import from AppShell if no longer used elsewhere
- [x] Ensure no leftover empty gaps, consistent spacing between AI Assistant and profile
