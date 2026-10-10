# VozCare AI

Reviewed React frontend for a synthetic-data care follow-up prototype.

- Hosted prototype: https://voz-care-ai-86eef3a2.base44.app
- Base44 dashboard: https://app.base44.com/apps/6aca7bb397b1030686eef3a2/editor/workspace/overview
- Implementation and backend contracts: [Base44 handoff](docs/BASE44_HANDOFF.md)
- Earlier team planning documents: [PRD v2](VozCare_PRD_v2_EN.md) and [README v2](VozCare_README_v2_EN.md). These documents are preserved; their delivery flow and integration status differ from the current frontend described below.

## Current status

1. Sign in with Google from the doctor view (`/?view=doctor`). An admin must approve your care-team membership.
2. Admins approve memberships and can create synthetic demo patients from the doctor view, even before approving their own membership. Nothing is approved automatically.
3. Patient, visit and education-draft data is admin-only. Doctors cannot open patient records until a Base44-hosted backend operation exists; it needs the Builder plan or higher. See the [handoff](docs/BASE44_HANDOFF.md) for the required checks.
4. Once records are available, doctors review and save a bilingual education draft, including a saved drawing. Every save advances the draft revision, and a stale save reports a conflict.
5. Final approval, immutable approved packets, personal patient links, SMS, calls, and live maps are not built or connected. Use fictional data only.

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