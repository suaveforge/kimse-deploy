const {chromium}=require(process.env.RUNNER_TEMP+'/kh-preview/node_modules/playwright');
const fs=require('fs');
(async()=>{
const browser=await chromium.launch({headless:true});
fs.mkdirSync('qa-artifacts/home-preview',{recursive:true});
for(const w of [375,1440]){
const page=await browser.newPage({viewport:{width:w,height:900}});
await page.addInitScript(()=>{localStorage.setItem('kimse.p0.state',JSON.stringify({
version:14,account:{name:'김노인',email:'preview@example.invalid'},intent:'both',self:true,care:true,mode:'self',
onboarding:{profileDone:true,initialDone:true,consentDone:true,completed:true},
initial:{step:5,completedAt:'2026-10-01T12:00:00Z',answers:{},voiceSamples:[]},
baseline:{startedAt:new Date(Date.now()-1.73*86400000).toISOString()},
caregivers:[],consents:{service:true,privacy:true,health:true,caregiverShare:false},
a11y:{largeText:false,highContrast:false,largeTouchTargets:false}
}));});
await page.goto('http://127.0.0.1:4173/#/home',{waitUntil:'domcontentloaded'});
await page.locator('.screen-home .kh-home-grid').waitFor({timeout:20000});
await page.waitForTimeout(300);
await page.screenshot({path:'qa-artifacts/home-preview/home-'+w+'.png',fullPage:true});
await page.close();
}
await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
