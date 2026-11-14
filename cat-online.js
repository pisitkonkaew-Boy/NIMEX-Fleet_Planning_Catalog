/* NIMEX Fleet Planning Catalog — online mode.
   Cars and photos come from NIMEX Car Inspection Monthly (Google Sheet + Drive via Apps Script, window.FPC_API).
   Viewers see only what the admin allows (hidden items are never sent to them).
   Admin opens the page with #admin and the ADMIN_KEY of the inspection system: sees everything and edits. */
(function(){'use strict';
var API=window.FPC_API||'';if(!API)return;
var TYMAP={'040':'AB','042':'CC'};
var GR=[['p4','รูปรถ 4 ด้าน'],['eng','รูปห้องเครื่อง / แบต / หน้าปัด'],['tyre','รูปยาง / ปียาง / ยางอะไหล่'],['cab','รูปห้องโดยสาร / ตู้ / ม่าน / กล้องหน้า'],['dmg','รูปจุดที่ผิดปกติ'],['year','ปีรถ'],['price','ราคา']];
var DEF={p4:1,eng:0,tyre:0,cab:0,dmg:0,year:0,price:0};
var GKEYS={p4:['front','back','left','right'],eng:['engine','battery','odo'],tyre:['tFL','tFR','tRL','tRR','dFL','dFR','dRL','dRR','spare'],cab:['cabin','boxF','boxB','curtain','dashcam'],dmg:['damage']};
var NM={front:'ด้านหน้า',back:'ด้านหลัง',left:'ด้านซ้าย',right:'ด้านขวา',engine:'ห้องเครื่อง',battery:'แบตเตอรี่',odo:'หน้าปัดเลขไมล์',tFL:'ยางหน้าซ้าย',tFR:'ยางหน้าขวา',tRL:'ยางหลังซ้าย',tRR:'ยางหลังขวา',dFL:'ปียาง หน้าซ้าย',dFR:'ปียาง หน้าขวา',dRL:'ปียาง หลังซ้าย',dRR:'ปียาง หลังขวา',spare:'ยางอะไหล่',cabin:'ห้องโดยสาร',boxF:'ภายในตู้ ด้านหน้า',boxB:'ภายในตู้ ด้านหลัง',curtain:'ม่านความเย็น',dashcam:'กล้องหน้ารถ',damage:'จุดที่ผิดปกติ'};
var COL={1:'front',2:'back',3:'left',4:'right'};
var CK={headlight:'ไฟหน้า',taillight:'ไฟท้าย / ไฟเบรก',signal:'ไฟเลี้ยว / ไฟฉุกเฉิน',brake:'เบรก',handbrake:'เบรกมือ',ac:'แอร์ห้องโดยสาร',horn:'แตร',wiper:'ที่ปัดน้ำฝน',mirror:'กระจก / กระจกมองข้าง',belt:'เข็มขัดนิรภัย',fluid:'น้ำมันเครื่อง / น้ำหล่อเย็น',dash:'ไฟเตือนหน้าปัด',door:'ประตูตู้ / ซีลยาง / กุญแจ',reefer:'ตู้เย็น',curtain:'ม่านความเย็น',dashcam:'กล้องหน้ารถ'};
var TYL=[['FL','หน้าซ้าย'],['FR','หน้าขวา'],['RL','หลังซ้าย'],['RR','หลังขวา']];
var THM=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'],MAXY=5;
var ADMIN=false,KEY=null,RAW={carx:{}},SET={glob:{},per:{}};

function th(id,sz){return'https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w'+(sz||800)}
function h(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function ml(m){var p=String(m||'').split('-');return p.length===2?THM[+p[1]-1]+' '+(+p[0]+543):m}
function grpOf(k){for(var g in GKEYS)for(var i=0;i<GKEYS[g].length;i++)if(k.indexOf(GKEYS[g][i])===0)return g;return null}
function nameOf(k){var m=k.match(/^(damage)(\d+)$/);return m?NM.damage+' '+m[2]:(NM[k]||k)}
function tyreAge(s){s=String(s||'');if(!/^\d{4}$/.test(s))return null;var wk=+s.slice(0,2),yr=2000+(+s.slice(2));if(wk<1||wk>53)return null;var a=(Date.now()-new Date(yr,0,1+(wk-1)*7))/31557600000;return a<0?null:a}
function vis(pl,k){var p=SET.per[pl]||{};if(k in p)return!!p[k];return k in SET.glob?!!SET.glob[k]:!!DEF[k]}
async function post(b){var r=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({},b,{key:KEY,who:'Fleet Catalog'}))});var j=await r.json();if(!j.ok){var e=new Error(j.error||'failed');e.code=j.error;throw e}return j}

/* ---------- styles (NIMEX kit tokens of this page) ---------- */
var css=document.createElement('style');css.textContent=
'.fpc-view .hbtn.pri,.fpc-view .edit-btn,.fpc-view .ph-ov,.fpc-view .det-empty-sub,.fpc-on .hbtn.pri{display:none!important}'+
'.fpx-sec{background:var(--sf);border:1px solid var(--ln);border-radius:14px;padding:14px;margin-bottom:16px;box-shadow:var(--sh)}'+
'.fpx-h{display:flex;align-items:center;gap:8px;justify-content:space-between;flex-wrap:wrap;margin-bottom:10px;font-weight:600;color:var(--t1);font-size:14px}'+
'.fpx-h:before{content:"";width:4px;height:18px;border-radius:2px;background:var(--gold-l);margin-right:2px}.fpx-h span:first-child{flex:1}'+
'.fpx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}'+
'.fpx-ph{position:relative;border:0;padding:0;border-radius:10px;overflow:hidden;aspect-ratio:4/3;background:var(--sf3) center/cover no-repeat;cursor:zoom-in}'+
'.fpx-ph span{position:absolute;left:0;right:0;bottom:0;padding:14px 8px 5px;font-size:12px;color:#fff;background:linear-gradient(transparent,rgba(6,26,61,.8));text-align:left}'+
'.fpx-b{font-size:11px;padding:2px 9px;border-radius:999px;font-weight:600}.fpx-b.pub{background:var(--br-lt);color:var(--br)}.fpx-b.adm{background:var(--ab-lt);color:var(--ab)}'+
'.fpx-dl{display:grid;grid-template-columns:auto 1fr;gap:5px 14px;font-size:13.5px;margin:0}.fpx-dl dt{color:var(--t3)}.fpx-dl dd{margin:0;color:var(--t1);font-weight:500}'+
'.fpx-bad{color:var(--rd)!important}.fpx-ok{color:var(--ok)}'+
'.fpx-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:7px 0;border-top:1px solid var(--ln);font-size:13.5px;color:var(--t1)}'+
'.fpx-seg{display:inline-flex;gap:2px;background:var(--sf2);border:1px solid var(--ln);border-radius:9px;padding:2px}'+
'.fpx-seg button{border:0;background:transparent;border-radius:7px;padding:5px 10px;font:inherit;font-size:12.5px;color:var(--t3);cursor:pointer}'+
'.fpx-seg button[aria-pressed="true"]{background:var(--navy2);color:#fff}'+
'.fpx-ov{font-size:10.5px;padding:0 7px;border-radius:999px;background:var(--ab-lt);color:var(--ab);margin-left:6px;font-weight:600}'+
'.fpx-chip{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(180deg,#f0d57a,#d4af37);color:#0a2a5e;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:600}'+
'.fpx-note{font-size:12px;color:var(--t3);margin:6px 0 0}';
document.head.appendChild(css);
document.body.classList.add('fpc-on');

/* ---------- load ---------- */
function build(d){var dcn={};(d.dcs||[]).forEach(function(x){dcn[String(x[0])]=String(x[1]).replace(/^C?DC\s*/,'')});
 RAW=d;RAW.carx=d.carx||{};
 vehicles=d.cars.map(function(c){var ph=c.ph||{},p={};for(var n in COL)if(ph[COL[n]])p[n]=th(ph[COL[n]]);
  return{plate:c.pl,dc:dcn[c.dc]||String(c.dc),type:TYMAP[c.ty]||c.ty,year:c.yr||'',price:c.pr||'',photos:p,_ph:ph,_c:c}});
 buildAll();if(document.getElementById('detView').style.display!=='none'&&window._fpxOpen)openDetail(window._fpxOpen)}
async function load(){loading(true);try{var d;
  if(ADMIN){d=await post({a:'catadmin'});SET=d.set||{};SET.glob=SET.glob||{};SET.per=SET.per||{}}
  else d=await(await fetch(API+(API.indexOf('?')<0?'?':'&')+'a=cat&t='+Date.now())).json();
  if(!d.cars)throw new Error('no data');build(d);toast('📡 ข้อมูลรถและรูปจากระบบตรวจรถ '+vehicles.length+' คัน','info')}
 catch(e){if(e.code==='denied'&&ADMIN){logout();return}toast('⚠️ โหลดข้อมูลออนไลน์ไม่ได้ ลองเปิดหน้าใหม่','err')}loading(false)}

/* ---------- viewer / admin ---------- */
function header(){var r=document.querySelector('.hdr-right');if(!r)return;var old=document.getElementById('fpxHdr');if(old)old.remove();
 var w=document.createElement('span');w.id='fpxHdr';w.style.display='contents';
 w.innerHTML=ADMIN?'<span class="fpx-chip">ผู้ดูแล</span><button class="hbtn" id="fpxSetBtn" type="button">ตั้งค่าการแสดงผล</button><button class="hbtn" id="fpxYpBtn" type="button">นำเข้าปี / ราคา</button><input type="file" id="fpxYp" accept=".xlsx,.xls,.csv" hidden><button class="hbtn" id="fpxOut" type="button">ออก</button>':'';
 r.insertBefore(w,r.firstChild);
 if(ADMIN){document.getElementById('fpxSetBtn').onclick=globalModal;document.getElementById('fpxYpBtn').onclick=function(){document.getElementById('fpxYp').click()};document.getElementById('fpxYp').onchange=importYP;document.getElementById('fpxOut').onclick=logout}}
function logout(){try{sessionStorage.removeItem('fpc-admin-key')}catch(e){}KEY=null;ADMIN=false;history.replaceState(null,'',location.pathname);document.body.classList.remove('fpc-admin');document.body.classList.add('fpc-view');header();load()}
function askKey(err){var m=document.createElement('div');m.className='modal-bg on';m.id='fpxLogin';
 m.innerHTML='<div class="modal"><div class="modal-title">ผู้ดูแลระบบ</div>'+(err?'<p style="color:var(--rd);margin:0 0 10px">'+h(err)+'</p>':'')+'<div class="fg"><label for="fpxKey">รหัสผู้ดูแล (ADMIN_KEY ของระบบตรวจรถ)</label><input class="fi" type="password" id="fpxKey" autocomplete="current-password"></div><div class="modal-actions"><button class="mbtn cancel" id="fpxNo" type="button">ดูแบบผู้ชม</button><button class="mbtn ok" id="fpxGo" type="button">เข้าสู่ระบบ</button></div></div>';
 document.body.appendChild(m);var inp=document.getElementById('fpxKey');setTimeout(function(){inp.focus()},50);
 document.getElementById('fpxNo').onclick=function(){m.remove();logout()};
 var go=async function(){KEY=inp.value.trim();if(!KEY)return;try{var j=await post({a:'auth'});if(j.role!=='admin')throw{code:'denied'};try{sessionStorage.setItem('fpc-admin-key',KEY)}catch(e){}m.remove();start(true)}catch(e){m.remove();KEY=null;askKey(e&&e.code==='denied'?'รหัสไม่ถูกต้อง':'เชื่อมต่อไม่ได้')}};
 document.getElementById('fpxGo').onclick=go;inp.onkeydown=function(e){if(e.key==='Enter')go()}}
function start(admin){ADMIN=!!admin;document.body.classList.toggle('fpc-admin',ADMIN);document.body.classList.toggle('fpc-view',!ADMIN);header();load()}

/* ---------- detail: extra photo groups + admin info ---------- */
var _bd=buildDetail;
buildDetail=function(v){window._fpxOpen=v.plate;var out=_bd(v);if(!v._c)return out;var ph=v._ph||{};
 ['p4','eng','tyre','cab','dmg'].forEach(function(g){var ks=Object.keys(ph).filter(function(k){return grpOf(k)===g});if(g==='p4'&&!ADMIN)return;if(!ks.length)return;
  if(g==='p4'&&ADMIN){out+='<div class="fpx-sec"><div class="fpx-h"><span>'+h(GR[0][1])+'</span>'+badge(v.plate,g)+'</div><p class="fpx-note">รูปด้านบนคือรูปที่ผู้ชมเห็น เปลี่ยนหรือลบรูปได้ที่รูปด้านบน รูปที่แอดมินเปลี่ยนจะใช้แทนรูปจากการตรวจ</p></div>';return}
  out+='<div class="fpx-sec"><div class="fpx-h"><span>'+h(GR.filter(function(x){return x[0]===g})[0][1])+'</span>'+(ADMIN?badge(v.plate,g):'')+'</div><div class="fpx-grid">'+ks.map(function(k){var id=ph[k];return'<button type="button" class="fpx-ph" style="background-image:url(\''+th(id,600)+'\')" data-lb="'+h(th(id,1800))+'" data-cap="'+h(v.plate+' — '+nameOf(k))+'"><span>'+h(nameOf(k))+'</span></button>'}).join('')+'</div></div>'});
 if(ADMIN){out+=insHtml(v)+perHtml(v)}
 setTimeout(wire,0);return out};
function badge(pl,g){return vis(pl,g)?'<span class="fpx-b pub">ผู้ชมเห็น</span>':'<span class="fpx-b adm">เฉพาะแอดมิน</span>'}
function insHtml(v){var i=v._c.ins;if(!i)return'<div class="fpx-sec"><div class="fpx-h"><span>ผลตรวจล่าสุด</span><span class="fpx-b adm">เฉพาะแอดมิน</span></div><p class="fpx-note">ยังไม่มีผลตรวจของรถคันนี้</p></div>';
 var bad=Object.keys(i.checks||{}).filter(function(k){return i.checks[k]&&i.checks[k].v==='bad'}),ok=Object.keys(i.checks||{}).filter(function(k){return i.checks[k]&&i.checks[k].v==='ok'}).length;
 var ty=TYL.map(function(t){var s=(i.tyres||{})[t[0]]||'',a=tyreAge(s);return'<dt>ปียาง '+t[1]+'</dt><dd>'+(s?h(s)+(a!=null?' <span class="'+(a>=MAXY?'fpx-bad':'fpx-ok')+'">· '+Math.floor(a)+' ปี'+(a>=MAXY?' · ยางเก่า':'')+'</span>':''):'-')+'</dd>'}).join('');
 return'<div class="fpx-sec"><div class="fpx-h"><span>ผลตรวจล่าสุด · '+h(ml(i.m))+'</span><span class="fpx-b adm">เฉพาะแอดมิน</span></div><dl class="fpx-dl">'+
  '<dt>ผล</dt><dd>'+(i.res==='issue'?'<span class="fpx-bad">พบความผิดปกติ</span>':'<span class="fpx-ok">ปกติ</span>')+(i.st!=='done'?' · ยังกรอกไม่ครบ':'')+'</dd>'+
  '<dt>ผู้ตรวจ</dt><dd>'+h(i.by||'-')+'</dd><dt>เลขไมล์</dt><dd>'+(i.mile?Number(i.mile).toLocaleString('th-TH')+' กม.':'-')+'</dd>'+
  '<dt>รายการตรวจ</dt><dd>ปกติ '+ok+' รายการ'+(bad.length?' · <span class="fpx-bad">ผิดปกติ '+bad.length+'</span>':'')+'</dd>'+
  bad.map(function(k){return'<dt class="fpx-bad">✕</dt><dd class="fpx-bad">'+h(CK[k]||k)+(i.checks[k].n?' — '+h(i.checks[k].n):'')+'</dd>'}).join('')+
  (i.issue&&i.issue.v==='has'&&i.issue.t?'<dt>หมายเหตุ</dt><dd>'+h(i.issue.t)+'</dd>':'')+ty+'</dl></div>'}
function perHtml(v){var p=SET.per[v.plate]||{};
 return'<div class="fpx-sec" id="fpxPer"><div class="fpx-h"><span>การแสดงผลของรถคันนี้</span><span class="fpx-b adm">เฉพาะแอดมิน</span></div><p class="fpx-note">"ตามทั้งหมด" = ใช้ค่าจากปุ่มตั้งค่าการแสดงผลด้านบน</p>'+
  GR.map(function(x){var k=x[0],cur=k in p?String(p[k]):'a';return'<div class="fpx-row"><span>'+h(x[1])+(k in p?'<span class="fpx-ov">ตั้งแยก</span>':'')+'</span><span class="fpx-seg" data-pk="'+k+'">'+[['a','ตามทั้งหมด'],['1','แสดง'],['0','ซ่อน']].map(function(o){return'<button type="button" data-v="'+o[0]+'" aria-pressed="'+(cur===o[0])+'">'+o[1]+'</button>'}).join('')+'</span></div>'}).join('')+'</div>'}
function wire(){document.querySelectorAll('.fpx-ph[data-lb]').forEach(function(b){b.onclick=function(){openLB(b.dataset.lb,b.dataset.cap)}});
 document.querySelectorAll('#fpxPer [data-pk] button').forEach(function(b){b.onclick=async function(){var k=b.parentElement.dataset.pk,pl=window._fpxOpen,p=SET.per[pl]=SET.per[pl]||{};
  if(b.dataset.v==='a')delete p[k];else p[k]=+b.dataset.v;if(!Object.keys(p).length)delete SET.per[pl];
  try{await post({a:'set',k:'cat',v:SET});toast('✅ บันทึกการแสดงผลแล้ว','ok')}catch(e){toast('❌ บันทึกไม่สำเร็จ','err')}openDetail(pl)}})}

/* ---------- admin: global visibility ---------- */
function globalModal(){var m=document.createElement('div');m.className='modal-bg on';var g=JSON.parse(JSON.stringify(SET.glob||{}));
 var nPer=Object.keys(SET.per||{}).length;
 m.innerHTML='<div class="modal"><div class="modal-title">ตั้งค่าการแสดงผล · รถทุกคัน</div><p class="fpx-note" style="margin:0 0 6px">ผู้ชมทั่วไปจะเห็นเฉพาะหัวข้อที่เปิด แอดมินเห็นทั้งหมดเสมอ'+(nPer?' · มีรถที่ตั้งแยก '+nPer+' คัน':'')+'</p>'+
  GR.map(function(x){var on=x[0] in g?!!g[x[0]]:!!DEF[x[0]];return'<div class="fpx-row"><span>'+h(x[1])+'</span><span class="fpx-seg" data-gk="'+x[0]+'"><button type="button" data-v="1" aria-pressed="'+on+'">แสดง</button><button type="button" data-v="0" aria-pressed="'+!on+'">ซ่อน</button></span></div>'}).join('')+
  '<div class="modal-actions"><button class="mbtn cancel" type="button" data-x>ยกเลิก</button><button class="mbtn ok" type="button" data-ok>บันทึก</button></div></div>';
 document.body.appendChild(m);
 m.querySelectorAll('[data-gk] button').forEach(function(b){b.onclick=function(){g[b.parentElement.dataset.gk]=+b.dataset.v;b.parentElement.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',x===b)})}});
 m.querySelector('[data-x]').onclick=function(){m.remove()};m.onclick=function(e){if(e.target===m)m.remove()};
 m.querySelector('[data-ok]').onclick=async function(){SET.glob=g;try{await post({a:'set',k:'cat',v:SET});toast('✅ บันทึกแล้ว','ok');m.remove();if(window._fpxOpen&&document.getElementById('detView').style.display!=='none')openDetail(window._fpxOpen)}catch(e){toast('❌ บันทึกไม่สำเร็จ','err')}}}

/* ---------- admin: year / price ---------- */
var _om=openModal;
openModal=function(pl){_om(pl);['edt-plate','edt-dc','edt-type'].forEach(function(id){var el=document.getElementById(id);if(el){el.disabled=true;el.title='มาจาก Car Performance Dashboard'}})};
saveModal=async function(){var v=vehicles.find(function(x){return x.plate===editingPlate});if(!v){closeModal();return}
 if(!ADMIN){toast('เฉพาะผู้ดูแล','err');return}
 var yr=document.getElementById('edt-year').value.trim(),pr=document.getElementById('edt-price').value.trim(),o={};o[v.plate]={yr:yr||null,pr:pr||null};
 try{var j=await post({a:'set',k:'carx',merge:1,v:o});RAW.carx=j.v;v.year=yr||v._c.yr0||'';v.price=pr;closeModal();buildAll();openDetail(v.plate);toast('✅ บันทึกปีรถ / ราคาแล้ว','ok')}catch(e){toast('❌ บันทึกไม่สำเร็จ','err')}};
async function importYP(e){var f=e.target.files[0];e.target.value='';if(!f)return;loading(true);
 try{if(!window.XLSX)await new Promise(function(res,rej){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)});
  var wb=XLSX.read(await f.arrayBuffer()),rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:''});
  var hi=rows.findIndex(function(r){return r.some(function(c){return/ทะเบียน/.test(c)})});if(hi<0)throw new Error('ไม่พบหัวคอลัมน์ "ทะเบียน"');
  var hd=rows[hi].map(String),ci=hd.findIndex(function(c){return/ทะเบียน/.test(c)}),yi=hd.findIndex(function(c){return/ปี/.test(c)}),pi=hd.findIndex(function(c){return/ราคา/.test(c)});
  var known={},o={},n=0,miss=[];vehicles.forEach(function(v){known[v.plate.replace(/\s/g,'')]=v.plate});
  rows.slice(hi+1).forEach(function(r){var raw=String(r[ci]||'').replace(/\s/g,'');if(!raw)return;var pl=known[raw];if(!pl){miss.push(raw);return}var x={};
   if(yi>=0&&String(r[yi]).trim())x.yr=String(r[yi]).trim();if(pi>=0&&String(r[pi]).trim())x.pr=String(r[pi]).replace(/[^\d.]/g,'');if(Object.keys(x).length){o[pl]=x;n++}});
  if(!n)throw new Error('ไม่พบข้อมูลปี/ราคาที่ตรงกับทะเบียนในระบบ');
  var j=await post({a:'set',k:'carx',merge:1,v:o});RAW.carx=j.v;await load();
  toast('✅ นำเข้าปี/ราคา '+n+' คัน'+(miss.length?' · ไม่พบทะเบียน '+miss.length+' คัน':''),miss.length?'info':'ok')}
 catch(err){toast('❌ '+err.message,'err')}loading(false)}

/* ---------- admin: change / remove photos (stored as catalog photos, override the inspection photo) ---------- */
function shrinkB64(file){return new Promise(function(res,rej){var u=URL.createObjectURL(file),i=new Image();i.onload=function(){var s=Math.min(1,1600/Math.max(i.naturalWidth,i.naturalHeight)),c=document.createElement('canvas');c.width=Math.round(i.naturalWidth*s);c.height=Math.round(i.naturalHeight*s);c.getContext('2d').drawImage(i,0,0,c.width,c.height);URL.revokeObjectURL(u);res(c.toDataURL('image/jpeg',0.82).split(',')[1])};i.onerror=function(){URL.revokeObjectURL(u);rej(new Error('อ่านรูปไม่ได้'))};i.src=u})}
async function setPh(v,slot,val){var cur=Object.assign({},(RAW.carx[v.plate]||{}).ph||{});cur[slot]=val;var o={};o[v.plate]={ph:cur};var j=await post({a:'set',k:'carx',merge:1,v:o});RAW.carx=j.v}
onPhotoFile=async function(e){var file=e.target.files[0],p=pending;pending=null;e.target.value='';if(!file||!p)return;if(!ADMIN){toast('เฉพาะผู้ดูแล','err');return}
 var v=vehicles.find(function(x){return x.plate===p.pl}),slot=COL[p.col];toast('⏳ กำลังอัปโหลดรูป '+p.name+'...','info');loading(true);
 try{var j=await post({a:'photo',month:'catalog',dc:v._c.dc,plate:v.plate,slot:slot,data:await shrinkB64(file),mime:'image/jpeg'});await setPh(v,slot,j.id);v._ph[slot]=j.id;v.photos[p.col]=th(j.id);refreshDet(v.plate);toast('✅ บันทึกรูป '+p.name,'ok')}
 catch(err){toast('❌ อัปโหลดไม่สำเร็จ','err')}loading(false)};
removeP=async function(e,pl,col){e.stopPropagation();if(!ADMIN)return;var v=vehicles.find(function(x){return x.plate===pl});if(!v)return;
 try{await setPh(v,COL[col],'-');delete v._ph[COL[col]];delete v.photos[col];refreshDet(pl);toast('🗑️ ซ่อนรูปแล้ว','ok')}catch(err){toast('❌ ไม่สำเร็จ','err')}};
var _cs=clickSlot;clickSlot=function(pl,col,name){if(ADMIN)return _cs(pl,col,name);var v=vehicles.find(function(x){return x.plate===pl});if(v&&v.photos&&v.photos[col])openLB(v.photos[col],pl+' — '+name)};

/* ---------- PPTX: images come as data (CORS-safe) through the inspection API ---------- */
async function dataOf(id){var j=ADMIN?await post({a:'img',id:id}):await(await fetch(API+(API.indexOf('?')<0?'?':'&')+'a=img&id='+encodeURIComponent(id))).json();return j.ok?'data:'+j.mime+';base64,'+j.data:null}
async function withData(v){var p={};for(var n in COL){var id=v._ph&&v._ph[COL[n]];if(id){try{var d=await dataOf(id);if(d)p[n]=d}catch(e){}}}return Object.assign({},v,{photos:p})}
async function swapRun(list,fn){var orig=vehicles,out=new Array(list.length),i=0,done=0;loading(true);
 await Promise.all([0,1,2,3].map(async function(){while(i<list.length){var k=i++;out[k]=await withData(list[k]);done++;if(done%10===0)toast('⏳ เตรียมรูป '+done+'/'+list.length,'info')}}));
 vehicles=out;try{await fn()}finally{vehicles=orig;loading(false)}}
var _eo=exportOne,_ea=exportAll;
exportOne=function(pl){var v=vehicles.find(function(x){return x.plate===pl});if(!v)return;return swapRun([v],function(){return _eo(pl)})};
exportAll=function(){return swapRun(vehicles.slice(),function(){return _ea()})};

/* ---------- start ---------- */
var k=null;try{k=sessionStorage.getItem('fpc-admin-key')}catch(e){}
if(location.hash==='#admin'){if(k){KEY=k;start(true)}else{start(false);askKey()}}else if(k){KEY=k;start(true)}else start(false);
})();
