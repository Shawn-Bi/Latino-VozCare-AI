import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { errorResponse, AuthError } from "../../shared/access.ts";
import { usNumber, findAgentPhoneId, dial } from "../../shared/outboundCall.ts";

// Public demo call with fixed fictional content (María). No caller-supplied content.
// Abuse limit: at most 5 demo calls per hour across the whole app.
const HOURLY_LIMIT = 5;

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const mode = body?.mode === "tester" ? "tester" : "self";
    const language = body?.language === "en" ? "en" : "es";

    const since = new Date(Date.now() - 3600000).toISOString();
    const recent = await base44.asServiceRole.entities.DemoCall.count({ created_date: { $gte: since } });
    if (recent >= HOURLY_LIMIT) throw new AuthError(429, "The call limit for this link has been reached.");

    let toNumber: string;
    if (mode === "tester") {
      toNumber = secrets.get("VOZCARE_TESTER_NUMBER");
    } else {
      if (body?.consent !== true) throw new AuthError(400, "Please confirm you own this number and agree to the call.");
      toNumber = usNumber(body?.phone);
    }

    const agentPhoneId = await findAgentPhoneId();
    const record = await base44.asServiceRole.entities.DemoCall.create({ mode });
    const en = language === "en";
    const conversationId = await dial(agentPhoneId, toNumber, {
      patient_first_name: "María",
      language,
      appointment_starts_at: "2026-10-12T14:30:00Z",
      appointment_hospital: "Central Community Hospital",
      appointment_address: "500 Demo Avenue",
      starting_address: "120 Example Street",
      care_summary: en
        ? "This is a fictional demo. At the visit, the doctor explained a finding in the sigmoid colon. Depth and stage are still pending."
        : "Esta es una demostración ficticia. En la visita, el médico explicó un hallazgo en el colon sigmoide. La profundidad y la etapa están pendientes.",
      next_steps: en
        ? "Attend the follow-up appointment and bring your questions to the care team."
        : "Asista a su cita de seguimiento y lleve sus preguntas al equipo de atención.",
    });
    if (conversationId === null) throw new AuthError(502, "The call could not be started. Please try again.");
    await base44.asServiceRole.entities.DemoCall.update(record.id, { conversation_id: conversationId });
    return Response.json({ started: true, attemptsUsed: 0 });
  } catch (error) {
    return errorResponse(error);
  }
}