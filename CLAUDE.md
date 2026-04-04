# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
yarn dev              # Start dev server at http://localhost:3000
yarn build            # Build for production
yarn lint             # Run ESLint

# Database (Docker is NOT used for local dev — connect to a remote/existing PostgreSQL via env vars)
yarn db:migrate       # Create and apply new migrations
yarn db:generate      # Regenerate Prisma client after schema changes
yarn db:seed          # Seed initial data
yarn db:reset         # Drop and re-migrate (destructive)
yarn db:studio        # Open Prisma Studio GUI

# Utilities
yarn create-superuser # Interactively create an admin user
```

There is no test suite configured. **Always run `yarn build` after making code changes** — it is the primary correctness check (TypeScript type errors only surface at build time, not during `yarn dev`).

## Architecture

**Stack:** Next.js 14 App Router + TypeScript, PostgreSQL via Prisma ORM, NextAuth.js (JWT/Credentials), Tailwind CSS + shadcn/ui, next-intl (en/xh), Resend (email), ImageKit (media), Sentry (monitoring).

**What it does:** Fund and beneficiary management platform for South African civil society. Core entities are Funders → Funds → Local Development Agencies (LDAs). LDAs submit application forms built from configurable form templates.

### Route structure

```
app/[locale]/
  (protected)/          # Requires authentication (enforced by middleware)
    account/
    dashboard/
      admin/
      funders/, funds/, ldas/
      form-templates/, applications-reports/
      documents/, media/, users/
  (unprotected)/        # Public
    sign-in/, sign-up/, forgot-password/, reset-password/
  api/                  # API routes (NextAuth + resource CRUD)
```

The `[locale]` segment is `en` or `xh` (Xhosa). Route protection is handled by `middleware.ts` via next-intl's routing. The term "LDA" and its URL path are configurable via `NEXT_PUBLIC_LDA_*` env vars and rewritten in `next.config.js`.

### Data layer

- `db/index.ts` — Prisma client singleton
- `prisma/schema.prisma` — source of truth for all models
- `lib/data.ts` — shared server-side data fetching helpers
- After any schema change, run `yarn db:migrate` then `yarn db:generate`

Key model relationships: `Funder` → `Fund` → `LocalDevelopmentAgency` → `LocalDevelopmentAgencyForm` (submitted against a `FormTemplate`).

### Auth & permissions

- `lib/auth.ts` — NextAuth config; user role and LDA affiliations are embedded in the JWT
- `lib/permissions.ts` — RBAC helpers; check here before adding role-gated logic
- Passwords hashed with bcrypt (`lib/hash.ts`)
- Password reset tokens in `lib/token.ts` + `PasswordResetToken` DB model

### Forms

Form templates are JSON-defined schemas stored in `/form-templates/`. LDA form submissions (`LocalDevelopmentAgencyForm`) reference these templates. Form events (status changes, notifications) are handled in `lib/form-events/`.

### UI conventions

- Components are in `/components/` grouped by domain (funders, funds, ldas, etc.)
- shadcn/ui components live in `components/ui/`; add new ones via `npx shadcn@latest add <component>`
- Translations go in `messages/en.json` and `messages/xh.json`; use `useTranslations` (client) or `getTranslations` (server)
- Toast notifications via Sonner; charts via Recharts; maps via react-leaflet

### Form template system

Form templates are JSON files in `/form-templates/` that define sections, fields, conditional logic, and prefilled data for LDA application forms. The renderer lives in `components/form-templates/`.

Key concepts (full reference in [docs/FORM_TEMPLATES.md](docs/FORM_TEMPLATES.md)):
- **Field types:** `text`, `textarea`, `number`, `date`, `currency`, `select`, `multiselect`, `radio`, `toggle`, `group`, `fileUpload`, `repeatable`, `data-table`
- **Conditional visibility:** `show_if: { field, value }` — show a field only when another has a specific value
- **Dynamic options:** `depends_on` — change a field's options/label based on another field's value
- **Data prefilling:** `prefill: { source, path }` — pre-populate fields from the LDA's organisation data or a linked form. Sources: `organisation`, `organisation_detail`, `organisation_operations`, `organisation_staff`, `linkedForm`
- **Layouts:** `repeatable` (dynamic add/remove rows), `data-table` (read-only), `label-value-list` (horizontal with optional total)
- **Access control:** section-level `editable_by` array restricts which roles can edit; empty array locks the section entirely
- **`group` subfield naming:** stored as `{group_name}_{subfield_name}`
- **`toggle` values:** stored as strings `"true"` / `"false"`, not booleans

Prefilling happens in `app/api/lda-form/[lda_form_id]/route.ts`. Dynamic option sources fetch from `/api/funder-list`, `/api/lda/{id}/staff`.

### Breadcrumb navigation

Cross-entity links (LDA → Fund, Fund → Funder, etc.) use referrer-based breadcrumbs via helpers in `lib/breadcrumb-utils.ts`:
- `buildReferrerUrl(targetUrl, { type, id, name })` — appends `?from=lda&from_id=...&from_name=...` to a URL
- `preserveReferrer(baseUrl, searchParams)` — carries referrer params through tab navigation
- `DynamicBreadcrumb` component reads these params automatically

Currently only LDA Overview → Funds links pass referrer info. Fund → LDA, Fund → Funder, Funder → Fund, and Funder → LDA links still need `buildReferrerUrl` added (see [docs/REFERRER_BREADCRUMBS.md](docs/REFERRER_BREADCRUMBS.md)).

### Key environment variables

See `.env.example` for the full list. Critical ones:
- `POSTGRES_URL_NON_POOLING` — database connection
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL` — auth
- `IMAGEKIT_*` — media uploads
- `RESEND_API_KEY` / `EMAIL_FROM` — transactional email
- `NEXT_PUBLIC_LDA_FULL_NAME` etc. — customize LDA terminology per deployment
