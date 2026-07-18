# Ledgerly revenue portal

Private finance dashboard built with Next.js, TypeScript, the App Router, and Supabase.

## Run locally

```bash
npm install
npm run dev
```

Without Supabase environment variables, the app keeps a local demo fallback:

- Email: `minh@ledgerly.app`
- Password: `revenue2026`

## Connect Supabase

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Add the project URL and publishable key to `.env.local`.
3. Replace the two placeholder emails in the migration with the Google accounts that should have access.
4. Enable the Google provider in Supabase Authentication. In Google Cloud, use this authorized redirect URI:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

5. Apply the database migration:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

The migration creates the invite allowlist, user profiles, normalized monthly finance tables, row-level security policies, dashboard query, and the May/June seed data currently shown in the app.

## Data model

- `revenue_monthly_reports`: monthly actual and plan totals used for comparison.
- `revenue_report_categories`, `revenue_expense_lines`, `revenue_product_monthly`: drill-down data from each workbook.
- `revenue_source_files`, `revenue_import_runs`: Drive file identity, checksum, parsing status, and errors.
- `revenue_invited_users`, `revenue_profiles`: Google login allowlist and roles.
- `revenue_report_notes`: management summaries and action items.

## Connect Google Drive

1. In Google Cloud, create a Web OAuth client and enable the Google Drive API.
2. Add `http://localhost:3000/api/drive/callback` and `https://<domain>/api/drive/callback` as authorized redirect URIs.
3. Set the Google Drive and cron variables from `.env.example` locally and in Vercel.
4. Apply the latest Supabase migration, sign in as an admin, open Workbooks, and choose **Connect Drive**.

The first refresh backfills every supported P&L workbook. Later refreshes download only new or changed files. Vercel runs the same importer daily at 01:17 UTC.

## Current boundary

- Google login and database reads are active when Supabase environment variables are configured.
- The app falls back to its local demo store when they are absent.
- Google Drive ingestion uses one admin-connected personal account with read-only, offline OAuth access. Its refresh token is encrypted before storage.

`SUPABASE_SERVICE_ROLE_KEY` is required by the trusted importer and is never exposed to the browser.
