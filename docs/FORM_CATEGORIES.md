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
(placement), `lib/report-rules.ts` (reports), `lib/form-tree.ts` (the list).

## Categories

| Role | Example | Where its forms sit |
|---|---|---|
| Primary | Grant Funding | Top level. An LDA can't have two of the same category with overlapping dates (Rejected ones don't count). |
| Secondary | DFT Application, under Grant Funding | Under the LDA's primary form of the parent category whose start–end dates include the form's start date. Any number per period. |
| Report | Narrative Report | Under the form it was created for. |

A category's **key** is fixed once created: code looks some categories up by it
(e.g. `grant_funding` for prefills). Changing a category's role or parent, or a
template's category, regroups existing forms straight away.

## Report rules

Rules sit on a primary or secondary category and are the default for all its
templates:

| When | Creates | Dates |
|---|---|---|
| **After a status** (e.g. Approved, Under review = on submission) | One report as soon as the form reaches the status | Due N days after that day; same start/end as the parent |
| **Quarterly / Half-yearly / Yearly / every N months** | One report per period of the parent form's **own** start–end dates (an April–March grant's Q1 is April–June) | Opens N days before the period ends, due N days after it ends |

- "Reached" means the status itself or any approved status after it
  (Approved, Underway). Draft, Rejected and Paused parents never get new reports.
- Rejecting the parent rejects its after-status reports; moving it back pauses
  them; reaching the status again reopens them. Approved reports are left alone.
- Reports use the **active template in the report category** (the newest if
  several are active). For a new year, activate the new template and deactivate
  the old one.
- Changing a rule only affects reports not created yet. On a report itself, the
  due date and start/end dates can still be edited as usual.
- A rule that has created reports can be switched off but not deleted.

### Per-template changes

A template can change any rule setting for its own forms (Categories page → the
template's report link, or **Reports** in the template editor): switch the
report off, use a different trigger status, frequency or number of days, or pin
a specific report template. Unchanged settings keep following the category.
Cloning a template copies its changes.

Example: the DFT Application category's DFT Report is created on approval. For a
few LDAs it should come on submission, so clone the template as "DFT Application
– on submission", change the trigger to "Under review (submitted)", and create
those LDAs' forms from it.

## The daily job

Periodic reports are created by `/api/cron/generate-reports`. It creates every
period that has opened and has no report yet, so missed days are caught up and
running it twice creates nothing new. Reaching a periodic rule's trigger also
creates the periods already open straight away.

- **Production:** `app.json` declares a Dokku cron (02:00 UTC daily) that calls
  the endpoint with `Authorization: Bearer $CRON_SECRET`. Set the secret with
  `dokku config:set <app> CRON_SECRET=…` and check `dokku cron:list <app>`.
- **By hand:** Admin → Reports → Run now (super users). The same panel lists
  the reports opening in the next 90 days.

## Moving from the old settings

The old "Linked form template" setting and the per-template report schedules
are replaced by rules. After deploying:

1. Give every template a category on the Categories page (templates without one
   are listed at the bottom).
2. `yarn migrate-report-rules` — dry run: prints the rules, template changes and
   report tags it would create, and anything still missing a category.
3. `yarn migrate-report-rules --commit` once the dry run looks right.
4. `yarn link-primary-forms` (dry run, then `--commit`) to group existing forms.

The old tables and columns stay until a follow-up release removes them.
