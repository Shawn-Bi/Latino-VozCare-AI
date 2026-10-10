# VozCare AI

Reviewed React frontend for a synthetic-data care follow-up prototype.

- Hosted prototype: https://voz-care-ai-86eef3a2.base44.app
- Base44 dashboard: https://app.base44.com/apps/6aca7bb397b1030686eef3a2/editor/workspace/overview
- Implementation and backend contracts: [Base44 handoff](docs/BASE44_HANDOFF.md)
- Earlier team planning documents: [PRD v2](VozCare_PRD_v2_EN.md) and [README v2](VozCare_README_v2_EN.md). These documents are preserved; their delivery flow and integration status differ from the current frontend described below.

## Current journey

1. Continue as the demo doctor and select a patient.
2. Review that patient's visit, contact information, appointment, bilingual education draft, reference anatomy model, and reading links.
3. Approve an immutable patient-facing packet and create a personal demo link. SMS remains simulated.
4. Open the link in another tab of the same browser. It shows patient-only content and starts one simulated call; refreshing does not start another.
5. Typed examples show approved care, the saved appointment, directions from the saved address, or help.
6. Confirm an assistance request and review its status in that patient's doctor record.

The app uses browser-local storage. Google sign-in, server authorization, database persistence, cross-device patient links, live SMS/calls, and live maps are not connected. Use fictional data only.

## Local development

Use Node.js 24 and pnpm 9.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The frontend development server uses http://127.0.0.1:5174.

```sh
pnpm exec tsc --noEmit
node --experimental-strip-types --test tests/workflow.test.ts
pnpm build
```

## Base44 editor connection

The default branch must be `main`, and `base44/config.jsonc` must name the app `VozCare AI`. The repository owner must install the Base44 GitHub App with write access to this repository. The Base44 app owner can then use **Overview → Link GitHub repo** to connect it.

After linking, GitHub becomes the source of truth. Continue through the Base44 editor and its GitHub sync; stop using direct CLI deployment for this app. Base44 lists GitHub two-way sync as requiring the Builder plan or higher.

Private design notes, credentials, environment files, browser storage, and verification screenshots are excluded from this repository. Keep provider credentials server-side when implementing the backend.

## Assets

Preserve the shared design tokens, Source Serif 4 and Source Sans 3 fonts and their licenses, both photos, and the anatomy assets. See [anatomy attribution](public/models/ATTRIBUTION.md).
