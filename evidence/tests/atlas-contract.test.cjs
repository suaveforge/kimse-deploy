/* KIMSE Global Atlas: offline structural acceptance test. No secrets/network. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root=require('node:path').resolve(__dirname,'..');
const read=f=>fs.readFileSync(require('node:path').join(root,f),'utf8');
const data=JSON.parse(read('rd-world-map-data.json'));
const html=read('rd.html');
const mapJs=read('rd-world-map.js');
const appJs=read('evidence-application-tabs.js');
const style=read('rd-world-map.css');
assert.equal(data.total,92,'current source sample count');
assert.equal(data.institutions.length,data.total,'map data matches total');
assert.equal(data.iso31661Master.length,249,'ISO 3166-1 master includes 249 codes');
assert.equal(new Set(data.iso31661Master.map(x=>x.alpha2)).size,249,'ISO alpha codes unique');
assert.equal(new Set(data.iso31661Master.map(x=>x.numeric)).size,249,'ISO numeric codes unique');
assert.equal(new Set(data.institutions.map(x=>x.id)).size,data.total,'unique institution ids');
assert.equal(new Set(data.institutions.map(x=>x.countryCode)).size,24,'24 already-researched markets');
assert.equal(data.untouchedCountryAreaCount,225,'225 unresearched master areas');
const byCode={};
for(const v of data.institutions){
  assert.match(v.countryCode,/^[A-Z]{2}$/);
  assert.match(v.countryNumeric,/^\d{3}$/);
  assert.ok(['A','B','C'].includes(v.authorityTier));
  assert.ok(['CANDIDATE_REVIEW_SCHEDULED','CANDIDATE_FIT_PRELIMINARY',
    'INFORMATION_REQUEST_SENT','INFORMATION_REQUEST_REGISTERED',
    'INFORMATION_REQUEST_ACKNOWLEDGED'].includes(v.stage),'no invented collaboration status');
  assert.ok(!Object.keys(v).some(k=>/email|gmail|password|auth_token/i.test(k)),'public fields must not include message IDs/emails');
  if(v.sourceURL)assert.match(v.sourceURL,/^https:\/\/\S+$/);
  if(v.cityCoordinate){
    assert.equal(v.cityCoordinate.length,2);
    const [lon,lat]=v.cityCoordinate;
    assert.ok(Number.isFinite(lon)&&lon>=-180&&lon<=180);
    assert.ok(Number.isFinite(lat)&&lat>=-90&&lat<=90);
    assert.equal(v.positionAccuracy,'CITY_CENTER_REFERENCE_NOT_BUILDING');
  }
  byCode[v.countryCode]=(byCode[v.countryCode]||0)+1;
}
assert.equal(byCode.GB,39);
assert.equal(byCode.US,10);
assert.equal(data.institutions.filter(x=>/^INFORMATION_REQUEST_/.test(x.stage)).length,3);
assert.equal(data.institutions.filter(x=>x.cityCoordinate).length,62);
new vm.Script(mapJs,{filename:'rd-world-map.js'});
new vm.Script(appJs,{filename:'evidence-application-tabs.js'});
assert.match(mapJs,/centerMapViewport/,'mobile viewport focus safeguard');
assert.match(mapJs,/countryTextFallback/,'country picker works if map topology unavailable');
assert.match(mapJs,/setSelected/);
assert.match(mapJs,/renderPins/);
assert.match(mapJs,/schemaVersion|rd-world-map-data\.json/);
assert.match(style,/@media\(max-width:700px\)/);
for(const local of ['rd-world-map.js','rd-world-map.css','evidence-application-tabs.js']){
  assert.ok(html.includes('./'+local+'?v='),'HTML links '+local);
}
assert.ok(html.includes('d3@7.9.0') && html.includes('topojson-client@3.1.0'),'map dependencies');
console.log('PASS: 249 countries/territories · 24 with institutions · 92 records · 62 city pins · 3 FOI requests · JS/CSS/HTML contract');
