import puppeteer from 'puppeteer-core';
const OUT='/workspace/ankush-portfolio/shots/', URL='http://localhost:8765/index.html';
const browser = await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const results={};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for (const [name,vp] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2}]]) {
  const page = await browser.newPage(); await page.setViewport(vp);
  const errs=[], warns=[], failed=[];
  page.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); if(m.type()==='warning') warns.push(m.text()); });
  page.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
  page.on('requestfailed',r=>{ const u=r.url(); if(!/\.mp4/.test(u)) failed.push(u+' '+r.failure()?.errorText); });
  await page.goto(URL,{waitUntil:'networkidle2',timeout:60000});
  await sleep(1200);
  await page.screenshot({path:OUT+`${name}-00-splash.png`});
  await page.waitForFunction(()=>document.body.classList.contains('is-ready'),{timeout:15000});
  await sleep(3200);
  const r={};
  r.heroVideo = await page.evaluate(()=>{const v=document.getElementById('heroVideo');return {playing:!v.paused,readyState:v.readyState,t:v.currentTime.toFixed(2)}});
  r.stats = await page.$$eval('[data-count]',e=>e.map(x=>x.textContent));
  await page.screenshot({path:OUT+`${name}-01-hero.png`});
  // work section: scroll into sticky
  const workTop = await page.evaluate(()=>document.getElementById('work').offsetTop);
  for (const [lbl,off] of [['start',0],['mid',0.5],['end',1]]) {
    await page.evaluate((t,f)=>{const w=document.getElementById('work');window.scrollTo(0,t+(w.offsetHeight-innerHeight)*f)},workTop,off);
    await sleep(1500);
    r['headline_'+lbl] = await page.evaluate(()=>{const h=document.getElementById('workHeadline').getBoundingClientRect();return {dx:+((h.left+h.width/2)-innerWidth/2).toFixed(2),dy:+((h.top+h.height/2)-innerHeight/2).toFixed(2),w:Math.round(h.width),h:Math.round(h.height),spansVisible:[...document.querySelectorAll('#workHeadline > span')].map(s=>getComputedStyle(s).opacity).join(',')}});
    if(lbl==='start') await page.screenshot({path:OUT+`${name}-02-sphere.png`});
  }
  r.dolly = await page.evaluate(()=>{const c=window.__portfolio.cards[0].el.style.transform;return c});
  // drag
  const before = await page.evaluate(()=>window.__portfolio.cards[3].el.style.transform);
  const cx=vp.width/2, cy=vp.height*0.3;
  await page.mouse.move(cx-150,cy); await page.mouse.down(); for(let i=0;i<10;i++){await page.mouse.move(cx-150+i*30,cy+i*3);await sleep(16);} await page.mouse.up();
  const after = await page.evaluate(()=>window.__portfolio.cards[3].el.style.transform);
  r.dragChanged = before!==after;
  await sleep(800);
  await page.evaluate((t)=>window.scrollTo(0,t),workTop); await sleep(600);
  // click frontmost card
  const front = await page.evaluate(()=>{let b=null,bz=-1;for(const c of window.__portfolio.cards){const z=+c.el.style.zIndex;const r=c.el.getBoundingClientRect();if(z>bz&&r.top>120&&r.bottom<innerHeight-120){bz=z;b=r;}}return b&&{x:b.left+b.width/2,y:b.top+b.height/2}});
  if(front){ await page.mouse.click(front.x,front.y); await sleep(1300);
    r.lightboxFromSphere = await page.evaluate(()=>({open:document.getElementById('lightbox').classList.contains('is-shown'),title:document.getElementById('lbTitle').textContent}));
    await page.screenshot({path:OUT+`${name}-03-lightbox-sphere.png`});
    await page.keyboard.press('Escape'); await sleep(900);
  }
  // grid
  await page.click('#gridToggle'); await sleep(1500);
  r.grid = await page.evaluate(()=>({open:document.getElementById('grid').classList.contains('is-open'),items:document.querySelectorAll('.grid-item').length}));
  await page.screenshot({path:OUT+`${name}-04-grid.png`});
  await page.click('.grid-item:nth-child(8)'); await sleep(1400);
  r.lightboxFromGrid = await page.evaluate(()=>({open:document.getElementById('lightbox').classList.contains('is-shown'),title:document.getElementById('lbTitle').textContent,count:document.getElementById('lbCount').textContent}));
  await page.screenshot({path:OUT+`${name}-05-lightbox-grid.png`});
  await page.click('#lbNext'); await sleep(800);
  r.lbNext = await page.evaluate(()=>document.getElementById('lbTitle').textContent);
  await page.keyboard.press('Escape'); await sleep(900); await page.keyboard.press('Escape'); await sleep(700);
  r.gridClosed = await page.evaluate(()=>!document.getElementById('grid').classList.contains('is-open'));
  // about
  await page.evaluate(()=>document.getElementById('about').scrollIntoView()); await sleep(1300);
  await page.screenshot({path:OUT+`${name}-06-about.png`});
  // services
  await page.evaluate(()=>document.getElementById('services').scrollIntoView()); await sleep(9000);
  r.spline = await page.evaluate(()=>{const s=document.getElementById('services');const v=document.querySelector('spline-viewer');return {webgl:s.dataset.webgl,state:s.dataset.spline,viewer:!!v,fuOpacity:getComputedStyle(document.querySelector('.services .fu')).opacity}});
  await page.screenshot({path:OUT+`${name}-07-services-spline.png`});
  // contact / atelier
  await page.evaluate(()=>document.getElementById('contact').scrollIntoView()); await sleep(3500);
  r.atelier = await page.evaluate(()=>{const h=document.getElementById('atHead');const W=h.clientWidth-parseFloat(getComputedStyle(h).paddingLeft)*2;return {inClass:document.getElementById('contact').classList.contains('in'),font:document.fonts.check('700 40px "AU Grotesk"'),lineWidths:[...h.querySelectorAll(".fit")].map(s=>Math.round(s.getBoundingClientRect().width+parseFloat(s.style.marginRight||0))),fontSize:h.querySelector(".fit").style.fontSize,headBottom:Math.round(h.getBoundingClientRect().bottom),sectionH:Math.round(document.getElementById("contact").offsetHeight),target:Math.round(W),video:(()=>{const v=document.getElementById('atVideo');return {playing:!v.paused,rs:v.readyState}})()}});
  await page.screenshot({path:OUT+`${name}-08-contact-atelier.png`});
  // menu
  await page.click('#burger'); await sleep(1400);
  r.menu = await page.evaluate(()=>({open:document.documentElement.classList.contains('menu-open'),links:[...document.querySelectorAll('.menu li a')].map(a=>a.textContent.replace(/\d+/,'').trim())}));
  await page.screenshot({path:OUT+`${name}-09-menu.png`});
  await page.click('.menu a[data-open-grid]'); await sleep(1200);
  r.menuWorkOpensGrid = await page.evaluate(()=>document.getElementById('grid').classList.contains('is-open') && !document.documentElement.classList.contains('menu-open'));
  r.fonts = await page.evaluate(()=>['20px "Instrument Serif"','400 20px Sora','20px "BubbledotICG-FinePos"','700 20px "AU Grotesk"'].map(f=>f+':'+document.fonts.check(f)));
  r.overflowX = await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  r.consoleErrors=errs; r.failedRequests=failed; r.warnings=warns.slice(0,5);
  results[name]=r; await page.close();
}
// reduced motion
const p=await browser.newPage(); await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]); await p.setViewport({width:1440,height:900});
const e2=[]; p.on('pageerror',e=>e2.push(e.message)); p.on('console',m=>m.type()==='error'&&e2.push(m.text()));
await p.goto(URL,{waitUntil:'networkidle2'}); await sleep(1500);
results.reduced = await p.evaluate(()=>({ready:document.body.classList.contains('is-ready'),h1:getComputedStyle(document.querySelector('.hero h1')).opacity}));
results.reduced.errors=e2;
await browser.close();
console.log(JSON.stringify(results,null,1));
