const express = require('express');
const load = p => { const m = require(p); return m.default || m; };
const app = express();
app.use(express.json());
app.use('/app-store-lookup', load('../dist/routes/app-store-lookup-api/routes/intelligence.js'));
app.use('/sports-scores', load('../dist/routes/sports-scores-api/routes/intelligence.js'));
app.use('/news-search', load('../dist/routes/news-search-api/routes/intelligence.js'));
let pass=0, fail=0;
const ck=(n,c,x)=>{ c?(pass++,console.log('  PASS',n)):(fail++,console.log('  FAIL',n,JSON.stringify(x).slice(0,200))); };
const srv = app.listen(0, async () => {
  const base=`http://127.0.0.1:${srv.address().port}`;
  const post=async(p,b)=>{const r=await fetch(base+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});return{status:r.status,json:await r.json().catch(()=>null)};};

  console.log('# app-store-lookup (iTunes)');
  let r=await post('/app-store-lookup/lookup',{input:'slack'});
  ck('lookup 200 success', r.status===200 && r.json.success===true, r.json && {s:r.json.success,e:r.json.error});
  ck('lookup real app name', JSON.stringify(r.json.data||{}).toLowerCase().includes('slack'), r.json.data);
  ck('provider apple-itunes', r.json.provenance?.provider==='apple-itunes', r.json.provenance);
  r=await post('/app-store-lookup/reviews',{input:'slack'});
  ck('reviews 200 success', r.status===200 && r.json.success===true, r.json && {s:r.json.success,e:r.json.error});
  r=await post('/app-store-lookup/lookup',{});
  ck('missing input → 400', r.status===400, r.status);

  console.log('# sports-scores (ESPN)');
  r=await post('/sports-scores/live-scores',{sport:'nba'});
  ck('live-scores 200 success', r.status===200 && r.json.success===true, r.json && {s:r.json.success,e:r.json.error});
  ck('games is array', Array.isArray(r.json.games), Object.keys(r.json||{}));
  ck('provider espn', r.json.source_provenance?.provider==='espn', r.json.source_provenance);
  r=await post('/sports-scores/live-scores',{sport:'quidditch'});
  ck('unknown sport → success:false (not 500)', r.status===200 && r.json.success===false, r.json && {s:r.json.success});
  r=await post('/sports-scores/live-scores',{});
  ck('missing sport → 400', r.status===400, r.status);

  console.log('# news-search (Google News RSS)');
  r=await post('/news-search/search',{query:'artificial intelligence'});
  ck('search 200 success', r.status===200 && r.json.success===true, r.json && {s:r.json.success,e:r.json.error});
  const arts = r.json.articles || r.json.data?.articles || r.json.results;
  ck('real articles returned', Array.isArray(arts) && arts.length>0, {keys:Object.keys(r.json||{})});
  ck('article has real title+url', !!(arts && arts[0] && (arts[0].title) && (arts[0].url||arts[0].link)), arts && arts[0]);
  r=await post('/news-search/search',{});
  ck('missing query → 400', r.status===400, r.status);

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  srv.close(); process.exit(fail?1:0);
});
