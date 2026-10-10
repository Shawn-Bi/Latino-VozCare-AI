import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { errorResponse, AuthError } from "../../shared/access.ts";

// Public, token-gated call start. The patient link token is the check.
// Limits: 3 attempts per link, one call at a time, US numbers only, consent required.
const MAX_ATTEMPTS = 3;
const EL = "https://api.elevenlabs.io/v1/convai";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const token = body?.token;
    const mode = body?.mode === "tester" ? "tester" : "self";
    if (!token || typeof token !== "string") throw new AuthError(400, "A link token is required.");

    const page = await base44.asServiceRole.entities.PatientLink.filter({ token }, { limit: 1 });
    const link = (page.items ?? page)[0];
    if (!link) throw new AuthError(404, "This link is not valid.");
    if (link.revoked_at) throw new AuthError(403, "This link has been revoked.");
    if (Date.parse(link.expires_at) <= Date.now()) throw new AuthError(403, "This link has expired.");
    if ((link.call_attempts || 0) >= MAX_ATTEMPTS) throw new AuthError(429, "The call limit for this link has been reached.");

    const apiKey = secrets.get("ELEVENLABS_API_KEY");
    const headers = { "xi-api-key": apiKey, "Content-Type": "application/json" };

    // One call at a time: the previous conversation must have ended.
    if (link.last_call_id && !link.call_ended_at) {
      const r = await fetch(`${EL}/conversations/${link.last_call_id}`, { headers, signal: AbortSignal.timeout(10000) });
      const conv = r.ok ? await r.json() : null;
      if (conv && !["done", "failed"].includes(conv.status)) throw new AuthError(409, "The previous call has not ended yet.");
      await base44.asServiceRole.entities.PatientLink.update(link.id, { call_ended_at: new Date().toISOString() });
    }

    let toNumber: string;
    if (mode === "tester") {
      toNumber = secrets.get("VOZCARE_TESTER_NUMBER");
    } else {
      if (body?.consent !== true) throw new AuthError(400, "Please confirm you own this number and agree to the call.");
      const digits = String(body?.phone || "").replace(/\D/g, "");
      const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
      if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) throw new AuthError(400, "Enter a valid US phone number.");
      toNumber = `+1${national}`;
    }

    const packet = await base44.asServiceRole.entities.ApprovedPacket.get(link.packet_id);

    // Find the ElevenLabs phone-number id that matches our Twilio number.
    const fromNumber = secrets.get("TWILIO_FROM_NUMBER");
    const pr = await fetch(`${EL}/phone-numbers`, { headers, signal: AbortSignal.timeout(10000) });
    if (!pr.ok) throw new AuthError(502, "The call service is not reachable.");
    const numbers = await pr.json();
    const match = (Array.isArray(numbers) ? numbers : numbers.phone_numbers || []).find((n: any) => n.phone_number === fromNumber);
    if (!match) throw new AuthError(502, "The calling number is not set up in the call service.");

    // Reserve the attempt before dialing (duplicate-request protection).
    await base44.asServiceRole.entities.PatientLink.update(link.id, { call_attempts: (link.call_attempts || 0) + 1, call_ended_at: "" });

    const callRes = await fetch(`${EL}/twilio/outbound-call`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        agent_id: secrets.get("ELEVENLABS_AGENT_ID"),
        agent_phone_number_id: match.phone_number_id,
        to_number: toNumber,
        conversation_initiation_client_data: {
          dynamic_variables: {
            patient_first_name: packet.patient_first_name || "",
            language: packet.delivery_language || "es",
            appointment_starts_at: packet.appointment_starts_at || "",
            appointment_hospital: packet.appointment_hospital || "",
            appointment_address: packet.appointment_address || "",
            starting_address: packet.starting_address || "",
            care_summary: (packet.delivery_language === "en" ? packet.english : packet.spanish) || "",
            next_steps: (packet.delivery_language === "en" ? packet.plan_english : packet.plan_spanish) || "",
          },
        },
      }),
    });
    const result = await callRes.json().catch(() => ({}));
    if (!callRes.ok || result.success === false) {
      console.error("outbound-call failed", callRes.status, JSON.stringify(result));
      await base44.asServiceRole.entities.PatientLink.update(link.id, { call_ended_at: new Date().toISOString() });
      throw new AuthError(502, "The call could not be started. Please try again.");
    }

    await base44.asServiceRole.entities.PatientLink.update(link.id, { last_call_id: result.conversation_id || "" });
    return Response.json({ started: true, attemptsUsed: (link.call_attempts || 0) + 1, maxAttempts: MAX_ATTEMPTS });
  } catch (error) {
    return errorResponse(error);
  }
}