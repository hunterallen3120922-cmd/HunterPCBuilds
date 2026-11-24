const { chromium } = require('playwright'); const fs=require('fs');
const items=process.argv.slice(2);
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const it of items){const p=await b.newPage({viewport:{width:1200,height:900}});
 p.on('console',m=>m.type()==='error'&&console.log(it,m.text())); p.on('pageerror',e=>console.log(it,e.message));
 await p.goto('http://localhost:8765/index.html?w=1200&h=900'); await p.waitForFunction(()=>window.ready);
 const d=await p.evaluate(n=>window.renderItem(n),it); fs.writeFileSync(`out-${it}.png`,Buffer.from(d.split(',')[1],'base64')); await p.close(); console.log('ok',it);}
await b.close();})();
