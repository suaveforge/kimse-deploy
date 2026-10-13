const {chromium}=require(process.env.RUNNER_TEMP+'/kh-preview/node_modules/playwright');
const fs=require('fs');
(async()=>{
const browser=await chromium.launch({headless:true});
fs.mkdirSync('qa-artifacts/home-preview',{recursive:true});
for(const w of [375,1440]){
const page=await browser.newPage({viewport:{width:w,height:900}});
await page.goto('http://127.0.0.1:4173/#/home');
await page.screenshot({path:'qa-artifacts/home-preview/home-'+w+'.png',fullPage:true});
await page.close();
}
await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
