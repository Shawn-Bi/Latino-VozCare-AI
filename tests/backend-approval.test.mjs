import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

// Execute the actual handler with in-memory entities. No Base44/provider requests.
const source = await fs.readFile(new URL('../base44/functions/approvePacket/entry.ts', import.meta.url), 'utf8');
const key = '__vozcareApprovalTest';
const transformed = ts.transpileModule(source.replace(/^import .*;\r?\n/gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const prefix = `const createClientFromRequest = () => globalThis.${key}.client;
const requireApprovedDoctor = async () => ({ id: 'doctor' });
const loadAssignedPatient = async () => globalThis.${key}.patient;
class AuthError extends Error { constructor(status, message) { super(message); this.status = status; } }
const errorResponse = error => Response.json({error: error.message}, {status: error.status || 500});\n`;
const { default: approve } = await import('data:text/javascript;base64,' + Buffer.from(prefix + transformed).toString('base64'));
function fixture() {
  const created = [];
  const draft = { patient_id: 'p', visit_id: 'v', revision: 3, checks: { note: true, language: true, visual: true }, resources: ['accepted', 'rejected'], note: 'Source note', english: 'Reviewed text', spanish: 'Texto revisado', plan_english: 'Plan', plan_spanish: 'Plan', caption_english: 'Caption', caption_spanish: 'Descripción' };
  const visit = { patient_id: 'p', appointment_hospital: 'Demo hospital', appointment_address: 'Demo street', appointment_starts_at: '2026-10-12T14:30:00Z' };
  globalThis[key] = { patient: { id: 'p', name: 'Demo', phone: '+12025550101', address: 'Demo origin' }, client: { asServiceRole: { entities: {
    EducationDraft: { get: async () => draft }, Visit: { get: async () => visit },
    ApprovedPacket: { create: async data => { created.push(data); return { ...data, id: 'packet' }; } },
    PatientLink: { create: async data => { created.push(data); return data; } },
  } } } };
  const run = () => approve(new Request('http://localhost/approval', { method: 'POST', body: JSON.stringify({patientId: 'p', visitId: 'v', draftId: 'd', serverRevision: 3}) }));
  return { draft, visit, created, run };
}
test('approval snapshots saved wording and ties link to its packet', async () => {
  const f = fixture(); const response = await f.run(); const body = await response.json();
  assert.equal(response.status, 200); assert.equal(f.created[0].english, f.draft.english);
  assert.equal(f.created[0].revision, 3); assert.equal(f.created[1].packet_id, 'packet');
  assert.equal(body.approvedAt, f.created[0].approved_at); assert.equal('note' in f.created[0], false);
});
for (const [label, change, status] of [
  ['stale revision', f => { f.draft.revision = 4; }, 409],
  ['another visit', f => { f.draft.visit_id = 'other'; }, 404],
  ['unfinished reading', f => { f.draft.resources[0] = 'pending'; }, 400],
  ['missing wording', f => { f.draft.spanish = ''; }, 400],
  ['unchecked visual', f => { f.draft.checks.visual = false; }, 400],
]) test(`approval rejects ${label} without creating a packet`, async () => {
  const f = fixture(); change(f); assert.equal((await f.run()).status, status); assert.equal(f.created.length, 0);
});
