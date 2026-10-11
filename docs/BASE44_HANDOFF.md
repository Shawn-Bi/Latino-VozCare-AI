# VozCare Base44 implementation handoff

Updated October 11, 2026. This document replaces the earlier Free-plan blocker and local simulation migration plan. Backend functions and live calls are now implemented. Use fictional patient data only; this is a hackathon demo, not a production clinical system.

## Current flow

1. Open the [public website](https://vozcare.base44.app/). Use **Try as a demo doctor** without sign-in, or sign in with Google for the doctor workspace. Google sign-in alone does not grant doctor access: an approved care-team membership is required.
2. Select an assigned patient, check their visit and contact details, and review the source note, visual, bilingual wording, and reading choices. Admin management is separate from the doctor workflow.
3. Complete the review checks. Next section requires the current section to be complete; the final panel exposes the same checks directly. A new unapproved packet initially follows the site language, with a manual language override. Existing approved packets retain their language.
4. Save and approve the packet. The backend validates assignment and revision, snapshots the approved patient content and appointment, and creates a seven-day personal link. Copy or open the link manually. No SMS is sent.
5. The patient sees only their scoped patient experience, with **Conversation** and **Full details**. A call starts only after an explicit request. The public demo accepts a tester-entered US number; the team test button is restricted to approved administrators.
6. During the call, ElevenLabs tool events change one Conversation card. Appointment shows a calendar; directions use Google Maps; care shows saved instructions; education shows the patient visual. Full details stays available without an automatic tab switch.
7. Call setup is hidden while starting or active and returns after the call ends or fails. The last useful card remains visible. Personal links allow three attempts; public demo calls have an app-wide five-per-hour limit.

Directions use the saved origin or device coordinates after an explicit location request. Denied location access falls back to the saved address. Fictional addresses are labeled as example routes and may not resolve correctly. Anatomy illustrations do not show the patient's exact tumor size, depth, or stage.

## Source and deployment

- Repository: [Shawn-Bi/Latino-VozCare-AI](https://github.com/Shawn-Bi/Latino-VozCare-AI)
- Connected branch: `main`
- Editor: [Base44 preview](https://app.base44.com/apps/6aca7bb397b1030686eef3a2/editor/preview)
- Public app: [vozcare.base44.app](https://vozcare.base44.app/)

Review changes in a PR, merge to `main`, wait for Base44 GitHub sync, and verify the editor contains the expected revision. Publish from the editor, then check the public site separately. GitHub sync alone is not publication. Do not use direct CLI deployment for this GitHub-connected app. No local demo server or temporary tunnel is required for the Base44 flow.

## Implementation map

| Responsibility | Current source |
| --- | --- |
| Authentication, membership and patient assignment | `base44/shared/access.ts`, `doctorLoadPatients`, `doctorLoadPatient` |
| Patient creation and edits | `doctorCreatePatient`, `doctorSaveContact`, `doctorSaveDraft` |
| Review and immutable approval | `src/EducationReview.tsx`, `approvePacket`, `doctorGetPatientLink` |
| Scoped patient access | `validatePatientLink`, `src/components/LivePatientView.tsx` |
| Manual calls and provider requests | `startCall`, `startDemoCall`, `base44/shared/outboundCall.ts`, `agentVars.ts` |
| Voice-driven website cards | `agentShowCard`, `getCallCard`, `src/components/patient/useCallCard.ts` |
| Patient content and visuals | `src/components/patient/`, `src/ColonModel.tsx` |
| Shared design tokens | `src/tokens.css`, `src/index.css` |

Function sources are under `base44/functions/<name>/entry.ts`. The main records are CareTeamMembership, Patient, Visit, EducationDraft, ApprovedPacket, PatientLink, and DemoCall. Legacy `workflow.ts` domain tests describe earlier local rules; they do not prove the current provider integration works.

Contact or appointment edits invalidate review checks and advance the draft revision. Approval preserves an independent snapshot; previously shared packet content does not silently change. Patient link validation checks token, expiry, revocation, and packet relationships. Personal call attempts use a conditional database reservation to avoid duplicate calls from simultaneous requests. The screen tool uses a per-call session ID and rejects a supplied conversation ID that conflicts with the stored call. Patient card polling runs during the call, approximately every three seconds.

## Server configuration

Configure these through the Base44 app's server secrets settings. Values must never appear in frontend code, documentation, commits, or screenshots.

| Secret name | Purpose |
| --- | --- |
| `ELEVENLABS_API_KEY` | Server access to the existing voice agent and call API |
| `ELEVENLABS_AGENT_ID` | Existing VozCare agent identifier |
| `TWILIO_FROM_NUMBER` | Connected calling number; server lookup resolves its ElevenLabs phone-number ID |
| `VOZCARE_TESTER_NUMBER` | E.164 destination for the admin-only Team test call |

The agent's greeting, instructions, and turn-taking settings also live in ElevenLabs configuration. Base44 can update them through the configured integration. A Git commit does not by itself prove those provider settings changed. Keep the `show_patient_card` tool connected to this app's `agentShowCard` function and preserve its session variables. Do not restore the retired temporary tunnel URL.

## Verification and limitations

Dennis confirmed completing a live test on October 11, 2026. Treat this as user-reported live verification; it is not evidence that all failure, permission, or concurrent-device cases were exercised. No new call was placed for this documentation update.

Run local checks with Node.js 24:

```sh
npm ci
npx tsc --noEmit
node --experimental-strip-types --test tests/*.test.ts tests/*.test.mjs
npm run build
```

The regression checks use in-memory entities. After future integration changes, verify the spoken appointment, calendar, directions, patient visual, and Full details agree with the same approved packet. Also check the relevant failure paths: expired links, limits, concurrent call requests, denied location permission, and provider failure. Coordinate before placing billable calls.

Known limits: SMS is not configured; doctor transcripts, teach-back results, and assistance queues are not implemented. Google Maps depends on resolvable addresses and browser/network behavior. Account ownership and billing responsibility must be confirmed with the team. Production healthcare use is outside this demo's scope.

## Troubleshooting

- **Public site looks old:** verify GitHub sync, publish, and reload the public site.
- **Call does not start:** check the displayed error, link expiry/attempt count, valid US number, server secrets, connected calling number, and provider logs.
- **Call speaks but the card stays unchanged:** inspect `show_patient_card` tool delivery, app endpoint, per-call session variable, and `agentShowCard`/`getCallCard` logs.
- **Wrong patient information:** compare the approved packet with the draft and verify the selected link. Reapprove edited content rather than assuming an old link changed.
- **Map is incorrect:** check origin and hospital addresses; use the external Google Maps link and the example-route notice where applicable.

Preserve fonts and licenses, photos, favicon, design tokens, anatomy assets and attribution. Private design notes, credentials, browser storage, and review screenshots stay outside Git. The separate launch video is unchanged.
