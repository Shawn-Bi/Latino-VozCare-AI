import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { errorResponse, AuthError } from "../../shared/access.ts";

// Public read of the card the voice agent last showed. Patient links use their token;
// the fictional demo uses the demo call id returned when the call was requested.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const db = base44.asServiceRole.entities;

    if (typeof body?.token === "string" && body.token) {
      const page = await db.PatientLink.filter({ token: body.token }, { limit: 1 });
      const link = (page.items ?? page)[0];
      if (!link || link.revoked_at || Date.parse(link.expires_at) <= Date.now()) throw new AuthError(404, "This link is not valid.");
      return Response.json({ card: link.active_card || "", updatedAt: link.card_updated_at || "", ended: !!link.call_ended_at });
    }
    if (typeof body?.demoCallId === "string" && body.demoCallId) {
      const demo = await db.DemoCall.get(body.demoCallId).catch(() => null);
      if (!demo) throw new AuthError(404, "Unknown demo call.");
      return Response.json({ card: demo.active_card || "", updatedAt: demo.card_updated_at || "", ended: !!demo.ended_at });
    }
    throw new AuthError(400, "A link token is required.");
  } catch (error) {
    return errorResponse(error);
  }
}