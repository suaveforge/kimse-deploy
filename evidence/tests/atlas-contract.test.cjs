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
    'FOI_FORM_APPROVED_NOT_SUBMITTED','FIRST_CONTACT_ROUTE_VERIFIED_UNSENT','INFORMATION_REQUEST_SENT',
    'AUTOMATED_ACK_ONLY','FORMAL_FOI_REGISTERED',
    'RESEARCH_METHODS_RESPONSE_RECEIVED'].includes(v.stage),'only approved, evidence-based outreach stages');
  assert.ok(v.progress && [0,1,2].includes(v.progress.phase),'P0/P1/P2 evidence phase required');
  assert.equal(v.progress.cooperation,'NONE','no invented collaboration or endorsement');
  assert.equal(v.progress.commercialDiscussion,'NOT_STARTED','FOI is not a commercial conversation');
  assert.equal(v.progress.procurementEvidenceVerified,false,'do not imply proven procurement from FOI registration');
  assert.equal(v.progress.requestSent,v.progress.contactStatus!=='IDENTIFIED_NOT_CONTACTED','outbound transport and stage parity');
  if(v.progress.formSubmitted){
    assert.equal(v.progress.requestSent,true,'submitted FOI form has sent status');
    assert.equal(v.progress.phase,1,'submitted form moves to phase 1');
    assert.match(v.progress.submissionProof,/^https:\/\/agent\.tinyfish\.ai\/runs\//,'successful submission has traceable browser run');
  }
  if(v.progress.approvedWebFormNotSubmitted){
    assert.equal(v.stage,'FOI_FORM_APPROVED_NOT_SUBMITTED','approved forms remain pending P0');
    assert.match(v.progress.formURL,/^https:\/\//,'pending form must link official HTTPS route');
    assert.equal(v.progress.requestSent,false,'approval does not equal sending');
  }
  if(v.stage==='FIRST_CONTACT_ROUTE_VERIFIED_UNSENT'){
    assert.equal(v.progress.phase,0,'verified initial-contact route must remain stage zero');
    assert.equal(v.progress.requestSent,false,'verified first contact does not mean sent');
    assert.equal(v.progress.formSubmitted,false,'verified first contact is not a form submission');
    assert.match(v.progress.contactRouteURL,/^https:\/\//,'verified first enquiry links official route');
  }
  if(v.stage==='FORMAL_FOI_REGISTERED')assert.ok(v.progress.formalFOIRef,'official reference only when verified');
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
assert.equal(data.institutions.filter(x=>x.progress.requestSent).length,data.contacts.outreachSent,'transport-confirmed outreach counts match verified delivery ledger');
assert.equal(data.institutions.filter(x=>x.stage==='FORMAL_FOI_REGISTERED').length,data.contacts.formalFOIRegistered,'official FOI references equal verified receive count');
assert.equal(data.institutions.filter(x=>x.stage==='AUTOMATED_ACK_ONLY').length,2,'automatic replies');
assert.equal(data.institutions.filter(x=>x.stage==='INFORMATION_REQUEST_SENT').length,data.contacts.outreachSent-data.contacts.formalFOIRegistered-data.contacts.automatedAckOnly-data.contacts.researchMethodsReply,'sent and waiting derived from actual transport evidence');
assert.equal(data.institutions.filter(x=>x.stage==='RESEARCH_METHODS_RESPONSE_RECEIVED').length,1,'methodology-only reply');
assert.equal(data.institutions.filter(x=>x.stage==='FOI_FORM_APPROVED_NOT_SUBMITTED').length,4,'approved and still not submitted');
assert.equal(data.institutions.filter(x=>x.progress.contactStatus==='IDENTIFIED_NOT_CONTACTED').length,61,'uncontacted total');
assert.equal(data.institutions.filter(x=>x.progress.formalFOIRef).length,data.contacts.formalFOIRegistered,'verifiable formal references match live acknowledgement ledger');
const routeReady=data.institutions.filter(x=>x.stage==='FIRST_CONTACT_ROUTE_VERIFIED_UNSENT');
assert.equal(routeReady.length,data.routeReview20261013.verifiedFirstEnquiryUnsent,'official first-enquiry P0 routing count must match evidence-backed review');
assert.ok(routeReady.every(x=>x.progress.phase===0 && !x.progress.requestSent && x.progress.sendApproved===false),'routing review must not advance outreach or sending');
assert.equal(data.institutions.filter(x=>x.progress.formSubmitted).length,5,'five web form submissions with proof');
for(const [id,reference] of Object.entries({hackney_council:'50807786',southampton_city_council:'98N5UZS4U',newham_council:'FOIEIR-2026-004173',cambridgeshire_county_council:'CCC882925672'})){
 const x=data.institutions.find(y=>y.id===id);
 assert.ok(x && x.progress.formSubmitted,'known submitted form must be registered: '+id);
 assert.equal(x.progress.formalFOIRef,reference,'official reference: '+id);
}
for(const [id,reference] of Object.entries({hillingdon_council:'FOI 06272',manchester_city_council:'FOI/21992'})){
 const x=data.institutions.find(y=>y.id===id);
 assert.ok(x && x.progress.requestSent && !x.progress.formSubmitted,'email FOI receipt must not be counted as a web form: '+id);
 assert.equal(x.progress.formalFOIRef,reference,'verified official email FOI reference: '+id);
}
const shropshire=data.institutions.find(x=>x.id==='shropshire_council');
assert.equal(shropshire.progress.formSubmitted,true,'Shropshire form confirmation received');
assert.equal(shropshire.progress.formalFOIRef,null,'Shropshire formal reference awaits email');
assert.equal(data.contacts.procurementSpendEvidence,0,'FOI references are not actual spend documents');
assert.equal(data.contacts.mutualCollaboration,0,'no partnership has been agreed');
assert.equal(data.progressStages.reduce((s,x)=>s+x.count,0),92,'all stages accounted for');
assert.ok(!JSON.stringify(data).match(/(?:programmer119@gmail\.com|gmailMessageId|sentGmailMessageId)/i),'no private outbound-identifying data in public JSON');
assert.equal(data.institutions.filter(x=>x.cityCoordinate).length,62);
new vm.Script(mapJs,{filename:'rd-world-map.js'});
new vm.Script(appJs,{filename:'evidence-application-tabs.js'});
assert.match(mapJs,/centerMapViewport/,'mobile viewport focus safeguard');
assert.match(mapJs,/countryTextFallback/,'country picker works if map topology unavailable');
assert.match(mapJs,/setSelected/);
assert.match(mapJs,/renderPins/);
assert.match(mapJs,/schemaVersion|rd-world-map-data\.json/);
assert.match(mapJs,/renderProgress/,'institution phase table renders');
assert.match(mapJs,/kimse-progress-rows/,'institution phase table DOM exists');
assert.match(mapJs,/kimse-progress-overview/,'phase counts with clickable filters');
assert.match(style,/@media\(max-width:700px\)/);
for(const local of ['rd-world-map.js','rd-world-map.css','evidence-application-tabs.js']){
  assert.ok(html.includes('./'+local+'?v='),'HTML links '+local);
}
assert.ok(html.includes('d3@7.9.0') && html.includes('topojson-client@3.1.0'),'map dependencies');
console.log('PASS: 249 territories · 24 selected markets · '+data.total+' institutions · '+data.contacts.outreachSent+' contacted · '+data.contacts.formalFOIRegistered+' registered FOI · '+data.contacts.approvedFOIFormNotSubmitted+' approved unsubmitted forms · 0 contracts · JS/CSS/HTML contract');
