# VozCare AI
**Spanish-first AI Discharge Voice Agent** — Latino Voice Hackathon MVP.

> Every patient deserves to understand their care.

## What it does
VozCare helps fictional Spanish-speaking patients understand clinician-approved discharge instructions via browser voice conversation, uses teach-back to detect gaps in understanding, and displays structured follow-up flags in a clinician dashboard. Educational hackathon demo only; not for real patient care.

## Stack
- **Base44:** application UI, clinician authentication, Entities database, backend functions, dashboard.
- **ElevenLabs Conversational AI:** Spanish speech input, dialogue, natural TTS. Use secure signed-URL integration if available.
- **No Twilio, Tavily, Clerk or EHR connection** for MVP.

## Setup checklist
1. Create Base44 app and enable auth, database Entities, backend functions and secrets (verify account entitlement).
2. Create ElevenLabs account and Spanish Conversational Agent; select warm natural voice; copy Agent ID.
3. Set `ELEVENLABS_API_KEY` as Base44 **server-side secret only**; set `ELEVENLABS_AGENT_ID` in server configuration. Never commit secrets.
4. Configure secure signed URL flow; only after patient code validation. Test mic permissions and Spanish voice in published Base44 URL.
5. Seed fictional `PatientDemo`, `DischargePlan`, and test records. Approve plan in clinician dashboard.
6. Test full voice session and verify **real** result persistence. If unavailable, visibly label dashboard outcomes as simulated; do not claim automatic integration.
7. Publish app and verify clinician login / patient link from an incognito browser.

## Core routes
- `/clinician`: sign in, synthetic patient list, plan review/approval, sessions, follow-up flags.
- `/patient`: access code, AI disclosure/consent, Spanish voice interaction, completion.
- `/demo`: optional non-sensitive guided demonstration, if supported.

## Core entities
`PatientDemo`, `DischargePlan`, `VoiceSession`, `TeachBackResult`, `FollowUpFlag`. See PRD.md for fields, access rules, and acceptance criteria.

## Priority definitions (P0 / P1 / P2)
- **P0 = Must-have:** required to demonstrate the minimum working end-to-end product. Freeze P0 scope = agree on the must-have feature list and do not add features without replacing an existing one.
- **P1 = Should-have:** only build if P0 works and time remains (e.g., optional refinements).
- **P2 = Future / out of scope:** not required for this four-hour hackathon (e.g., EHR or phone integration).

## 4-hour team execution — Shawn (Voice AI PM) + Dennies (Base44/API engineer)
| Time | Shawn — Voice AI PM / Agent Lead | Dennies — Base44/API Engineer | Exit gate |
|---|---|---|---|
| 00:00–00:20 | Freeze P0 scope, one synthetic case, bilingual approved plan, 3 acceptance scenarios | Create app, entities, clinician authentication and basic backend endpoint | Agree on field schema and result contract |
| 00:20–01:00 | Configure ElevenLabs Spanish voice, grounding and teach-back; test with synthetic plan | Build minimal signed-session/API integration spike and verify actual persistence | Live voice proof by minute 60; document blockers |
| 01:00–01:40 | Run Spanish correctness and safety tests; revise agent instructions | Build clinician dashboard, approved-plan selection, expiring demo access code | Patient can start a valid session by minute 100 |
| 01:40–02:25 | Jointly verify real voice -> structured teach-back result, classify failures | Connect authorized callback/tool to Base44 backend; ensure idempotent session writes | End-to-end real data flow, no fake success |
| 02:25–03:05 | Run happy-path, misunderstanding, out-of-scope tests and decide priorities | Fix blocking issues, ensure access controls and reload persistence | Core flow works by minute 185 |
| 03:05–03:35 | Run final regression tests and prioritize remaining defects | Publish, export code if supported, GitHub; write 2-minute pitch, demo and Devpost copy | Feature freeze at minute 185 |
| 03:35–04:00 | Verify deployed URL, permissions, and real persisted results; sign off on product claims | Record demo, verify demo claims against Shawn’s sign-off, and submit artifacts | Submit before deadline |

**Ownership:** **Shawn (Voice AI PM)** owns user needs, voice UX, approved bilingual content, prompts, teach-back evaluation, safety tests, final regression, published-site verification, metrics, and product acceptance. **Dennies (Base44/API engineer)** owns Base44 entities, authentication, API integration, secrets, persistence, deployment, GitHub, 2-minute pitch, demo recording, Devpost copy, and submission. Shawn approves factual claims before Dennies submits. Both review the interface contract and final demo. No new features after minute 185.

**Integration contract agreed in first 20 minutes:** `session_id`, `patient_demo_id`, `plan_id`, `plan_version`, `language`, `teach_back_items[{item_id, status, original_spanish, english_translation}]`, `escalation_flag`, `completed_at`. A model statement is not proof of a saved record; verify actual database writes and access controls. Avoid exposing a global shared patient plan to public agents.

**Fallback at minute 100 if integration fails:** retain working browser voice and a separate clinician dashboard; clearly label any dashboard sample as simulated, do not imply automatic sync. Prioritize a true single-session backend write over visual polish. Never use real patient information.

## Demo script (under 2 minutes) — owned and recorded by Dennies; Shawn verifies accuracy
1. Clinician opens approved fictional María Rivera plan.
2. Patient opens link and uses demo access code, consents to AI voice.
3. Patient asks in Spanish: "¿Qué tengo que hacer en casa?" AI answers from approved plan.
4. Patient responds to teach-back; ask an unsafe/out-of-scope question to demonstrate safe handoff.
5. Clinician dashboard displays session, comprehension statuses and unresolved flag.

## Test matrix
| Test | Expected result |
|---|---|
| Invalid patient code | Denied |
| Unapproved plan | Cannot start |
| Spanish question from plan | Correct grounded Spanish audio |
| Ask to double medication | No dosing advice; refer to clinician/pharmacist |
| Fainting/confusion | Urgent/emergency escalation, not diagnosis |
| Repeat more slowly | Agent repeats in clear Spanish |
| Complete teach-back | Structured status visible in clinician dashboard |
| Anonymous dashboard request | Denied |

## Limitations / safety
Synthetic data only. No real patient PHI, real prescriptions, clinical diagnosis, medical decisions, emergency monitoring, live EHR integration, or claims of HIPAA/FDA certification. Public ElevenLabs widget is only an optional synthetic-data fallback; authenticated patient-specific voice requires secured SDK/session integration. For real deployment: clinical oversight, security and privacy review, language-access standards, HIPAA obligations, vendor BAA where required, and accessibility review.

## Future roadmap
FHIR/SMART on FHIR EHR adapters, clinical approval workflows, human interpreter handoff, multilingual support, phone calls, SMS reminders, latency analytics and validated multilingual quality evaluation.

## Bilingual voice acceptance addendum
- English clinician instructions are authoritative; Spanish translations require side-by-side human approval before use.
- ElevenLabs provides speech/conversation, not medical translation certification. No custom training required for hackathon; configure the agent prompt and approved session context.
- Test preservation of dose, units, dates, negation, allergies and warning signs; flag uncertainty instead of guessing.
- Clinician: sign in → choose/approve plan → launch. Patient: access code/consent → Start Talking → finish.
- Demo supplies: browser mic, Base44 deployed URL, synthetic clinician login, patient access code, approved bilingual synthetic plan, ElevenLabs agent, optional second device, screen recorder, GitHub repository.
- Two-minute demo: clinician approval (20s), patient start (15s), Spanish voice Q&A (35s), incorrect teach-back (25s), dashboard follow-up (15s), value summary (10s).
- Verify real persistence, denied invalid codes, denied unapproved plans, safe escalation, and correct Spanish output. Never present mock data writes as successful integrations.


## FINAL runbook — easy-to-use bilingual workflow
**Roles:** Shawn (Voice AI PM): own approved bilingual synthetic case, Spanish agent prompt, voice experience, teach-back rubric, test evidence, final regression and product sign-off. Dennies (Base44/API engineer): own auth, Entities, clinician/patient pages, secured integration, persistence, publish/GitHub, 2-minute pitch, demo recording, Devpost and submission.

**First 20 minutes:** agree on `session_id`, `plan_id`, `plan_version`, three teach-back items, escalation flag and persisted result status. Test the most difficult dependency (ElevenLabs ↔ Base44) early; do not build decorative UI first.

**Clinician UX:** log in → choose preloaded fictional patient → compare English source and Spanish draft, approve → generate code; later review results. **Patient UX:** enter short-lived code → consent/Start Talking → converse naturally in Spanish and complete teach-back → end. No download, patient account, EHR, Twilio or extra authentication service.

**Language responsibilities:** Base44 manages approved English/Spanish content and authorized session context; ElevenLabs recognizes Spanish speech and responds with warm, clear Spanish audio. Configure agent instructions, not model training. Confirm clinical details and negation survive translation; use side-by-side review. Never expose secrets in client code.

**Pre-event preparation:** Base44 account with Entities/auth/backend functions/secrets enabled; ElevenLabs account with Conversational Agent, Spanish voice and Agent ID; browser microphone and permissions; synthetic bilingual discharge plan; test clinician account and code; screen recorder and repository. Check account-specific integration capabilities before event.

**Three acceptance demonstrations:** (1) grounded Spanish Q&A, (2) deliberately wrong follow-up teach-back flagged, (3) unapproved medication advice safely declined and marked for follow-up. Also test invalid code, unapproved plan, network/mic error and refresh-to-verify actual database persistence.

**Two-minute pitch (Dennies writes and records; Shawn reviews factual accuracy):** 0–15s clinician login, 15–30s bilingual plan review, 30–45s patient code/consent, 45–80s live Spanish Q&A, 80–105s teach-back error, 105–120s dashboard result and product value. Use clearly labeled synthetic data. Do not pretend a prerecorded demo is live.

**Four-hour gates:** 0–20m scope/interface contract; 20–60m live voice and Base44 API proof; 60–100m patient start and clinician core screens; 100–145m integrate; 145–185m test and repair; 185–215m Dennies deploys and writes demo/Devpost while Shawn performs final regression; 215–240m Dennies records and submits while Shawn checks published app and claims. No new features after minute 185.
