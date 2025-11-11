const fs = require('fs');
const puppeteer = require('puppeteer');
(async ()=>{
  const outLog = [];
  try{
    const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(20000);

    page.on('console', msg => {
      try{
        const args = msg.args().map(a=>a._remoteObject && a._remoteObject.value !== undefined ? a._remoteObject.value : a.toString());
        outLog.push({type:'console',level:msg.type(),text:msg.text(),args});
      }catch(e){ outLog.push({type:'console',level:msg.type(),text:msg.text()}); }
    });
    page.on('pageerror', err => outLog.push({type:'pageerror',error:err && err.stack ? err.stack : String(err)}));
    page.on('requestfailed', req => outLog.push({type:'requestfailed',url:req.url(),method:req.method(),failure: req.failure() && req.failure().errorText}));
    page.on('response', res => {
      const st = res.status();
      if(st >= 400){ outLog.push({type:'badresponse',url:res.url(),status:st,ok:res.ok()}); }
    });

    const target = process.env.SITE_URL || 'http://localhost:8000';
    outLog.push({type:'info',text:`navigating to ${target}`});
    await page.goto(target, {waitUntil:'networkidle2'});
    // wait a bit more for async scripts
    await page.waitForTimeout(1500);
    // take screenshot
    const ssPath = 'site/debug_screenshot.png';
    await page.screenshot({path:ssPath, fullPage:true});
    outLog.push({type:'info',text:`screenshot saved to ${ssPath}`});

    // collect some DOM info
    const domInfo = await page.evaluate(()=>{
      return {
        title: document.title,
        bodyLength: document.body ? document.body.innerText.length : 0,
        numImages: document.images ? document.images.length : 0,
        numScripts: Array.from(document.scripts).map(s=>s.src||'(inline)')
      };
    });
    outLog.push({type:'dom',info:domInfo});

    await browser.close();
  }catch(e){
    outLog.push({type:'fatal',error: e && e.stack ? e.stack : String(e)});
  }
  fs.writeFileSync('site/puppeteer_log.json', JSON.stringify(outLog, null, 2), 'utf8');
  console.log('done; wrote site/puppeteer_log.json');
})();
