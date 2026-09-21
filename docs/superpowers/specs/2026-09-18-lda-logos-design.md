# Optional LDA logos

## Approved behavior

Manage LDA's Admin tab has a field labelled `Logo` immediately after Organisational summary and before Registration status; uploading is optional. Show an Upload logo button, followed by a shadcn Attachment row for the current or selected logo. The row contains a thumbnail, filename, file metadata and an accessible remove action with a tooltip. No attachment row is shown when the logo is empty or removed. Accept PNG, JPEG and WebP files up to 5 MiB. Changes apply when Save and close succeeds; cancelling discards pending logo changes. Existing LDAs need no logo. On the Overview page, place an LDA Details card at the top of the left column. Display a 64 × 64 px logo beside the organisation name and organisation status, preserving its aspect ratio without cropping. Include the organisational summary, programme officer, registration status/code/date, development stage, focus areas, and staff/board counts. Omit an empty summary and use clear fallback text for missing metadata. Keep LDA Details in the left column. In the right column, stack the Funding card above Location & Contact. The existing Funding Overview totals remain below both columns. The shared page header contains only the organisation name. No logo placeholder is shown when none is stored.

## Implementation

Add a nullable `logo` field to `LocalDevelopmentAgency`, storing an ImageKit file path using the existing ImageKit configuration. Extend the existing PUT endpoint to accept multipart form data containing the current JSON fields and an optional logo file or removal instruction. Keep JSON updates compatible and preserve the stored logo when no logo change is requested. Use the existing `canManageLDA` permission before processing uploads.

Validate size, allowed MIME type and file signature on the server. Upload to `/lda-logos`, then save the file path together with the other LDA changes in one database update. If the database save fails, attempt to remove the new upload; retain the previous logo. Invalidate the LDA detail cache after saving. Replaced files follow the existing app's storage retention approach and are not deleted automatically.

Reuse the installed form controls and ImageKit URL convention. Keep the dialog open during saving and errors, disable duplicate submissions, and release temporary preview URLs when no longer needed. Show no logo placeholder when no logo is stored. The upload is scoped to Manage LDA for existing organisations; creation remains optional without a logo.

## Alternatives considered

Saving immediately on file selection would reuse the avatar workflow more directly, but would make Cancel inconsistent with the other LDA fields. Saving through the existing form is the chosen approach. A separate media record is unnecessary for a single optional logo.

## Verification

Check successful upload, replacement, removal, unchanged JSON saves, unauthorised requests, missing LDAs, invalid/oversized files, upload failures and database failure cleanup. Run the project's existing tests, TypeScript checks and lint. The nullable database migration must be applied before deploying the updated application.
