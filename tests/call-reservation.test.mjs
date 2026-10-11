import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source = await fs.readFile(new URL('../base44/functions/startCall/entry.ts', import.meta.url), 'utf8');
const transformed = ts.transpileModule(source.replace(/^import .*;\r?\n/gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const prefix = `const createClientFromRequest = () => globalThis.__callReservation.client;
const secrets = {get: () => ''};
const requireApprovedDoctor = async () => ({role:'admin'});
const conversationStatus = async () => 'done';
const usNumber = () => '+12025550101';
const findAgentPhoneId = async () => 'number';
const agentVars = () => ({});
const dial = async () => { globalThis.__callReservation.dials++; await new Promise(r=>setTimeout(r,10)); return 'conversation'; };
class AuthError extends Error {constructor(status,message){super(message);this.status=status;}}
const errorResponse=e=>Response.json({error:e.message},{status:e.status||500});\n`;
const {default: start} = await import('data:text/javascript;base64,'+Buffer.from(prefix+transformed).toString('base64'));
test('two concurrent tabs reserve one attempt and place only one provider call', async () => {
  const link={id:'link',packet_id:'packet',expires_at:'2099-01-01',call_attempts:0,call_session_id:'',last_call_id:'',call_ended_at:''};
  globalThis.__callReservation={dials:0,client:{asServiceRole:{entities:{
    PatientLink:{filter:async()=>[structuredClone(link)],updateMany:async(q,ops)=>{
      if(q.call_attempts!==link.call_attempts || q.$or[0].call_session_id!==link.call_session_id)return {updated:0};
      link.call_attempts+=ops.$inc.call_attempts; Object.assign(link,ops.$set);return {updated:1};
    },update:async(id,data)=>Object.assign(link,data)},
    ApprovedPacket:{get:async()=>({delivery_language:'en'})}
  }}}};
  const req=()=>new Request('http://localhost/call',{method:'POST',body:JSON.stringify({token:'token',phone:'2025550101',consent:true})});
  const results=await Promise.all([start(req()),start(req())]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  assert.equal(link.call_attempts,1);assert.equal(globalThis.__callReservation.dials,1);
  link.last_call_id='';link.call_ended_at='';
  assert.equal((await start(req())).status,409);assert.equal(globalThis.__callReservation.dials,1);
});
