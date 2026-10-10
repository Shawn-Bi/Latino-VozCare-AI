# VozCare AI — README
Version 2.0 | 2026-10-10 | Hackathon MVP

## What we are building
**VozCare AI: Spanish-first discharge support assistant.**
Patients hear clinician-approved discharge instructions in Spanish, ask questions, use teach-back, and optionally share barriers involving **transportation, cost, or appointment scheduling**. Staff see comprehension results and **real persisted follow-up tasks** in a Base44 dashboard.

**Tagline:** Every patient deserves to understand their care.
**Demo only:** fictional patients and synthetic instructions; not medical advice, a deployed clinical product, a real referral service, or HIPAA-certified software.

## Team and ownership
- **Shawn — Voice AI Product Manager & QA Lead:** PRD/P0, approved bilingual synthetic content, ElevenLabs system prompt and voice UX, teach-back and barrier questions, language/safety QA, final regression, published-site verification, acceptance and factual sign-off.
- **Dennies — Base44/API Engineer & Demo Lead:** Base44 app and database, auth, secure API integration, real follow-up persistence, deployment, GitHub, 2-minute pitch, demo script/recording, Devpost copy and submission.
- Shared: API/result contract and end-to-end walkthrough.

## Priority glossary
**P0 (Must-have):** indispensable to a real end-to-end demonstration. **Freeze P0:** agree on features and do not add more without removing something else.
**P1 (Should-have):** only after P0 works.
**P2 (Future):** explicitly excluded from the four-hour MVP.

**P0:** staff login; approved English/Spanish plan; patient access code/consent; Spanish ElevenLabs voice; three teach-back checks; transportation/cost/scheduling questions; real Base44 follow-up task creation and staff queue; safety; verified persistence.
**P1:** Tavily official resource search; dashboard filters; subtitles.
**P2:** Twilio reminders, phone/WhatsApp, real EHR/FHIR, real referrals, multilingual rollout.
**Optional, not required:** Clerk (auth overlap), Block Convey (evaluation), Daytona (batch test sandbox), Vapi (voice/telephony overlap).

## Minimal user journeys
**Staff:** Sign in → choose synthetic patient → compare/approve English original + Spanish translation → issue short-lived code → review follow-up queue and change task status.
**Patient:** Open link → enter code/consent → Start Talking → listen/ask in Spanish → teach-back → optionally discuss transportation, cost, time → Finish. No download or registration.
**No promise of real assistance:** The agent can say a request has been logged **only after backend confirmation**, not that a ride/appointment/financial aid is arranged.

## Architecture
```text
Staff English source + human-reviewed Spanish translation
  → Base44 approval + session-specific authorization
  → Patient browser / ElevenLabs Spanish voice agent
  → secure structured callback / server-side validation
  → Base44 VoiceSession + TeachBackResult + BarrierResponse + FollowUpTask
  → Staff dashboard: Open / In progress / Resolved
```
Base44 owns app/auth/entities/backend/queue. ElevenLabs owns Spanish ASR/conversation/TTS; configure an agent system prompt, **no custom training**. Keep API keys server-side. Only approved session-scoped Spanish content may be spoken as clinical instructions. English is authoritative; translation requires bilingual review.
Tavily (P1) may look up official clinics/transport resources with links; it **must not** override approved medical content or imply eligibility/booking. Avoid collecting exact location unless needed and consented.

## Data entities and result contract
- `PatientDemo`: fictional profile.
- `DischargePlan`: `englishSourceJson`, `approvedSpanishJson`, `approvalStatus`, `version`.
- `VoiceSession`: session/consent/provider IDs and status.
- `TeachBackResult`: criterion, status, original Spanish, English summary.
- `BarrierResponse`: type `transportation|cost|scheduling`, response `yes|no|skipped|unclear`, original Spanish, English summary.
- `FollowUpTask`: barrier type, original Spanish, English request summary, status `open|in_progress|resolved`, timestamps.
- Short-lived `AccessCode`, stored hashed when feasible.

Result payload: `session_id`, `patient_demo_id`, `plan_id`, `plan_version`, `teach_back_items[]`, `barrier_responses[]`, `follow_up_tasks[]`, `escalation_flag`, `completed_at`.
Use server-side authorization, idempotent writes, minimal data collection. Create tasks for actual expressed needs, not for every “no.” Never fake a write.

## Demo content
Fictional María Rivera: mild dehydration, no drug dosing. Clinician-reviewed plan: follow written hydration directions, clinic follow-up in two days, urgent assessment for fainting/confusion/inability to keep fluids down/worsening symptoms.
Spanish prompts:
- Teach-back: “¿Puede decirme con sus palabras cuándo debe volver a la clínica?”
- Transport: “¿Tiene alguna dificultad para llegar a su cita?”
- Cost: “¿Le preocupa el costo de su atención o medicamentos?”
- Schedule: “¿El horario de su cita le resulta difícil?”
- Clarifier: “¿Qué tipo de ayuda le gustaría que el equipo revisara?”
Do not ask all questions at once. Allow “skip.”

## Four-hour build plan
| Time | Shawn — Voice AI PM / QA | Dennies — Base44/API / Demo | Gate |
|---|---|---|---|
| 00:00–00:20 | Freeze P0, bilingual case, barrier prompts, tests | Base44 app, auth, entities, backend | Agree result schema |
| 00:20–01:00 | Configure ElevenLabs voice, grounding, safety | Test signed session, callback, actual DB write | Voice + integration proof |
| 01:00–01:40 | Test Spanish, teach-back and barrier dialogue | Build staff queue and patient page | Patient can start session |
| 01:40–02:25 | Validate structured results and escalation | Wire callback and persistence; prevent duplicate tasks | True voice-to-queue flow |
| 02:25–03:05 | End-to-end acceptance and triage | Fix blockers and publish | Freeze features at 185m |
| 03:05–03:35 | Final regression, confirm evidence | GitHub; pitch, demo script and Devpost text | Claims approved by Shawn |
| 03:35–04:00 | Verify published URL, permissions and saved tasks | Record demo and submit | Deadline met |

**Integration fallback by minute 100:** If automated voice-to-Base44 task creation is blocked, use a functioning voice demo and separately labeled sample/manual task entries. Do not claim automatic synchronization. Do not spend the last hour building Tavily/Twilio.

## Setup checklist
1. Dennies: Base44 app, auth, Entities, backend functions and secret storage; verify plan/account supports required integrations.
2. Shawn: ElevenLabs account, Spanish voice/Agent ID, system prompt with approved Spanish plan and teach-back + barrier screening.
3. Dennies: create short-lived authenticated session mechanism; do not expose ElevenLabs secret in browser.
4. Both: seed 2 fictional patients and one bilingual human-reviewed plan. Approve before patient starts.
5. Dennies: implement secure tool/callback to save results and follow-up tasks, with retry deduplication.
6. Shawn: test Spanish numbers, timing, negation, warning signs and barriers.
7. Dennies: publish, verify real DB entries persist after reload; export GitHub code if supported.
8. Shawn: final acceptance and factual sign-off; Dennies records and submits.

## QA matrix
| Scenario | Expected |
|---|---|
| Correct plan question | Natural, accurate Spanish answer |
| Wrong teach-back follow-up time | `needs_review` saved |
| “No tengo transporte” | One Open Transportation task actually saved |
| “No puedo pagar” | One Open Cost task actually saved |
| “No puedo en ese horario” | One Open Scheduling task actually saved |
| Patient says “no” or skips | No false follow-up task |
| Retry callback | No duplicate task |
| Medication change request | Decline unsupported advice; flag clinician |
| Fainting/confusion | Urgent professional/emergency direction |
| Invalid/expired code, unapproved plan, anonymous dashboard | Access denied |
| Refresh dashboard | Actual task and status persist |
| Backend write fails | Agent must not claim task was saved |

## Two-minute demo — Dennies owns writing, recording, submission
0–20s: staff views English + approved Spanish plan.
20–35s: patient link/code and consent.
35–65s: Spanish voice explanation.
65–85s: teach-back.
85–105s: patient reports transportation barrier.
105–120s: staff dashboard shows a **real persisted Open task**, optionally status update.
Shawn validates every claim before recording. Label all data synthetic.

## Deliverables
- `PRD.md` / `PRD_中文版.md`: product requirements.
- `README.md` / `README_中文版.md`: implementation and collaboration.
- Existing `BASE44_BUILD_PROMPT.md` files are **v1 prompts and must be revised to reflect barrier screening and follow-up tasks before reuse**.
- Published Base44 URL, optional exported repo, recorded demo, Devpost submission.

## Safety and future
No real PHI, real prescriptions, real referrals, live EHR, autonomous scheduling, HIPAA/FDA certification claims, or emergency monitoring. Production requires qualified clinical and language review, consent/privacy/security assessment, HIPAA/BAA as applicable, and human operational ownership of tasks.
