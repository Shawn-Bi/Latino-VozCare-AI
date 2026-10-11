import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source = await fs.readFile(new URL('../base44/functions/getCallCard/entry.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source.replace(/^import .*;\r?\n/gm, ''), {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const prefix = `const createClientFromRequest = () => globalThis.__vozcareCardTest.client;
const conversationStatus = async () => globalThis.__vozcareCardTest.status;
class AuthError extends Error { constructor(status,message) { super(message); this.status=status; } }
const errorResponse = error => Response.json({error:error.message},{status:error.status||500});\n`;
const {default: getCard} = await import('data:text/javascript;base64,'+Buffer.from(prefix+compiled).toString('base64'));
function fixture(status='done') {
  const link = {id:'link', active_card:'appointment', last_call_id:'conversation', call_ended_at:'', expires_at:'2099-01-01', revoked_at:''};
  const writes=[];
  globalThis.__vozcareCardTest = {status,client:{asServiceRole:{entities:{PatientLink:{filter:async()=>[link],update:async(id,patch)=>writes.push(patch)}}}}};
  const run=()=>getCard(new Request('http://localhost/card',{method:'POST',body:JSON.stringify({token:'fictional-token'})}));
  return {link,writes,run};
}
test('missing end tool event recovers terminal call without losing last useful card',async()=>{
  const f=fixture(); const r=await f.run(); const data=await r.json();
  assert.equal(data.ended,true); assert.equal(data.card,'appointment'); assert.equal(f.writes.length,1);
});
test('active or unavailable provider status does not mark call ended',async()=>{
  for(const status of ['in-progress',null]) { const f=fixture(status); const data=await(await f.run()).json(); assert.equal(data.ended,false); assert.equal(f.writes.length,0); }
});
test('expired patient link cannot poll a conversation',async()=>{
  const f=fixture(); f.link.expires_at='2000-01-01'; assert.equal((await f.run()).status,404); assert.equal(f.writes.length,0);
});
