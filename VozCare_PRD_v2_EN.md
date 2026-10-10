# VozCare AI — Product Requirements Document
Version 2.0 | Hackathon MVP | 2026-10-10
Owners: Shawn (Voice AI Product Manager), Dennies (Base44/API Engineer & Demo Lead)

## 1. Product vision
**Tagline:** Every patient deserves to understand their care.
**Problem:** Spanish-speaking patients may misunderstand English discharge instructions or face practical barriers (transportation, cost, scheduling) that prevent them from following the plan.
**Solution:** A Spanish-first, browser-based **discharge support voice assistant** that explains clinician-approved instructions, verifies comprehension with teach-back, asks about transportation/cost/time barriers, and saves actionable follow-up requests for staff.
**Boundary:** Patient education and nonclinical barrier screening only. Not a clinician, interpreter replacement, emergency monitoring service, or autonomous care coordinator. Hackathon uses fictional data only.

## 2. Users and simplest workflow
**Staff:** Sign in → choose fictional patient and review/approve English source + Spanish translation → share short-lived patient link/code → later see comprehension and barrier follow-up queue.
**Patient:** Open link/code → consent + Start Talking → speak Spanish, hear instructions, complete teach-back, answer 3 optional barrier questions → finish. No account, download, or form filling.
**Staff follow-up:** Review each saved request → mark Open / In progress / Resolved. The AI must never promise that assistance has been booked or provided.

## 3. P0 / P1 / P2 priorities
- **P0 = must-have for an honest end-to-end demo.** Freeze P0 means do not add features unless another feature is removed.
- **P1 = build only after P0 works.**
- **P2 = future / out of scope for four hours.**

| Priority | Requirement | Acceptance |
|---|---|---|
| P0 | Staff login and role-protected dashboard | Anonymous users cannot view staff data |
| P0 | Two synthetic patients and one approved bilingual discharge plan | English source and Spanish reviewed text are visible; unapproved plans blocked |
| P0 | Patient access link/code, disclosure and consent | Invalid/expired code rejected; no patient signup |
| P0 | Live Spanish ElevenLabs voice Q&A | Answer grounded only in approved plan; repeat/slow-down works |
| P0 | Teach-back on 3 plan items | Confirmed / Needs review / Not assessed saved |
| P0 | Barrier screening: transportation, cost, scheduling | Agent asks short, optional questions without pressuring patient |
| P0 | Actionable staff follow-up queue | Barrier type, patient words, short English summary, requested help, status, timestamp persist to Base44 |
| P0 | Safety and truthful status | No invented treatment, resources, bookings, or saved tasks; urgent issue escalates |
| P0 | Verified backend persistence | Refresh dashboard shows actual session and follow-up records |
| P1 | Tavily official-resource lookup | Only after reliable follow-up persistence; vetted source URL, freshness, location and eligibility disclaimer |
| P1 | Staff filter/status updates, patient subtitles | If time remains |
| P2 | Twilio SMS/WhatsApp/calls, EHR/FHIR, real referrals, multilingual expansion | Not built |
| Optional | Clerk, Block Convey, Daytona, Vapi | Use only if they solve a demonstrated gap; avoid overlapping services |

**Integration contingency:** If ElevenLabs-to-Base44 structured write cannot be implemented, show voice and clearly labeled manually entered/sample follow-up data. Do **not** claim automatic capture or a fully functional P0 workflow.

## 4. Synthetic demo case and approved content
Fictional patient: **María Rivera**, mild dehydration. No medication dosage in the example.
Approved illustrative instructions: follow written clinician directions on fluids; clinic follow-up in two days; seek urgent medical assessment for fainting, confusion, inability to keep fluids down or worsening symptoms. English is authoritative; reviewed Spanish must preserve numbers, timing, negation and warning signs. The example is not personal medical advice.
Teach-back criteria: hydration action; follow-up timeframe; warning sign.
Barrier prompts, one at a time:
1. “¿Tiene alguna dificultad para llegar a su cita?” (Transportation)
2. “¿Le preocupa el costo de su atención o medicamentos?” (Cost)
3. “¿El horario de su cita le resulta difícil?” (Scheduling)
Patient can say no, skip, or decline. If yes, ask one concise clarifier: “¿Qué tipo de ayuda le gustaría que el equipo revisara?” Record a request, not a promise.
Example: “No tengo cómo llegar a la clínica” → Transportation / Open / needs staff outreach.
No real personal contact information needed for hackathon.

## 5. Data model (Base44)
- `PatientDemo`: `id`, `displayName`, `preferredLanguage`, `synthetic`.
- `DischargePlan`: `id`, `patientId`, `englishSourceJson`, `approvedSpanishJson`, `approvalStatus`, `approvedByUserId`, `version`.
- `VoiceSession`: `id`, `patientId`, `planId`, `planVersion`, `consentAt`, `startedAt`, `completedAt`, `status`, `providerSessionId`.
- `TeachBackResult`: `id`, `sessionId`, `criterionKey`, `status` (`confirmed|needs_review|not_assessed`), `originalSpanish`, `englishSummary`.
- `BarrierResponse`: `id`, `sessionId`, `barrierType` (`transportation|cost|scheduling`), `response` (`yes|no|skipped|unclear`), `originalSpanish`, `englishSummary`.
- `FollowUpTask`: `id`, `sessionId`, `barrierType`, `requestSummaryEn`, `originalSpanish`, `status` (`open|in_progress|resolved`), `assignedTo`, `createdAt`, `updatedAt`.
- `AccessCode`: short-lived, single-session, stored hashed where supported; do not expose in logs.

**Minimal result payload:** `session_id`, `patient_demo_id`, `plan_id`, `plan_version`, `teach_back_items[]`, `barrier_responses[]`, `follow_up_tasks[]`, `escalation_flag`, `completed_at`. Validate IDs, types and authorization server-side; idempotent writes; only create a task for an expressed need or safety follow-up, not for every “no.” Patient voice agent cannot read the full staff queue.

## 6. Technical architecture and sponsor fit
**Base44 — CORE:** staff/patient web UI, authentication, entities, secure backend functions, bilingual plan approval, follow-up queue, real persistence.
**ElevenLabs — CORE:** Spanish speech recognition, turn-taking, dialogue and voice synthesis; agent receives only the authorized, approved Spanish plan and barrier questionnaire for the active session. Configure a system prompt, **not model training**.
**Translation:** generate draft via backend model if available, then qualified bilingual review before approval. Never rely on speech synthesis or ElevenLabs alone to certify medical translation.
**Tavily — P1:** official-resource search for nearby clinics/transport assistance; server-side query only, prefer official sources, cite URL, do not invent eligibility, availability or booking. Location only if voluntarily provided and necessary. Never let web results override the approved discharge plan.
**Twilio — P2:** consented SMS, WhatsApp, voice reminders in later release.
**Clerk — optional:** redundant if Base44 auth works.
**Block Convey — optional:** evaluate unsupported claims, misunderstandings and unsaved follow-up promises, subject to access verification.
**Daytona — optional:** isolated batch QA tests; not required for a small MVP.
**Vapi — optional:** telephone/voice orchestration alternative; avoid duplication with ElevenLabs browser agent.
**No real EHR integration or real patient data.** Confirm actual Base44 backend/secrets and ElevenLabs signed-session/tool support before implementation.

Data path: staff-approved English/Spanish plan → Base44 authorized patient session → ElevenLabs Spanish conversation → validated structured callback/tool → Base44 TeachBackResult + BarrierResponse + FollowUpTask → staff dashboard. Use server-held secrets and per-session authorization; do not confuse an agent statement with a successful DB write.

## 7. Conversation and safety rules
1. Introduce AI and request consent; brief Spanish phrases, one question at a time, repeat on request.
2. Explain **only** reviewed Spanish plan. No diagnoses, dose changes, unapproved medical claims or invented advice.
3. Ask teach-back, then transportation/cost/scheduling questions naturally and optionally.
4. Confirm follow-up accurately: “Voy a registrar esta solicitud para que el equipo la revise.” Only say “registered” after confirmed write; otherwise “No pude registrar la solicitud; comuníquese con el equipo.”
5. Do not claim staff have called, scheduled a ride, approved aid, or contacted a clinic.
6. Urgent symptoms: direct to emergency services / urgent professional help; log safety flag when technically possible. Not a substitute for emergency care.
7. Store minimal structured text, avoid raw audio and full transcripts by default. Do not claim HIPAA compliance.

## 8. Test plan and demo (Dennies owns recording; Shawn owns acceptance)
**Required scenarios:** (A) correct Spanish explanation + teach-back; (B) incorrect follow-up time triggers Needs review; (C) “No tengo transporte” creates a real Open follow-up task; (D) “No puedo pagar” creates Cost task; (E) “El horario no me sirve” creates Scheduling task; (F) urgent or unsupported medication question safely escalates; (G) invalid code/unapproved plan/anonymous staff access denied; (H) refresh confirms real persistence and no duplicate task on retries.
**2-minute demo:** 0–20s staff approves bilingual plan; 20–35s patient link and consent; 35–65s Spanish explanation; 65–85s teach-back; 85–105s transportation barrier; 105–120s staff dashboard shows persisted Open follow-up task. If possible, show one staff status change.
**Supplies:** Base44 account with auth/backend/secrets, ElevenLabs account/Agent ID and voice, synthetic bilingual plan, clinician demo login, access code, browser mic, stable network, second device optional, screen recorder, GitHub and Devpost links.

## 9. Four-hour ownership and gates
| Minutes | Shawn — Voice AI PM / QA | Dennies — Base44/API / Demo |
|---|---|---|
| 0–20 | Freeze P0, approved synthetic bilingual case, barrier prompts, acceptance rubric | Create app, schema, login, backend endpoint |
| 20–60 | Configure ElevenLabs and test voice/grounding | Verify signed session, callback and actual DB write |
| 60–100 | Test teach-back, Spanish accuracy, barrier dialogue | Build staff queue and patient access UI |
| 100–145 | Test structured output and safety | Integrate persistence, idempotency, role checks |
| 145–185 | End-to-end acceptance, defect prioritization | Fix blockers, publish |
| 185–215 | Final regression and evidence verification | Write pitch, demo script, Devpost copy, GitHub |
| 215–240 | Verify published URL and approve claims | Record demo and submit |

**Feature freeze at minute 185.** If integration remains blocked at minute 100, reduce scope transparently rather than fake data synchronization.

## 10. Success measures and future
Primary MVP metric: percentage of patient-stated barriers correctly captured as **real actionable Open follow-up tasks**. Secondary: teach-back coverage, safe escalation, completion, false-positive tasks and Spanish accuracy (manual review).
Future: qualified clinical/language review, consent governance, security/HIPAA/BAA analysis, FHIR integration, human referrals, Tavily vetted resources, Twilio notifications and multilingual support.
