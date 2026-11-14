/* NIMEX Fleet Planning Catalog — online mode.
   Cars and photos come from NIMEX Car Inspection Monthly (Google Sheet + Drive via Apps Script, window.FPC_API).
   Viewers see only what the admin allows (hidden items are never sent to them).
   Admin opens the page with #admin and the ADMIN_KEY of the inspection system: sees everything and edits. */
(function(){'use strict';
var API=window.FPC_API||'';if(!API)return;
var TYMAP={'040':'AB','042':'CC'};
var GR=[['p4','รูปรถ 4 ด้าน'],['eng','รูปห้องเครื่อง / แบต / หน้าปัด'],['tyre','รูปยาง / ปียาง / ยางอะไหล่'],['cab','รูปห้องโดยสาร / ตู้ / ม่าน / กล้องหน้า'],['dmg','รูปจุดที่ผิดปกติ'],['year','ปีรถ'],['price','ราคา']];
var DEF={p4:1,eng:0,tyre:0,cab:0,dmg:0,year:0,price:0};
var GKEYS={p4:['front','back','left','right'],eng:['engine','battery','odo'],tyre:['tFL','tFR','tRL','tRR','dFL','dFR','dRL','dRR','spare'],cab:['cabin','boxF','boxB','curtainF','curtainB','curtain','dashcam'],dmg:['damage']};
var NM={front:'ด้านหน้า',back:'ด้านหลัง',left:'ด้านซ้าย',right:'ด้านขวา',engine:'ห้องเครื่อง',battery:'แบตเตอรี่',odo:'หน้าปัดเลขไมล์',tFL:'ยางหน้าซ้าย',tFR:'ยางหน้าขวา',tRL:'ยางหลังซ้าย',tRR:'ยางหลังขวา',dFL:'ปียาง หน้าซ้าย',dFR:'ปียาง หน้าขวา',dRL:'ปียาง หลังซ้าย',dRR:'ปียาง หลังขวา',spare:'ยางอะไหล่',cabin:'ห้องโดยสาร',boxF:'ภายในตู้ ด้านหน้า',boxB:'ภายในตู้ ด้านหลัง',curtain:'ม่านความเย็น',curtainF:'ม่านความเย็น ด้านหน้า',curtainB:'ม่านความเย็น ด้านหลัง',dashcam:'กล้องหน้ารถ',damage:'จุดที่ผิดปกติ'};
var COL={1:'front',2:'back',3:'left',4:'right'};
var CK={headlight:'ไฟหน้า',taillight:'ไฟท้าย / ไฟเบรก',signal:'ไฟเลี้ยว / ไฟฉุกเฉิน',brake:'เบรก',handbrake:'เบรกมือ',ac:'แอร์ห้องโดยสาร',horn:'แตร',wiper:'ที่ปัดน้ำฝน',mirror:'กระจก / กระจกมองข้าง',belt:'เข็มขัดนิรภัย',fluid:'น้ำมันเครื่อง / น้ำหล่อเย็น',dash:'ไฟเตือนหน้าปัด',door:'ประตูตู้ / ซีลยาง / กุญแจ',reefer:'ตู้เย็น',curtain:'ม่านความเย็น',curtainF:'ม่านความเย็น ด้านหน้า',curtainB:'ม่านความเย็น ด้านหลัง',dashcam:'กล้องหน้ารถ'};
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
var ZONES=[],OPT={};
function build(d){var dcn={},zn={};ZONES=[];(d.dcs||[]).forEach(function(x){dcn[String(x[0])]=String(x[1]).replace(/^C?DC\s*/,'');zn[String(x[0])]=String(x[2]);if(ZONES.indexOf(String(x[2]))<0)ZONES.push(String(x[2]))});
 RAW=d;RAW.carx=d.carx||{};OPT=ADMIN?{dcpage:!!(SET.glob&&SET.glob.dcpage)}:(d.opt||{});
 vehicles=d.cars.map(function(c){var ph=c.ph||{},p={};for(var n in COL)if(ph[COL[n]])p[n]=th(ph[COL[n]]);
  return{plate:c.pl,dc:dcn[c.dc]||String(c.dc),zone:zn[c.dc]||'อื่นๆ',type:TYMAP[c.ty]||c.ty,year:c.yr||'',price:c.pr||'',photos:p,_ph:ph,_c:c}});
 navDC();
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
 m.innerHTML='<div class="modal"><div class="modal-title">ตั้งค่าการแสดงผล · รถทุกคัน</div><p class="fpx-note" style="margin:0 0 6px">ผู้ชมทั่วไปจะเห็นเฉพาะหัวข้อที่เปิด แอดมินเห็นทั้งหมดเสมอ · รูปจะขึ้นเฉพาะรถที่แอดมินกด "ตรวจสอบแล้ว" ในระบบตรวจรถ'+(nPer?' · มีรถที่ตั้งแยก '+nPer+' คัน':'')+'</p>'+
  GR.concat([['dcpage','หน้า "จำนวนรถแยกตาม DC"']]).map(function(x){var on=x[0] in g?!!g[x[0]]:!!DEF[x[0]];return'<div class="fpx-row"><span>'+h(x[1])+'</span><span class="fpx-seg" data-gk="'+x[0]+'"><button type="button" data-v="1" aria-pressed="'+on+'">แสดง</button><button type="button" data-v="0" aria-pressed="'+!on+'">ซ่อน</button></span></div>'}).join('')+
  '<div class="modal-actions"><button class="mbtn cancel" type="button" data-x>ยกเลิก</button><button class="mbtn ok" type="button" data-ok>บันทึก</button></div></div>';
 document.body.appendChild(m);
 m.querySelectorAll('[data-gk] button').forEach(function(b){b.onclick=function(){g[b.parentElement.dataset.gk]=+b.dataset.v;b.parentElement.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',x===b)})}});
 m.querySelector('[data-x]').onclick=function(){m.remove()};m.onclick=function(e){if(e.target===m)m.remove()};
 m.querySelector('[data-ok]').onclick=async function(){SET.glob=g;OPT.dcpage=!!g.dcpage;navDC();try{await post({a:'set',k:'cat',v:SET});toast('✅ บันทึกแล้ว','ok');m.remove();if(window._fpxOpen&&document.getElementById('detView').style.display!=='none')openDetail(window._fpxOpen)}catch(e){toast('❌ บันทึกไม่สำเร็จ','err')}}}

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

/* ---------- dashboard: 3 cards (count + value), by region, by type ---------- */
function num(v){var n=parseFloat(String(v||'').replace(/[^\d.]/g,''));return isFinite(n)?n:0}
function baht(n){return n?'฿'+Math.round(n).toLocaleString('th-TH'):'—'}
function agg(list){var a={n:list.length,AB:0,CC:0,o:0,val:0,vAB:0,vCC:0,priced:0,ph:0};list.forEach(function(v){var p=num(v.price);if(v.type==='AB'){a.AB++;a.vAB+=p}else if(v.type==='CC'){a.CC++;a.vCC+=p}else a.o++;a.val+=p;if(p)a.priced++;if(SLOTS.every(function(s){return(v.photos||{})[s.col]}))a.ph++});return a}
function byKey(list,fn){var m={};list.forEach(function(v){var k=fn(v);(m[k]=m[k]||[]).push(v)});return m}
buildDash=function(){if(!vehicles.length){document.getElementById('dbEmpty').style.display='block';document.getElementById('dbContent').style.display='none';return}
 document.getElementById('dbEmpty').style.display='none';document.getElementById('dbContent').style.display='block';
 var A=agg(vehicles),pc=function(a,b){return b?Math.round(a/b*100)+'%':'0%'};
 document.getElementById('kpiRow').innerHTML=
  '<div class="kpi k-total"><div class="kpi-top"><div class="kpi-ico">🚛</div><span class="kpi-tag">รวมทั้งหมด</span></div><div class="kpi-val">'+A.n+'</div><div class="kpi-lbl">รถทั้งหมด</div><div class="kpi-sub">มูลค่ารวม '+baht(A.val)+(A.priced&&A.priced<A.n?' · มีราคา '+A.priced+' คัน':'')+'</div><div class="kpi-bar"></div></div>'+
  '<div class="kpi k-ab"><div class="kpi-top"><div class="kpi-ico">🚚</div><span class="kpi-tag">AB รถแห้ง</span></div><div class="kpi-val">'+A.AB+'</div><div class="kpi-lbl">รถ AB รถแห้ง · '+pc(A.AB,A.n)+'</div><div class="kpi-sub">มูลค่า '+baht(A.vAB)+'</div><div class="kpi-bar"></div></div>'+
  '<div class="kpi k-cc"><div class="kpi-top"><div class="kpi-ico">❄️</div><span class="kpi-tag">CC รถเย็น</span></div><div class="kpi-val">'+A.CC+'</div><div class="kpi-lbl">รถ CC รถเย็น · '+pc(A.CC,A.n)+'</div><div class="kpi-sub">มูลค่า '+baht(A.vCC)+'</div><div class="kpi-bar"></div></div>';
 var kr=document.getElementById('kpiRow');kr.style.gridTemplateColumns='repeat(auto-fit,minmax(min(100%,220px),1fr))';
 var Z=byKey(vehicles,function(v){return v.zone}),zs=ZONES.filter(function(z){return Z[z]}).map(function(z){return[z,agg(Z[z])]}).sort(function(a,b){return b[1].n-a[1].n}),mx=zs.length?zs[0][1].n:1;
 var cards=document.querySelectorAll('#dbContent .ch-card');if(cards[0]){cards[0].querySelector('.ch-hd').lastChild.textContent='จำนวนรถแยกตามภาค';}if(cards[1])cards[1].style.display='none';
 var cr=document.querySelector('#dbContent .charts-row');if(cr)cr.style.gridTemplateColumns='1fr';
 document.getElementById('bclist').innerHTML=zs.map(function(x){var a=x[1];return'<div class="bc-row"><div class="bc-lbl" title="'+h(x[0])+'">'+h(x[0])+'</div><div class="bc-track" style="display:flex"><div class="bc-fill" style="width:'+(a.AB/mx*100)+'%;background:#b8860b;border-radius:6px 0 0 6px"><span>'+(a.AB||'')+'</span></div><div class="bc-fill" style="width:'+(a.CC/mx*100)+'%;background:#1d57b8;border-radius:0 6px 6px 0"><span>'+(a.CC||'')+'</span></div></div><div class="bc-num">'+a.n+'</div></div>'}).join('')+'<p class="fpx-note">สีทอง = AB รถแห้ง · สีน้ำเงิน = CC รถเย็น</p>';
 var th=document.querySelector('#dbContent .dtbl thead');if(th)th.innerHTML='<tr><th>ภาค</th><th>🚚 AB รถแห้ง</th><th>❄️ CC รถเย็น</th><th>รวม</th><th>มูลค่ารวม</th><th>ภาพครบ</th></tr>';
 document.getElementById('dtbody').innerHTML=zs.map(function(x){var a=x[1];return'<tr><td><strong>'+h(x[0])+'</strong></td><td>'+(a.AB?'<span class="pip pip-ab">'+a.AB+'</span>':'—')+'</td><td>'+(a.CC?'<span class="pip pip-cc">'+a.CC+'</span>':'—')+'</td><td><strong>'+a.n+'</strong></td><td>'+baht(a.val)+'</td><td>'+a.ph+'/'+a.n+'</td></tr>'}).join('')+
  '<tr><td><strong>รวม</strong></td><td><strong>'+A.AB+'</strong></td><td><strong>'+A.CC+'</strong></td><td><strong>'+A.n+'</strong></td><td><strong>'+baht(A.val)+'</strong></td><td>'+A.ph+'/'+A.n+'</td></tr>'};

/* ---------- page: จำนวนรถแยกตาม DC (admin; viewers only when allowed) ---------- */
function navDC(){var nav=document.querySelector('.nav');if(!nav)return;var b=document.getElementById('navDC'),pg=document.getElementById('pgDC'),show=ADMIN||OPT.dcpage;
 if(!b){b=document.createElement('button');b.className='nbtn';b.id='navDC';b.type='button';b.innerHTML='<svg viewBox="0 0 24 24"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg>แยกตาม DC';b.onclick=function(){goPage('DC');buildDC()};var hub=nav.querySelector('.hub');nav.insertBefore(b,hub||null)}
 if(!pg){pg=document.createElement('div');pg.className='page';pg.id='pgDC';document.querySelector('.wrap').appendChild(pg)}
 b.style.display=show?'':'none';if(!show&&pg.classList.contains('on'))goPage('Dashboard')}
function buildDC(){var pg=document.getElementById('pgDC'),D=byKey(vehicles,function(v){return v.dc}),rows=Object.keys(D).map(function(k){return[k,agg(D[k]),D[k][0].zone]}).sort(function(a,b){return b[1].n-a[1].n}),mx=rows.length?rows[0][1].n:1;
 pg.innerHTML='<div class="fpx-sec"><div class="fpx-h"><span>จำนวนรถแยกตาม DC</span>'+(ADMIN?(OPT.dcpage?'<span class="fpx-b pub">ผู้ชมเห็น</span>':'<span class="fpx-b adm">เฉพาะแอดมิน</span>'):'')+'</div>'+(ADMIN?'<p class="fpx-note">เปิดหรือปิดหน้านี้ให้ผู้ชมได้ที่ปุ่ม "ตั้งค่าการแสดงผล"</p>':'')+
  '<div class="bclist">'+rows.map(function(x){var a=x[1];return'<div class="bc-row"><div class="bc-lbl">DC '+h(x[0])+'</div><div class="bc-track" style="display:flex"><div class="bc-fill" style="width:'+(a.AB/mx*100)+'%;background:#b8860b"><span>'+(a.AB||'')+'</span></div><div class="bc-fill" style="width:'+(a.CC/mx*100)+'%;background:#1d57b8"><span>'+(a.CC||'')+'</span></div></div><div class="bc-num">'+a.n+'</div></div>'}).join('')+'</div></div>'+
  '<div class="tbl-card"><table class="dtbl"><thead><tr><th>DC</th><th>ภาค</th><th>🚚 AB</th><th>❄️ CC</th><th>รวม</th><th>มูลค่ารวม</th><th></th></tr></thead><tbody>'+rows.map(function(x){var a=x[1];return'<tr><td><strong>DC '+h(x[0])+'</strong></td><td>'+h(x[2])+'</td><td>'+(a.AB||'—')+'</td><td>'+(a.CC||'—')+'</td><td><strong>'+a.n+'</strong></td><td>'+baht(a.val)+'</td><td><button class="tlink" type="button" data-fdc="'+h(x[0])+'">ดูรายทะเบียน →</button></td></tr>'}).join('')+'</tbody></table></div>';
 pg.querySelectorAll('[data-fdc]').forEach(function(b){b.onclick=function(){filterDC(b.dataset.fdc)}})}

/* ---------- share / export (pick what to share; any slice of the fleet) ---------- */
function shareBtn(){var r=document.querySelector('.hdr-right');if(!r||document.getElementById('fpxShare'))return;var b=document.createElement('button');b.className='hbtn';b.id='fpxShare';b.type='button';b.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6"/></svg>แชร์ / ส่งออก';b.onclick=shareModal;var ea=document.getElementById('expAllBtn');if(ea)ea.style.display='none';r.insertBefore(b,document.getElementById('themeBtn'))}
var SEL={zone:'all',dc:'all',type:'all',plates:'',only:false,sides:{1:1,2:1,3:1,4:1},sec:{kpi:1,zone:1,dc:0,cars:1}};
function pick(){var pl=SEL.plates.split(/[\s,]+/).map(function(s){return s.trim()}).filter(Boolean);
 return vehicles.filter(function(v){return(SEL.zone==='all'||v.zone===SEL.zone)&&(SEL.dc==='all'||v.dc===SEL.dc)&&(SEL.type==='all'||v.type===SEL.type)&&(!pl.length||pl.indexOf(v.plate)>=0)&&(!SEL.only||Object.keys(v.photos||{}).length)})}
function canDC(){return ADMIN||OPT.dcpage}
function shareModal(){var m=document.createElement('div');m.className='modal-bg on';var dcs=Object.keys(byKey(vehicles,function(v){return v.dc})).sort();
 var opt=function(list,cur,all){return'<option value="all">'+all+'</option>'+list.map(function(x){return'<option'+(x===cur?' selected':'')+'>'+h(x)+'</option>'}).join('')};
 var ck=function(id,lbl,on){return'<label style="display:flex;gap:8px;align-items:center;font-size:13.5px;color:var(--t1);padding:4px 0"><input type="checkbox" data-c="'+id+'"'+(on?' checked':'')+'>'+lbl+'</label>'};
 m.innerHTML='<div class="modal" style="max-width:560px"><div class="modal-title">แชร์ / ส่งออก</div>'+
  '<div class="fpx-h" style="margin-top:4px"><span>1. เลือกรถ</span><span class="fpx-note" id="fpxCnt"></span></div>'+
  '<div class="fi-row"><div class="fg" style="margin:0"><label>ภาค</label><select class="fi" data-s="zone">'+opt(ZONES,SEL.zone,'ทุกภาค')+'</select></div><div class="fg" style="margin:0"><label>DC</label><select class="fi" data-s="dc">'+opt(dcs,SEL.dc,'ทุก DC')+'</select></div></div>'+
  '<div class="fi-row" style="margin-top:8px"><div class="fg" style="margin:0"><label>ชนิด</label><select class="fi" data-s="type"><option value="all">ทุกชนิด</option><option value="AB"'+(SEL.type==='AB'?' selected':'')+'>AB รถแห้ง</option><option value="CC"'+(SEL.type==='CC'?' selected':'')+'>CC รถเย็น</option></select></div><div class="fg" style="margin:0"><label>ทะเบียน (เว้นว่าง = ทุกคัน)</label><input class="fi" data-s="plates" placeholder="3ฒข-1306, 2ฒฮ-7671" value="'+h(SEL.plates)+'"></div></div>'+
  ck('only','เฉพาะรถที่มีรูปแล้ว',SEL.only)+
  '<div class="fpx-h" style="margin-top:10px"><span>2. หัวข้อสรุป (Excel / PowerPoint / ข้อความ)</span></div>'+ck('sec.kpi','จำนวนรวม + มูลค่ารวม',SEL.sec.kpi)+ck('sec.zone','แยกภาค และแยกชนิด',SEL.sec.zone)+(canDC()?ck('sec.dc','แยกตาม DC',SEL.sec.dc):'')+ck('sec.cars','รายการรถรายคัน',SEL.sec.cars)+
  '<div class="fpx-h" style="margin-top:10px"><span>3. ด้านของรูปรถ (PowerPoint / รูปรถ)</span></div><div style="display:flex;flex-wrap:wrap;gap:4px 16px">'+SLOTS.map(function(s){return ck('side.'+s.col,s.name,SEL.sides[s.col])}).join('')+'</div>'+
  '<div class="fpx-h" style="margin-top:12px"><span>4. ส่งออก</span></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">'+
  [['ig','อินโฟกราฟิก 16:9'],['png','รูปรถรายคัน (ZIP)'],['pptx','PowerPoint'],['xlsx','Excel'],['txt','ข้อความ (LINE)']].map(function(x){return'<button type="button" class="mbtn ok" data-x="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div>'+
  '<div class="modal-actions"><button class="mbtn cancel" type="button" data-close>ปิด</button></div></div>';
 document.body.appendChild(m);var cnt=function(){var l=pick();m.querySelector('#fpxCnt').textContent='เลือกไว้ '+l.length+' คัน'};cnt();
 m.querySelectorAll('[data-s]').forEach(function(el){el.oninput=el.onchange=function(){SEL[el.dataset.s]=el.value;cnt()}});
 m.querySelectorAll('[data-c]').forEach(function(el){el.onchange=function(){var p=el.dataset.c.split('.');if(p[0]==='only')SEL.only=el.checked;else if(p[0]==='sec')SEL.sec[p[1]]=el.checked?1:0;else SEL.sides[p[1]]=el.checked?1:0;cnt()}});
 m.querySelector('[data-close]').onclick=function(){m.remove()};m.onclick=function(e){if(e.target===m)m.remove()};
 m.querySelectorAll('[data-x]').forEach(function(b){b.onclick=async function(){var l=pick();if(!l.length){toast('ไม่มีรถตามที่เลือก','err');return}b.disabled=true;
  try{await({ig:expIG,png:expPNG,pptx:expPPTX,xlsx:expXLSX,txt:expTXT})[b.dataset.x](l)}catch(e){console.error(e);toast('❌ '+(e.message||'ส่งออกไม่สำเร็จ'),'err')}b.disabled=false}})}
function stamp(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function scopeTxt(){return[SEL.zone==='all'?'ทุกภาค':SEL.zone,SEL.dc==='all'?'':'DC '+SEL.dc,SEL.type==='all'?'':SEL.type].filter(Boolean).join(' · ')}
async function save(blob,name){var f=new File([blob],name,{type:blob.type});if(navigator.canShare&&navigator.canShare({files:[f]})&&/Mobi|Android/i.test(navigator.userAgent)){try{await navigator.share({files:[f],title:name});return}catch(e){if(e.name==='AbortError')return}}
 var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},5000);toast('✅ ส่งออก '+name,'ok')}
async function expTXT(l){var A=agg(l),L=['🚛 NIMEX Fleet Planning Catalog · '+scopeTxt()];
 if(SEL.sec.kpi)L.push('✅ รถทั้งหมด '+A.n+' คัน (AB '+A.AB+' · CC '+A.CC+')',A.val?'💰 มูลค่ารวม '+baht(A.val):'');
 if(SEL.sec.zone){L.push('','📍 แยกภาค');var Z=byKey(l,function(v){return v.zone});ZONES.filter(function(z){return Z[z]}).forEach(function(z){var a=agg(Z[z]);L.push('• '+z+' '+a.n+' คัน (AB '+a.AB+' · CC '+a.CC+')'+(a.val?' · '+baht(a.val):''))})}
 if(SEL.sec.dc&&canDC()){L.push('','🏢 แยก DC');var D=byKey(l,function(v){return v.dc});Object.keys(D).sort(function(a,b){return D[b].length-D[a].length}).forEach(function(k){L.push('• DC '+k+' '+D[k].length+' คัน')})}
 if(SEL.sec.cars&&l.length<=40){L.push('','🚚 รายคัน');l.forEach(function(v,i){L.push((i+1)+'. '+v.plate+' · DC '+v.dc+' · '+v.type+(v.year?' · ปี '+v.year:'')+(v.price?' · '+baht(num(v.price)):''))})}
 var t=L.filter(function(x){return x!==''||true}).join('\n').replace(/\n{3,}/g,'\n\n');
 if(navigator.share&&/Mobi|Android/i.test(navigator.userAgent)){try{await navigator.share({text:t});return}catch(e){}}
 try{await navigator.clipboard.writeText(t);toast('📋 คัดลอกข้อความแล้ว วางใน LINE ได้เลย','ok')}catch(e){var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('📋 คัดลอกแล้ว','ok')}}
async function xlsxLib(){if(!window.XLSX)await new Promise(function(res,rej){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
async function expXLSX(l){await xlsxLib();var wb=XLSX.utils.book_new(),A=agg(l),add=function(name,rows){var ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=rows[0].map(function(){return{wch:16}});XLSX.utils.book_append_sheet(wb,ws,name)};
 if(SEL.sec.kpi)add('สรุป',[['หัวข้อ','จำนวน (คัน)','มูลค่ารวม (บาท)'],['รถทั้งหมด',A.n,A.val],['AB รถแห้ง',A.AB,A.vAB],['CC รถเย็น',A.CC,A.vCC],['ขอบเขต',scopeTxt(),'']]);
 if(SEL.sec.zone){var Z=byKey(l,function(v){return v.zone});add('แยกภาค',[['ภาค','AB','CC','รวม','มูลค่ารวม']].concat(ZONES.filter(function(z){return Z[z]}).map(function(z){var a=agg(Z[z]);return[z,a.AB,a.CC,a.n,a.val]})))}
 if(SEL.sec.dc&&canDC()){var D=byKey(l,function(v){return v.dc});add('แยก DC',[['DC','ภาค','AB','CC','รวม','มูลค่ารวม']].concat(Object.keys(D).sort().map(function(k){var a=agg(D[k]);return['DC '+k,D[k][0].zone,a.AB,a.CC,a.n,a.val]})))}
 if(SEL.sec.cars)add('รายคัน',[['ทะเบียน','ภาค','DC','ชนิด','ปีรถ','ราคา'].concat(SLOTS.map(function(s){return'รูป '+s.name}))].concat(l.map(function(v){return[v.plate,v.zone,'DC '+v.dc,v.type,v.year||'',num(v.price)||''].concat(SLOTS.map(function(s){var id=v._ph&&v._ph[COL[s.col]];return id?'https://drive.google.com/file/d/'+id+'/view':''}))})));
 if(!wb.SheetNames.length)throw new Error('เลือกหัวข้ออย่างน้อย 1 หัวข้อ');
 var out=XLSX.write(wb,{bookType:'xlsx',type:'array'});await save(new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'NIMEX-Fleet-Catalog-'+stamp()+'.xlsx')}
async function withSides(v){var p={};for(var n in COL){if(!SEL.sides[n])continue;var id=v._ph&&v._ph[COL[n]];if(id){try{var d=await dataOf(id);if(d)p[n]=d}catch(e){}}}return Object.assign({},v,{photos:p})}
async function mapLimit(list,fn){var out=new Array(list.length),i=0,done=0;await Promise.all([0,1,2,3].map(async function(){while(i<list.length){var k=i++;out[k]=await fn(list[k]);done++;if(done%10===0)toast('⏳ เตรียมรูป '+done+'/'+list.length,'info')}}));return out}
async function expPPTX(l){loading(true);try{var cars=await mapLimit(l,withSides),orig=vehicles;vehicles=cars;try{if(l.length===1)await _eo(l[0].plate);else await _ea()}finally{vehicles=orig}}finally{loading(false)}}
function loadImg(src){return new Promise(function(res){if(!src)return res(null);var i=new Image();i.onload=function(){res(i)};i.onerror=function(){res(null)};i.src=src})}
function rr(x,X,Y,w,hh,r){x.beginPath();x.roundRect(X,Y,w,hh,r)}
function coverImg(x,img,X,Y,w,hh,r){x.save();rr(x,X,Y,w,hh,r||12);x.clip();if(img){var s=Math.max(w/img.width,hh/img.height);x.drawImage(img,X+(w-img.width*s)/2,Y+(hh-img.height*s)/2,img.width*s,img.height*s)}else{x.fillStyle='#e9eef7';x.fillRect(X,Y,w,hh);x.fillStyle='#7a8aa5';x.font='500 26px Prompt';x.textAlign='center';x.textBaseline='middle';x.fillText('ไม่มีรูป',X+w/2,Y+hh/2)}x.restore()}
async function carPNG(v,logo){var W=1600,H=1000,c=document.createElement('canvas');c.width=W;c.height=H;var x=c.getContext('2d');x.fillStyle='#eef2f9';x.fillRect(0,0,W,H);
 x.fillStyle='#0a2a5e';x.fillRect(0,0,W,150);x.fillStyle='#d4af37';x.fillRect(0,150,W,6);if(logo){x.fillStyle='#fff';rr(x,24,20,220,110,16);x.fill();var s=Math.min(200/logo.width,90/logo.height);x.drawImage(logo,24+(220-logo.width*s)/2,20+(110-logo.height*s)/2,logo.width*s,logo.height*s)}
 x.fillStyle='#fff';x.font='600 64px Prompt';x.textAlign='left';x.textBaseline='middle';x.fillText(v.plate,280,62);x.font='500 30px Prompt';x.fillStyle='#e6d79c';x.fillText(['DC '+v.dc,v.zone,v.type==='AB'?'AB รถแห้ง':v.type==='CC'?'CC รถเย็น':v.type,v.year?'ปี '+v.year:'',v.price?baht(num(v.price)):''].filter(Boolean).join(' · '),282,118,W-310);
 var sides=SLOTS.filter(function(s){return SEL.sides[s.col]}),n=sides.length||1,cols=n===1?1:2,rows=Math.ceil(n/cols),gw=(W-48-(cols-1)*20)/cols,gh=(H-190-(rows-1)*20)/rows;
 for(var i=0;i<sides.length;i++){var X=24+(i%cols)*(gw+20),Y=176+Math.floor(i/cols)*(gh+20);coverImg(x,await loadImg(v.photos[sides[i].col]),X,Y,gw,gh,14);x.fillStyle='rgba(6,26,61,.8)';rr(x,X+14,Y+gh-54,220,40,20);x.fill();x.fillStyle='#fff';x.font='500 24px Prompt';x.textAlign='center';x.fillText(sides[i].name,X+124,Y+gh-33)}
 return await new Promise(function(res){c.toBlob(res,'image/png')})}
async function expPNG(l){if(!window.JSZip)throw new Error('ไม่พบตัวสร้าง ZIP');loading(true);try{try{await document.fonts.load('600 40px Prompt')}catch(e){}var logo=await loadImg('logo.png'),cars=await mapLimit(l,withSides),zip=new JSZip();
 for(var i=0;i<cars.length;i++){zip.file('NIMEX-'+cars[i].plate+'.png',await carPNG(cars[i],logo));if(i%10===9)toast('⏳ สร้างรูป '+(i+1)+'/'+cars.length,'info')}
 if(cars.length===1)await save(await carPNG(cars[0],logo),'NIMEX-'+cars[0].plate+'.png');else await save(await zip.generateAsync({type:'blob'}),'NIMEX-Fleet-Cars-'+stamp()+'.zip')}finally{loading(false)}}
/* 16:9 infographic: SVG 1920x1080 with the page's Prompt font + logo inlined, rendered to PNG at 2x */
async function dataURL(src){var b=await(await fetch(src)).blob();return await new Promise(function(res){var r=new FileReader();r.onload=function(){res(r.result)};r.readAsDataURL(b)})}
function fontCSS(){var out='';document.querySelectorAll('style').forEach(function(s){(s.textContent.match(/@font-face\s*\{[^}]*\}/g)||[]).forEach(function(r){if(/Prompt/.test(r))out+=r})});return out}
async function expIG(l){loading(true);try{var A=agg(l),logo=await dataURL('logo.png'),W=1920,H=1080,e=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')};
 var Z=byKey(l,function(v){return v.zone}),zs=ZONES.filter(function(z){return Z[z]}).map(function(z){return[z,agg(Z[z])]}),D=byKey(l,function(v){return v.dc}),ds=Object.keys(D).map(function(k){return[k,agg(D[k])]}).sort(function(a,b){return b[1].n-a[1].n}).slice(0,10);
 var s='<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'"><style>'+fontCSS()+'text{font-family:Prompt,sans-serif}</style><rect width="'+W+'" height="'+H+'" fill="#eef2f9"/>';
 s+='<rect width="'+W+'" height="120" fill="#0a2a5e"/><rect y="120" width="'+W+'" height="6" fill="#d4af37"/><rect x="28" y="16" width="200" height="88" rx="14" fill="#fff"/><image href="'+logo+'" x="38" y="22" width="180" height="76" preserveAspectRatio="xMidYMid meet"/>';
 s+='<text x="256" y="66" font-size="44" font-weight="600" fill="#fff">NIMEX Fleet Planning Catalog</text><text x="258" y="102" font-size="22" fill="#e6d79c">'+e(scopeTxt())+' · ข้อมูล ณ '+e(new Date().toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'}))+'</text>';
 [['รถทั้งหมด',A.n+' คัน','AB '+A.AB+' · CC '+A.CC,'#d4af37'],['AB รถแห้ง',A.AB+' คัน',baht(A.vAB),'#b8860b'],['CC รถเย็น',A.CC+' คัน',baht(A.vCC),'#1d57b8'],['มูลค่ารวม',baht(A.val),A.priced+' คันที่มีราคา','#d4af37']].forEach(function(k,i){var X=40+i*465;
  s+='<rect x="'+X+'" y="150" width="440" height="170" rx="18" fill="#123f8c"/><rect x="'+X+'" y="312" width="440" height="8" fill="'+k[3]+'"/><text x="'+(X+220)+'" y="196" font-size="24" fill="#d9c98a" text-anchor="middle">'+e(k[0])+'</text><text x="'+(X+220)+'" y="256" font-size="52" font-weight="600" fill="#fff" text-anchor="middle">'+e(k[1])+'</text><text x="'+(X+220)+'" y="296" font-size="22" fill="#cfdcf2" text-anchor="middle">'+e(k[2])+'</text>'});
 var panel=function(X,Y,w,hh,t){return'<rect x="'+X+'" y="'+Y+'" width="'+w+'" height="'+hh+'" rx="18" fill="#fff" stroke="#dbe3f0"/><rect x="'+(X+w*0.2)+'" y="'+Y+'" width="'+(w*0.6)+'" height="3" fill="#d4af37"/><text x="'+(X+w/2)+'" y="'+(Y+40)+'" font-size="26" font-weight="600" fill="#0b1f3f" text-anchor="middle">'+e(t)+'</text>'};
 var bars=function(X,Y,w,hh,items,val,fmtv){var mx=Math.max.apply(null,items.map(function(i){return val(i)[0]+val(i)[1]}).concat([1])),bh=Math.min(36,(hh-70)/Math.max(items.length,1)-8),o='';
  items.forEach(function(it,i){var y=Y+60+i*(bh+8),v=val(it),w1=v[0]/mx*(w-330),w2=v[1]/mx*(w-330);o+='<text x="'+(X+20)+'" y="'+(y+bh/2+8)+'" font-size="20" fill="#33445f">'+e(it[0]).slice(0,18)+'</text><rect x="'+(X+200)+'" y="'+y+'" width="'+Math.max(w1,0)+'" height="'+bh+'" rx="4" fill="#b8860b"/><rect x="'+(X+200+w1)+'" y="'+y+'" width="'+Math.max(w2,0)+'" height="'+bh+'" rx="4" fill="#1d57b8"/><text x="'+(X+210+w1+w2)+'" y="'+(y+bh/2+8)+'" font-size="20" fill="#0b1f3f" font-weight="600">'+e(fmtv(v[0]+v[1]))+'</text>'});return o};
 s+=panel(40,350,910,330,'จำนวนรถแยกภาค (AB / CC)')+bars(40,350,910,330,zs,function(x){return[x[1].AB,x[1].CC]},function(n){return n+' คัน'});
 s+=panel(970,350,910,330,'มูลค่ารวมแยกภาค (AB / CC)')+bars(970,350,910,330,zs,function(x){return[x[1].vAB,x[1].vCC]},function(n){return n?baht(n):'—'});
 if(canDC())s+=panel(40,700,910,330,'10 DC ที่มีรถมากที่สุด')+bars(40,700,910,330,ds.map(function(x){return['DC '+x[0],x[1]]}),function(x){return[x[1].AB,x[1].CC]},function(n){return n+' คัน'});
 else s+=panel(40,700,910,330,'สัดส่วนชนิดรถ')+bars(40,700,910,330,[['AB รถแห้ง',{AB:A.AB,CC:0}],['CC รถเย็น',{AB:0,CC:A.CC}]],function(x){return[x[1].AB,x[1].CC]},function(n){return n+' คัน'});
 var pr=A.n?A.ph/A.n:0,cx=1425,cy=880,R=110,a=pr*2*Math.PI;
 s+=panel(970,700,910,330,'รถที่มีรูปครบ 4 ด้าน')+'<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="none" stroke="#e9eef7" stroke-width="36"/>'+(pr>0?'<path d="M '+cx+' '+(cy-R)+' A '+R+' '+R+' 0 '+(a>Math.PI?1:0)+' 1 '+(cx+R*Math.sin(a))+' '+(cy-R*Math.cos(a))+'" fill="none" stroke="#1d57b8" stroke-width="36"/>':'')+'<text x="'+cx+'" y="'+(cy+6)+'" font-size="44" font-weight="600" fill="#0b1f3f" text-anchor="middle">'+Math.round(pr*100)+'%</text><text x="'+cx+'" y="'+(cy+44)+'" font-size="22" fill="#55657f" text-anchor="middle">'+A.ph+' / '+A.n+' คัน</text>';
 s+='<text x="40" y="1062" font-size="18" fill="#55657f">สีทอง = AB รถแห้ง · สีน้ำเงิน = CC รถเย็น · มูลค่ารวมคิดจากราคาที่บันทึกไว้เท่านั้น · รูปขึ้นเฉพาะรถที่แอดมินตรวจสอบแล้ว</text></svg>';
 var url=URL.createObjectURL(new Blob([s],{type:'image/svg+xml;charset=utf-8'})),img=await loadImg(url),c=document.createElement('canvas');c.width=W*2;c.height=H*2;var x=c.getContext('2d');x.scale(2,2);x.drawImage(img,0,0);URL.revokeObjectURL(url);
 await save(await new Promise(function(res){c.toBlob(res,'image/png')}),'NIMEX-Fleet-Infographic-'+stamp()+'.png')}finally{loading(false)}}

/* ---------- start ---------- */
shareBtn();
var k=null;try{k=sessionStorage.getItem('fpc-admin-key')}catch(e){}
if(location.hash==='#admin'){if(k){KEY=k;start(true)}else{start(false);askKey()}}else if(k){KEY=k;start(true)}else start(false);
})();
