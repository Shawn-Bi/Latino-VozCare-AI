# VozCare Base44 handoff

Status: local synthetic-data implementation. No real login, SMS, phone call, map service, patient access control, or cross-device storage is connected.

## Working local journey

1. Home → Doctor view → Continue as demo doctor.
2. Select María, José, or Ana. Their records, drafts, appointments, links, sessions, and requests are independent.
3. Confirm contact/appointment details inside that record. Review its education draft.
4. Decide on every offered reading link and complete the three review checks.
5. Approve and send demo link. An immutable patient-facing packet is created; a simulated SMS is recorded. No call starts yet.
6. Open personal demo link in another tab of the same browser. It opens only the patient's approved packet and starts one simulated call.
7. Example statements or typed text generate scoped conversation events. Directions use the saved starting address without an extra confirmation step.
8. Confirm a transportation request. Staff see that patient's request; status changes update the patient tab.
9. Refresh or reopen the same link to resume without a duplicate call. Ended calls retain approved information.

Local records persist under `vozcare-patient-workflow-v1` in browser localStorage. Demo doctor access is a sessionStorage flag. Both are simulations and must be replaced. Do not enter real patient data. Personal links work only on the same browser and local origin that holds the fixture records. Hash tokens avoid sending the token in the initial local HTTP request. This does not make client-only access checks secure.

## Implementation owners

- `src/workflow.ts`: typed records, snapshot approval, token lifecycle, event routing, once-only call start, retry rules, appointment time conversion.
- `src/local-store.ts`: temporary local persistence and cross-tab notification. Mutations read the latest stored workspace; quota errors preserve the previous saved record.
- `src/App.tsx`: doctor record navigation, delivery states, scoped patient route, and simulated conversation input.
- `src/EducationReview.tsx`: doctor review/model workflow. Review controls remain English with a translated notice; bilingual packet content is separate.
- `src/ApprovedCare.tsx`: patient-facing approved content. Source notes and private anatomy annotations are excluded from the packet.
- `src/tokens.css` and `src/index.css`: existing typography, palette, spacing, focus, and responsive component rules.

## Proposed Base44 records

The local adapter nests records for simplicity and supports one transportation request per patient. Use separate request rows in Base44 to preserve multiple requests and their original session provenance. Map these relationships to persisted Base44 entities:

| Entity | Relationships and fields |
| --- | --- |
| Doctor / care-team membership | Auth user ID, authorized role, care-team membership |
| Patient | ID, assigned care team, name, language, phone, saved address |
| Visit | Patient ID, completed date, appointment ID, doctor source note |
| EducationDraft | Patient/visit IDs, revision, bilingual fields, doctor annotations, resource decisions, review checks |
| ApprovedPacket | Patient/visit IDs, immutable approved content and appointment snapshot, revision, approver/time |
| PatientAccess | Approved packet/patient IDs, hashed random token, expiry, revocation, open time |
| FollowUpSession | Patient/packet/access relationship, call/conversation provider IDs, call state, attempts, active website card |
| ConversationEvent | Unique event ID, patient/session/packet IDs, action, original statement/language, timestamp, confirmation |
| AssistanceRequest | Patient/session IDs, provenance, original quote if supplied, patient confirmation, staff status |
| DeliveryAttempt | Access/session ID, SMS provider ID, destination, queued/sent/delivered/failed state |

Doctor sign-in must use Base44 authentication and server-enforced membership rules. Google sign-in identifies an account; it does not establish a doctor role. Do not store Google passwords in application records.

Patients must never receive all patient records or doctor notes in the browser. Replace the local workspace read with a server-validated personal session that returns only the approved patient DTO. Configure private entity permissions; do not make the Patient, Visit, or ApprovedPacket entities public to enable anonymous links.

## Required backend operations

These are proposed application contracts, not built-in provider method names:

- `approveAndSend(patientId, visitId, draftRevision)`: authenticate the doctor, check assignment and exact draft revision, validate delivery details, save the immutable packet, mint access, queue SMS, and record delivery separately from approval. Reject duplicate submission/retry using an operation ID. Sending the same revision again must not approve changed content.
- `exchangePatientAccess(token)`: validate an unguessable token against its stored hash, expiry/revocation, and packet relationship; return only a scoped patient session. Do not start a call on an HTTP GET or an SMS link-preview request.
- `startFollowUp(sessionId, operationId)`: validate the scoped patient session, atomically claim a once-only start, and trigger ElevenLabs/Twilio after the actual page opens. Reopening/resuming the page must not repeat the call. The local synchronous rule is not sufficient for multiple servers or devices.
- `receiveAgentEvent(event)`: authenticate the provider tool, bind the provider call/conversation to the correct patient session on the server, validate the action and packet, reject duplicate events, persist the event, and notify only that patient's authorized website connection.
- `requestAssistance(sessionId, request, confirmation)`: validate patient access and explicit confirmation; record the real original statement or website-request provenance. Availability of a help request must not depend on a connected phone call.
- `updateAssistanceStatus(requestId, status)`: authenticate assigned staff; update status. A closed review is not proof that a ride was booked.
- `renewAccess` / `revokeAccess`: authorize assigned staff; rotating a token invalidates the previous one. Renewing access to the same session does not automatically restart a completed call.

Keep API keys and privileged access server-side. Token validation must also protect any live subscription/polling endpoint. Test the supported Base44 method for a patient session without Google login before finalizing the delivery architecture.

## Agent actions

The local `ConversationEvent` contract is the prepared event structure:

| Action | Website outcome |
| --- | --- |
| `show_appointment` | Show the immutable saved appointment; do not change it |
| `show_directions` | Show the route using the session origin and approved destination |
| `show_education` | Show the approved packet in the selected language |
| `show_help` | Show assistance choices |
| `request_transportation` | Show the request card; create a staff request only after confirmation |
| `end_call` | End call input and preserve approved information |

The local typed router is a keyword simulator, not speech recognition or AI. ElevenLabs agent webhook tools should call the authenticated backend action endpoint during the Twilio phone conversation. Persist a scoped event and update the companion website through an authorized live channel. Post-call webhooks can update summaries/status but cannot substitute for in-call events. Do not rely on browser client tools executing inside a separate phone call.

## Failure behavior prepared locally

- Failed SMS has explicit failed status and a demo retry.
- Unanswered call leaves care information available; explicit retry increments attempts.
- Expired, invalid, or revoked links show no patient content.
- A new link restores access to the approved packet while retaining the session.
- Missing/invalid contact or appointment data blocks delivery approval.
- Another starting address applies only to the route session, not the stored patient profile.
- Editing approved content or saved appointment details invalidates draft approval; the previously shared packet remains unchanged. A new approval replaces access and starts a new session while preserving existing assistance requests. Store requests separately from sessions in Base44.
- A storage failure is surfaced; the UI must not claim the packet was saved.

## Port assets and verification

Preserve the local fonts and OFL licenses, grandmother/clinician images, favicon, shared CSS tokens, and anatomy model attribution. Verify Three.js model loading and public asset URLs in the target Base44 environment. Retain the current English education-controls notice while localizing the delivered packet.

Run the pure domain checks with Node 24:

```sh
node --experimental-strip-types --test tests/workflow.test.ts
pnpm exec tsc --noEmit
pnpm build
```

After connection, test two doctor accounts with separate patient assignments, two patients on separate devices, expired/revoked links, duplicate page opens, duplicate provider callbacks, call failure/retry, actual SMS delivery, and a live spoken request opening the right card. Local verification is not proof that these provider or access-control boundaries work in Base44.

Do not export browser storage, verification backups, or unrelated private documentation as application source.
