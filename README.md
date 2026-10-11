# VozCare AI

Care follow-up that stays with the patient.

VozCare is a hackathon demo that helps patients revisit what they discussed with their doctor through an English or Spanish phone conversation and a companion website. As patients ask questions, the website shows their reviewed care information, appointment calendar, directions, or visual explanation.

**[Try the live demo](https://vozcare.base44.app/)**

The demo uses fictional clinical information and is not intended for clinical use.

## Why VozCare

Questions often come up after a patient leaves a visit. VozCare gives patients a way to review their care in English or Spanish, while doctors review the information before it is shared.

## What it does

- Gives doctors a patient workspace for reviewing visit notes and education packets.
- Supports English and Spanish patient wording.
- Creates personal links to doctor-approved care information.
- Connects real phone conversations to an appointment calendar, Google Maps directions, care instructions, and illustrative anatomy views.
- Keeps the reviewed information available in a separate **Full details** tab.

## How it works

1. A doctor selects a patient and reviews the visit education.
2. The doctor approves the packet and copies its personal link.
3. The patient opens the link and requests a follow-up call.
4. Questions about appointments, directions, care, or education open the matching information on the website.
5. The patient can revisit the saved packet in **Full details** after the call.

To explore without an account, select **Try as a demo doctor** on the homepage. The demo uses fictional clinical information. Requesting a call sends the number you enter to the calling services and places a real call. Use your own number.

## Technology

| Area | Tools |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Authentication, data and backend | Base44 |
| Voice agent and phone calls | ElevenLabs and Twilio |
| Anatomy visualization | Three.js |
| Directions | Google Maps |

## Run locally

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5174. This starts the frontend; it does not provision a Base44 backend, voice agent, or calling number. The checked-in client points to the existing VozCare Base44 app. Clones must configure their own app and services; frontend installation does not grant access to doctor records. See the [implementation handoff](docs/BASE44_HANDOFF.md) for setup and verification details.

## Verify locally

```sh
npx tsc --noEmit
node --experimental-strip-types --test tests/*.test.ts tests/*.test.mjs
npm run build
```

These checks do not place phone calls or verify the live provider configuration.

## Current limits

- This is a hackathon demo using fictional clinical information, not a production healthcare service.
- Calls support US numbers and are subject to usage limits.
- Links are shared manually; SMS is not configured.
- Doctor transcripts, teach-back reporting, and assistance queues are not implemented.
- The anatomy model is illustrative. It is not a patient scan and does not establish tumor size, depth, or stage.

## Documentation and credits

- [Implementation and operations](docs/BASE44_HANDOFF.md)
- [Original project brief](VozCare_PRD_v2_EN.md) — historical planning; some proposed features are not implemented.
- [Anatomy sources and attribution](public/models/ATTRIBUTION.md)

The interface uses Source Sans 3 and Source Serif 4; their license files are included with the font assets.
