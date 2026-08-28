const base=process.env.API_URL??'http://localhost:4000';
async function check(path:string, init?:RequestInit){const r=await fetch(base+path,init);if(!r.ok)throw new Error(`${init?.method??'GET'} ${path} -> ${r.status}`);console.log(`${init?.method??'GET'} ${path} -> ${r.status}`);return r.json().catch(()=>null);}
await check('/health');
const projects=await check('/api/projects');
if(!projects?.data?.length) throw new Error('No seeded project found');
const issues=await check('/api/issues?projectId=proj_01');
if(!issues?.data?.length) throw new Error('No seeded issues found');
console.log('Smoke test passed.');
