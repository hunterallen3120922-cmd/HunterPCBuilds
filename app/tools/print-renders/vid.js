const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:800,height:600}}); p.on('pageerror',e=>console.log(e.message));
await p.goto('http://localhost:8765/index.html?w=800&h=600&bg=0f1621'); await p.waitForFunction(()=>window.ready);
await p.evaluate(()=>window.setupPrinting()); const T=await p.evaluate(()=>window.PER_TOTAL); const fps=24, n=Math.round(T*fps);
for(let i=0;i<n;i++){const d=await p.evaluate(t=>window.printFrame(t),i/fps); fs.writeFileSync(`frames/f${String(i).padStart(4,'0')}.jpg`,Buffer.from(d.split(',')[1],'base64'));}
console.log('frames',n); await b.close();})();
