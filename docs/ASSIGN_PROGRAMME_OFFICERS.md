# Assigning programme officers to LDAs

`yarn assign-pos` reads a CSV from the project root and sets
`LocalDevelopmentAgency.programmeOfficerId` for each row.

Source: [`scripts/assign-programme-officers.ts`](../scripts/assign-programme-officers.ts)

> [!WARNING]
> `LocalDevelopmentAgency.programmeOfficer` is the **only** `User` ↔ `LDA` relation in
> the schema ([`prisma/schema.prisma:23`](../prisma/schema.prisma) ↔ `:183`), and
> [`lib/auth.ts:25`](../lib/auth.ts) derives each session's `ldaIds` from it:
>
> ```ts
> token.ldaIds = user.localDevelopmentAgencies?.map((lda) => lda.id) || []
> ```
>
> Every LDA-scoped API check reads `ldaIds`; `app/api/document/route.ts:36` returns
> `403 "No LDA access"` when it is empty. **Reassigning an LDA revokes the previous
> officer's access to it.** The script prints an `ACCESS REVOKED` section listing
> exactly who loses what. Read it before you commit.

## Usage

```bash
yarn assign-pos <file.csv> --lda-column "<header>" (--po-email|--po-name|--po-id) "<header>" [--commit]
```

| Argument | Meaning |
| --- | --- |
| `<file.csv>` | CSV file, must sit in the project root |
| `--lda-column` | header of the column holding the LDA name |
| `--po-email` | header of the column holding the officer's email |
| `--po-name` | header of the column holding the officer's full name |
| `--po-id` | header of the column holding the officer's numeric user id |
| `--commit` | apply the changes — **without it the script is a dry run** |

Exactly one of `--po-email` / `--po-id` / `--po-name` is required. Quote headers that
contain spaces. Extra CSV columns are ignored.

## Full flow

### 1. Check which database you are pointed at

The script reads `POSTGRES_URL_NON_POOLING` from `.env` and prints the host as its
first line of output. Confirm it is the database you mean — the script will happily
rewrite production.

### 2. Write the CSV into the project root

```csv
LDA Name,PO Email
Zanonced Empowerment Centre,lienke@openup.org.za
Interchurch Local Development Agency,carl@openup.org.za
```

LDA names match case-insensitively but must otherwise be exact, and must be unique
across LDAs.

### 3. Dry run (the default — writes nothing)

```bash
yarn assign-pos officers.csv --lda-column "LDA Name" --po-email "PO Email"
```

### 4. Read the output

```
Database: <host>/<db>                         ← check this first
CSV:      officers.csv (2 data rows)
Columns:  LDA = "LDA Name", officer = "PO Email" (matched by email)

INVALID ROWS (n)                              ← if present, nothing is written
  line 3    lienke@openup.org.za has role USER, not PROGRAMME_OFFICER

AMBIGUOUS NAMES RESOLVED BY ROLE (n)          ← --po-name only, see below
ALREADY CORRECT (n)                           ← skipped, no-ops
WILL ASSIGN (n)                               ← LDA, current officer -> new officer
ACCESS REVOKED (n)                            ← who loses access, and whether it is their only LDA
```

Any invalid row means exit code `1` and zero writes. Fix the CSV and re-run. Iterate
until `INVALID ROWS` is gone and `WILL ASSIGN` reads the way you expect.

### 5. Commit

```bash
yarn assign-pos officers.csv --lda-column "LDA Name" --po-email "PO Email" --commit
```

The plan is printed again, then you are asked to type the number of changes (e.g. `2`)
to confirm. Anything else aborts. Writes go through a single `prisma.$transaction` —
all rows land, or none do.

### 6. Afterwards

Displaced users keep their old `ldaIds` until their JWT expires or they sign out and
back in. The same applies to newly-assigned officers: they will not see their LDAs
until they re-authenticate.

## Validation

Every check runs before anything is written. One bad row aborts the whole file.

| Check | Example failure |
| --- | --- |
| Both columns exist in the CSV | lists the headers actually found |
| Cells non-empty | `empty "LDA Name"` |
| Email well-formed (`--po-email`) | `"x@" is not a valid email` |
| Numeric id (`--po-id`) | `"abc" is not a numeric user id` |
| LDA exists | `no LDA named "Foo"` |
| LDA name unambiguous | `"Foo" matches 2 LDAs (ids 4, 9)` |
| Officer exists | `no user with email x@y.org` |
| Officer's role is `PROGRAMME_OFFICER` | `Jane <j@y.org> has role USER, not PROGRAMME_OFFICER` |
| No LDA claimed twice in the file | `LDA "Foo" already assigned on line 7` |

Failures report the CSV line number (counting the header as line 1).

## Choosing a lookup mode

| Mode | Can match multiple users? |
| --- | --- |
| `--po-email` | No — `email` is `@unique` |
| `--po-id` | No — `id` is the primary key |
| `--po-name` | **Yes** — `name` has no unique constraint |

When a name matches several users, the match is narrowed by role first, because a
namesake who is not a programme officer cannot be the intended target:

- **One namesake is a PO** → resolves to them, and logs the narrowing under
  `AMBIGUOUS NAMES RESOLVED BY ROLE`. Never silent.
- **No namesake is a PO** → row rejected, showing each namesake's actual role.
- **Two or more namesakes are POs** → row rejected. Re-run with `--po-id` or
  `--po-email`.

`--po-name` can work today and break next month when a namesake is added. Prefer
`--po-id` or `--po-email` for anything you intend to re-run.

Matching LDAs by name is fragile for the same reason — names get renamed and
re-typed. If your CSV can carry LDA ids, matching on those would be safer.

## Related

- [`app/api/user/route.ts`](../app/api/user/route.ts) — `GET /api/user?role=PROGRAMME_OFFICER`,
  which backs the "Assigned programme officer" select in the Manage LDA dialog.
- [`components/ldas/manage-lda/admin.tsx`](../components/ldas/manage-lda/admin.tsx) — that select.
- [`lib/permissions.ts`](../lib/permissions.ts) — `lda.programmeOfficerId === user.id` gates
  PO access to an LDA's documents, media, and Manage button.
