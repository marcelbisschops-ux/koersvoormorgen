// Release-regressie: een laat documentantwoord tekent in het huidige blok van dezelfde sessie.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const src=fs.readFileSync(new URL('../mna/06-schermen.js',import.meta.url),'utf8');
const start=src.indexOf('(function laadMijnOvereenkomsten(){'),end=src.indexOf('})();',start)+5;
assert(start>0&&end>start);
const block=src.slice(start,end);
const tick=()=>new Promise(r=>setImmediate(r));
const dom=()=>({innerHTML:'',querySelectorAll:()=>[]});
async function proef(wissel){
 let resolve;let current=dom();const old=current;
 const ctx={S:{code:'K_SYNTH'},WORKER:'https://synthetisch.invalid',encodeURIComponent,isKoper:()=>true,
 ge:()=>current,esc:s=>String(s),fetchMetTimeout:()=>new Promise(r=>{resolve=r})};
 vm.createContext(ctx);vm.runInContext(block,ctx);current=dom();
 if(wissel==='nieuw-zelfde')ctx.S={code:'K_SYNTH'};
 else if(wissel==='code')ctx.S.code='K_ANDER';
 else if(wissel)ctx.S={code:'K_ANDER'};
 resolve({json:async()=>({ok:true,documenten:[{profiel:'NDA@1',status:'verstuurd'},{profiel:'LOI@1',status:'goedgekeurd'}]})});
 await tick();await tick();
 assert.equal(old.innerHTML,'','oud, losgeraakt element blijft ongemoeid');
 if(wissel)assert.equal(current.innerHTML,'','antwoord andere sessie wordt genegeerd');
 else {assert(current.innerHTML.includes('Geheimhoudingsovereenkomst'));assert(current.innerHTML.includes('Letter of Intent'));assert.equal((current.innerHTML.match(/class="mo-rij"/g)||[]).length,2)}
}
await proef(false);await proef(true);await proef('nieuw-zelfde');await proef('code');
console.log('KVM009 async dashboard: 4 scenario’s PASS (huidig blok en sessiewissel).');
