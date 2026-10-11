// Public fictional demonstration data. No credentials or real patient data.
export const demoAppointment = {
  startsAt: "2026-10-12T14:30:00Z", endsAt: "2026-10-12T15:30:00Z",
  timeZone: "America/New_York", hospital: "Bellevue Hospital", address: "462 First Avenue, New York, NY 10016",
};
export const demoStartingAddress = "301 Gold Street, Brooklyn, NY 11201";
export const demoEducation = {
  note: "FICTIONAL DEMO NOTE · October 10, 2026\n\nSigmoid colon biopsy reports adenocarcinoma. Depth of invasion and final stage have not been established in this sample record.\n\nDiscussed the location of the colon and the purpose of further evaluation. Removal of the affected colon segment was discussed as a possible treatment, pending staging and specialist review. No treatment decision or medication change is recorded.\n\nFollow-up: October 12, 2026 at 10:30 AM, Bellevue Hospital. Patient prefers Spanish. Bring questions to the care team.",
  english: "Your sample biopsy report found cancer in the sigmoid colon, a part of the large intestine. This illustration helps explain where the colon is and how its wall is arranged. It does not show the exact size or depth of your cancer. The stage is still pending in this fictional record.",
  spanish: "En este caso ficticio, el informe de la biopsia encontró cáncer en el colon sigmoide, una parte del intestino grueso. Esta ilustración explica dónde está el colon y cómo está formada su pared. No muestra el tamaño ni la profundidad exactos de su cáncer. El estadio aún está pendiente en este registro ficticio.",
  planEnglish: "The care team discussed surgery to remove the affected section as a possible treatment. A treatment decision has not been made. Your next appointment is October 12, 2026 at 10:30 AM at Bellevue Hospital. Bring your questions about the tests and treatment choices.",
  planSpanish: "El equipo médico habló de la cirugía para retirar la parte afectada como un posible tratamiento. Aún no se ha tomado una decisión sobre el tratamiento. Su próxima cita es el 12 de octubre de 2026 a las 10:30 a. m. en Bellevue Hospital. Lleve sus preguntas sobre las pruebas y las opciones de tratamiento.",
  captionEnglish: "The body and organ views show reference anatomy. The red region marks the sigmoid colon. The inside view shows an example growth. These illustrations do not show the exact size or depth of your cancer and do not establish its stage.",
  captionSpanish: "Las vistas del cuerpo y de los órganos muestran una anatomía de referencia. La región roja señala el colon sigmoide. La vista interior muestra un ejemplo de un crecimiento. Estas ilustraciones no muestran el tamaño ni la profundidad exactos de su cáncer y no determinan su estadio.",
  includeProcedure: false,
  deliveryLanguage: "es" as const,

};