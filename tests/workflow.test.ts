import test from "node:test";
import assert from "node:assert/strict";
import { initialWorkspace, approveAndSend, openPatientLink, resolveLink, applyConversationEvent, makeEvent, inferAction, retryCall, renewPatientLink, localAppointmentValue, appointmentInstant } from "../src/workflow.ts";
import { editEducation } from "../src/education.ts";
const approved = (index = 0) => {
  const record = initialWorkspace().records[index];
  record.draft = { ...record.draft, checks: { note: true, language: true, visual: true }, resources: record.draft.resources.map(() => "accepted") };
  return approveAndSend(record);
};
test("each patient owns separate draft, visit, address, and appointment", () => {
  const workspace = initialWorkspace();
  workspace.records[0].draft.english = "edited Maria draft";
  assert.notEqual(workspace.records[1].draft.english, "edited Maria draft");
  assert.equal(new Set(workspace.records.map((r) => r.visit.id)).size, 3);
  assert.equal(new Set(workspace.records.map((r) => r.patient.address)).size, 3);
});
test("approval rejects unchecked content and missing delivery details", () => {
  assert.throws(() => approveAndSend(initialWorkspace().records[0]));
  const r = approved(); r.draft = editEducation(r.draft, {}); r.draft.checks = { note: true, language: true, visual: true }; r.patient.phone = "";
  assert.throws(() => approveAndSend(r));
});
test("approved packet is an independent snapshot and excludes internal notes", () => {
  const r = approved(); const before = r.packet!.english;
  r.draft = editEducation(r.draft, { english: "a new draft" });
  r.visit.appointment.hospital = "Changed hospital";
  assert.equal(r.packet!.english, before); assert.equal(r.packet!.appointment.hospital, "Central Community Hospital");
  assert.equal(r.draft.approvedAt, null); assert.equal(r.draft.revision, 2);
  assert.equal("note" in r.packet!, false); assert.equal("anatomyNotes" in r.packet!, false);
});
test("approval waits for link open; reload and duplicate open do not repeat calls", () => {
  const r = approved(); assert.equal(r.session.callAttempts, 0);
  const opened = openPatientLink(r); assert.equal(opened.session.callAttempts, 1);
  assert.deepEqual(openPatientLink(opened), opened);
  const ended = applyConversationEvent(opened, makeEvent(opened, "end_call", "", "es"));
  assert.equal(openPatientLink(ended).session.callAttempts, 1); assert.equal(openPatientLink(ended).session.callState, "Ended");
});
test("invalid, expired, revoked, or mismatched packet links fail", () => {
  const r = approved(); const workspace = { version: 1 as const, records: [r] }; const token = r.access!.token;
  assert.equal(resolveLink(workspace, token).record?.patient.id, "maria");
  assert.equal(resolveLink(workspace, "not-a-link").error, "invalid");
  assert.equal(resolveLink(workspace, token, Date.parse(r.access!.expiresAt)).error, "expired");
  r.access!.revokedAt = new Date().toISOString(); assert.equal(resolveLink(workspace, token).error, "revoked");
  r.access!.revokedAt = null; r.access!.packetId = "other-packet"; assert.equal(resolveLink(workspace, token).error, "invalid");
});
test("events stay within their patient, packet, session, and connected call", () => {
  const maria = openPatientLink(approved()); const jose = openPatientLink(approved(1));
  const event = makeEvent(maria, "show_appointment", "I thought it was next week", "en");
  assert.deepEqual(applyConversationEvent(jose, event), jose);
  assert.deepEqual(applyConversationEvent(maria, { ...event, sessionId: "other" }), maria);
  assert.deepEqual(applyConversationEvent(maria, { ...event, packetId: "other" }), maria);
  const updated = applyConversationEvent(maria, event); assert.equal(updated.session.activeCard, "appointment");
  assert.deepEqual(applyConversationEvent(updated, event), updated);
});
test("directions open directly and temporary origin does not change patient address", () => {
  const r = openPatientLink(approved()); const update = applyConversationEvent(r, makeEvent(r, "show_directions", "I don't know where to go", "en"));
  assert.equal(update.session.activeCard, "route"); update.session.startingAddress = "Another fictional address";
  assert.equal(update.patient.address, "120 Example Street");
});
test("transport needs confirmation and retains the patient's exact statement", () => {
  const r = openPatientLink(approved()); const quote = "I need a ride to my appointment.";
  assert.equal(inferAction(quote), "request_transportation");
  const event = makeEvent(r, "request_transportation", quote, "en");
  const pending = applyConversationEvent(r, event); assert.equal(pending.session.taskCreated, false);
  const confirmed = applyConversationEvent(pending, makeEvent(pending, "request_transportation", quote, "en", true));
  assert.equal(confirmed.session.taskCreated, true); assert.equal(confirmed.session.transportationStatement, quote);
});
test("renewing a link invalidates the previous token without changing its packet or restarting the call", () => {
  const r = openPatientLink(approved()); const renewed = renewPatientLink(r);
  assert.equal(resolveLink({ version: 1, records: [renewed] }, r.access!.token).error, "invalid");
  assert.equal(renewed.packet!.id, r.packet!.id); assert.equal(openPatientLink(renewed).session.callAttempts, 1);
});
test("call retry is allowed only after no answer", () => {
  const r = openPatientLink(approved()); assert.deepEqual(retryCall(r), r);
  r.session.callState = "No answer"; assert.equal(retryCall(r).session.callAttempts, 2);
});
test("appointment editor preserves local time across daylight saving seasons", () => {
  const appointment = initialWorkspace().records[0].visit.appointment;
  assert.equal(localAppointmentValue(appointment), "2026-10-12T10:30");
  assert.equal(appointmentInstant("2026-10-12T10:30", "America/New_York"), "2026-10-12T14:30:00.000Z");
  assert.equal(appointmentInstant("2026-12-12T10:30", "America/New_York"), "2026-12-12T15:30:00.000Z");
  assert.throws(() => appointmentInstant("2026-03-08T02:30", "America/New_York"));
});
test("human assistance remains available after the conversation ends", () => {
  const r = openPatientLink(approved()); const ended = applyConversationEvent(r, makeEvent(r, "end_call", "", "es"));
  const requested = applyConversationEvent(ended, makeEvent(ended, "request_transportation", "", "es", true));
  assert.equal(requested.session.taskCreated, true); assert.equal(requested.session.callState, "Ended");
  assert.equal(requested.session.transportationStatement, "");
});
test("revoked links cannot submit events or retry calls", () => {
  const r = openPatientLink(approved()); r.access!.revokedAt = new Date().toISOString();
  assert.deepEqual(applyConversationEvent(r, makeEvent(r, "show_appointment", "appointment", "en")), r);
  r.session.callState = "No answer"; assert.deepEqual(retryCall(r), r);
});
test("a revised packet preserves the patient's existing assistance request", () => {
  let r = openPatientLink(approved());
  r = applyConversationEvent(r, makeEvent(r, "request_transportation", "I need a ride.", "en", true));
  r.session.taskStatus = "In progress";
  r.draft = editEducation(r.draft, { planEnglish: "Updated approved next steps." });
  r.draft.checks = { note: true, language: true, visual: true };
  const next = approveAndSend(r);
  assert.notEqual(next.packet!.id, r.packet!.id);
  assert.equal(next.session.taskCreated, true);
  assert.equal(next.session.taskStatus, "In progress");
  assert.equal(next.session.transportationStatement, "I need a ride.");
  assert.equal(next.session.callAttempts, 0);
  assert.equal(resolveLink({ version: 1, records: [next] }, r.access!.token).error, "invalid");
});
