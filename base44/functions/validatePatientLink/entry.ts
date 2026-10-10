import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { errorResponse, AuthError } from "../../shared/access.ts";

// Public, token-gated lookup: a patient opens their link and receives ONLY the
// approved packet (no source notes, no other patients, no credentials). The
// long random token saved at approval is the only check, so sign-in is not
// required. The token is matched exactly; an expired or revoked link is
// refused. The drawing, if present, is signed server-side and returned as a
// temporary URL.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const token = body?.token;
    if (!token || typeof token !== "string") throw new AuthError(400, "A link token is required.");

    const linkPage = await base44.asServiceRole.entities.PatientLink.filter({ token }, { limit: 1 });
    const linkItems = linkPage.items ?? linkPage;
    if (!linkItems || linkItems.length === 0) throw new AuthError(404, "This link is not valid.");
    const link = linkItems[0];
    if (link.revoked_at) throw new AuthError(403, "This link has been revoked.");
    if (!Number.isFinite(Date.parse(link.expires_at)) || Date.parse(link.expires_at) <= Date.now()) {
      throw new AuthError(403, "This link has expired.");
    }

    let packet;
    try {
      packet = await base44.asServiceRole.entities.ApprovedPacket.get(link.packet_id);
    } catch {
      throw new AuthError(404, "The approved packet is not available.");
    }
    if (!packet || packet.patient_id !== link.patient_id) throw new AuthError(404, "The approved packet is not available.");

    // Record first open.
    if (!link.opened_at) {
      await base44.asServiceRole.entities.PatientLink.update(link.id, { opened_at: new Date().toISOString() });
    }

    // Sign the drawing if present.
    let drawingUrl = "";
    if (packet.drawing_file_uri) {
      try {
        const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: packet.drawing_file_uri, expires_in: 3600 });
        drawingUrl = signed_url;
      } catch {
        // Leave empty — the patient view handles a missing drawing.
      }
    }

    return Response.json({
      packet: {
        patientName: packet.patient_name,
        firstName: packet.patient_first_name,
        initials: packet.patient_initials,
        deliveryLanguage: packet.delivery_language,
        english: packet.english,
        spanish: packet.spanish,
        planEnglish: packet.plan_english,
        planSpanish: packet.plan_spanish,
        captionEnglish: packet.caption_english,
        captionSpanish: packet.caption_spanish,
        includeProcedure: packet.include_procedure,
        resources: packet.resources || [],
        drawingUrl,
        drawingView: packet.drawing_view,
        caseKind: packet.case_kind,
        appointment: {
          startsAt: packet.appointment_starts_at,
          endsAt: packet.appointment_ends_at,
          timeZone: packet.appointment_time_zone,
          hospital: packet.appointment_hospital,
          address: packet.appointment_address,
        },
        startingAddress: packet.starting_address,
        approvedAt: packet.approved_at,
      },
      link: {
        callAttempts: link.call_attempts || 0,
        callEndedAt: link.call_ended_at || "",
        lastCallId: link.last_call_id || "",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}