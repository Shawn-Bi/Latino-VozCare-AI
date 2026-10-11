import { demoAppointment, demoStartingAddress, demoEducation } from "../../shared/demoScenario.ts";
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { requireApprovedDoctor, errorResponse, AuthError } from "../../shared/access.ts";
import { usNumber, findAgentPhoneId, dial } from "../../shared/outboundCall.ts";
import { agentVars } from "../../shared/agentVars.ts";

// Public demo call with fixed fictional content (María). No caller-supplied content.
// Clearly labeled fictional demo: no consent checkbox; number validation still applies.
// Abuse limit: at most 5 demo calls per hour across the whole app.
const HOURLY_LIMIT = 5;

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const mode = body?.mode === "tester" ? "tester" : "self";
    if (mode === "tester") {
      const user = await requireApprovedDoctor(base44);
      if (user.role !== "admin") throw new AuthError(403, "Team test calls require an administrator.");
    }
    const language = body?.language === "en" ? "en" : "es";

    const since = new Date(Date.now() - 3600000).toISOString();
    const recent = await base44.asServiceRole.entities.DemoCall.count({ created_date: { $gte: since } });
    if (recent >= HOURLY_LIMIT) throw new AuthError(429, "The call limit for this link has been reached.");

    const toNumber = mode === "tester" ? secrets.get("VOZCARE_TESTER_NUMBER") : usNumber(body?.phone);

    const agentPhoneId = await findAgentPhoneId();
    const sessionId = crypto.randomUUID();
    const record = await base44.asServiceRole.entities.DemoCall.create({ mode, session_id: sessionId });
    const en = language === "en";
    const conversationId = await dial(agentPhoneId, toNumber, sessionId, agentVars({
      firstName: "María",
      language,
      ...demoAppointment,
      startingAddress: demoStartingAddress,
      careSummary: en ? demoEducation.english : demoEducation.spanish,
      carePlan: en ? demoEducation.planEnglish : demoEducation.planSpanish,
    }));
    if (conversationId === null) {
      await base44.asServiceRole.entities.DemoCall.update(record.id, { ended_at: new Date().toISOString() });
      throw new AuthError(502, "The call could not be started. Please try again.");
    }
    await base44.asServiceRole.entities.DemoCall.update(record.id, { conversation_id: conversationId });
    return Response.json({ started: true, attemptsUsed: 0, demoCallId: record.id });
  } catch (error) {
    return errorResponse(error);
  }
}