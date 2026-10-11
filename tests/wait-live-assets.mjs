import fs from 'node:fs';
import crypto from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
// Compare deployed files byte-for-byte with checkout; report stale assets.
const profiles={
  premium:['service-worker.js','premium-ux.js','premium-ux.css','govtech-p0.js','govtech-p0.css'],
  accessibility:['service-worker.js','accessibility-enhancements.js','accessibility-enhancements.css','premium-ux.js','premium-ux.css','govtech-p0.js','govtech-p0.css'],
  govtech:['service-worker.js','govtech-p0.js','govtech-p0.css','premium-ux.css'],
  submission:['service-worker.js','accessibility-enhancements.css','accessibility-enhancements.js','premium-ux.css','premium-ux.js','govtech-p0.js','govtech-p0.css'],
  capture:['service-worker.js','app.js','capture-polish.css','accessibility-enhancements.css','accessibility-enhancements.js','premium-ux.css','premium-ux.js','govtech-p0.css','govtech-p0.js']
};
const group=process.argv[2],files=profiles[group];
if(!files)throw new Error('Unknown QA group: '+String(group));
const expected=Object.fromEntries(files.map(file=>[file,fs.readFileSync(file)]));
const checksum=data=>crypto.createHash('sha256').update(data).digest('hex').slice(0,12);
for(let attempt=1;attempt<=50;attempt++){
  const results=await Promise.all(files.map(async file=>{
    try{
      const url=new URL(file,'https://kimse.suaveforge.com/');
      url.searchParams.set('ci',String(process.env.GITHUB_SHA||'qa'));
      url.searchParams.set('try',String(attempt));
      const r=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{'Cache-Control':'no-cache'}});
      if(!r.ok)return {file,error:'HTTP '+r.status};
      const live=Buffer.from(await r.arrayBuffer());
      return live.equals(expected[file])?{file,ok:true}:{file,error:'sha256 expected '+checksum(expected[file])+' got '+checksum(live)};
    }catch(e){return {file,error:String(e?.message||e)}}
  }));
  const failures=results.filter(x=>!x.ok);
  if(!failures.length){console.log('KIMSE_LIVE_ASSETS_MATCH=PASS '+group+' '+files.length+' files');break}
  if(attempt%5===0||attempt===1||attempt===50)console.log('KIMSE_LIVE_ASSETS_WAIT '+attempt+'/50 '+JSON.stringify(failures));
  if(attempt===50)throw new Error('KIMSE_LIVE_ASSETS_MATCH=FAIL '+JSON.stringify(failures));
  await sleep(4000);
}
