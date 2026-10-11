import test from "node:test";
import assert from "node:assert/strict";
import { packetMatchesReview } from "../base44/shared/packetReview.ts";
const patient = { id: "p", address: "Example address", name: "Demo patient" };
const visit = { id: "v", appointment_starts_at: "2026-10-12T14:30:00Z" };
const draft = { visit_id: "v", revision: 2, english: "Reviewed wording", resources: ["accepted"] };
const packet = { ...draft, ...visit, patient_id: "p", visit_id: "v", patient_name: patient.name, starting_address: patient.address };
test("only the exact current review can display approved status", () => {
  assert.equal(packetMatchesReview(packet, draft, visit, patient), true);
  assert.equal(packetMatchesReview(packet, { ...draft, revision: 3 }, visit, patient), false);
  assert.equal(packetMatchesReview(packet, { ...draft, english: "New wording" }, visit, patient), false);
  assert.equal(packetMatchesReview(packet, { ...draft, resources: ["rejected"] }, visit, patient), false);
  assert.equal(packetMatchesReview(packet, draft, { ...visit, appointment_starts_at: "2026-10-13T14:30:00Z" }, patient), false);
  assert.equal(packetMatchesReview(packet, draft, visit, { ...patient, address: "Changed address" }), false);
  assert.equal(packetMatchesReview(packet, { ...draft, visit_id: "different" }, visit, patient), false);
});

test("approval defaults match absent optional fields on reload", () => {
  const stored = { ...packet, include_procedure: false, delivery_language: "es", drawing_file_uri: "", drawing_view: "", caption_english: "", caption_spanish: "", appointment_time_zone: "America/New_York" };
  assert.equal(packetMatchesReview(stored, draft, visit, patient), true);
});
