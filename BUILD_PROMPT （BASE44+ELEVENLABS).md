# VozCare AI — Prompt Delivery Guide (English)

**Owners:** Shawn = Voice AI PM / ElevenLabs Agent and acceptance; Dennies = Base44/API build, deployment, 2-minute pitch, demo recording and Devpost submission.

**Send in separate steps, not one giant message:**
1. **STEP 1 — Dennies → Base44:** Paste the main build prompt below together with the PRD.md. Wait for the generated app and review blockers.
2. **STEP 2 — Dennies → Base44:** Paste the bilingual/integration addendum after STEP 1. It is a follow-up message, NOT part of the first paste. Ask Base44 to implement and report actual tests.
3. **STEP 3 — Shawn → ElevenLabs:** Paste the ElevenLabs system prompt in the ElevenLabs Agent configuration. **Do not paste this into Base44 as its developer instruction.**
4. **STEP 4 — Shawn → Base44 (via Dennies):** After integration, paste the acceptance checklist and request a factual pass/fail report.

**Important:** The English PRD is a reference attachment for STEP 1, not a substitute for the prompt. API keys go into Base44 server-side Secrets, never into chat prompts or frontend code.

## STEP 1 — BASE44 ONLY | Dennies | Send main prompt + PRD.md together

Build a responsive, polished hackathon MVP web application named **VozCare AI**, tagline **Every patient deserves to understand their care.** It is a Spanish-first AI discharge voice assistant for **fictional** patients, with a clinician dashboard, a patient browser voice experience, and teach-back comprehension checks. This is an educational demonstration, NOT a clinical product.

## Non-negotiable implementation
1. Use Base44 native authentication for clinician login, Base44 Entities for persistent data, and Base44 backend functions for sensitive operations and role checks. Do not add Clerk, Twilio, Tavily, or external EHR integrations.
2. Build these screens: clinician login; clinician dashboard with patient cards, approved plan editor, session status and follow-up flags; patient access-code entry; AI consent and microphone permission; Spanish voice conversation page; end-of-session confirmation.
3. Implement entities `PatientDemo`, `DischargePlan`, `VoiceSession`, `TeachBackResult`, `FollowUpFlag` with fields described in attached PRD. Create 2 clearly fictional synthetic patients. Seed María Rivera with mild dehydration and a clinician-reviewed illustrative plan; do not prescribe numerical fluid amounts or drug doses.
4. Clinician must explicitly approve a plan before a patient voice session can start. Patient uses a short-lived access code linked to only one demo plan; check code on server; patient must not see any other patient's record. All privileged reads and writes must enforce authorization in backend functions, not just UI.
5. Integrate **ElevenLabs Conversational AI** for genuinely interactive Spanish voice. Prefer secure SDK + backend-issued signed URL after code verification. Store `ELEVENLABS_API_KEY` in Base44 server-side secrets and never expose it in browser code. Use `ELEVENLABS_AGENT_ID` in configuration. Ensure session-specific approved plan is provided to the agent only through a trusted authenticated mechanism. Implement a secure server-side endpoint to accept validated structured outcome updates. Verify the exact Base44 backend and ElevenLabs SDK APIs before writing integration code.
6. If secure SDK voice integration is blocked by account plan or runtime limitations, STOP and explicitly report the blocker. As a secondary **synthetic-data-only** demo option, allow an ElevenLabs public widget with a generic fictional plan and clearly label dashboard data as simulated unless actual outcome callbacks work. Never silently substitute fake audio, text chat, or fabricated live persistence for a working voice integration.
7. Agent must use warm, calm, natural Spanish and short sentences, answer only from clinician-approved discharge content, support interruption/repeat/slow speech, ask three teach-back questions, and flag missing/uncertain comprehension. Do not invent medical instructions or change doses. Escalate out-of-scope questions and emergency symptoms. Do not provide medical diagnoses.
8. Store only structured outcomes by default, not full audio or transcript. Clinician dashboard must show session completion, three teach-back statuses, and follow-up flags; demonstrate actual database persistence.
9. Visual design: clean trustworthy healthcare UI; white background, teal/blue accents, accessible contrast, responsive cards, prominent microphone button, Spanish-first patient UX, English clinician UX. Display 'Demo / Synthetic data only' visibly. Include AI disclosure and patient consent before mic activation.
10. Add loading, empty, invalid code, expired code, microphone-denied, network failure, and unavailable-agent states. No fake success messages.

## Pages and expected actions
- Clinician dashboard: sign in, view patients, edit/review plan, click Approve, generate code, view follow-up flags, refresh status.
- Patient entry: enter access code, validate server-side, read AI disclosure, consent, start voice.
- Voice: play Spanish audio, receive spoken Spanish, display short plan summary and repeat/stop controls. If supported, show live captions and transcript; otherwise omit transcript rather than fabricate.
- Teach-back: assess hydration, follow-up timing, warning signs against the approved plan; record `confirmed`, `needs_review`, or `not_assessed`. Mark any uncertain AI assessment for clinician review.
- Results: show only session's actual stored outcomes and timestamps.

## Testing and delivery
Implement and test: (a) clinician authentication; (b) invalid code denial; (c) unapproved plan denial; (d) Spanish voice response; (e) out-of-scope medication question escalation; (f) warning-sign escalation; (g) three teach-back records persisted; (h) dashboard updated from database. Explain which tests passed and which are blocked. Publish the app and provide the working URL and technical limitations. Do not claim HIPAA compliance or production readiness.

## Implementation order
First generate schema, authentication and basic UI. Second validate ElevenLabs real-time voice integration early. Third implement teach-back and backend persistence. Fourth test end-to-end and polish. Prioritize a working vertical slice over decorative features.


## STEP 2 — BASE44 ONLY | Dennies | Send AFTER STEP 1: bilingual accuracy, integration and usability
Clinicians enter English source instructions. Store structured source fields and create a Spanish translation draft with exact preservation of medications, dose, units, numbers, timing, negation, follow-up and warning signs. Show bilingual side-by-side review; never auto-approve. Patient sessions must use only the approved Spanish plan scoped to that authorized session. A model prompt alone is not an enforcement mechanism: validate permissions and approved status server-side. Clinician UX: sign in, select and approve plan, start guidance; patient UX: access code, consent, Start Talking, finish. Patient need not create an account. Capture original Spanish teach-back responses, translated English review text and item-level result with auditable persistence; do not claim success if backend write fails. ElevenLabs handles speech input/output and conversational delivery; Base44 handles records, authorization, approved content, and results. Never expose an API key in browser code.


### Additional STEP 2 requirements — include together in the SAME STEP 2 message
**Critical language contract:** Clinicians author all discharge information in ENGLISH. Create structured English fields and a SPANISH translation draft. Show English and Spanish side-by-side for explicit human approval; never auto-approve. Only the approved Spanish version, with version ID, can be passed into the authorized ElevenLabs conversation. Preserve exactly medication names, numbers, units, timing, negation, allergies and warning signs. Flag ambiguities for reviewer correction. Do not treat a prompt or model self-rating as a safety guarantee. For the hackathon, seed a pre-reviewed bilingual fictional case to avoid dependence on live medical translation.

**Service boundaries:** Base44 builds both web UIs, clinician auth, patient access-code verification, Entities, authorized backend endpoints, approved-plan versioning, and dashboard persistence. ElevenLabs handles Spanish ASR, natural conversational behavior, interruptions, and Spanish TTS. No custom voice model training. Configure its agent system prompt separately; ensure the session receives only its own approved fictional plan using an authenticated mechanism. Do not expose API keys in frontend code.

**Make both sides frictionless:** clinician signs in, selects synthetic patient, reviews/approves bilingual plan, generates access code and later sees outcomes. Patient opens mobile browser, enters code, consents, taps a large Start Talking button, converses in Spanish, completes teach-back and ends. No patient registration, installation, Twilio, real EHR, or complicated settings. Show microphone permission/error and unavailable-agent states.

**Backend outcome contract:** Store `session_id`, `plan_id`, `plan_version`, `teach_back_items[{item_id,status}]`, `escalation_flag`, `completed_at` and optional consented brief Spanish excerpts with English translations. Default to no raw audio and minimal retention. Save through an authenticated/verified backend action, not by trusting a client-generated success flag. Show only actually persisted outcomes in dashboard.

**Build order:** first test a real ElevenLabs voice session and a secure Base44 result-write spike; then Entities and clinician auth; then patient code and voice page; then teach-back results and dashboard; finally UI polish. By minute 60 show voice/API feasibility; by minute 100 patient can start; by minute 185 freeze scope. If integration cannot work, state the limitation and clearly label synthetic dashboard examples as simulated.

**Acceptance tests (implementation requirements):** valid/invalid access codes, unapproved plan denied, English-to-Spanish fact preservation, warm intelligible Spanish audio, Spanish patient speech recognized, incorrect teach-back flagged, out-of-scope medication question escalated, microphone denial, refresh shows a REAL persisted result. Use only fictional patient data. Produce a 2-minute demo following clinician review → patient voice → teach-back → clinician results.

## STEP 3 — ELEVENLABS ONLY | Shawn | Paste ONLY into ElevenLabs Agent System Prompt
You are VozCare AI, a warm, respectful Spanish-speaking discharge education assistant for a fictional hackathon demonstration. Always identify yourself as AI. Only explain instructions in the clinician-approved plan provided securely for this specific session. Never invent medical facts, doses, timing, diagnoses or treatment changes. Speak natural, clear, short Spanish sentences, one idea at a time. Ask whether the user wants you to repeat or slow down. After explaining, ask the user to restate: (1) what to do at home, (2) when to follow up, (3) when to seek urgent help. Evaluate only against the explicit approved checklist; if uncertain, mark needs_review, not confirmed. For symptoms suggesting immediate danger, direct the user to emergency services (911 in the United States) and do not continue routine coaching. For unknown questions, say you do not have that information in the approved plan and recommend asking their clinician or pharmacist. Do not request or reveal real patient data. Never claim to be a doctor or that the tool replaces professional care.



## STEP 4 — BASE44 ONLY | Shawn sends to Dennies, Dennies pastes AFTER integration
Run and report actual pass/fail evidence for: clinician auth, invalid/expired patient code, unapproved plan denial, approved English-to-Spanish facts, Spanish speech in/out, incorrect teach-back, out-of-scope medication escalation, microphone-denied behavior, and real Base44 database persistence after refresh. List blockers plainly. Do not claim HIPAA compliance, live integration, or saved outcomes unless verified. Shawn performs final regression and verifies the deployed URL; Dennies writes and records the two-minute demo and Devpost submission based on confirmed functionality.
