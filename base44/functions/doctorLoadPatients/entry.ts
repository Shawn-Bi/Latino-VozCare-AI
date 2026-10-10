import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireApprovedDoctor, errorResponse } from "../../shared/access.ts";

// Lists the signed-in doctor's assigned patients (assigned_doctor_id === this
// doctor, approved membership required) with derived education and follow-up
// status. Optional name search and education-status filter run server-side.
const EDUCATION = ["none", "draft", "approved"];

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireApprovedDoctor(base44);
    const body = await req.json().catch(() => ({}));
    const search = typeof body?.search === "string" ? body.search.trim().slice(0, 60) : "";
    const status = EDUCATION.includes(body?.status) ? body.status : "";

    const query: any = { assigned_doctor_id: user.id };
    if (search) query.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    const patientsPage = await base44.asServiceRole.entities.Patient.filter(query, { sort: "-created_date", limit: 50 });
    const patients = patientsPage.items ?? patientsPage;
    if (!patients || patients.length === 0) return Response.json({ patients: [] });

    const ids = { $in: patients.map((p: any) => p.id) };
    const [visitsPage, draftsPage, packetsPage, linksPage] = await Promise.all([
      base44.asServiceRole.entities.Visit.filter({ patient_id: ids }, { sort: "-created_date", limit: 200 }),
      base44.asServiceRole.entities.EducationDraft.filter({ patient_id: ids }, { sort: "-revision", limit: 200, fields: ["patient_id", "revision"] }),
      base44.asServiceRole.entities.ApprovedPacket.filter({ patient_id: ids }, { sort: "-created_date", limit: 200, fields: ["patient_id"] }),
      base44.asServiceRole.entities.PatientLink.filter({ patient_id: ids }, { sort: "-created_date", limit: 200, fields: ["patient_id", "call_attempts"] }),
    ]);
    const visits = visitsPage.items ?? visitsPage;
    const drafts = draftsPage.items ?? draftsPage;
    const packets = packetsPage.items ?? packetsPage;
    const links = linksPage.items ?? linksPage;

    const result = patients.map((p: any) => {
      const v = visits.find((x: any) => x.patient_id === p.id);
      const d = drafts.find((x: any) => x.patient_id === p.id);
      const approved = packets.some((x: any) => x.patient_id === p.id);
      const link = links.find((x: any) => x.patient_id === p.id);
      return {
        id: p.id,
        name: p.name,
        firstName: p.first_name,
        initials: p.initials,
        phone: p.phone,
        caseKind: p.case_kind,
        preferredLanguage: p.preferred_language,
        isSyntheticDemo: p.is_synthetic_demo !== false,
        draftRevision: d?.revision ?? 1,
        educationStatus: !d ? "none" : approved ? "approved" : "draft",
        followUpStatus: !link ? "not_started" : (link.call_attempts || 0) > 0 ? "called" : "link_ready",
        appointmentStartsAt: v?.appointment_starts_at ?? "",
        appointmentTimeZone: v?.appointment_time_zone ?? "America/New_York",
      };
    }).filter((p: any) => !status || p.educationStatus === status);
    return Response.json({ patients: result });
  } catch (error) {
    return errorResponse(error);
  }
}