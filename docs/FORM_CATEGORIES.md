# Form categories and reports

Every form template belongs to a **category** (Grant Funding, DFT Application,
Narrative Report, …). The category decides where its forms sit in an LDA's
forms list and which reports they get. Templates never point at each other, so
next year's template slots in by picking the same category.

```
Grant Funding Application (2026)       2026  Application  Approved
  Narrative Report – Q1 2026           Q1    Report
  Finance Report – Q1 2026             Q1    Report
  DFT Application                      Q3    Application  Approved
    DFT Report                         Q3    Report       Draft
Grant Funding Application (2027)       2027  Application  Under review
```

Set up on **Form templates → Categories** (super users). Code: `lib/primary-form.ts`
(placement), `lib/report-timing.ts` (period maths), `lib/report-rules.ts`
(planning and creating reports), `lib/form-tree.ts` (the list).

## Categories

| Role | Example | Where its forms sit |
|---|---|---|
| Primary | Grant Funding | Top level. An LDA can't have two of the same category with overlapping dates (Rejected ones don't count). |
| Secondary | DFT Application, under Grant Funding | Under the LDA's primary form of the parent category whose start–end dates include the form's start date. Any number per period. |
| Report | Narrative Report | Under the form it was created for. |

A category's **key** is fixed once created: code looks some categories up by it
(e.g. `grant_funding` for prefills). Changing a category's role or parent, or a
template's category, regroups existing forms straight away.

## Reports

Reports are set up in three layers, and each form then has its own planned
reports with real dates:

```
Report category timing  →  template changes  →  the form's planned reports  →  report forms
(Reports tab)              (template → Reports)  (Reports panel on the form)
```

### Timing on the report category

Each report category (Reports tab) has its timing:

| When | Creates | Dates |
|---|---|---|
| **Once, after a status** (e.g. Approved; Under review = on submission) | One report when the form reaches the status | Due N days after that day; same start/end as the form |
| **Quarterly / Half-yearly / Yearly** | One report per period of the form's **own** start–end dates (an April–March grant's Q1 is April–June) | Opens N days before the period ends, due N days after it ends |

Quarters and halves are numbered from the form's start and restart every 12
months; the year is the one the period starts in (a two-year April grant: Q1
2026 … Q4 2027 (Jan–Mar), then Q1 2027 (Apr–Jun) …).

A primary or secondary category gets a report by **attaching** the report
category (Applications tab → Reports → Attach report). The link has no timing of
its own. Detaching it stops new forms getting the report; forms that already
have it planned keep it.

- "Reached" means the status itself or any approved status after it
  (Approved, Underway). Draft, Rejected and Paused forms never get new reports.
- Reports use the **newest active template in the report category**. For a new
  year, add the new template to the report category and deactivate the old one.

### Per-template changes

A template can change two things for its own forms (Categories page → the
template's report link, or **Reports** in the template editor): **switch a
report off**, or **create it at a different status**. Frequency and days always
come from the report category. Cloning a template copies its changes.

Example: DFT Report is created on approval. For a few LDAs it should come on
submission, so clone the DFT Application template as "DFT Application – on
submission", change the trigger to "Under review (submitted)", and create those
LDAs' forms from it.

### Planned reports on each form

When a form is created, its reports are **planned** from the settings above:
one row per period (or one after-status row) with its period, opening date and
due date. Approvers see them in the **Reports** panel at the bottom of the form
and can, for that form only:

- **edit** a planned report's period, opening and due dates (it's then marked
  edited);
- **skip** or unskip it;
- **create now**, without waiting for the opening date or the trigger;
- **recalculate from settings**, e.g. after a report was attached to the
  category.

Settings changes only affect forms created afterwards. Existing forms keep
their planned dates until an approver recalculates. Recalculating (and changing
the form's start/end dates, which recalculates automatically) replaces only the
untouched planned rows: reports already created, skipped or edited stay, and no
new period is planned over them.

Once created, a planned report links to its report form, which is edited like
any form. Rejecting the parent rejects its after-status reports; moving it back
pauses them; reaching the status again reopens them. Approved reports are left
alone.

## The daily job

`/api/cron/generate-reports` creates every planned report whose opening date
has passed and whose form has reached its trigger. Missed days are caught up and
running it twice creates nothing new. After-status reports are also created
straight away when the form's status changes.

- **Production:** `app.json` declares a Dokku cron (02:00 UTC daily) that calls
  the endpoint with `Authorization: Bearer $CRON_SECRET`. Set the secret with
  `dokku config:set <app> CRON_SECRET=…` and check `dokku cron:list <app>`.
- **By hand:** Admin → Reports → Run now (super users). The same panel lists
  the reports opening in the next 90 days.

## Moving from the old settings

The old "Linked form template" setting and the per-template report schedules
are replaced. After deploying:

1. Give every template a category on the Categories page (templates without one
   are listed at the bottom of each tab).
2. `yarn migrate-report-rules` — dry run: prints the report category timing,
   links, template changes and existing reports it would record, and anything
   to check by hand (a template's own due days or frequency can't be kept, and
   monthly schedules aren't supported). Then `--commit`.
3. `yarn plan-reports` (dry run, then `--commit`) to plan existing forms' reports.
4. `yarn link-primary-forms` (dry run, then `--commit`) to group existing forms.

The old tables and columns stay until a follow-up release removes them.
