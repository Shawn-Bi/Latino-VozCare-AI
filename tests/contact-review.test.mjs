import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source=await fs.readFile(new URL('../base44/functions/doctorSaveContact/entry.ts',import.meta.url),'utf8');
const transformed=ts.transpileModule(source.replace(/^import .*;\r?\n/gm,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const prefix=`const createClientFromRequest=()=>globalThis.__contactReview.client;
const requireApprovedDoctor=async()=>({id:'doctor'});
const loadAssignedPatient=async()=>globalThis.__contactReview.patient;
class AuthError extends Error{constructor(status,message){super(message);this.status=status;}}
const errorResponse=e=>Response.json({error:e.message},{status:e.status||500});\n`;
const {default: save}=await import('data:text/javascript;base64,'+Buffer.from(prefix+transformed).toString('base64'));
test('appointment change invalidates checked draft before facts change and advances revision',async()=>{
 const events=[];const draft={revision:3,checks:{note:true,visual:true,language:true}};
 const visit={patient_id:'p',appointment_starts_at:'2026-10-12T14:30:00Z',appointment_ends_at:'2026-10-12T15:30:00Z',appointment_hospital:'Hospital',appointment_address:'Address'};
 globalThis.__contactReview={patient:{phone:'+12025550101',address:'Origin'},client:{asServiceRole:{entities:{
 Visit:{get:async()=>visit,update:async()=>events.push('visit')},Patient:{update:async()=>events.push('patient')},
 EducationDraft:{updateMany:async(q,ops)=>{events.push('invalidate');Object.assign(draft,ops.$set);draft.revision+=ops.$inc.revision;},filter:async()=>[draft]}
 }}}};
 const response=await save(new Request('http://localhost/contact',{method:'POST',body:JSON.stringify({patientId:'p',visitId:'v',phone:'+12025550101',address:'Origin',appointment:{startsAt:'2026-10-13T14:30:00Z',endsAt:visit.appointment_ends_at,hospital:'Hospital',address:'Address'}})}));
 assert.equal(response.status,200);assert.equal(events[0],'invalidate');assert.deepEqual(draft.checks,{note:false,visual:false,language:false});assert.equal((await response.json()).revision,4);
});
