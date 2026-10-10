// Patient, Visit and EducationDraft are admin-only at the data layer.
// Doctors may only reach them through a Base44-hosted backend operation that derives the caller from
// request auth, checks an approved CareTeamMembership and the patient assignment on every request, and
// verifies the patient/visit/draft relationships. Backend functions require the Builder plan or higher,
// so that operation does not exist yet. Do not set `available` to true until it is deployed and the
// functions in vozcare-api.ts call it instead of the raw entities.
export const DOCTOR_RECORD_ACCESS: { available: boolean; reason: string; reasonEs: string } = {
  available: false,
  reason: "Patient, visit and education-draft data is admin-only. Doctors must reach it through a Base44-hosted backend operation that checks approved care-team membership and patient assignment on every request. Backend functions require the Builder plan or higher, which this workspace does not have, so that operation cannot be created and doctors cannot open patient records yet.",
  reasonEs: "Los datos de pacientes, visitas y borradores educativos son solo para administradores. Los médicos deben acceder mediante una operación de servidor de Base44 que verifique la membresía aprobada del equipo y la asignación del paciente en cada solicitud. Las funciones de servidor requieren el plan Builder o superior, que este espacio de trabajo no tiene, así que esa operación no puede crearse y los médicos aún no pueden abrir registros de pacientes.",
};