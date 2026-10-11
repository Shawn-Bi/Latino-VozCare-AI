# VozCare AI

Reviewed React frontend for a synthetic-data care follow-up prototype.

- Hosted prototype: https://vozcare.base44.app
- Base44 dashboard: https://app.base44.com/apps/6aca7bb397b1030686eef3a2/editor/workspace/overview
- Implementation and backend contracts: [Base44 handoff](docs/BASE44_HANDOFF.md)
- Earlier team planning documents: [PRD v2](VozCare_PRD_v2_EN.md) and [README v2](VozCare_README_v2_EN.md). These documents are preserved; their delivery flow and integration status differ from the current frontend described below.

## Current status

1. Sign in with Google from the doctor view (`/?view=doctor`). An admin must approve your care-team membership. The public **Try as a demo doctor** flow uses fictional browser-local records without sign-in.
2. Doctors see assigned patients through server-authorized functions. Admin tools live in the separate admin view.
3. Review the visit note, visual, both wording versions and reading choices. Approval saves the reviewed draft, checks its revision, snapshots its content and appointment, and creates a seven-day patient link. An older link does not approve a changed draft. Contact or appointment edits invalidate the review checks and advance the draft revision.
4. The patient link opens Conversation and Full details. Calls start only when requested; the voice tool changes one conversation card. Three attempts are allowed per personal link. Each attempt is reserved with a conditional database update to prevent concurrent tabs from dialing twice. Public fictional demo calls have an app-wide limit of five per hour.
5. Team test calls require an approved administrator on the server. SMS is not configured. Transcripts, teach-back results and assistance queues are not yet available in the doctor workspace. Use fictional data only.

## Review fixes and verification

Changes should be reviewed in a PR before merging to the connected `main` branch. GitHub sync updates Base44's editor; verify sync and publication separately. Do not deploy this GitHub-connected app directly through CLI.

```sh
npx tsc --noEmit
node --experimental-strip-types --test tests/*.test.ts tests/*.test.mjs
npm run build
```

The backend regression checks use in-memory entities and never place calls. A live retest after sync must confirm the reviewed words, appointment, directions, education card and Full details all use the same packet. Stop before placing a live call until the tester is ready. The launch video is maintained separately under the event’s video folder; confirm its render matches this release before sharing.

## Local development

Use Node.js 24 and npm. `package-lock.json` is the only lockfile.

```sh
npm ci
npm run dev
```

The frontend development server uses http://127.0.0.1:5174.

```sh
npx tsc --noEmit
node --experimental-strip-types --test tests/workflow.test.ts
npm run build
```

## Base44 editor connection

The default branch must be `main`, and `base44/config.jsonc` must name the app `VozCare AI`. The repository owner must install the Base44 GitHub App with write access to this repository. The Base44 app owner can then use **Overview → Link GitHub repo** to connect it.

After linking, GitHub becomes the source of truth. Continue through the Base44 editor and its GitHub sync; stop using direct CLI deployment for this app. Base44 lists GitHub two-way sync as requiring the Builder plan or higher.

Private design notes, credentials, environment files, browser storage, and verification screenshots are excluded from this repository. Keep provider credentials server-side when implementing the backend.

## Assets

Preserve the shared design tokens, Source Serif 4 and Source Sans 3 fonts and their licenses, both photos, and the anatomy assets. See [anatomy attribution](public/models/ATTRIBUTION.md).