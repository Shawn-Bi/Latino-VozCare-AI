import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { requireApprovedDoctor, errorResponse, AuthError } from "../../shared/access.ts";
import { conversationStatus, usNumber, findAgentPhoneId, dial } from "../../shared/outboundCall.ts";
import { agentVars } from "../../shared/agentVars.ts";

// Public, token-gated call start. The patient link token is the check.
// Limits: 3 attempts per link, one call at a time, US numbers only, consent required.
const MAX_ATTEMPTS = 3;

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const token = body?.token;
    const mode = body?.mode === "tester" ? "tester" : "self";
    if (mode === "tester") {
      const user = await requireApprovedDoctor(base44);
      if (user.role !== "admin") throw new AuthError(403, "Team test calls require an administrator.");
    }
    if (!token || typeof token !== "string") throw new AuthError(400, "A link token is required.");

    const page = await base44.asServiceRole.entities.PatientLink.filter({ token }, { limit: 1 });
    const link = (page.items ?? page)[0];
    if (!link) throw new AuthError(404, "This link is not valid.");
    if (link.revoked_at) throw new AuthError(403, "This link has been revoked.");
    if (Date.parse(link.expires_at) <= Date.now()) throw new AuthError(403, "This link has expired.");
    if ((link.call_attempts || 0) >= MAX_ATTEMPTS) throw new AuthError(429, "The call limit for this link has been reached.");

    if (link.last_call_id && !link.call_ended_at) {
      const status = await conversationStatus(link.last_call_id);
      if (status && !["done", "failed"].includes(status)) throw new AuthError(409, "The previous call has not ended yet.");
      await base44.asServiceRole.entities.PatientLink.update(link.id, { call_ended_at: new Date().toISOString() });
    }

    let toNumber: string;
    if (mode === "tester") {
      toNumber = secrets.get("VOZCARE_TESTER_NUMBER");
    } else {
      if (body?.consent !== true) throw new AuthError(400, "Please confirm you own this number and agree to the call.");
      toNumber = usNumber(body?.phone);
    }

    const packet = await base44.asServiceRole.entities.ApprovedPacket.get(link.packet_id);
    const agentPhoneId = await findAgentPhoneId();

    // Reserve the attempt before dialing (duplicate-request protection).
    const sessionId = crypto.randomUUID();
    await base44.asServiceRole.entities.PatientLink.update(link.id, { call_attempts: (link.call_attempts || 0) + 1, call_ended_at: "", last_call_id: "", call_session_id: sessionId, active_card: "", card_updated_at: "" });

    const en = packet.delivery_language === "en";
    const conversationId = await dial(agentPhoneId, toNumber, sessionId, agentVars({
      firstName: packet.patient_first_name || "",
      language: packet.delivery_language || "es",
      startsAt: packet.appointment_starts_at || "",
      timeZone: packet.appointment_time_zone || "",
      hospital: packet.appointment_hospital || "",
      address: packet.appointment_address || "",
      startingAddress: packet.starting_address || "",
      careSummary: (en ? packet.english : packet.spanish) || "",
      carePlan: (en ? packet.plan_english : packet.plan_spanish) || "",
    }));
    if (conversationId === null) {
      await base44.asServiceRole.entities.PatientLink.update(link.id, { call_ended_at: new Date().toISOString() });
      throw new AuthError(502, "The call could not be started. Please try again.");
    }

    await base44.asServiceRole.entities.PatientLink.update(link.id, { last_call_id: conversationId });
    return Response.json({ started: true, attemptsUsed: (link.call_attempts || 0) + 1, maxAttempts: MAX_ATTEMPTS });
  } catch (error) {
    return errorResponse(error);
  }
}