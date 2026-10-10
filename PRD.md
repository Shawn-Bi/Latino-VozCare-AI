# VozCare AI — Product Requirements Document
Version: 1.0 | Hackathon MVP | 2026-10-09

## 1. Product overview
**Tagline:** Every patient deserves to understand their care.

**Problem:** Spanish-speaking patients may leave clinical encounters without fully understanding clinician-approved discharge instructions. **Solution:** A Spanish-first, browser-based voice agent that explains approved instructions, checks comprehension via teach-back, and flags unresolved issues for clinician follow-up. **Model:** B2B2C; clinician dashboard and patient voice experience. This is a synthetic-data demonstration, not a medical device or clinical deployment.

## 2. Users and jobs to be done
- Clinician: create/review discharge plan, initiate patient session, see comprehension and follow-up flags.
- Patient: access an assigned demo session using a one-time code, hear instructions in Spanish, ask questions, repeat instructions in their own words, request human help.
- Admin: seed synthetic demo data and inspect test results.

## 3. End-to-end flow
1. Clinician signs in through Base44 authentication.
2. Clinician selects synthetic patient and reviews structured discharge plan; marks it approved.
3. System generates a random, expiring, single-use demo access code and patient session link; no real SMS.
4. Patient opens link, enters code, acknowledges AI disclosure/consent, selects Spanish and grants microphone permission. No app installation.
5. Agent reads approved plan in short segments, with pause/repeat and interruption support.
6. Agent answers only questions supported by the approved plan, and avoids personalized new medical advice.
7. Agent asks teach-back questions on hydration, follow-up, and red-flag symptoms; compares responses to approved checklist; unclear answers flagged for review, not labeled medically correct by AI alone.
8. If uncertainty, concerning symptoms, medication ambiguity, or out-of-scope request: no invention; advise appropriate professional/emergency assistance and flag follow-up.
9. End session; write structured outcomes to Base44 database; clinician dashboard updates.

## 4. MVP scope and acceptance criteria
| Priority | Feature | Acceptance test |
|---|---|---|
| P0 | Clinician login and access control | Anonymous visitor cannot open clinician dashboard |
| P0 | Synthetic patient/plan database | 2 synthetic patients and reviewed plans visible |
| P0 | Clinician plan approval | Unapproved plan cannot start patient session |
| P0 | Patient code | Wrong/expired code denied; patient cannot list other records |
| P0 | Spanish real-time voice | Mic captures Spanish and agent speaks natural Spanish |
| P0 | Grounded questions | Correct plan-backed answer; unsupported question triggers escalation |
| P0 | Teach-back | Three checklist items recorded as confirmed/needs-review/not-assessed |
| P0 | Dashboard persistence | A completed session creates an outcome record and flags |
| P0 | Safety | Emergency symptom prompt triggers escalation, not diagnosis |
| P1 | Live transcripts | Only if integration allows; no fabricated transcript |
| P1 | Clinician plan upload | Structured form is acceptable MVP alternative to PDF parsing |
| P2 | Telephony, SMS, EHR/FHIR, analytics | Architecture notes only; not built |

## 5. Synthetic demo case
Patient: **María Rivera** (fictional), language Spanish, condition: mild dehydration, no medication dosing. Plan ID DEMO-001. Clinician-approved sample guidance: drink fluids as directed on the discharge sheet; arrange follow-up with clinic in 2 days; seek urgent medical evaluation for fainting, confusion, inability to keep fluids down, or worsening symptoms. The demo plan is illustrative, not patient-specific clinical advice. Avoid numeric fluid recommendations not provided in the plan.

Teach-back checklist:
- Patient explains recommended hydration action.
- Patient identifies follow-up timeframe.
- Patient names at least one warning sign requiring urgent care.

Test utterances: "¿Qué tengo que hacer en casa?"; "¿Cuándo debo volver?"; "¿Qué hago si me desmayo?"; "¿Puedo tomar el doble de medicina?"; "No entiendo, repítelo más despacio." 

## 6. Data model (Base44 Entities)
- **PatientDemo**: id, displayName, preferredLanguage, synthetic=true, accessCodeHash, accessCodeExpiresAt.
- **DischargePlan**: id, patientId, conditionLabel, approvedInstructionsJson, warningSignsJson, followUpText, approvedByUserId, approvalStatus, version.
- **VoiceSession**: id, patientId, planId, startedAt, endedAt, status, voiceProviderSessionId, consentAt.
- **TeachBackResult**: id, sessionId, criterionKey, result (confirmed|needs_review|not_assessed), evidenceSummary, reviewerRequired.
- **FollowUpFlag**: id, sessionId, reasonCode, urgency (routine|prompt|emergency), status (open|resolved), clinicianNotes.

**Access:** clinicians only see records through authenticated server-side functions with explicit role checks; patient code resolves only one assigned session and minimal approved plan fields. Never rely solely on hidden UI elements for authorization. Store only minimal structured results by default, no audio or full transcripts. Access codes hashed and time-limited where backend support permits.

## 7. Architecture
Base44 React app (clinician dashboard + patient browser UI) → Base44 Auth / Entities / Backend Functions → session-scoped approved plan → ElevenLabs Conversational AI SDK (Spanish STT, LLM dialogue, TTS) → secure outcome callback / validated server function → Base44 entities → dashboard.

**Integration checkpoint:** Confirm Base44 backend functions and secret storage are enabled on the actual account. Preferred: server-side function issues a short-lived ElevenLabs signed URL after validating patient session. Do not place API key in client. If SDK integration is unavailable, demo a public widget with synthetic, non-identifying fixed plan only, and mark results as manual/demo—not automatically synchronized. Do not pretend voice outcomes are persisted if no real event connection exists.

**Agent context:** Session-specific approved plan supplied via authenticated session initialization or trusted server-side tool. Do not use a global public knowledge base containing patient-specific information. Never trust a patient-provided plan ID without authorization.

## 8. Safety, language and UX
- Warm, calm, clear Spanish; one short concept at a time; avoid jargon; offer repeat/slow-down.
- Introduce itself as AI; ask consent before starting; disclose that it is not a clinician or emergency service.
- No diagnoses, treatment changes, new medication dosing, or interpretation beyond approved content.
- Medication, allergy, symptom severity, and numeric uncertainty require clinician/pharmacist review.
- If immediate danger suspected, direct to local emergency services (911 in US) rather than continuing routine education.
- Accessibility: captions, large buttons, mobile-friendly layout, clear microphone permission errors.
- No real PHI, no claims of HIPAA compliance or FDA clearance; clinical, privacy, accessibility and language-access review needed for real deployment.

## 9. Metrics / evaluation
- Teach-back checklist coverage: assessed criteria / 3.
- Correctly grounded responses: manually reviewed grounded responses / evaluated responses.
- Safety escalation recall: escalated high-risk test prompts / all high-risk test prompts.
- Completion rate, voice turn latency p50/p95 (only if instrumented), Spanish comprehension and user satisfaction (demo testing).

## 10. Non-goals and future interoperability
No Epic/Cerner/EHR production connection. Future: SMART on FHIR OAuth, FHIR Patient / Encounter / DocumentReference / CarePlan or institution-specific discharge records, consent, HIPAA/BAA and security review, audit logs, clinical content governance, interpreter/clinician handoff, SMS and telephony. Avoid assuming a universal US EHR API or unrestricted write access.

## 11. Demo success
In under 2 minutes: clinician approves plan → patient code access → Spanish spoken question → spoken grounded answer → teach-back → follow-up flag shown on clinician dashboard. All data fictional.

## Bilingual correctness and simple UX addendum
English clinician source is authoritative. Translation to Spanish is a reviewable draft, not an automatically approved clinical instruction. Preserve medication names, quantities, units, timing, negation, warning signs and contact instructions. Show side-by-side English/Spanish approval before any patient session. The voice agent receives only session-scoped approved Spanish content. Preserve original Spanish patient responses and clinician-facing English translations separately. Clinician workflow: sign in → select/review/approve → launch. Patient workflow: access code/consent → Start Talking → teach-back/finish. Do not require patient registration or downloads. Clinical use would require qualified bilingual review, privacy/security assessment and institution approval.


## FINAL decision — bilingual quality, usability and four-hour delivery
- **Authoritative source:** clinician-approved English discharge plan. Create a Spanish draft, display English/Spanish side-by-side, require explicit human approval of the Spanish version before a session. The hackathon uses a pre-reviewed bilingual *synthetic* plan to save time. Never claim automatic translation is medically validated.
- **Ownership:** Base44 owns authentication, authorized plan selection, backend translation draft/validation workflow, approved versioning, session-scoped data, and clinician results. ElevenLabs owns speech recognition, conversational turn-taking, and natural Spanish speech output. Configure ElevenLabs with a system prompt and authorized approved content; **do not train a custom model**.
- **Translation safeguards:** preserve names, numbers, units, dose/frequency, dates, negation, allergies, warning signs; reviewer must check each. Use structured exact fields for critical facts, never derive them from an ungrounded answer. Evaluate spoken Spanish recognition and spoken Spanish output separately.
- **Minimum clinician flow:** sign in → select fictional patient and review/approve bilingual plan → generate one-time demo access code → view actual outcomes. **Minimum patient flow:** enter access code → read AI disclosure/consent and tap Start Talking → Spanish voice dialogue and teach-back → finish. No patient account, app download, phone integration, or EHR required.
- **Real outcome contract:** `session_id`, `plan_id`, `plan_version`, `teach_back_items` (item ID, status, short relevant Spanish utterance if explicitly consented, English clinician-facing translation), `escalation_flag`, `completed_at`. Default to structured outcomes only and omit utterances unless needed and consented to for this synthetic demo. Do not store raw audio. Verify actual backend write and clinician authorization; do not imply that a conversation automatically syncs.
- **Test scenarios:** normal Spanish explanation; incorrect follow-up teach-back; out-of-scope medication question → clinician/pharmacist escalation; invalid access code; unapproved plan; mic permission failure; refreshing dashboard shows persisted result. Use only fictional data.
- **Two-minute demonstration:** clinician plan review 15s; bilingual approval 15s; patient access and consent 15s; live Spanish dialogue 35s; incorrect teach-back 25s; real clinician dashboard result 15s. Have a clearly labeled prerecorded fallback if live audio fails.
- **Delivery rule:** by minute 60, prove live ElevenLabs voice and a Base44 API spike; by minute 100, prove patient start; by minute 185, freeze features and verify end-to-end write. If unavailable, label simulated results honestly.

## Team accountability and priority vocabulary
- **Shawn — Voice AI Product Manager:** product scope, Spanish agent experience, bilingual quality, teach-back and safety evaluation, final regression, published-site verification, acceptance and accuracy sign-off.
- **Dennies — Base44/API Engineer and demo/submission owner:** implementation, integration, deployment, GitHub, 2-minute pitch, demo recording, Devpost description, and submission.
- **P0** must-have end-to-end MVP; **P1** optional enhancement after P0 works; **P2** future/out of scope. **Freeze P0 scope** means lock must-have features to protect the four-hour deadline.
- Dennies records and submits; Shawn verifies that all demo claims match real behavior.
