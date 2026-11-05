// Re-encode generated source images for delivery; no body retouching or alpha removal.
import {chromium} from 'playwright';
import {readFileSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),args:['--no-sandbox']});const page=await browser.newPage();
try{for(const name of ['ballroom','principals','guests','fabric']){const uri='data:image/png;base64,'+readFileSync(`design/source/${name}.png`).toString('base64');const encoded=await page.evaluate(async uri=>{const im=new Image();im.src=uri;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);return c.toDataURL('image/webp',.9).split(',')[1]},uri);writeFileSync(`public/assets/wedding/${name}.webp`,Buffer.from(encoded,'base64'));console.log('Encoded',name)}}finally{await browser.close()}
