const express = require('express');
const load = p => { const m = require(p); return m.default || m; };
const VITALIK = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
function mk(){ const app=express(); app.use(express.json()); app.use('/wallet-balance', load('../dist/routes/wallet-balance-api/routes/intelligence.js')); return app; }
let pass=0, fail=0; const ck=(n,c,x)=>{ c?(pass++,console.log('  PASS',n)):(fail++,console.log('  FAIL',n,JSON.stringify(x).slice(0,160))); };
(async()=>{
  // Phase 1: NO key
  delete process.env.ETHERSCAN_API_KEY;
  let srv = mk().listen(0); let base=`http://127.0.0.1:${srv.address().port}`;
  const post=async(p,b)=>{const r=await fetch(base+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});return{status:r.status,json:await r.json().catch(()=>null)};};
  console.log('# no key');
  let r=await post('/wallet-balance/lookup',{}); ck('missing addr → 400', r.status===400, r);
  r=await post('/wallet-balance/lookup',{address:'nothex'}); ck('bad addr → 400', r.status===400, r);
  r=await post('/wallet-balance/lookup',{address:VITALIK}); ck('no key → 200 success:false not_configured', r.status===200&&r.json.success===false&&r.json.error==='not_configured', r.json);
  r=await post('/wallet-balance/execution-gate',{address:VITALIK}); ck('gate flags PROVIDER_NOT_CONFIGURED', r.json.blocking_flags.includes('PROVIDER_NOT_CONFIGURED'), r.json.blocking_flags);
  srv.close();

  // Phase 2: dummy key → real Etherscan call rejected → graceful 200 success:false (NOT 500)
  process.env.ETHERSCAN_API_KEY='DUMMYKEYFORTEST';
  delete require.cache[require.resolve('../dist/routes/wallet-balance-api/routes/intelligence.js')];
  srv = mk().listen(0); base=`http://127.0.0.1:${srv.address().port}`;
  console.log('# dummy key');
  r=await post('/wallet-balance/lookup',{address:VITALIK,chain:'fakechain'}); ck('unsupported chain → 200 success:false', r.status===200&&r.json.success===false&&r.json.error==='unsupported_chain', r.json);
  r=await post('/wallet-balance/lookup',{address:VITALIK,chain:'ethereum'}); ck('rejected key → 200 (not 500)', r.status===200, r.status); ck('rejected key → success:false', r.json && r.json.success===false, r.json);
  srv.close();
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
