# Ledgerly agent guide

## Purpose

Ledgerly is an invite-only internal finance portal. It turns monthly P&L workbooks into comparable revenue, profit, margin, cost, and product views. The long-term source is a watched Google Drive folder; automated Drive ingestion is not implemented yet.

## Stack

- Next.js 16, TypeScript, React 19, App Router
- Supabase Postgres and Supabase Auth with Google OAuth
- Tailwind CSS 4 and shadcn/Base UI components
- No Prisma or other ORM; use the Supabase clients and SQL migrations already present

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

There is no automated test suite. For every change, run `npm run typecheck`; run `npm run build` for routing, server, dependency, or production-facing changes.

## CodeGraph

This repository is initialized for CodeGraph. Before using text search to understand code relationships, run:

```bash
codegraph explore "<question or symbol>"
```

Use `codegraph sync` after edits and `codegraph status` to check the index. The generated database stays local under `.codegraph/`; only `.codegraph/.gitignore` belongs in source control.

## Project map

- `app/page.tsx`: login entry point
- `app/(dashboard)/layout.tsx`: shared authenticated dashboard shell and context
- `app/(dashboard)/*/page.tsx`: Overview, P&L, Products, Workbooks, and Team routes
- `app/api/auth/route.ts`: session lookup, local login fallback, and logout
- `app/api/revenue/route.ts`: authenticated reporting-period and dashboard data API
- `app/api/team/route.ts`: admin-only invite listing and bulk invites
- `app/auth/callback/route.ts`: Google OAuth callback and allowlist check
- `components/dashboard/`: application-specific client UI
- `components/ui/`: shadcn components; reuse these before adding UI dependencies
- `lib/dashboard.ts`: shared dashboard types and formatting helpers
- `lib/store.ts`: local demo data and in-memory auth fallback only
- `lib/supabase/`: browser, server, admin, configuration, and session clients
- `supabase/migrations/`: schema, seed data, RLS, RPCs, and invite migrations
- `app/globals.css`: framework imports, shared theme tokens, and document-level base/accessibility rules only

## Runtime flow

1. With Supabase variables configured, login uses Google OAuth.
2. The OAuth callback accepts only Google identities with an active row in `revenue_invited_users`.
3. A database trigger creates or updates `revenue_profiles` from the matching invitation.
4. `DashboardProvider` calls `/api/auth`, then `/api/revenue`.
5. `/api/revenue` selects the requested complete month, chooses the preceding month for comparison, and calls `revenue_dashboard_report`.
6. Without Supabase variables, the app uses the in-memory demo users and report in `lib/store.ts`.

Do not extend the local fallback as a production data path. Production finance data belongs in Supabase.

## Database rules

This Supabase project is shared with another repository. All objects owned by this app use the `revenue_` prefix. Preserve that prefix for new tables, functions, triggers, policies, and indexes, and never modify unrelated database objects.

Core tables:

- `revenue_invited_users`: email allowlist, role, and active state
- `revenue_profiles`: authenticated user profile and portal role
- `revenue_source_files`: Drive file identity and import status
- `revenue_monthly_reports`: monthly actual and plan totals
- `revenue_report_categories`: category revenue and COGS
- `revenue_expense_lines`: detailed monthly expenses
- `revenue_products`, `revenue_product_monthly`: product master and monthly results
- `revenue_report_notes`: summaries and actions
- `revenue_import_runs`: importer audit trail and errors

Roles are `admin`, `finance`, and `viewer`. Only active admins may access `/team` or `/api/team`. Keep authorization checks on the server and preserve RLS; hiding UI is not authorization.

Make schema changes as new timestamped SQL files in `supabase/migrations/`. Do not edit an applied migration unless explicitly asked to repair local history.

## Reporting conventions

- Store months as the first day of the month (`YYYY-MM-01`).
- Store monetary values as Postgres `numeric`; convert them to JavaScript numbers only at the API/UI boundary.
- A selectable reporting period requires actual data, plan data, and a preceding actual month.
- The current branch value is `Central branch`.
- Currency is VND; shared formatting lives in `lib/dashboard.ts`.
- Keep source-file metadata and import status so an imported report remains auditable.

## UI conventions

- Each sidebar item is a real App Router route.
- Keep the shared shell in the dashboard layout; route-specific content belongs in its page.
- Reuse the shadcn primitives in `components/ui` before building controls or adding UI dependencies; add a missing primitive through the shadcn generator instead of hand-copying it.
- Customize shadcn components at the call site with their existing props, variants, sizes, and Tailwind `className`. Use `cn` for conditional classes and add a CVA variant only when multiple consumers share it.
- Keep `components/ui` generic. Feature-specific layout and branding belong in the consuming component, not in a shared primitive or global selector; use CodeGraph to inspect every consumer before changing primitive defaults.
- Preserve shadcn/Radix semantics, forwarded props, `data-slot` hooks, keyboard behavior, focus states, and ARIA relationships. Do not replace an accessible primitive with a styled native wrapper.
- Avoid one-off wrapper components that only rename a shadcn primitive or hard-code one `className`; compose directly unless the wrapper adds shared behavior.
- Use Phosphor icons before introducing another icon dependency.
- Use Tailwind utility classes in the owning component first. Do not add component or page selectors to `app/globals.css`.
- When utilities are genuinely unsuitable, use a colocated CSS Module so selectors remain scoped to the component.
- Keep `app/globals.css` limited to framework imports, shared design tokens, document-level base styles, theme variants, and global accessibility behavior.
- Before moving or deleting shared styles, use CodeGraph to trace every consumer and remove selectors that have no live use.
- Preserve keyboard access, labels, focus states, and responsive behavior.
- The reporting-period combobox is shared by dashboard routes and should default to the current complete month, or the latest complete month when the current month is unavailable.

## Environment and secrets

Start from `.env.example`. Required Supabase variables are:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Drive ingestion uses:

```text
GOOGLE_DRIVE_FOLDER_ID
GOOGLE_DRIVE_CLIENT_ID
GOOGLE_DRIVE_CLIENT_SECRET
GOOGLE_DRIVE_REDIRECT_URI
CRON_SECRET
```

The service-role key, OAuth client secret, and cron secret are server-only. Never expose them through `NEXT_PUBLIC_*`, client components, logs, commits, screenshots, or responses. The personal Google refresh token is encrypted with a key derived from the service-role key before database storage. Do not copy real credentials into documentation or source files.

## Change discipline

- Read the complete request path before editing: page/component, API route, Supabase client, migration/RLS, and callback where relevant.
- Prefer the smallest change using existing patterns and dependencies.
- Validate all API input and enforce authentication and roles server-side.
- Preserve unrelated user changes in the working tree.
- Do not add speculative abstractions or dependencies.
- Update this guide when architecture, setup, commands, or security boundaries materially change.
