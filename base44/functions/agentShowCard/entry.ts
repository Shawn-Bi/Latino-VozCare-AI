import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { errorResponse, AuthError } from "../../shared/access.ts";

// Webhook for the ElevenLabs show_patient_card tool, called during a live phone call.
// The unguessable per-call session id (sent by us as demo_session_id) identifies the call;
// the ElevenLabs conversation id must match the call we started.
const CARDS = ["appointment", "directions", "care", "education", "help", "ended"];

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body?.demo_session_id === "string" ? body.demo_session_id : "";
    const conversationId = typeof body?.conversation_id === "string" ? body.conversation_id : "";
    const card = body?.card;
    if (sessionId.length < 30 || !CARDS.includes(card)) throw new AuthError(400, "Invalid tool request.");

    const db = base44.asServiceRole.entities;
    const now = new Date().toISOString();
    const linkPage = await db.PatientLink.filter({ call_session_id: sessionId }, { limit: 1 });
    const link = (linkPage.items ?? linkPage)[0];
    const demoPage = link ? null : await db.DemoCall.filter({ session_id: sessionId }, { limit: 1 });
    const demo = demoPage ? (demoPage.items ?? demoPage)[0] : null;
    const record = link || demo;
    if (!record) throw new AuthError(404, "Unknown call.");

    const knownConversation = link ? link.last_call_id : demo.conversation_id;
    if (knownConversation && conversationId && knownConversation !== conversationId) throw new AuthError(403, "Call mismatch.");

    // "ended" keeps the last useful card on screen and marks the call finished.
    const patch: Record<string, string> = card === "ended"
      ? (link ? { call_ended_at: now } : { ended_at: now })
      : { active_card: card, card_updated_at: now };
    if (link) await db.PatientLink.update(link.id, patch);
    else await db.DemoCall.update(demo.id, patch);

    return Response.json({ success: true, shown_on_website: card === "ended" ? "conversation ended" : card });
  } catch (error) {
    return errorResponse(error);
  }
}