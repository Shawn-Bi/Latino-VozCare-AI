import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireApprovedDoctor, errorResponse, AuthError } from "../../shared/access.ts";

// Creates one patient assigned to the signed-in approved doctor. The doctor
// assignment comes from the server session only; no visit, note or draft is
// created. Marked is_synthetic_demo: false because a doctor entered it.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireApprovedDoctor(base44);
    const body = await req.json();

    const name = String(body?.name ?? "").trim().replace(/\s+/g, " ");
    const phone = String(body?.phone ?? "").trim();
    const address = String(body?.address ?? "").trim();
    const language = body?.preferredLanguage;

    if (name.length < 2 || name.length > 100) throw new AuthError(400, "Enter the patient's full name.");
    if (language !== "en" && language !== "es") throw new AuthError(400, "Choose a preferred language.");
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new AuthError(400, "Enter the phone in international format, for example +15551234567.");
    if (address.length < 5 || address.length > 200) throw new AuthError(400, "Enter the starting address.");

    const parts = name.split(" ");
    const initials = (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();

    const patient = await base44.asServiceRole.entities.Patient.create({
      name,
      first_name: parts[0],
      initials,
      phone,
      address,
      preferred_language: language,
      case_kind: "general",
      assigned_doctor_id: user.id,
      assigned_doctor_email: user.email || "",
      is_synthetic_demo: false,
    });
    return Response.json({ id: patient.id });
  } catch (error) {
    return errorResponse(error);
  }
}