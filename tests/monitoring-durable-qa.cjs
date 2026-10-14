'use strict';
const {chromium}=require(process.env.RUNNER_TEMP+'/kimse-qa/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 const ctx=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'block'});
 const page=await ctx.newPage();
 await page.goto('http://127.0.0.1:4173/#/start',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.KIMSE_SIGNAL_JOURNAL,{timeout:15000});
 await ctx.setOffline(true);
 const first=await page.evaluate(async()=>{
  const j=window.KIMSE_SIGNAL_JOURNAL;
  const events=Array.from({length:450},(_,i)=>({
    client_event_id:'qa-journal-20261014-'+String(i).padStart(5,'0'),
    source:'qa_synthetic',metric:'steps',value:i,unit:'count',
    observed_at:new Date(Date.UTC(2026,9,14,0,0,i)).toISOString(),
    metadata:{local_day:'2026-10-14',test_record:true}
  }));
  const writes=await Promise.all(events.map(e=>j.enqueue(e)));
  const before=await j.pending(100,[]),migration=await j.migrate(events.slice(0,75));
  const ack=await j.acknowledge(before.map(x=>x.client_event_id));
  return {writes:writes.every(Boolean),n:before.length,first:before[0]?.client_event_id,last:before.at(-1)?.client_event_id,migration,ack};
 });
 assert(first.writes,'IndexedDB write failed');
 assert.equal(first.n,100);
 assert.equal(first.first,'qa-journal-20261014-00000');
 assert.equal(first.last,'qa-journal-20261014-00099');
 assert(first.migration&&first.ack,'migration or ack failed');
 await ctx.setOffline(false);
 await page.reload({waitUntil:'domcontentloaded'});
 const second=await page.evaluate(async()=>{
   const j=window.KIMSE_SIGNAL_JOURNAL;
   const remaining=[];for(let i=0;i<5;i++){let batch=await j.pending(100,[]);remaining.push(...batch);if(!batch.length)break;await j.acknowledge(batch.map(e=>e.client_event_id))}
   return {n:remaining.length,first:remaining[0]?.client_event_id,last:remaining.at(-1)?.client_event_id,now:(await j.pending(100,[])).length};
 });
 assert.equal(second.n,350,'Offline journal must survive reload and retain 350 records');
 assert.equal(second.first,'qa-journal-20261014-00100');
 assert.equal(second.last,'qa-journal-20261014-00449');
 assert.equal(second.now,0);
 console.log('KIMSE_OFFLINE_JOURNAL_PASS persisted=450 before_ack=100 after_reload=350 after_final_ack=0');
 await page.goto('http://127.0.0.1:4173/#/collection-status',{waitUntil:'domcontentloaded'});
 const ui=await page.locator('body').innerText();
 assert(!ui.includes('📱 낌새 사용\n수집 중'),'Do not claim collection merely from consent');
 console.log('KIMSE_COLLECTION_LABEL_QA_PASS');
 await ctx.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});