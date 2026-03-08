import React, { useState, useRef, useEffect, useCallback } from "react";


// ═══════════════════════════════════════════════════════
// PENDAFTARAN AKUN (Register → Menunggu Persetujuan Kabag)
// ═══════════════════════════════════════════════════════
const REG_KEY="pending_registrations";
function loadPendingRegs(){try{return JSON.parse(localStorage.getItem(REG_KEY)||"[]");}catch{return[];}}
function savePendingRegs(regs){localStorage.setItem(REG_KEY,JSON.stringify(regs));}

function RegisterModal({onClose, onSuccess}){
  const NAVY="#0A1628",GOLD="#C9A84C";
  const [form,setForm]=React.useState({nama:"",jabatan:"",noWA:"",username:"",password:"",konfirmasi:"",role:"staf",alasan:""});
  const [err,setErr]=React.useState("");
  const [sent,setSent]=React.useState(false);
  const ROLE_OPTS=[{v:"staf",l:"Staf Protokol"},{v:"staf_input",l:"Staf Protokol (hak input jadwal)"},{v:"timkom",l:"Staf Komunikasi & Dokumentasi"},{v:"ajudan",l:"Ajudan Pimpinan"}];
  const inp={width:"100%",padding:"10px 13px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:14,outline:"none",background:"white",boxSizing:"border-box"};
  const submit=async()=>{
    setErr("");
    if(!form.nama||!form.username||!form.password||!form.jabatan)return setErr("Nama, jabatan, username & password wajib diisi.");
    if(form.password!==form.konfirmasi)return setErr("Konfirmasi password tidak cocok.");
    if(form.password.length<6)return setErr("Password minimal 6 karakter.");
    const existing=loadUsers().find(u=>u.username===form.username.toLowerCase().trim());
    if(existing)return setErr("Username sudah digunakan.");
    const pending=loadPendingRegs();
    if(pending.find(r=>r.username===form.username.toLowerCase().trim()))return setErr("Username sudah pernah didaftarkan, menunggu persetujuan.");
    const hash=await sha256(form.password);
    const reg={...form,username:form.username.toLowerCase().trim(),password:hash,id:Date.now(),tanggal:new Date().toISOString()};
    savePendingRegs([...pending,reg]);
    setSent(true);
  };
  if(sent)return(
    <div style={{position:"fixed",inset:0,zIndex:9000,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"white",borderRadius:20,padding:"36px 28px",maxWidth:380,textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{fontSize:52,marginBottom:12}}>✅</div>
        <div style={{fontSize:18,fontWeight:800,color:NAVY,marginBottom:8}}>Pendaftaran Terkirim</div>
        <div style={{fontSize:13,color:"#64748B",lineHeight:1.6,marginBottom:20}}>Permohonan akun Anda sedang menunggu persetujuan Kabag Protokol dan Komunikasi Pimpinan. Anda akan dihubungi setelah akun diaktifkan.</div>
        <button onClick={onClose} style={{padding:"12px 32px",borderRadius:10,border:"none",background:"linear-gradient(135deg,"+NAVY+",#1B4080)",color:"white",cursor:"pointer",fontWeight:700,fontSize:14}}>Tutup</button>
      </div>
    </div>
  );
  return(
    <div style={{position:"fixed",inset:0,zIndex:9000,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(4px)",overflowY:"auto",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"20px 0 40px"}}>
      <div style={{background:"white",borderRadius:20,width:"100%",maxWidth:440,margin:"0 16px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{background:"linear-gradient(135deg,"+NAVY+",#1B4080)",padding:"20px",borderRadius:"20px 20px 0 0"}}>
          <div style={{color:GOLD,fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>Prokopim Tarakan</div>
          <div style={{color:"white",fontSize:18,fontWeight:800,marginTop:3}}>Daftar Akun Baru</div>
          <div style={{color:"rgba(255,255,255,0.6)",fontSize:12,marginTop:3}}>Perlu persetujuan Kabag sebelum aktif</div>
        </div>
        <div style={{padding:"20px"}}>
          {err&&<div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:9,padding:"10px 13px",marginBottom:14,color:"#991B1B",fontSize:13}}>{err}</div>}
          {[
            {l:"Nama Lengkap",k:"nama",ph:"Nama sesuai NIP/SK"},
            {l:"Jabatan",k:"jabatan",ph:"Contoh: Staf Protokol"},
            {l:"No. WhatsApp",k:"noWA",ph:"08xxxx (opsional)"},
            {l:"Username",k:"username",ph:"Huruf kecil, tanpa spasi"},
          ].map(f=>(
            <div key={f.k} style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:12,fontWeight:700,color:"#475569",marginBottom:4}}>{f.l}</label>
              <input value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} style={inp}/>
            </div>
          ))}
          <div style={{marginBottom:12}}>
            <label style={{display:"block",fontSize:12,fontWeight:700,color:"#475569",marginBottom:4}}>Posisi/Role</label>
            <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} style={{...inp}}>
              {ROLE_OPTS.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}
            </select>
          </div>
          {[{l:"Password",k:"password"},{l:"Konfirmasi Password",k:"konfirmasi"}].map(f=>(
            <div key={f.k} style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:12,fontWeight:700,color:"#475569",marginBottom:4}}>{f.l}</label>
              <input type="password" value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={inp}/>
            </div>
          ))}
          <div style={{marginBottom:18}}>
            <label style={{display:"block",fontSize:12,fontWeight:700,color:"#475569",marginBottom:4}}>Alasan Mendaftar (opsional)</label>
            <textarea value={form.alasan} onChange={e=>setForm(p=>({...p,alasan:e.target.value}))} rows={2} placeholder="Contoh: Staf baru Kasubbag Protokol..." style={{...inp,resize:"none"}}/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onClose} style={{flex:1,padding:"12px",borderRadius:10,border:"1.5px solid #e2e8f0",background:"white",color:"#64748B",cursor:"pointer",fontWeight:600,fontSize:13}}>Batal</button>
            <button onClick={submit} style={{flex:2,padding:"12px",borderRadius:10,border:"none",background:"linear-gradient(135deg,"+NAVY+",#1B4080)",color:"white",cursor:"pointer",fontWeight:800,fontSize:14}}>Kirim Permohonan</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== CONSTANTS ====================
const NAVY="#0A1628", GOLD="#D4AF5A", GREEN="#0D6B4F";
const C={
  navy:"#0A1628", navyMid:"#142238", navyLight:"#1E3254",
  gold:"#D4AF5A", goldLight:"rgba(212,175,90,0.15)",
  green:"#0D6B4F", greenBg:"#ECFDF5",
  red:"#DC2626", redBg:"#FEF2F2",
  amber:"#D97706", amberBg:"#FFFBEB",
  surface:"#F0F4FA", surfaceCard:"#FFFFFF",
  border:"#E4EAF2", borderLight:"rgba(0,0,0,0.06)",
  text:"#0F1C2E", textMid:"#4A5568", textLight:"#94A3B8",
  glass:"rgba(255,255,255,0.08)", glassBorder:"rgba(255,255,255,0.14)",
};
const ALL_ROLE_DEFS=[
  {key:"walikota",      label:"Wali Kota",                     icon:"circle"},
  {key:"wakilwalikota", label:"Wakil Wali Kota",               icon:"circle2"},
  {key:"ajudan",        label:"Ajudan",                        icon:"clip"},
  {key:"timkom",        label:"Tim Komunikasi & Dokumentasi",  icon:"attach"},
  {key:"staf",          label:"Staf Protokol",                 icon:"pencil"},
  {key:"kasubbag",      label:"Kasubbag Protokol",             icon:"search"},
  {key:"kabag",         label:"Kabag Prokopim",                icon:"check"},
];
const WF={
  draft:             {label:"Draft",             color:"#64748b",bg:"#f1f5f9"},
  menunggu_kasubbag: {label:"Menunggu Kasubbag", color:"#d97706",bg:"#fef3c7"},
  menunggu_kabag:    {label:"Menunggu Kabag",    color:"#7c3aed",bg:"#ede9fe"},
  disetujui:         {label:"Disetujui",         color:"#065f46",bg:"#d1fae5"},
  ditolak:           {label:"Ditolak",           color:"#991b1b",bg:"#fee2e2"},
};
// Label display per role
const ROLE_LABEL={
  walikota:"Wali Kota",wakilwalikota:"Wakil Wali Kota",
  kabag:"Kabag Prokopim",
  kasubbag:"Kasubbag Protokol",kasubbag_kominfo:"Kasubbag Komdokpim",
  ajudan:"Ajudan",
  staf:"Staf Protokol",staf_input:"Staf Protokol (Input)",
  timkom:"Staf Komunikasi & Dokumentasi",
};
// Role hierarchy untuk penugasan: siapa bisa menugaskan siapa
const ASSIGN_ROLES={
  kasubbag:["staf","staf_input"],
  kasubbag_kominfo:["timkom"],
  kabag:["staf","staf_input","timkom","ajudan"],
  timkom:["timkom"],
};

// Inject CSS animasi untuk SambutanBlock loading state
if(typeof document!=="undefined"&&!document.getElementById("prokopim-anim")){
  const s=document.createElement("style");
  s.id="prokopim-anim";
  s.textContent=`
    @keyframes prokopim-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
    @keyframes prokopim-slide{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}
    @keyframes prokopim-pulse{0%,100%{opacity:1}50%{opacity:0.5}}
    .prokopim-spin{animation:prokopim-spin 1s linear infinite}
    .prokopim-pulse{animation:prokopim-pulse 1.5s ease infinite}
    .prokopim-slide{animation:prokopim-slide 1.8s ease infinite}
  `;
  document.head.appendChild(s);
}

const PAKAIAN=["PDH","PDH Batik Tarakan","Batik Lengan Panjang","PSL","PSR","PSH","PDUB","Pakaian Lapangan","Pakaian Olahraga","Bebas Rapi"];
const JENIS=["Menghadiri","Sambutan","Pengarahan"];
const PEJABAT=["Sekda","Asisten Pemerintahan dan Kesra","Asisten Perekonomian dan Pembangunan","Asisten Administrasi Umum"];
const ROLES_WITH_REPORT=["staf","staf_input","kasubbag","kasubbag_kominfo","kabag","timkom"];
const STAF_ROLES=["staf","staf_input","timkom"];
const KASUBBAG_ROLES=["kasubbag","kasubbag_kominfo"];

// ==================== USERS ====================
// ══ HASH ENGINE (SHA-256 via Web Crypto, tidak butuh library) ══
async function sha256(str){
  const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
// Verifikasi password: hash input, bandingkan dengan stored hash
async function verifyPassword(plain,hash){
  // Support legacy plaintext selama masa transisi
  if(!hash.startsWith("$sha256$"))return plain===hash;
  return ("$sha256$"+await sha256(plain))===hash;
}
async function hashPassword(plain){
  return "$sha256$"+await sha256(plain);
}
// Hash semua password di array users (untuk migrasi)
async function migratePasswords(users){
  return Promise.all(users.map(async u=>{
    if(u.password&&!u.password.startsWith("$sha256$")){
      return{...u,password:await hashPassword(u.password)};
    }
    return u;
  }));
}

const DEFAULT_USERS=[
  {username:"walikota",      password:"WK@2025",      role:"walikota",      nama:"Wali Kota Tarakan",                jabatan:"Wali Kota Tarakan"},
  {username:"wakilwalikota", password:"WWK@2025",     role:"wakilwalikota", nama:"Wakil Wali Kota Tarakan",          jabatan:"Wakil Wali Kota Tarakan"},
  {username:"ajudan",        password:"Ajudan@2025",  role:"ajudan",        nama:"Ajudan Pimpinan",                  jabatan:"Ajudan"},
  {username:"timkom",        password:"Timkom@2025",  role:"timkom",        nama:"Tim Komunikasi & Dokumentasi",     jabatan:"Tim Komunikasi & Dokumentasi Pimpinan"},
  {username:"staf",          password:"Staf@2025",    role:"staf",          nama:"Staf Protokol",                    jabatan:"Staf Protokol"},
  {username:"kasubbag",      password:"Ksbg@2025",    role:"kasubbag",      nama:"Kasubbag Protokol",                jabatan:"Kasubbag Protokol"},
  {username:"kasubbag_kominfo",password:"Kinfo@2025",  role:"kasubbag_kominfo",nama:"Kasubbag Komdokpim",           jabatan:"Kasubbag Komdokpim"},
  {username:"kabag",         password:"Kabag@2025",   role:"kabag",         nama:"Kabag Protokol & Komunikasi",      jabatan:"Kepala Bagian Protokol & Komunikasi Pimpinan"},
];
function loadUsers(){
  // Pakai cache jika sudah diisi oleh initUsers()
  if(_usersCache)return _usersCache;
  try{
    const s=localStorage.getItem("jp_users");
    const users=s?JSON.parse(s):DEFAULT_USERS;
    const hasPlain=users.some(u=>u.password&&!u.password.startsWith("$sha256$"));
    if(hasPlain){
      migratePasswords(users).then(migrated=>{
        _usersCache=migrated;
        try{localStorage.setItem("jp_users",JSON.stringify(migrated));}catch{}
      });
    }
    return users;
  }catch{return DEFAULT_USERS;}
}
function saveUsers(u){
  _usersCache=u;
  // Simpan ke localStorage sebagai cache offline
  try{localStorage.setItem("jp_users",JSON.stringify(u));}catch{}
  // Sync ke Supabase (fire-and-forget)
  if(SUPA_OK){
    Promise.all(u.map(user=>dbUpsertUser(user))).catch(e=>console.warn("saveUsers Supabase sync error:",e));
  }
}

// ==================== BIOMETRIC (WebAuthn) ====================
function bioKey(username){return "jp_bio_"+username;}
async function bioRegister(username){
  if(!window.PublicKeyCredential)throw new Error("WebAuthn tidak didukung browser ini");
  const challenge=crypto.getRandomValues(new Uint8Array(32));
  const cred=await navigator.credentials.create({publicKey:{
    challenge,
    rp:{name:"Jadwal Pimpinan Tarakan",id:window.location.hostname},
    user:{id:new TextEncoder().encode(username),name:username,displayName:username},
    pubKeyCredParams:[{alg:-7,type:"public-key"},{alg:-257,type:"public-key"}],
    authenticatorSelection:{authenticatorAttachment:"platform",userVerification:"required"},
    timeout:60000
  }});
  const id=btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
  localStorage.setItem(bioKey(username),id);
  return id;
}
async function bioAuthenticate(username){
  const stored=localStorage.getItem(bioKey(username));
  if(!stored)throw new Error("Biometrik belum didaftarkan");
  const rawId=Uint8Array.from(atob(stored),c=>c.charCodeAt(0));
  const challenge=crypto.getRandomValues(new Uint8Array(32));
  await navigator.credentials.get({publicKey:{
    challenge,
    allowCredentials:[{id:rawId,type:"public-key"}],
    userVerification:"required",
    timeout:60000
  }});
  return true;
}
function bioIsRegistered(username){return!!localStorage.getItem(bioKey(username));}
function bioSupported(){return!!(window.PublicKeyCredential&&window.isSecureContext);}

// ==================== SUPABASE ====================
const SUPA_URL=import.meta.env.VITE_SUPABASE_URL||"";
const SUPA_KEY=import.meta.env.VITE_SUPABASE_ANON_KEY||"";
const SUPA_OK=!!(SUPA_URL&&SUPA_KEY);
const H=()=>({"Content-Type":"application/json",apikey:SUPA_KEY,Authorization:"Bearer "+SUPA_KEY});
const forDB=ev=>{const d={...ev};if(d.sambutanFile?.startsWith("data:"))d.sambutanFile=null;if(d.sambutanDocx?.startsWith("blob:")||d.sambutanDocx?.startsWith("data:"))d.sambutanDocx=null;if(d.undanganFile?.startsWith("data:"))d.undanganFile=null;return d;};
async function dbLoadAll(){if(!SUPA_OK)return null;const r=await fetch(SUPA_URL+"/rest/v1/jadwal?select=data&order=id",{headers:H()});if(!r.ok)throw new Error(await r.text());return(await r.json()).map(x=>x.data);}
async function dbUpsert(ev){if(!SUPA_OK)return;await fetch(SUPA_URL+"/rest/v1/jadwal",{method:"POST",headers:{...H(),Prefer:"resolution=merge-duplicates"},body:JSON.stringify({id:ev.id,data:forDB(ev)})});}
async function dbDelete(id){if(!SUPA_OK)return;await fetch(SUPA_URL+"/rest/v1/jadwal?id=eq."+id,{method:"DELETE",headers:H()});}
async function storageUpload(bucket,evId,file){
  if(!SUPA_OK)return null;
  const path=evId+"/"+Date.now()+"_"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
  const r=await fetch(SUPA_URL+"/storage/v1/object/"+bucket+"/"+path,{method:"POST",headers:{apikey:SUPA_KEY,Authorization:"Bearer "+SUPA_KEY,"Content-Type":file.type},body:file});
  if(!r.ok)return null;
  return SUPA_URL+"/storage/v1/object/public/"+bucket+"/"+path;
}
async function storageDelete(bucket,url){
  if(!SUPA_OK||!url)return;
  const m=url.match(/\/object\/public\/[^/]+\/(.+)$/);
  if(m)await fetch(SUPA_URL+"/storage/v1/object/"+bucket+"/"+m[1],{method:"DELETE",headers:{apikey:SUPA_KEY,Authorization:"Bearer "+SUPA_KEY}});
}

// ==================== SUPABASE USERS ====================
let _usersCache = null; // module-level cache

async function dbLoadUsers(){
  if(!SUPA_OK)return null;
  const r=await fetch(SUPA_URL+"/rest/v1/users?select=*&order=username",{headers:H()});
  if(!r.ok)throw new Error(await r.text());
  return await r.json();
}
async function dbUpsertUser(u){
  if(!SUPA_OK)return;
  const{_newPw,...clean}=u; // jangan simpan field temp
  await fetch(SUPA_URL+"/rest/v1/users",{
    method:"POST",
    headers:{...H(),Prefer:"resolution=merge-duplicates"},
    body:JSON.stringify(clean)
  });
}
async function dbDeleteUser(username){
  if(!SUPA_OK)return;
  await fetch(SUPA_URL+"/rest/v1/users?username=eq."+encodeURIComponent(username),{method:"DELETE",headers:H()});
}
async function initUsers(){
  // Prioritas: Supabase → localStorage → DEFAULT_USERS
  if(!SUPA_OK){
    _usersCache=null; // biarkan loadUsers() pakai localStorage
    return loadUsers();
  }
  try{
    const rows=await dbLoadUsers();
    if(rows&&rows.length>0){
      _usersCache=rows;
      try{localStorage.setItem("jp_users",JSON.stringify(rows));}catch{}
      // Migrasi password plaintext jika ada
      const hasPlain=rows.some(u=>u.password&&!u.password.startsWith("$sha256$"));
      if(hasPlain){
        const migrated=await migratePasswords(rows);
        _usersCache=migrated;
        await Promise.all(migrated.map(u=>dbUpsertUser(u))).catch(()=>{});
        try{localStorage.setItem("jp_users",JSON.stringify(migrated));}catch{}
      }
      return _usersCache;
    } else {
      // Supabase kosong — seed dari localStorage
      const local=loadUsers();
      const migrated=await migratePasswords(local);
      _usersCache=migrated;
      await Promise.all(migrated.map(u=>dbUpsertUser(u))).catch(console.warn);
      return migrated;
    }
  }catch(e){
    console.warn("initUsers Supabase error, fallback localStorage:",e.message);
    _usersCache=null;
    return loadUsers();
  }
}

// ==================== HELPERS ====================
const HARI_ID=["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const getHari=d=>d?HARI_ID[new Date(d+"T00:00:00").getDay()]:"";
const fmt=d=>d?new Date(d+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}):"--";
const fmtShort=d=>d?new Date(d+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}):"--";
const toMin=t=>{if(!t)return 0;const[h,m]=t.split(":").map(Number);return h*60+m;};
const todayStr=()=>new Date().toISOString().slice(0,10);
const tomorrowStr=()=>{const d=new Date();d.setDate(d.getDate()+1);return d.toISOString().slice(0,10);};
const weekStart=()=>{const d=new Date();d.setDate(d.getDate()-d.getDay()+1);return d.toISOString().slice(0,10);};
const weekEnd=()=>{const d=new Date();d.setDate(d.getDate()-d.getDay()+7);return d.toISOString().slice(0,10);};
const monthStart=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-01";};
const monthEnd=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth()+1,0).toISOString().slice(0,10);};
const hasConflict=(events,ev)=>{const s=toMin(ev.jam),e2=s+120;return events.some(e=>e.id!==ev.id&&e.alur==="disetujui"&&e.tanggal===ev.tanggal&&e.untukPimpinan.some(p=>ev.untukPimpinan?.includes(p))&&(()=>{const es=toMin(e.jam),ee=es+120;return s<ee&&e2>es;})());};
function makeICS(ev){
  const[y,mo,d]=ev.tanggal.split("-");
  const[hh,mm]=(ev.jam||"08:00").split(":");
  const pad=n=>String(n).padStart(2,"0");
  const dtStart=y+mo+d+"T"+pad(hh)+pad(mm)+"00";
  const endHr=parseInt(hh)+2;
  const dtEnd=y+mo+d+"T"+pad(endHr)+pad(mm)+"00";
  const desc=[
    ev.penyelenggara&&"Penyelenggara: "+ev.penyelenggara,
    ev.kontak&&"Kontak: "+ev.kontak,
    ev.pakaian&&"Pakaian: "+ev.pakaian,
    ev.jenisKegiatan&&"Jenis: "+ev.jenisKegiatan,
    ev.catatan&&"Catatan: "+ev.catatan,
  ].filter(Boolean).join("\n");
  const lines=[
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Protokol Tarakan//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:ev"+ev.id+"-"+ev.tanggal+"@protokol.tarakankota.go.id",
    "DTSTART:"+dtStart,
    "DTEND:"+dtEnd,
    "SUMMARY:"+ev.namaAcara,
    ...(ev.lokasi?["LOCATION:"+ev.lokasi]:[]),
    ...(desc?["DESCRIPTION:"+desc.split("\n").join("\\n")]:[]),
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Pengingat: "+ev.namaAcara,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return "data:text/calendar;charset=utf8,"+encodeURIComponent(lines.join("\r\n"));
}
function useWindowWidth(){const[w,setW]=useState(typeof window!=="undefined"?window.innerWidth:1280);useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);return w;}

// ==================== SEED ====================
const T=todayStr(),TMR=tomorrowStr();
const mkEv=o=>({alur:"disetujui",catatanTolak:"",statusWK:null,statusWWK:null,perwakilanWK:"",perwakilanWWK:"",delegasiKeWWK:false,sambutanFile:null,sambutanNama:"",sambutanDocx:null,sambutanDocxNama:"",undanganFile:null,undanganNama:"",catatanPimpinan:"",tersembunyi:false,alurHapus:null,lokasi:"",personil:[],catatanPenugasan:"",evaluasi:{},...o});
const seed=[
  mkEv({id:1,tanggal:T,jam:"09:00",namaAcara:"Rapat Koordinasi Infrastruktur",penyelenggara:"Dinas PUPR",kontak:"Budi 0812-3456-7890",buktiUndangan:"No.045/PUPR/2025",pakaian:"PDH",lokasi:"Ruang Rapat Lt.3 Balaikota Tarakan",jenisKegiatan:"Sambutan",catatan:"Ruang Rapat Lt.3",untukPimpinan:["walikota","wakilwalikota"]}),
  mkEv({id:2,tanggal:T,jam:"14:00",namaAcara:"Peresmian Taman Kota Baru",penyelenggara:"Dinas LH",kontak:"Sari 0813-9876-5432",buktiUndangan:"No.023/DLH/2025",pakaian:"Batik Lengan Panjang",lokasi:"Taman Kota Baru Tarakan",jenisKegiatan:"Sambutan",catatan:"Outdoor, bawa payung.",untukPimpinan:["walikota"],statusWK:"hadir"}),
  mkEv({id:3,tanggal:TMR,jam:"10:00",namaAcara:"Audiensi DPRD - Pembahasan APBD",penyelenggara:"Sekretariat DPRD",kontak:"Ahmad 0811-2222-3333",buktiUndangan:"No.110/DPRD/2025",pakaian:"PSH",lokasi:"Gedung DPRD Kota Tarakan",jenisKegiatan:"Pengarahan",catatan:"Bawa dokumen APBD",untukPimpinan:["walikota","wakilwalikota"],alur:"menunggu_kasubbag"}),
  mkEv({id:4,tanggal:TMR,jam:"08:00",namaAcara:"Apel Pagi Gabungan",penyelenggara:"Sekretariat Daerah",kontak:"Hendra 0815-1111-2222",buktiUndangan:"Memo No.5/2025",pakaian:"PDH",lokasi:"Halaman Kantor Wali Kota Tarakan",jenisKegiatan:"Menghadiri",catatan:"",untukPimpinan:["walikota"],alur:"menunggu_kabag"}),
];
const emptyForm={tanggal:"",jam:"",namaAcara:"",penyelenggara:"",kontak:"",buktiUndangan:"",pakaian:"PDH",jenisKegiatan:"Menghadiri",catatan:"",lokasi:"",untukPimpinan:["walikota"],undanganFile:null,undanganNama:"",personil:[],catatanPenugasan:""};

// ==================== SMALL COMPONENTS ====================
const StatusPill=({alur,hapus})=>{
  if(hapus)return <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:"#fff1f2",color:"#e11d48",whiteSpace:"nowrap"}}>Minta Hapus</span>;
  const c=WF[alur]||WF.draft;
  return <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:c.bg,color:c.color,whiteSpace:"nowrap"}}>{c.label}</span>;
};
const JenisBadge=({j})=>{const m={Sambutan:{bg:"#fdf4ff",c:"#9333ea"},Pengarahan:{bg:"#eff6ff",c:"#2563eb"},Menghadiri:{bg:"#f0fdf4",c:"#16a34a"}};const x=m[j]||{bg:"#f1f5f9",c:"#64748b"};return <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:x.bg,color:x.c}}>{j}</span>;};
function Toast({msg,type}){
  const bg=type==="error"?"rgba(220,38,38,0.96)":type==="warn"?"rgba(217,119,6,0.96)":"rgba(10,22,40,0.95)";
  const icon=type==="error"?"⚠️":type==="warn"?"⚡":"✓";
  return <div style={{position:"fixed",top:"env(safe-area-inset-top,20px)",marginTop:20,left:"50%",transform:"translateX(-50%)",zIndex:9999,padding:"11px 18px",borderRadius:40,background:bg,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",color:"white",boxShadow:"0 8px 32px rgba(0,0,0,0.28)",fontSize:13,fontWeight:600,whiteSpace:"pre-wrap",display:"flex",alignItems:"center",gap:7,animation:"upSpring 0.3s ease",maxWidth:"calc(100vw - 40px)",textAlign:"center"}}>
    <span style={{fontSize:14}}>{icon}</span>{msg}
  </div>;
}

// ==================== DELEGATE MODAL ====================
function DelegateModal({label,onConfirm,onCancel}){
  const[sel,setSel]=useState("");const[cust,setCust]=useState("");const fin=sel==="__c__"?cust:sel;
  return <div style={{position:"fixed",inset:0,zIndex:8200,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:"white",borderRadius:16,padding:20,width:"100%",maxWidth:400}} onClick={e=>e.stopPropagation()}>
      <div style={{fontSize:15,fontWeight:700,color:NAVY,marginBottom:4}}>Wakilkan Tugas</div>
      <div style={{fontSize:13,color:"#64748b",marginBottom:12}}>Pilih pejabat mewakili <strong>{label}</strong>:</div>
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
        {PEJABAT.map(p=><button key={p} onClick={()=>setSel(p===sel?"":p)} style={{padding:"10px 13px",borderRadius:9,border:"1.5px solid "+(sel===p?NAVY:"#e2e8f0"),background:sel===p?"#EBF0FA":"white",color:sel===p?NAVY:"#334155",cursor:"pointer",fontSize:13,textAlign:"left",fontWeight:sel===p?700:400}}>{p}</button>)}
        <button onClick={()=>setSel("__c__")} style={{padding:"10px 13px",borderRadius:9,border:"1.5px solid "+(sel==="__c__"?NAVY:"#e2e8f0"),background:sel==="__c__"?"#EBF0FA":"white",color:sel==="__c__"?NAVY:"#334155",cursor:"pointer",fontSize:13,textAlign:"left"}}>Pejabat lainnya...</button>
      </div>
      {sel==="__c__"&&<input placeholder="Nama pejabat..." value={cust} onChange={e=>setCust(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #e2e8f0",fontSize:14,marginBottom:12}}/>}
      {fin&&<div style={{background:"#f0f9ff",borderRadius:8,padding:"8px 11px",marginBottom:12,border:"1px solid #bae6fd",fontSize:13,color:"#0284c7"}}><strong>{fin}</strong> akan mewakili.</div>}
      <div style={{display:"flex",gap:8}}>
        <button onClick={onCancel} style={{flex:1,padding:"11px",borderRadius:9,border:"1.5px solid #e2e8f0",background:"white",color:"#64748b",cursor:"pointer",fontSize:13,fontWeight:600}}>Batal</button>
        <button onClick={()=>fin.trim()&&onConfirm(fin)} disabled={!fin.trim()} style={{flex:2,padding:"11px",borderRadius:9,border:"none",background:fin.trim()?NAVY:"#e2e8f0",color:fin.trim()?"white":"#94a3b8",cursor:fin.trim()?"pointer":"default",fontSize:13,fontWeight:700}}>Konfirmasi</button>
      </div>
    </div>
  </div>;
}

// ==================== PDF/IMAGE VIEWER MODAL ====================
function FileViewModal({file,nama,onClose}){
  const isImg=nama&&(nama.match(/\.(jpg|jpeg|png|gif|webp)$/i)||file?.startsWith("data:image"));
  return <div style={{position:"fixed",inset:0,zIndex:8500,background:"rgba(0,0,0,0.88)",display:"flex",flexDirection:"column"}} onClick={onClose}>
    <div style={{background:NAVY,padding:"11px 16px",display:"flex",alignItems:"center",gap:10}} onClick={e=>e.stopPropagation()}>
      <span style={{color:"white",fontSize:14,fontWeight:700,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nama}</span>
      <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:7,color:"white",padding:"6px 12px",cursor:"pointer",fontSize:13,fontWeight:700}}>Tutup</button>
    </div>
    <div style={{flex:1,overflow:"auto",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.stopPropagation()}>
      {isImg?<img src={file} alt={nama} style={{maxWidth:"100%",maxHeight:"80vh",borderRadius:8,boxShadow:"0 4px 24px rgba(0,0,0,0.5)"}}/>:<iframe src={file} title={nama} style={{width:"100%",height:"80vh",border:"none",borderRadius:8}}/>}
    </div>
    <div style={{background:NAVY,padding:"10px 16px"}} onClick={e=>e.stopPropagation()}>
      <a href={file} download={nama} style={{display:"block",padding:"11px",borderRadius:9,background:GOLD,color:NAVY,textAlign:"center",fontSize:14,fontWeight:700,textDecoration:"none"}}>Unduh File</a>
    </div>
  </div>;
}

// ==================== UNDANGAN UPLOAD ====================
function UndanganBlock({ev,canEdit,onUpload,onRemove}){
  const ref=useRef();const[load,setL]=useState(false);const[view,setV]=useState(false);
  const handleFile=f=>{
    if(!f)return;
    const ok=f.type==="application/pdf"||f.type.startsWith("image/");
    if(!ok){alert("Hanya PDF atau gambar (JPG/PNG).");return;}
    if(f.size>15*1024*1024){alert("Maks 15MB.");return;}
    setL(true);onUpload(f,f.name).finally(()=>setL(false));
  };
  const isImg=ev.undanganNama?.match(/\.(jpg|jpeg|png|webp)$/i);
  if(ev.undanganFile)return <>
    {view&&<FileViewModal file={ev.undanganFile} nama={ev.undanganNama||"Berkas Undangan"} onClose={()=>setV(false)}/>}
    <div style={{background:"#f0f9ff",borderRadius:10,padding:11,border:"1.5px solid #bae6fd"}}>
      <div style={{fontSize:12,color:"#0284c7",fontWeight:700,marginBottom:7}}>Berkas Undangan</div>
      <div style={{display:"flex",alignItems:"center",gap:8,background:"white",borderRadius:8,padding:"8px 10px",border:"1px solid #bae6fd",marginBottom:7}}>
        <span style={{fontSize:16}}>{isImg?"IMG":"PDF"}</span>
        <div style={{flex:1,minWidth:0,fontSize:12,fontWeight:600,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.undanganNama||"Berkas Undangan"}</div>
      </div>
      <div style={{display:"flex",gap:7}}>
        <button onClick={()=>setV(true)} style={{flex:1,padding:"8px",borderRadius:8,border:"1.5px solid #0284c7",background:"white",color:"#0284c7",cursor:"pointer",fontSize:12,fontWeight:700}}>Lihat</button>
        <a href={ev.undanganFile} download={ev.undanganNama} style={{flex:1,padding:"8px",borderRadius:8,border:"none",background:"#0284c7",color:"white",textDecoration:"none",textAlign:"center",fontSize:12,fontWeight:700,display:"block"}}>Unduh</a>
        {canEdit&&<><input ref={ref} type="file" accept="application/pdf,image/*" onChange={e=>{handleFile(e.target.files[0]);e.target.value="";}} style={{display:"none"}}/><button onClick={()=>ref.current.click()} disabled={load} style={{padding:"8px 10px",borderRadius:8,border:"1.5px solid #94a3b8",background:"white",color:"#64748b",cursor:load?"default":"pointer",fontSize:11,fontWeight:700}}>{load?"...":"Ganti"}</button><button onClick={onRemove} style={{padding:"8px 10px",borderRadius:8,border:"1.5px solid #fca5a5",background:"white",color:"#ef4444",cursor:"pointer",fontSize:11,fontWeight:700}}>Hapus</button></>}
      </div>
    </div>
  </>;
  if(!canEdit)return <div style={{padding:"8px 10px",background:"#fef9c3",borderRadius:8,fontSize:12,color:"#92400e",fontWeight:600}}>Berkas undangan belum diupload</div>;
  return <div style={{background:"#fafafa",borderRadius:10,padding:11,border:"1.5px dashed #7dd3fc"}}>
    <div style={{fontSize:12,color:"#64748b",fontWeight:700,marginBottom:6}}>Upload Berkas Undangan (Opsional)</div>
    <input ref={ref} type="file" accept="application/pdf,image/*" onChange={e=>{handleFile(e.target.files[0]);e.target.value="";}} style={{display:"none"}}/>
    <button onClick={()=>ref.current.click()} disabled={load} style={{width:"100%",padding:"11px",borderRadius:8,border:"1.5px dashed #0284c7",background:load?"#f1f5f9":"white",color:"#0284c7",cursor:load?"default":"pointer",fontSize:13,fontWeight:700}}>{load?"Mengunggah...":"Upload PDF / Foto Undangan"}</button>
  </div>;
}

// ==================== SAMBUTAN BLOCK (DOCX→PDF) ====================
function SambutanBlock({ev,canUpload,onUploadDocx,onRemove}){
  const NAVY="#0A1628",GREEN="#0D6B4F",GOLD="#C9A84C";
  const ref=useRef();
  const[step,setStep]=React.useState("idle"); // idle|processing|done|error
  const[progress,setProgress]=React.useState("");
  const[pdfPreview,setPdfPreview]=React.useState(null);
  const[errMsg,setErrMsg]=React.useState("");
  const[viewPdf,setViewPdf]=React.useState(false);
  const[drag,setDrag]=React.useState(false);

  const DOCX_MIME="application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const handleFile=async(f)=>{
    if(!f)return;
    const isDocx=f.type===DOCX_MIME||f.name.toLowerCase().endsWith(".docx");
    if(!isDocx){alert("Hanya file .docx yang diterima untuk naskah sambutan.");return;}
    if(f.size>5*1024*1024){alert("Ukuran file maks 5MB.");return;}
    setStep("processing");setErrMsg("");
    try{
      setProgress("Membaca dokumen DOCX...");
      await new Promise(r=>setTimeout(r,300));
      setProgress("Mengolah isi naskah...");
      await new Promise(r=>setTimeout(r,400));
      setProgress("Membuat PDF resmi...");
      const result=await onUploadDocx(f);
      if(result?.pdfBase64){
        setPdfPreview("data:application/pdf;base64,"+result.pdfBase64);
      }
      setStep("done");setProgress("");
    }catch(e){
      setStep("error");setErrMsg(e.message||"Gagal memproses file");
    }
  };

  const handleDrop=e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0]);};

  // ── Tampilan setelah ada PDF ──
  if(ev.sambutanFile){
    const previewUrl=pdfPreview||ev.sambutanFile;
    return <>
      {/* Preview modal */}
      {viewPdf&&<div style={{position:"fixed",inset:0,zIndex:8500,background:"rgba(0,0,0,0.92)",display:"flex",flexDirection:"column"}}>
        <div style={{background:NAVY,padding:"11px 16px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <span style={{color:"white",fontWeight:700,fontSize:13,flex:1}}>📄 {ev.sambutanNama}</span>
          {ev.sambutanDocx&&<a href={ev.sambutanDocx} download={ev.sambutanDocxNama||"naskah.docx"} style={{padding:"6px 12px",borderRadius:7,background:GOLD,color:NAVY,textDecoration:"none",fontSize:11,fontWeight:700}}>⬇ DOCX Asli</a>}
          <a href={ev.sambutanFile} download={ev.sambutanNama} style={{padding:"6px 12px",borderRadius:7,background:"white",color:NAVY,textDecoration:"none",fontSize:11,fontWeight:700}}>⬇ PDF</a>
          <button onClick={()=>setViewPdf(false)} style={{padding:"6px 12px",borderRadius:7,background:"rgba(255,255,255,0.15)",border:"none",color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>✕ Tutup</button>
        </div>
        <div style={{flex:1,overflow:"hidden",background:"#1a1a2e",display:"flex",alignItems:"stretch"}}>
          <iframe src={previewUrl+"#toolbar=1&navpanes=0"} title="Naskah Sambutan" style={{width:"100%",border:"none"}}/>
        </div>
      </div>}
      <div style={{background:"linear-gradient(135deg,#ECFDF5,#D1FAE5)",borderRadius:12,padding:13,border:"1.5px solid #6EE7B7"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:GREEN,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>📄</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:800,color:GREEN}}>Naskah Sambutan</div>
            <div style={{fontSize:11,color:"#065f46",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.sambutanNama}</div>
            {ev.sambutanDocxNama&&<div style={{fontSize:10,color:"#6B7280",marginTop:1}}>📎 DOCX: {ev.sambutanDocxNama}</div>}
          </div>
        </div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          <button onClick={()=>setViewPdf(true)} style={{flex:1,minWidth:80,padding:"9px 8px",borderRadius:9,border:"none",background:NAVY,color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>👁 Baca PDF</button>
          <a href={ev.sambutanFile} download={ev.sambutanNama} style={{flex:1,minWidth:80,padding:"9px 8px",borderRadius:9,border:"1.5px solid "+NAVY,background:"white",color:NAVY,textDecoration:"none",textAlign:"center",fontSize:12,fontWeight:700}}>⬇ Unduh PDF</a>
          {canUpload&&<><button onClick={()=>{if(ref.current)ref.current.click();}} style={{padding:"9px 10px",borderRadius:9,border:"1.5px solid #94A3B8",background:"white",color:"#475569",cursor:"pointer",fontSize:11,fontWeight:700}}>🔄 Ganti</button><button onClick={onRemove} style={{padding:"9px 10px",borderRadius:9,border:"1.5px solid #FCA5A5",background:"white",color:"#EF4444",cursor:"pointer",fontSize:11,fontWeight:700}}>🗑</button><input ref={ref} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e=>{handleFile(e.target.files[0]);e.target.value="";}} style={{display:"none"}}/></>}
        </div>
      </div>
    </>;
  }

  // ── Upload area ──
  if(canUpload){
    const isProcessing=step==="processing";
    return <div
      onDragOver={e=>{e.preventDefault();setDrag(true);}}
      onDragLeave={()=>setDrag(false)}
      onDrop={handleDrop}
      style={{borderRadius:12,border:"2px dashed "+(drag?"#6366F1":isProcessing?"#A5B4FC":"#C4B5FD"),background:drag?"#F5F3FF":isProcessing?"#F8F7FF":"#FAFAFA",padding:"20px 16px",transition:"all 0.2s"}}>
      <input ref={ref} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e=>{handleFile(e.target.files[0]);e.target.value="";}} style={{display:"none"}}/>
      <div style={{textAlign:"center"}}>
        {isProcessing
          ?<>
            <div style={{fontSize:28,marginBottom:8,className:"prokopim-pulse"}}>⚙️</div>
            <div style={{fontSize:13,fontWeight:700,color:"#4F46E5",marginBottom:4}}>Memproses Naskah...</div>
            <div style={{fontSize:11,color:"#818CF8"}}>{progress}</div>
            <div style={{marginTop:12,height:4,background:"#E0E7FF",borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",background:"linear-gradient(90deg,#6366F1,#A5B4FC)",borderRadius:4,className:"prokopim-slide"}}/>
            </div>
          </>
          :step==="error"
          ?<>
            <div style={{fontSize:28,marginBottom:6}}>❌</div>
            <div style={{fontSize:13,fontWeight:700,color:"#DC2626",marginBottom:4}}>{errMsg}</div>
            <button onClick={()=>{setStep("idle");setErrMsg("");}} style={{padding:"8px 18px",borderRadius:8,border:"1.5px solid #94A3B8",background:"white",color:"#475569",cursor:"pointer",fontSize:12,fontWeight:600}}>Coba Lagi</button>
          </>
          :<>
            <div style={{fontSize:32,marginBottom:8}}>📝</div>
            <div style={{fontSize:13,fontWeight:700,color:"#4F46E5",marginBottom:4}}>Upload Naskah Sambutan</div>
            <div style={{fontSize:11,color:"#6B7280",marginBottom:12}}>Format .docx · Maks 5MB · Auto-convert ke PDF resmi</div>
            <button onClick={()=>ref.current.click()} style={{padding:"10px 22px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"white",cursor:"pointer",fontSize:13,fontWeight:700,boxShadow:"0 3px 10px rgba(99,102,241,0.35)"}}>Pilih File DOCX</button>
            <div style={{fontSize:10,color:"#9CA3AF",marginTop:8}}>atau seret & lepas file di sini</div>
          </>
        }
      </div>
    </div>;
  }
  return <div style={{padding:"9px 12px",background:"#FEF9C3",borderRadius:8,fontSize:12,color:"#92400E",fontWeight:600}}>⏳ Naskah sambutan belum diupload</div>;
}

// ==================== AI MODAL ====================
function AIModal({onFill,onClose}){
  const ref=useRef();const[drag,setDrag]=useState(false);const[loading,setLoading]=useState(false);const[result,setResult]=useState(null);const[edited,setEdited]=useState(null);const[err,setErr]=useState("");
  // Kompres gambar ke maks 1024px & kualitas 0.75 sebelum kirim ke API
  const compressImage=async(file)=>{
    return new Promise((resolve)=>{
      const img=new Image();
      const url=URL.createObjectURL(file);
      img.onload=()=>{
        URL.revokeObjectURL(url);
        const MAX=1024;
        let w=img.width,h=img.height;
        if(w>MAX||h>MAX){if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;}}
        const canvas=document.createElement("canvas");
        canvas.width=w;canvas.height=h;
        canvas.getContext("2d").drawImage(img,0,0,w,h);
        const compressed=canvas.toDataURL("image/jpeg",0.75);
        resolve(compressed.split(",")[1]);
      };
      img.onerror=()=>{
        // Gagal kompres, pakai original
        const r=new FileReader();
        r.onload=e=>resolve(e.target.result.split(",")[1]);
        r.readAsDataURL(file);
      };
      img.src=url;
    });
  };

  const analyze=async f=>{
    setLoading(true);setErr("");setResult(null);setEdited(null);
    try{
      const isPdf=f.type==="application/pdf";
      let b64,mimeType;
      if(isPdf){
        // PDF: baca langsung, cek ukuran max 4MB
        if(f.size>4*1024*1024){setErr("PDF terlalu besar (maks 4MB). Coba PDF yang lebih kecil.");setLoading(false);return;}
        b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(f);});
        mimeType="application/pdf";
      } else {
        // Gambar: kompres dulu ke maks 1024px / JPEG 75%
        b64=await compressImage(f);
        mimeType="image/jpeg";
      }
      const PROMPT='Balas HANYA JSON ini tanpa penjelasan. Tanggal: YYYY-MM-DD, Jam: HH:MM: {"namaAcara":"","tanggal":"","jam":"","penyelenggara":"","kontak":"","pakaian":"","jenisKegiatan":"","catatan":"","buktiUndangan":"","lokasi":"","untukPimpinan":["walikota"]}';
      const bodyContent=isPdf
        ?[{type:"document",source:{type:"base64",media_type:mimeType,data:b64}},{type:"text",text:PROMPT}]
        :[{type:"image",source:{type:"base64",media_type:mimeType,data:b64}},{type:"text",text:PROMPT}];
      // Call via /api/ai proxy (Vercel serverless function) to avoid CORS & hide API key
      const resp=await fetch("/api/ai",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          messages:[{role:"user",content:bodyContent}]
        })
      });
      const data=await resp.json().catch(()=>null);
      if(!resp.ok){
        const errMsg=data&&data.error?(typeof data.error==="string"?data.error:JSON.stringify(data.error)):"Server error HTTP "+resp.status+" — cek Vercel Function Logs";
        throw new Error(errMsg);
      }
      if(data&&data.error){const em=typeof data.error==="string"?data.error:JSON.stringify(data.error);throw new Error(em);}
      if(!data||!data.content){throw new Error("Respons tidak valid: "+(data?JSON.stringify(data).slice(0,200):"null"));}
      const txt=(data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
      const cleaned=txt.replace(/```(?:json)?\s*/gi,"").replace(/```/g,"").trim();
      const m=cleaned.match(/{[\s\S]*}/);
      if(!m)throw new Error("AI tidak mengembalikan JSON. Respons: "+cleaned.slice(0,120));
      const parsed=JSON.parse(m[0]);
      setResult(parsed);
      setEdited({...emptyForm,...parsed});
    }catch(e){
      if(e.message.includes("Failed to fetch")||e.message.includes("NetworkError")){
        setErr("Koneksi gagal. Periksa: (1) File api/ai.js sudah ada di GitHub, (2) GEMINI_API_KEY sudah diset di Vercel Environment Variables, (3) Klik Redeploy di Vercel setelah menambah env variable.");
      } else {
        setErr(typeof e.message==="string"?e.message:JSON.stringify(e.message));
      }
    }
    setLoading(false);
  };
  const handleFile=f=>{if(!f)return;if(!f.type.match(/pdf|image/)){setErr("Gunakan PDF atau gambar.");return;}analyze(f);};
  const inp={width:"100%",padding:"9px 11px",borderRadius:8,border:"1.5px solid #e2e8f0",fontSize:14,background:"white",color:"#1e293b"};
  return <div style={{position:"fixed",inset:0,zIndex:8100,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:520,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"16px 20px 12px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:10}}>
        <div style={{flex:1}}><div style={{fontSize:16,fontWeight:700,color:NAVY}}>Analisa Undangan AI</div><div style={{fontSize:12,color:"#64748b"}}>Upload PDF/foto undangan, form terisi otomatis</div></div>
        <button onClick={onClose} style={{background:"#f1f5f9",border:"none",borderRadius:7,padding:"6px 10px",cursor:"pointer",fontSize:13,fontWeight:700,color:"#64748b"}}>Tutup</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px 20px"}}>
        {!result&&!loading&&<>
          <input ref={ref} type="file" accept="application/pdf,image/*" onChange={e=>{handleFile(e.target.files[0]);e.target.value="";}} style={{display:"none"}}/>
          <div onClick={()=>ref.current.click()} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0]);}} style={{border:"2px dashed "+(drag?"#6366f1":"#c7d2fe"),borderRadius:12,padding:"36px 20px",textAlign:"center",cursor:"pointer",background:drag?"#eef2ff":"#f8faff"}}>
            <div style={{fontSize:36,marginBottom:10}}>Unggah</div>
            <div style={{fontSize:15,fontWeight:700,color:NAVY,marginBottom:4}}>Seret atau klik untuk upload</div>
            <div style={{fontSize:13,color:"#64748b"}}>PDF, JPG, atau PNG undangan</div>
          </div>
          {err&&<div style={{marginTop:12,padding:"10px 12px",background:"#fee2e2",borderRadius:8,fontSize:13,color:"#991b1b"}}>{err}</div>}
        </>}
        {loading&&<div style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{width:48,height:48,border:"4px solid #e0e7ff",borderTopColor:"#6366f1",borderRadius:"50%",animation:"spin 0.9s linear infinite",margin:"0 auto 16px"}}/>
          <div style={{fontSize:14,fontWeight:700,color:NAVY,marginBottom:6}}>AI sedang membaca dokumen...</div>
          <div style={{fontSize:12,color:"#64748b"}}>Menganalisa isi undangan, mohon tunggu</div>
          <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
        </div>}
        {edited&&<>
          <div style={{background:"#d1fae5",borderRadius:9,padding:"9px 12px",marginBottom:14,fontSize:13,color:GREEN,fontWeight:700}}>Analisa selesai. Periksa dan edit sebelum digunakan.</div>
          {[{k:"namaAcara",l:"Nama Acara"},{k:"tanggal",l:"Tanggal",t:"date"},{k:"jam",l:"Jam",t:"time"},{k:"penyelenggara",l:"Penyelenggara"},{k:"kontak",l:"Kontak"},{k:"buktiUndangan",l:"No. Surat"},{k:"lokasi",l:"Lokasi"},{k:"catatan",l:"Catatan"}].map(f=><div key={f.k} style={{marginBottom:9}}><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:3}}>{f.l}</label><input type={f.t||"text"} value={edited[f.k]||""} onChange={e=>setEdited(p=>({...p,[f.k]:e.target.value}))} style={inp}/></div>)}
          <div style={{marginBottom:9}}><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:3}}>Pakaian</label><select value={edited.pakaian||"PDH"} onChange={e=>setEdited(p=>({...p,pakaian:e.target.value}))} style={{...inp,WebkitAppearance:"none"}}>{PAKAIAN.map(x=><option key={x}>{x}</option>)}</select></div>
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button onClick={()=>{setResult(null);setEdited(null);setErr("");}} style={{flex:1,padding:"11px",borderRadius:9,border:"1.5px solid #e2e8f0",background:"white",cursor:"pointer",fontSize:13,fontWeight:600,color:"#64748b"}}>Ulangi</button>
            <button onClick={()=>onFill(edited)} style={{flex:2,padding:"11px",borderRadius:9,border:"none",background:NAVY,color:"white",cursor:"pointer",fontSize:13,fontWeight:700}}>Gunakan Data Ini</button>
          </div>
        </>}
      </div>
    </div>
  </div>;
}

// ==================== SUMMARY MODAL ====================
function SummaryModal({events,onToggleHide,onClose}){
  const today=todayStr();
  const todayEvs=events.filter(e=>e.tanggal===today&&e.alur==="disetujui").sort((a,b)=>a.jam.localeCompare(b.jam));
  const pub=todayEvs.filter(e=>!e.tersembunyi);
  const shareText=["*AGENDA KEGIATAN PIMPINAN*","*"+getHari(today)+", "+fmt(today)+"*","",...pub.flatMap((ev,i)=>[`*${i+1}. ${ev.namaAcara}*`,ev.jam+" WITA",ev.penyelenggara,...(ev.lokasi?["Lokasi: "+ev.lokasi]:[]),"Pakaian: "+ev.pakaian,...(ev.catatan?["Catatan: "+ev.catatan]:[]),""]),"_Bagian Protokol & Komunikasi Pimpinan_"].join("\n");
  const copy=()=>{navigator.clipboard.writeText(shareText).catch(()=>{const ta=document.createElement("textarea");ta.value=shareText;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);});};
  const print=()=>{const w=window.open("","_blank");w.document.write("<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Agenda</title><style>@page{size:A4;margin:2cm}body{font-family:Arial,sans-serif;font-size:12pt}.h1{font-size:14pt;font-weight:900;color:#0B2545;text-align:center;margin:0 0 4px}.h2{text-align:center;font-size:11pt;color:#475569;margin:0 0 14px}.ev{margin-bottom:14px;padding:10px 14px;border-left:4px solid #0B2545;background:#f8fafc}.ev-t{font-size:13pt;font-weight:700;color:#0B2545;margin-bottom:3px}.ev-r{font-size:10pt;color:#334155;margin:2px 0}.footer{margin-top:20px;text-align:center;font-size:9pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px}</style></head><body><p class='h1'>AGENDA KEGIATAN PIMPINAN</p><p class='h2'>"+getHari(today)+", "+fmt(today)+"</p>"+pub.map((ev,i)=>"<div class='ev'><div class='ev-t'>"+(i+1)+". "+ev.namaAcara+"</div><div class='ev-r'>"+ev.jam+" WITA | "+ev.penyelenggara+"</div>"+(ev.lokasi?"<div class='ev-r'>Lokasi: "+ev.lokasi+"</div>":"")+"<div class='ev-r'>Pakaian: "+ev.pakaian+"</div>"+(ev.catatan?"<div class='ev-r'>Catatan: "+ev.catatan+"</div>":"")+"</div>").join("")+"<div class='footer'>Bagian Protokol &amp; Komunikasi Pimpinan</div></body></html>");w.document.close();w.focus();setTimeout(()=>w.print(),400);};
  return <div style={{position:"fixed",inset:0,zIndex:8100,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:500,maxHeight:"88vh",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"16px 20px 12px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:10}}>
        <div style={{flex:1}}><div style={{fontSize:16,fontWeight:700,color:NAVY}}>Rekap Agenda Hari Ini</div><div style={{fontSize:12,color:"#64748b"}}>{fmt(today)} | {pub.length}/{todayEvs.length} ditampilkan</div></div>
        <button onClick={onClose} style={{background:"#f1f5f9",border:"none",borderRadius:7,padding:"6px 10px",cursor:"pointer",fontSize:13,fontWeight:700,color:"#64748b"}}>Tutup</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 20px 20px"}}>
        {todayEvs.length===0?<div style={{textAlign:"center",padding:"30px",color:"#94a3b8",fontSize:14}}>Tidak ada agenda hari ini</div>:
        <>{todayEvs.map(ev=><div key={ev.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,marginBottom:7,background:ev.tersembunyi?"#f8fafc":"white",border:"1.5px solid "+(ev.tersembunyi?"#e2e8f0":NAVY),opacity:ev.tersembunyi?0.5:1}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:"#0F2040",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.namaAcara}</div>
            <div style={{fontSize:11,color:"#64748b"}}>{ev.jam} | {ev.penyelenggara}</div>
          </div>
          <button onClick={()=>onToggleHide(ev.id)} style={{flexShrink:0,padding:"5px 10px",borderRadius:8,border:"1.5px solid "+(ev.tersembunyi?"#e2e8f0":NAVY),background:ev.tersembunyi?"#f1f5f9":"#EBF0FA",color:ev.tersembunyi?"#94a3b8":NAVY,cursor:"pointer",fontSize:11,fontWeight:700}}>{ev.tersembunyi?"Tersembunyi":"Tampil"}</button>
        </div>)}
        {pub.length>0&&<>
          <div style={{background:"#f8fafc",borderRadius:10,padding:12,border:"1px solid #e2e8f0",marginTop:6,marginBottom:12}}><pre style={{fontSize:12,color:"#334155",whiteSpace:"pre-wrap",fontFamily:"sans-serif",margin:0,lineHeight:1.7}}>{shareText}</pre></div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button onClick={copy} style={{padding:"12px",borderRadius:10,border:"none",background:NAVY,color:"white",cursor:"pointer",fontSize:14,fontWeight:700}}>Salin Teks WhatsApp</button>
            <button onClick={print} style={{padding:"12px",borderRadius:10,border:"1.5px solid "+NAVY,background:"white",color:NAVY,cursor:"pointer",fontSize:14,fontWeight:700}}>Cetak PDF A4</button>
          </div>
        </>}</>}
      </div>
    </div>
  </div>;
}

// ==================== REPORTING MODAL ====================
function ReportingModal({events,onClose,kabagNama,cetakOleh}){
  const[mode,setMode]=useState("today");const[from,setFrom]=useState(todayStr());const[to,setTo]=useState(todayStr());
  const modeLabel={today:"Hari Ini",tomorrow:"Besok",week:"Minggu Ini",month:"Bulan Ini",range:"Rentang"};
  const filtered=events.filter(e=>{
    if(mode==="today")return e.tanggal===todayStr();if(mode==="tomorrow")return e.tanggal===tomorrowStr();
    if(mode==="week")return e.tanggal>=weekStart()&&e.tanggal<=weekEnd();if(mode==="month")return e.tanggal>=monthStart()&&e.tanggal<=monthEnd();
    if(mode==="range")return e.tanggal>=from&&e.tanggal<=to;return true;
  }).filter(e=>e.alur==="disetujui").sort((a,b)=>(a.tanggal+a.jam).localeCompare(b.tanggal+b.jam));
  const rangeLabel=()=>{if(mode==="today")return fmt(todayStr());if(mode==="tomorrow")return fmt(tomorrowStr());if(mode==="week")return fmt(weekStart())+" s.d. "+fmt(weekEnd());if(mode==="month"){const d=new Date();return d.toLocaleDateString("id-ID",{month:"long",year:"numeric"});}if(mode==="range"&&from&&to)return fmt(from)+" s.d. "+fmt(to);return "-";};
  const printPDF=()=>{
    const w=window.open("","_blank");
    const kabag=kabagNama||"Kabag Protokol & Komunikasi Pimpinan";
    const _now=new Date();
    const printDate=_now.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"});
    const printTime=_now.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
    const printDateTime=printDate+" pukul "+printTime+" WITA";
    // Group by tanggal untuk rowspan
    const byTgl={};
    filtered.forEach((ev,i)=>{
      if(!byTgl[ev.tanggal])byTgl[ev.tanggal]=[];
      byTgl[ev.tanggal].push({...ev,_globalIdx:i});
    });
    let nomor=0;
    const rows=Object.keys(byTgl).sort().flatMap(tgl=>{
      const evs=byTgl[tgl];
      return evs.map((ev,iInGroup)=>{
        nomor++;
        const wkS=ev.untukPimpinan.includes("walikota")?(ev.delegasiKeWWK?"Delegasi WWK":ev.statusWK==="hadir"?"Hadir":ev.statusWK==="tidak_hadir"?"Tidak Hadir":ev.statusWK==="diwakilkan"?"Diwakilkan"+(ev.perwakilanWK?" ("+ev.perwakilanWK+")":""):"-"):"-";
        const wwkS=(ev.untukPimpinan.includes("wakilwalikota")||ev.delegasiKeWWK)?(ev.statusWWK==="hadir"?"Hadir":ev.statusWWK==="tidak_hadir"?"Tidak Hadir":ev.statusWWK==="diwakilkan"?"Diwakilkan"+(ev.perwakilanWWK?" ("+ev.perwakilanWWK+")":""):"-"):"-";
        const tglCell=iInGroup===0?"<td class='nw' rowspan='"+evs.length+"' style='background:#EBF0FA;font-weight:700;color:#0B2545;vertical-align:middle;text-align:center;border-right:2px solid #CBD5E1'><strong>"+getHari(tgl)+"</strong><br><span style='font-size:7.5pt;font-weight:400'>"+fmtShort(tgl)+"</span></td>":"";
        return "<tr><td class='c'>"+nomor+"</td>"+tglCell+"<td class='c'><strong>"+ev.jam+"</strong></td><td><strong>"+ev.namaAcara+"</strong><br><span style='font-size:7.5pt;color:#64748b'>"+ev.penyelenggara+"</span></td><td class='c "+(ev.jenisKegiatan==="Sambutan"?"u":ev.jenisKegiatan==="Pengarahan"?"b":"g")+"'>"+ev.jenisKegiatan+"</td><td>"+(ev.lokasi||"<em style='color:#cbd5e1'>-</em>")+"</td><td style='font-size:7.5pt'>"+( ev.kontak||"<em style='color:#cbd5e1'>-</em>" )+"</td><td class='c' style='font-size:7pt'>"+ev.pakaian+"</td><td class='c'>"+wkS+"</td><td class='c'>"+wwkS+"</td><td class='cat'></td></tr>";
      });
    }).join("");
    w.document.write("<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Rekap Kegiatan</title><style>@page{size:A4 landscape;margin:1.5cm 1.8cm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:8.5pt;color:#1a1a1a}.kop{display:flex;align-items:center;gap:14px;border-bottom:3px solid #0B2545;padding-bottom:10px;margin-bottom:8px}.kop img{width:52px;height:52px;object-fit:contain}.kop h1{font-size:12pt;font-weight:900;color:#0B2545;margin:0 0 1px}.kop h2{font-size:9pt;font-weight:700;color:#0B2545;margin:0 0 2px}.kop p{font-size:7.5pt;color:#475569;margin:0}.jdl{text-align:center;margin:8px 0}.jdl h3{font-size:12pt;font-weight:900;color:#0B2545;margin:0;text-transform:uppercase;letter-spacing:1px}.jdl p{font-size:8.5pt;color:#475569;margin:3px 0 0}table{width:100%;border-collapse:collapse;font-size:8pt}thead th{background:#0B2545;color:white;padding:7px 6px;text-align:left;font-size:7.5pt}thead th.c{text-align:center}tbody td{padding:6px;border-bottom:1px solid #e2e8f0;vertical-align:top;line-height:1.4}tbody tr:nth-child(even) td{background:#f8fafc}tbody tr:last-child td{border-bottom:2px solid #0B2545}.c{text-align:center}.nw{white-space:nowrap}.cat{min-width:90px;border-left:1px dashed #94a3b8}.u{color:#7c3aed;font-weight:700}.b{color:#2563eb;font-weight:700}.g{color:#065f46;font-weight:700}.ttd{margin-top:22px;display:flex;justify-content:space-between;align-items:flex-end}.ttd-info{font-size:7.5pt;color:#64748b;line-height:1.8}.ttd-info b{color:#1a1a1a;font-size:8pt}.ttd-box{text-align:center;min-width:240px}.ttd-box .loc-date{font-size:8pt;color:#334155;margin:0 0 4px}.ttd-box .jab{font-size:8.5pt;font-weight:700;color:#0B2545;margin:0 0 56px;line-height:1.4}.ttd-box p{margin:0;border:none;padding:0}.ttd-box .nm{font-size:9pt;font-weight:900;color:#0B2545;margin:0 0 2px;letter-spacing:-0.2px;border:none}.ttd-box .nip{font-size:7.5pt;color:#64748b;display:flex;align-items:center;justify-content:center;gap:4px}.ttd-box .nip-line{display:inline-block;border-bottom:1px solid #94a3b8;width:160px;height:12px}.foot{margin-top:8px;font-size:7pt;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:5px}</style></head><body><div class='kop'><img src='/logo_tarakan.png' onerror=\"this.style.display='none'\"/><div><h1>PEMERINTAH KOTA TARAKAN</h1><h2>BAGIAN PROTOKOL DAN KOMUNIKASI PIMPINAN</h2><p>Sekretariat Daerah Kota Tarakan</p></div></div><div class='jdl'><h3>Rekap Agenda Kegiatan Pimpinan</h3><p>Periode: "+rangeLabel()+" &bull; Dicetak: "+printDateTime+" &bull; Total: <strong>"+filtered.length+" kegiatan</strong></p></div><table><thead><tr><th class='c' style='width:24px'>No</th><th style='width:78px'>Hari/Tgl</th><th class='c' style='width:42px'>Pukul</th><th style='width:170px'>Nama Acara</th><th class='c' style='width:60px'>Jenis</th><th style='width:110px'>Tempat/Lokasi</th><th style='width:80px'>Contact Person</th><th class='c' style='width:70px'>Pakaian</th><th class='c' style='width:50px'>WK</th><th class='c' style='width:50px'>WWK</th><th style='width:80px'>Catatan<br>Kepala Daerah</th></tr></thead><tbody>"+rows+"</tbody></table><div class='ttd'><div class='ttd-info'><b>Dicetak oleh:</b> "+cetakOleh+"<br><b>Sistem:</b> Bagian Protokol dan Komunikasi Pimpinan Setda Kota Tarakan</div><div class='ttd-box'><p class='loc-date'>Tarakan, "+printDate+"</p><p class='jab'>Kepala Bagian Protokol dan Komunikasi Pimpinan</p><p class='nm'>Anugrah Yega Pranatha, M.Si.</p><p class='nip'>NIP. 198811032007011003</p></div></div><p class='foot'>Sistem Terpadu Jadwal dan Agenda Kegiatan Pimpinan #TarakanHibot</p></body></html>");
    w.document.close();w.focus();setTimeout(()=>w.print(),500);
  };
  return <div style={{position:"fixed",inset:0,zIndex:8100,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:500,maxHeight:"88vh",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"16px 20px 12px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:10}}>
        <div style={{flex:1}}><div style={{fontSize:16,fontWeight:700,color:NAVY}}>Rekap Kegiatan</div><div style={{fontSize:12,color:"#64748b"}}>Cetak PDF A4 Landscape + TTD Kabag</div></div>
        <button onClick={onClose} style={{background:"#f1f5f9",border:"none",borderRadius:7,padding:"6px 10px",cursor:"pointer",fontSize:13,fontWeight:700,color:"#64748b"}}>Tutup</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 20px 20px"}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
          {["today","tomorrow","week","month","range"].map(m=><button key={m} onClick={()=>setMode(m)} style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid "+(mode===m?NAVY:"#e2e8f0"),background:mode===m?NAVY:"white",color:mode===m?"white":"#475569",cursor:"pointer",fontSize:12,fontWeight:700}}>{modeLabel[m]}</button>)}
        </div>
        {mode==="range"&&<div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center"}}>
          <div style={{flex:1}}><label style={{fontSize:11,color:"#64748b",fontWeight:600,display:"block",marginBottom:2}}>Dari</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid #e2e8f0",fontSize:14}}/></div>
          <span style={{color:"#94a3b8",marginTop:14}}>s.d.</span>
          <div style={{flex:1}}><label style={{fontSize:11,color:"#64748b",fontWeight:600,display:"block",marginBottom:2}}>Sampai</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid #e2e8f0",fontSize:14}}/></div>
        </div>}
        <div style={{background:"#f8fafc",borderRadius:10,padding:"10px 14px",marginBottom:12,border:"1.5px solid #e2e8f0"}}>
          <div style={{fontSize:13,fontWeight:700,color:NAVY}}>{filtered.length} kegiatan tayang</div>
          <div style={{fontSize:11,color:"#64748b",marginTop:2}}>Periode: {rangeLabel()}</div>
        </div>
        <div style={{background:"#EBF0FA",borderRadius:10,padding:"10px 14px",marginBottom:16,border:"1.5px solid "+NAVY,fontSize:12,color:NAVY,lineHeight:1.8}}>
          Isi PDF: kop surat &bull; lokasi acara &bull; kolom catatan kepala daerah &bull; TTD Kabag Prokopim
        </div>
        <button onClick={printPDF} disabled={filtered.length===0} style={{width:"100%",padding:"13px",borderRadius:11,border:"none",background:filtered.length?NAVY:"#e2e8f0",color:filtered.length?"white":"#94a3b8",cursor:filtered.length?"pointer":"default",fontSize:14,fontWeight:700}}>Cetak PDF A4 Landscape</button>
      </div>
    </div>
  </div>;
}

// ==================== LAPORAN MINGGUAN/BULANAN ====================
function LaporanModal({events,onClose,kabagNama,cetakOleh}){
  const[mode,setMode]=useState("week");const[selYear,setSelYear]=useState(new Date().getFullYear());const[selMonth,setSelMonth]=useState(new Date().getMonth());const[selWeek,setSelWeek]=useState(weekStart());
  const years=Array.from({length:3},(_,i)=>new Date().getFullYear()-1+i);
  const months=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const getRange=()=>{
    if(mode==="week"){const ws=selWeek;const we=new Date(ws);we.setDate(we.getDate()+6);return{from:ws,to:we.toISOString().slice(0,10),label:"Minggu "+fmt(ws)+" s.d. "+fmt(we.toISOString().slice(0,10))};}
    const ym=selYear+"-"+String(selMonth+1).padStart(2,"0");const ms=ym+"-01";const me=new Date(selYear,selMonth+1,0).toISOString().slice(0,10);return{from:ms,to:me,label:"Bulan "+months[selMonth]+" "+selYear};
  };
  const range=getRange();
  const filtered=events.filter(e=>e.alur==="disetujui"&&e.tanggal>=range.from&&e.tanggal<=range.to).sort((a,b)=>(a.tanggal+a.jam).localeCompare(b.tanggal+b.jam));
  const byDay=filtered.reduce((acc,ev)=>{(acc[ev.tanggal]=acc[ev.tanggal]||[]).push(ev);return acc;},{});
  const stats={total:filtered.length,wk:filtered.filter(e=>e.untukPimpinan.includes("walikota")).length,wwk:filtered.filter(e=>e.untukPimpinan.includes("wakilwalikota")||e.delegasiKeWWK).length,sambutan:filtered.filter(e=>e.jenisKegiatan==="Sambutan").length,pengarahan:filtered.filter(e=>e.jenisKegiatan==="Pengarahan").length,menghadiri:filtered.filter(e=>e.jenisKegiatan==="Menghadiri").length};
  const printPDF=()=>{
    const w=window.open("","_blank");
    const _now=new Date();
    const printDate=_now.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"});
    const printTime=_now.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
    const printDateTime=printDate+" pukul "+printTime+" WITA";
    const kabag=kabagNama||"Kabag Protokol & Komunikasi Pimpinan";
    const rows=Object.keys(byDay).sort().flatMap(tgl=>byDay[tgl].map((ev,i)=>"<tr>"+(i===0?"<td class='c' rowspan='"+byDay[tgl].length+"' style='background:#EBF0FA;font-weight:700;color:#0B2545'>"+getHari(tgl)+"<br><span style='font-size:7pt'>"+fmtShort(tgl)+"</span></td>":"")+"<td class='c'><strong>"+ev.jam+"</strong></td><td><strong>"+ev.namaAcara+"</strong><br><span style='font-size:7.5pt;color:#64748b'>"+ev.penyelenggara+"</span></td><td class='c "+(ev.jenisKegiatan==="Sambutan"?"u":ev.jenisKegiatan==="Pengarahan"?"b":"g")+"'>"+ev.jenisKegiatan+"</td><td>"+(ev.lokasi||"<em style='color:#cbd5e1'>-</em>")+"</td><td class='c' style='font-size:7pt'>"+ev.pakaian+"</td><td class='c'>"+(ev.untukPimpinan.includes("walikota")?(ev.delegasiKeWWK?"Delegasi":ev.statusWK==="hadir"?"Hadir":ev.statusWK==="tidak_hadir"?"Tdk Hadir":"-"):"-")+"</td><td class='c'>"+(ev.untukPimpinan.includes("wakilwalikota")||ev.delegasiKeWWK?(ev.statusWWK==="hadir"?"Hadir":ev.statusWWK==="tidak_hadir"?"Tdk Hadir":"-"):"-")+"</td></tr>")).join("");
    const statRow="<div style='display:flex;gap:10px;margin:8px 0;flex-wrap:wrap'>"+[["Total",stats.total,"#0B2545"],["Wali Kota",stats.wk,"#1B4080"],["Wakil WK",stats.wwk,"#065f46"],["Sambutan",stats.sambutan,"#7c3aed"],["Pengarahan",stats.pengarahan,"#2563eb"],["Menghadiri",stats.menghadiri,"#16a34a"]].map(([l,v,c])=>"<div style='background:"+c+";color:white;border-radius:8px;padding:6px 12px;font-size:10pt;font-weight:700;text-align:center'><div style='font-size:8pt;font-weight:400;opacity:0.8'>"+l+"</div>"+v+"</div>").join("")+"</div>";
    w.document.write("<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Laporan Kegiatan</title><style>@page{size:A4 landscape;margin:1.5cm 1.8cm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:8.5pt;color:#1a1a1a}.kop{display:flex;align-items:center;gap:14px;border-bottom:3px solid #0B2545;padding-bottom:10px;margin-bottom:8px}.kop img{width:52px;height:52px;object-fit:contain}.kop h1{font-size:12pt;font-weight:900;color:#0B2545;margin:0 0 1px}.kop h2{font-size:9pt;font-weight:700;color:#0B2545;margin:0 0 2px}.kop p{font-size:7.5pt;color:#475569;margin:0}.jdl{text-align:center;margin:8px 0}.jdl h3{font-size:12pt;font-weight:900;color:#0B2545;margin:0;text-transform:uppercase;letter-spacing:1px}.jdl p{font-size:8.5pt;color:#475569;margin:3px 0 0}table{width:100%;border-collapse:collapse;font-size:8pt}thead th{background:#0B2545;color:white;padding:7px 6px;text-align:left;font-size:7.5pt}thead th.c{text-align:center}tbody td{padding:6px;border-bottom:1px solid #e2e8f0;vertical-align:middle;line-height:1.4}tbody tr:nth-child(even) td:not(:first-child){background:#f8fafc}.c{text-align:center}.u{color:#7c3aed;font-weight:700}.b{color:#2563eb;font-weight:700}.g{color:#065f46;font-weight:700}.ttd{margin-top:22px;display:flex;justify-content:space-between;align-items:flex-end}.ttd-info{font-size:7.5pt;color:#64748b;line-height:1.8}.ttd-info b{color:#1a1a1a;font-size:8pt}.ttd-box{text-align:center;min-width:240px}.ttd-box .loc-date{font-size:8pt;color:#334155;margin:0 0 4px}.ttd-box .jab{font-size:8.5pt;font-weight:700;color:#0B2545;margin:0 0 56px;line-height:1.4}.ttd-box p{margin:0;border:none;padding:0}.ttd-box .nm{font-size:9pt;font-weight:900;color:#0B2545;margin:0 0 2px;letter-spacing:-0.2px;border:none}.ttd-box .nip{font-size:7.5pt;color:#64748b;display:flex;align-items:center;justify-content:center;gap:4px}.ttd-box .nip-line{display:inline-block;border-bottom:1px solid #94a3b8;width:160px;height:12px}.foot{margin-top:8px;font-size:7pt;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:5px}</style></head><body><div class='kop'><img src='/logo_tarakan.png' onerror=\"this.style.display='none'\"/><div><h1>PEMERINTAH KOTA TARAKAN</h1><h2>BAGIAN PROTOKOL DAN KOMUNIKASI PIMPINAN</h2><p>Sekretariat Daerah Kota Tarakan</p></div></div><div class='jdl'><h3>LAPORAN KEGIATAN PIMPINAN</h3><p>"+range.label+" &bull; Dicetak: "+printDateTime+"</p></div>"+statRow+"<table><thead><tr><th style='width:80px'>Hari/Tgl</th><th class='c' style='width:42px'>Pukul</th><th style='width:200px'>Nama Acara</th><th class='c' style='width:62px'>Jenis</th><th style='width:130px'>Tempat/Lokasi</th><th class='c' style='width:78px'>Pakaian</th><th class='c' style='width:50px'>WK</th><th class='c' style='width:50px'>WWK</th></tr></thead><tbody>"+rows+"</tbody></table><div class='ttd'><div class='ttd-info'><b>Dicetak oleh:</b> "+cetakOleh+"<br><b>Sistem:</b> Bagian Protokol dan Komunikasi Pimpinan Setda Kota Tarakan</div><div class='ttd-box'><p class='loc-date'>Tarakan, "+printDate+"</p><p class='jab'>Kepala Bagian Protokol dan Komunikasi Pimpinan</p><p class='nm'>Anugrah Yega Pranatha, M.Si.</p><p class='nip'>NIP. 198811032007011003</p></div></div><p class='foot'>Sistem Terpadu Jadwal dan Agenda Kegiatan Pimpinan #TarakanHibot</p></body></html>");
    w.document.close();w.focus();setTimeout(()=>w.print(),500);
  };
  const inp={borderRadius:8,border:"1.5px solid #e2e8f0",padding:"8px 10px",fontSize:13};
  return <div style={{position:"fixed",inset:0,zIndex:8100,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:520,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"16px 20px 12px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:10}}>
        <div style={{flex:1}}><div style={{fontSize:16,fontWeight:700,color:NAVY}}>Laporan Mingguan / Bulanan</div><div style={{fontSize:12,color:"#64748b"}}>Rekap agenda kegiatan pimpinan</div></div>
        <button onClick={onClose} style={{background:"#f1f5f9",border:"none",borderRadius:7,padding:"6px 10px",cursor:"pointer",fontSize:13,fontWeight:700,color:"#64748b"}}>Tutup</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 20px 20px"}}>
        <div style={{display:"flex",gap:0,marginBottom:16,borderRadius:10,overflow:"hidden",border:"1.5px solid #e2e8f0"}}>
          {["week","month"].map(m=><button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"11px",border:"none",background:mode===m?NAVY:"white",color:mode===m?"white":"#475569",cursor:"pointer",fontSize:13,fontWeight:700}}>{m==="week"?"Mingguan":"Bulanan"}</button>)}
        </div>
        {mode==="week"&&<div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:4}}>Pilih Minggu (isi tanggal hari Senin)</label>
          <input type="date" value={selWeek} onChange={e=>setSelWeek(e.target.value)} style={{...inp,width:"100%"}}/>
          <div style={{fontSize:11,color:"#64748b",marginTop:4}}>{range.label}</div>
        </div>}
        {mode==="month"&&<div style={{display:"flex",gap:8,marginBottom:14}}>
          <div style={{flex:2}}><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:4}}>Bulan</label><select value={selMonth} onChange={e=>setSelMonth(parseInt(e.target.value))} style={{...inp,width:"100%"}}>{months.map((m,i)=><option key={i} value={i}>{m}</option>)}</select></div>
          <div style={{flex:1}}><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:4}}>Tahun</label><select value={selYear} onChange={e=>setSelYear(parseInt(e.target.value))} style={{...inp,width:"100%"}}>{years.map(y=><option key={y}>{y}</option>)}</select></div>
        </div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
          {[["Total",stats.total,NAVY],["Wali Kota",stats.wk,"#1B4080"],["Wakil WK",stats.wwk,GREEN],["Sambutan",stats.sambutan,"#7c3aed"],["Pengarahan",stats.pengarahan,"#2563eb"],["Menghadiri",stats.menghadiri,"#16a34a"]].map(([l,v,c])=><div key={l} style={{background:c,borderRadius:10,padding:"10px 12px",textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.7)",fontSize:10,marginBottom:2}}>{l}</div><div style={{color:"white",fontSize:20,fontWeight:900}}>{v}</div></div>)}
        </div>
        <div style={{background:"#f8fafc",borderRadius:10,padding:"10px 14px",marginBottom:16,border:"1px solid #e2e8f0",maxHeight:200,overflowY:"auto"}}>
          {filtered.length===0?<div style={{textAlign:"center",color:"#94a3b8",fontSize:13,padding:"16px"}}>Tidak ada kegiatan pada periode ini</div>:
          filtered.map((ev,i)=><div key={ev.id} style={{display:"flex",gap:10,padding:"7px 0",borderBottom:i<filtered.length-1?"1px solid #f1f5f9":"none"}}>
            <div style={{width:44,flexShrink:0,textAlign:"center"}}><div style={{fontSize:10,fontWeight:700,color:NAVY}}>{getHari(ev.tanggal).slice(0,3)}</div><div style={{fontSize:12,fontWeight:800,color:"#334155"}}>{ev.tanggal.slice(8)}</div><div style={{fontSize:9,color:"#94a3b8"}}>{ev.jam}</div></div>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:700,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.namaAcara}</div><div style={{fontSize:11,color:"#64748b"}}>{ev.penyelenggara}</div></div>
          </div>)}
        </div>
        <button onClick={printPDF} disabled={filtered.length===0} style={{width:"100%",padding:"13px",borderRadius:11,border:"none",background:filtered.length?NAVY:"#e2e8f0",color:filtered.length?"white":"#94a3b8",cursor:filtered.length?"pointer":"default",fontSize:14,fontWeight:700}}>Cetak Laporan PDF A4 Landscape</button>
      </div>
    </div>
  </div>;
}

// ==================== NOTIF TAB ====================
function NotifTab({user,showT}){
  const[status,setStatus]=useState(()=>{
    if(!("Notification" in window))return "unsupported";
    return Notification.permission; // "default"|"granted"|"denied"
  });
  const[subbed,setSubbed]=useState(false);
  const[loading,setLoading]=useState(false);
  const[msg,setMsg]=useState("");

  // Cek apakah sudah subscribe
  useEffect(()=>{
    if(!("serviceWorker" in navigator)||!("PushManager" in navigator))return;
    navigator.serviceWorker.ready.then(reg=>
      reg.pushManager.getSubscription().then(sub=>setSubbed(!!sub))
    ).catch(()=>{});
  },[]);

  const activate=async()=>{
    setLoading(true);setMsg("");
    try{
      if(!("serviceWorker" in navigator)||!("PushManager" in navigator)){
        setMsg("Browser ini tidak mendukung push notification.");setLoading(false);return;
      }
      // Minta izin
      const perm=await Notification.requestPermission();
      setStatus(perm);
      if(perm!=="granted"){
        setMsg("Izin ditolak. Di iOS: Settings → [Nama App] → Notifications → Allow.");
        setLoading(false);return;
      }
      // Register SW & subscribe
      await registerPush(user.username,user.role);
      setSubbed(true);
      showT("Notifikasi berhasil diaktifkan ✓");
    }catch(e){setMsg("Gagal: "+e.message);}
    setLoading(false);
  };

  const deactivate=async()=>{
    setLoading(true);
    try{
      if(!("serviceWorker" in navigator))return;
      const reg=await navigator.serviceWorker.ready;
      const sub=await reg.pushManager.getSubscription();
      if(sub){
        await fetch("/api/webpush",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({action:"unsubscribe",subscription:sub})});
        await sub.unsubscribe();
      }
      setSubbed(false);setStatus("default");
      showT("Notifikasi dinonaktifkan","warn");
    }catch(e){setMsg("Gagal: "+e.message);}
    setLoading(false);
  };

  // Deteksi detail
  const isStandalone=window.navigator.standalone===true||window.matchMedia("(display-mode: standalone)").matches;
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent);
  const iosVer=(()=>{const m=navigator.userAgent.match(/OS (\d+)_(\d+)/);return m?parseFloat(m[1]+"."+m[2]):0;})();
  const hasSW="serviceWorker" in navigator;
  const hasPush="PushManager" in window;
  const hasNotif="Notification" in window;
  const supported=hasSW&&hasPush&&hasNotif;

  return <div>
    {/* Status card */}
    <div style={{borderRadius:12,padding:"14px 16px",marginBottom:16,
      background:status==="granted"?"#f0fdf4":status==="denied"?"#fef2f2":"#f0f9ff",
      border:"1px solid "+(status==="granted"?"#bbf7d0":status==="denied"?"#fecaca":"#bae6fd")}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:28}}>{status==="granted"?"🔔":status==="denied"?"🔕":"🔔"}</span>
        <div>
          <div style={{fontWeight:700,fontSize:14,color:status==="granted"?"#166534":status==="denied"?"#991b1b":"#0284c7"}}>
            {status==="granted"?"Notifikasi Aktif":status==="denied"?"Notifikasi Diblokir":"Notifikasi Belum Diaktifkan"}
          </div>
          <div style={{fontSize:12,color:"#64748b",marginTop:2}}>
            {status==="granted"&&subbed?"Perangkat ini terdaftar dan akan menerima notifikasi.":
             status==="granted"&&!subbed?"Izin diberikan tapi belum terdaftar. Klik Aktifkan.":
             status==="denied"?"Izin diblokir oleh browser/sistem. Lihat panduan di bawah.":
             "Tap tombol di bawah untuk mengaktifkan."}
          </div>
        </div>
      </div>
    </div>

    {/* Tombol aksi */}
    {supported&&status!=="denied"&&!subbed&&
      <button onClick={activate} disabled={loading} style={{width:"100%",padding:"13px",borderRadius:11,border:"none",
        background:loading?"#e2e8f0":"linear-gradient(135deg,#0A1628,#1B4080)",
        color:loading?"#94a3b8":"white",cursor:loading?"default":"pointer",fontSize:14,fontWeight:700,marginBottom:10}}>
        {loading?"Mengaktifkan...":"🔔 Aktifkan Notifikasi"}
      </button>}

    {supported&&status==="granted"&&subbed&&
      <button onClick={deactivate} disabled={loading} style={{width:"100%",padding:"12px",borderRadius:11,
        border:"1.5px solid #fca5a5",background:"white",color:"#ef4444",cursor:"pointer",fontSize:13,fontWeight:700,marginBottom:10}}>
        {loading?"Memproses...":"🔕 Nonaktifkan Notifikasi"}
      </button>}

    {/* Panduan jika diblokir */}
    {status==="denied"&&<div style={{background:"#fef9c3",borderRadius:10,padding:"12px 14px",fontSize:12,color:"#92400e",border:"1px solid #fde68a",lineHeight:1.7}}>
      <div style={{fontWeight:700,marginBottom:6}}>Cara mengaktifkan kembali:</div>
      <div><strong>iOS (Safari):</strong> Settings → Safari → Advanced → Website Data → cari domain app → hapus. Atau: Hapus app dari Home Screen lalu install ulang.</div>
      <div style={{marginTop:6}}><strong>Android (Chrome):</strong> Tap ikon kunci di address bar → Permissions → Notifications → Allow.</div>
    </div>}

    {!supported&&<div>
      {/* Info diagnostik */}
      <div style={{background:"#f8fafc",borderRadius:10,padding:"13px 14px",marginBottom:12,border:"1px solid #e2e8f0",fontSize:12,color:"#475569",lineHeight:2}}>
        <div style={{fontWeight:700,color:"#0A1628",marginBottom:4}}>🔍 Diagnostik Perangkat</div>
        <div>Mode standalone (PWA): <strong style={{color:isStandalone?"#166534":"#991b1b"}}>{isStandalone?"✅ Ya":"❌ Tidak"}</strong></div>
        <div>Platform: <strong>{isIOS?"iOS "+iosVer:"Android/Lainnya"}</strong></div>
        <div>Service Worker: <strong style={{color:hasSW?"#166534":"#991b1b"}}>{hasSW?"✅ Didukung":"❌ Tidak"}</strong></div>
        <div>Push Manager: <strong style={{color:hasPush?"#166534":"#991b1b"}}>{hasPush?"✅ Didukung":"❌ Tidak"}</strong></div>
        <div>Notification API: <strong style={{color:hasNotif?"#166534":"#991b1b"}}>{hasNotif?"✅ Didukung":"❌ Tidak"}</strong></div>
      </div>
      {/* Panduan sesuai kondisi */}
      {isIOS&&!isStandalone&&<div style={{background:"#fef3c7",borderRadius:12,padding:"14px",border:"1px solid #fde68a",fontSize:13,color:"#92400e"}}>
        <div style={{fontWeight:800,marginBottom:8}}>📱 Buka dari Home Screen dulu</div>
        <div style={{lineHeight:2}}>
          <div>1. Tap ikon <strong>Share</strong> (kotak+panah) di Safari</div>
          <div>2. Tap <strong>"Add to Home Screen"</strong></div>
          <div>3. Buka app dari ikon Home Screen</div>
          <div>4. Login ulang → aktifkan notifikasi</div>
        </div>
      </div>}
      {isIOS&&isStandalone&&iosVer>0&&iosVer<16.4&&<div style={{background:"#fee2e2",borderRadius:12,padding:"14px",border:"1px solid #fecaca",fontSize:13,color:"#991b1b"}}>
        <div style={{fontWeight:800,marginBottom:6}}>⚠️ iOS {iosVer} — Perlu Update</div>
        <div>Push notification di iOS membutuhkan minimal <strong>iOS 16.4</strong>. Silakan update iPhone Anda di Settings → General → Software Update.</div>
      </div>}
      {isIOS&&isStandalone&&iosVer>=16.4&&<div style={{background:"#fef3c7",borderRadius:12,padding:"14px",border:"1px solid #fde68a",fontSize:13,color:"#92400e"}}>
        <div style={{fontWeight:800,marginBottom:6}}>⚠️ iOS {iosVer} — Coba Langkah Ini</div>
        <div style={{lineHeight:1.8}}>iOS Anda sudah mendukung, tapi Push API belum aktif. Kemungkinan penyebab:<br/>
        • Hapus app dari Home Screen → install ulang<br/>
        • Pastikan Settings → [App] → Notifications → Allow<br/>
        • Restart iPhone lalu buka ulang app</div>
      </div>}
      {!isIOS&&<div style={{background:"#fef3c7",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#92400e",border:"1px solid #fde68a"}}>
        Push notification membutuhkan Android Chrome 90+ atau iOS 16.4+. Pastikan browser diperbarui.
      </div>}
    </div>}

    {msg&&<div style={{marginTop:10,background:"#fee2e2",borderRadius:8,padding:"9px 12px",fontSize:13,color:"#991b1b"}}>{msg}</div>}

    {/* Syarat */}
    <div style={{marginTop:14,padding:"10px 13px",background:"#f8fafc",borderRadius:9,border:"1px solid #e2e8f0",fontSize:11,color:"#64748b",lineHeight:1.8}}>
      <div style={{fontWeight:700,color:"#475569",marginBottom:4}}>Syarat push notification:</div>
      <div>✅ App sudah di-install ke Home Screen</div>
      <div>✅ Dibuka dari ikon Home Screen (bukan browser)</div>
      <div>✅ iOS 16.4+ atau Android Chrome 90+</div>
      <div>✅ Koneksi internet aktif saat pertama aktivasi</div>
    </div>
  </div>;
}

// ==================== PROFILE MODAL (ganti username & password) ====================
function ProfileModal({user,onClose,showT}){
  const[tabP,setTabP]=useState("profile");
  const[form,setForm]=useState({nama:user.nama,jabatan:user.jabatan});
  const[pw,setPw]=useState({old:"",next:"",confirm:""});
  const[uname,setUname]=useState({newUsername:"",pwConfirm:""});
  const[err,setErr]=useState("");
  const inp={width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #e2e8f0",fontSize:14,background:"white",color:"#1e293b"};

  const saveProfile=()=>{
    setErr("");if(!form.nama.trim())return setErr("Nama wajib diisi.");
    const users=loadUsers();const updated=users.map(u=>u.username===user.username?{...u,nama:form.nama,jabatan:form.jabatan}:u);
    saveUsers(updated);showT("Profil disimpan ✓");onClose({...user,nama:form.nama,jabatan:form.jabatan});
  };
  const changePassword=async()=>{
    setErr("");
    if(!pw.old||!pw.next||!pw.confirm)return setErr("Semua kolom wajib diisi.");
    if(pw.next.length<6)return setErr("Password minimal 6 karakter.");
    if(pw.next!==pw.confirm)return setErr("Konfirmasi tidak cocok.");
    const users=loadUsers();const cur=users.find(u=>u.username===user.username);
    if(!cur)return setErr("Akun tidak ditemukan.");
    const oldOk=await verifyPassword(pw.old,cur.password);
    if(!oldOk)return setErr("Password lama salah.");
    const hashed=await hashPassword(pw.next);
    saveUsers(users.map(u=>u.username===user.username?{...u,password:hashed}:u));
    setPw({old:"",next:"",confirm:""});showT("Password berhasil diubah ✓");
  };
  const changeUsername=async()=>{
    setErr("");
    if(!uname.newUsername.trim())return setErr("Username baru wajib diisi.");
    const un=uname.newUsername.toLowerCase().trim();
    const users=loadUsers();const cur=users.find(u=>u.username===user.username);
    if(!cur)return setErr("Akun tidak ditemukan.");
    const pwOk=await verifyPassword(uname.pwConfirm,cur.password);
    if(!pwOk)return setErr("Password tidak cocok.");
    if(users.find(u=>u.username===un&&u.username!==user.username))return setErr("Username sudah dipakai.");
    saveUsers(users.map(u=>u.username===user.username?{...u,username:un}:u));
    try{localStorage.setItem("jp_session",JSON.stringify({username:un}));}catch{}
    localStorage.removeItem(bioKey(user.username));
    showT("Username diubah. Silakan login ulang.","warn");
    setTimeout(()=>{localStorage.removeItem("jp_session");window.location.reload();},1800);
  };
  const tabs=[{k:"profile",l:"Profil"},{k:"password",l:"Ganti Password"},{k:"username",l:"Ganti Username"},{k:"biometric",l:"Biometrik"},{k:"notif",l:"🔔 Notifikasi"}];
  return <div style={{position:"fixed",inset:0,zIndex:8200,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:480,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"16px 20px 0",borderBottom:"1px solid #f1f5f9",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{flex:1,fontSize:16,fontWeight:700,color:NAVY}}>Pengaturan Akun</div>
          <button onClick={()=>onClose(null)} style={{background:"#f1f5f9",border:"none",borderRadius:7,padding:"6px 10px",cursor:"pointer",fontSize:13,fontWeight:700,color:"#64748b"}}>Tutup</button>
        </div>
        <div style={{display:"flex",gap:0,overflowX:"auto"}}>
          {tabs.map(t=><button key={t.k} onClick={()=>{setTabP(t.k);setErr("");}} style={{padding:"9px 14px",border:"none",background:"transparent",color:tabP===t.k?NAVY:"#94a3b8",fontWeight:tabP===t.k?700:500,fontSize:12,cursor:"pointer",borderBottom:tabP===t.k?"2.5px solid "+NAVY:"2.5px solid transparent",whiteSpace:"nowrap"}}>{t.l}</button>)}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px 20px"}}>
        {err&&<div style={{background:"#fee2e2",borderRadius:8,padding:"9px 12px",marginBottom:12,fontSize:13,color:"#991b1b"}}>{err}</div>}
        {tabP==="profile"&&<><div style={{marginBottom:12}}><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:4}}>Nama Lengkap</label><input value={form.nama} onChange={e=>setForm(p=>({...p,nama:e.target.value}))} style={inp}/></div><div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:4}}>Jabatan</label><input value={form.jabatan} onChange={e=>setForm(p=>({...p,jabatan:e.target.value}))} style={inp}/></div><button onClick={saveProfile} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:NAVY,color:"white",cursor:"pointer",fontSize:14,fontWeight:700}}>Simpan Profil</button></>}
        {tabP==="password"&&<><div style={{marginBottom:12}}><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:4}}>Password Lama</label><input type="password" value={pw.old} onChange={e=>setPw(p=>({...p,old:e.target.value}))} style={inp}/></div><div style={{marginBottom:12}}><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:4}}>Password Baru (min. 6 karakter)</label><input type="password" value={pw.next} onChange={e=>setPw(p=>({...p,next:e.target.value}))} style={inp}/></div><div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:4}}>Konfirmasi Password Baru</label><input type="password" value={pw.confirm} onChange={e=>setPw(p=>({...p,confirm:e.target.value}))} style={inp}/></div><button onClick={changePassword} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:GREEN,color:"white",cursor:"pointer",fontSize:14,fontWeight:700}}>Ubah Password</button></>}
        {tabP==="username"&&<><div style={{background:"#fef3c7",borderRadius:9,padding:"9px 12px",marginBottom:14,fontSize:13,color:"#92400e",border:"1px solid #fde68a"}}>Setelah ubah username, Anda akan diminta login ulang.</div><div style={{marginBottom:12}}><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:4}}>Username Baru</label><input value={uname.newUsername} onChange={e=>setUname(p=>({...p,newUsername:e.target.value}))} autoCapitalize="none" style={inp}/></div><div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:4}}>Konfirmasi dengan Password Anda</label><input type="password" value={uname.pwConfirm} onChange={e=>setUname(p=>({...p,pwConfirm:e.target.value}))} style={inp}/></div><button onClick={changeUsername} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:"#d97706",color:"white",cursor:"pointer",fontSize:14,fontWeight:700}}>Ubah Username</button></>}
        {tabP==="biometric"&&<BiometricTab user={user} showT={showT}/>}
        {tabP==="notif"&&<NotifTab user={user} showT={showT}/>}
      </div>
    </div>
  </div>;
}

function BiometricTab({user,showT}){
  const[supported]=useState(bioSupported());const[registered,setRegistered]=useState(()=>bioIsRegistered(user.username));const[loading,setLoading]=useState(false);const[msg,setMsg]=useState("");
  const doRegister=async()=>{setLoading(true);setMsg("");try{await bioRegister(user.username);setRegistered(true);showT("Biometrik berhasil didaftarkan ✓");}catch(e){setMsg("Gagal: "+e.message);}setLoading(false);};
  const doRemove=()=>{localStorage.removeItem(bioKey(user.username));setRegistered(false);showT("Biometrik dihapus","warn");};
  if(!supported)return <div style={{background:"#fef3c7",borderRadius:10,padding:"14px 16px",fontSize:13,color:"#92400e",border:"1px solid #fde68a"}}>Biometrik (WebAuthn) tidak didukung oleh browser atau perangkat ini. Pastikan menggunakan HTTPS dan browser modern.</div>;
  return <div>
    <div style={{background:"#f0f9ff",borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:13,color:"#0284c7",border:"1px solid #bae6fd",lineHeight:1.7}}>
      Biometrik menggunakan sidik jari, Face ID, atau PIN perangkat untuk login tanpa password. Data biometrik tidak pernah meninggalkan perangkat Anda.
    </div>
    {registered?<><div style={{background:"#d1fae5",borderRadius:10,padding:"12px 14px",marginBottom:14,fontSize:13,color:GREEN,fontWeight:700,border:"1px solid #a7f3d0"}}>Biometrik aktif untuk akun ini</div><button onClick={doRemove} style={{width:"100%",padding:"12px",borderRadius:10,border:"1.5px solid #fca5a5",background:"white",color:"#ef4444",cursor:"pointer",fontSize:14,fontWeight:700}}>Hapus / Nonaktifkan Biometrik</button></>:
    <><div style={{background:"#fafafa",borderRadius:10,padding:"12px 14px",marginBottom:14,fontSize:13,color:"#64748b",border:"1px solid #e2e8f0"}}>Biometrik belum didaftarkan. Klik tombol di bawah dan ikuti instruksi perangkat Anda.</div><button onClick={doRegister} disabled={loading} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:loading?"#e2e8f0":NAVY,color:loading?"#94a3b8":"white",cursor:loading?"default":"pointer",fontSize:14,fontWeight:700}}>{loading?"Memproses...":"Daftarkan Biometrik"}</button></>}
    {msg&&<div style={{marginTop:10,background:"#fee2e2",borderRadius:8,padding:"9px 12px",fontSize:13,color:"#991b1b"}}>{msg}</div>}
  </div>;
}

// ==================== ADMIN MODAL ====================
function AdminModal({onClose,showT}){
  const[users,setUsers]=useState(loadUsers);const[tabA,setTabA]=useState("users");const[pendRegs,setPendRegs]=React.useState(()=>loadPendingRegs());const[editUser,setEditUser]=useState(null);const[newUser,setNewUser]=useState({username:"",password:"",nama:"",jabatan:"",role:"staf",noWA:""});const[err,setErr]=useState("");
  const save=u=>{setUsers(u);saveUsers(u);};
  const doAdd=async()=>{
    setErr("");
    if(!newUser.username||!newUser.password||!newUser.nama)return setErr("Username, password & nama wajib.");
    if(users.find(u=>u.username===newUser.username.toLowerCase()))return setErr("Username sudah ada.");
    const hashed=await hashPassword(newUser.password);
    save([...users,{...newUser,username:newUser.username.toLowerCase(),password:hashed}]);
    setNewUser({username:"",password:"",nama:"",jabatan:"",role:"staf",noWA:""});
    showT("Pengguna ditambahkan ✓");
  };
  const doDelete=async un=>{
    if(!window.confirm("Hapus pengguna "+un+"?"))return;
    const updated=users.filter(u=>u.username!==un);
    save(updated);
    await dbDeleteUser(un).catch(e=>console.warn("dbDeleteUser error:",e));
    showT("Pengguna dihapus");
  };
  const doSaveEdit=async()=>{
    setErr("");
    if(!editUser.nama)return setErr("Nama wajib.");
    let toSave={...editUser};
    // Jika password diisi dan belum di-hash, hash dulu
    if(toSave._newPw){
      toSave.password=await hashPassword(toSave._newPw);
      delete toSave._newPw;
    }
    save(users.map(u=>u.username===toSave.username?toSave:u));
    setEditUser(null);
    showT("Data disimpan ✓");
  };
  const inp={width:"100%",padding:"9px 11px",borderRadius:8,border:"1.5px solid #e2e8f0",fontSize:13,background:"white",color:"#1e293b"};
  return <div style={{position:"fixed",inset:0,zIndex:8200,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:560,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"16px 20px 0",borderBottom:"1px solid #f1f5f9",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><div style={{flex:1,fontSize:16,fontWeight:700,color:NAVY}}>Panel Admin</div><button onClick={onClose} style={{background:"#f1f5f9",border:"none",borderRadius:7,padding:"6px 10px",cursor:"pointer",fontSize:13,fontWeight:700,color:"#64748b"}}>Tutup</button></div>
        <div style={{display:"flex",gap:0,overflowX:"auto"}}>{[{k:"users",l:"Pengguna"},{k:"pendaftaran",l:"Pendaftaran"+(pendRegs.length>0?" ("+pendRegs.length+")":"")},{k:"add",l:"Tambah"},{k:"pw",l:"Reset PW"}].map(t=><button key={t.k} onClick={()=>{setTabA(t.k);setErr("");}} style={{padding:"9px 14px",border:"none",background:"transparent",color:tabA===t.k?NAVY:t.k==="pendaftaran"&&pendRegs.length>0?"#DC2626":"#94a3b8",fontWeight:tabA===t.k?700:500,fontSize:12,cursor:"pointer",borderBottom:tabA===t.k?"2.5px solid "+NAVY:"2.5px solid transparent",whiteSpace:"nowrap"}}>{t.l}</button>)}</div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px 20px"}}>
        {err&&<div style={{background:"#fee2e2",borderRadius:8,padding:"9px 12px",marginBottom:12,fontSize:13,color:"#991b1b"}}>{err}</div>}
        {tabA==="users"&&<>{users.map(u=><div key={u.username} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,marginBottom:7,border:"1.5px solid #e2e8f0",background:"#f8fafc"}}>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.nama}</div><div style={{fontSize:11,color:"#64748b"}}>{u.username} | {ALL_ROLE_DEFS.find(r=>r.key===u.role)?.label||u.role}</div></div>
          <button onClick={()=>setEditUser({...u,_newPw:""})} style={{padding:"5px 10px",borderRadius:7,border:"1.5px solid "+NAVY,background:"white",color:NAVY,cursor:"pointer",fontSize:11,fontWeight:700}}>Edit</button>
          <button onClick={()=>doDelete(u.username)} style={{padding:"5px 10px",borderRadius:7,border:"1.5px solid #fca5a5",background:"white",color:"#ef4444",cursor:"pointer",fontSize:11,fontWeight:700}}>Hapus</button>
        </div>)}
        {editUser&&<div style={{background:"#EBF0FA",borderRadius:12,padding:14,marginTop:8,border:"1.5px solid "+NAVY}}>
          <div style={{fontSize:13,fontWeight:700,color:NAVY,marginBottom:10}}>Edit: {editUser.username}</div>
          {[{k:"nama",l:"Nama"},{k:"jabatan",l:"Jabatan"}].map(f=><div key={f.k} style={{marginBottom:8}}><label style={{display:"block",fontSize:11,color:"#64748b",fontWeight:600,marginBottom:2}}>{f.l}</label><input value={editUser[f.k]||""} onChange={e=>setEditUser(p=>({...p,[f.k]:e.target.value}))} style={inp}/></div>)}
          <div style={{marginBottom:8}}><label style={{display:"block",fontSize:11,color:"#64748b",fontWeight:600,marginBottom:2}}>Password Baru (kosong = tidak ubah)</label><input type="password" placeholder="Isi untuk reset password" onChange={e=>setEditUser(p=>({...p,_newPw:e.target.value||undefined}))} style={inp}/></div>
            <div style={{background:"#fef9c3",borderRadius:7,padding:"7px 10px",fontSize:11,color:"#92400e",marginBottom:6}}>💡 Kabag bisa reset password langsung dari sini tanpa OTP.</div>
          <div style={{marginBottom:12}}><label style={{display:"block",fontSize:11,color:"#64748b",fontWeight:600,marginBottom:2}}>Role / Hak Akses</label><select value={editUser.role} onChange={e=>setEditUser(p=>({...p,role:e.target.value}))} style={{...inp,WebkitAppearance:"none"}}>{ALL_ROLE_DEFS.map(r=><option key={r.key} value={r.key}>{r.label}</option>)}</select></div>
          <div style={{display:"flex",gap:8}}><button onClick={()=>setEditUser(null)} style={{flex:1,padding:"10px",borderRadius:9,border:"1.5px solid #e2e8f0",background:"white",color:"#64748b",cursor:"pointer",fontSize:13,fontWeight:600}}>Batal</button><button onClick={doSaveEdit} style={{flex:2,padding:"10px",borderRadius:9,border:"none",background:NAVY,color:"white",cursor:"pointer",fontSize:13,fontWeight:700}}>Simpan</button></div>
        </div>}</>}
        {tabA==="add"&&<>{[{k:"username",l:"Username *"},{k:"nama",l:"Nama Lengkap *"},{k:"jabatan",l:"Jabatan"}].map(f=><div key={f.k} style={{marginBottom:10}}><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:3}}>{f.l}</label><input value={newUser[f.k]||""} onChange={e=>setNewUser(p=>({...p,[f.k]:e.target.value}))} autoCapitalize="none" style={inp}/></div>)}
          <div style={{marginBottom:10}}><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:3}}>Password *</label><input type="password" value={newUser.password||""} onChange={e=>setNewUser(p=>({...p,password:e.target.value}))} style={inp}/></div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:3}}>Role / Hak Akses</label><select value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))} style={{...inp,WebkitAppearance:"none"}}>{ALL_ROLE_DEFS.map(r=><option key={r.key} value={r.key}>{r.label}</option>)}</select></div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:3}}>No. WhatsApp (opsional)</label><input value={newUser.noWA||""} onChange={e=>setNewUser(p=>({...p,noWA:e.target.value}))} placeholder="08123456789" style={inp}/><div style={{fontSize:11,color:"#94a3b8",marginTop:3}}>Untuk menerima notifikasi otomatis</div></div>
          <button onClick={doAdd} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:NAVY,color:"white",cursor:"pointer",fontSize:14,fontWeight:700}}>Tambahkan Pengguna</button></>}
        {tabA==="pendaftaran"&&<div>{pendRegs.length===0
          ?<div style={{textAlign:"center",padding:"30px 10px",color:"#94a3b8"}}><div style={{fontSize:36,marginBottom:8}}>📭</div><div style={{fontWeight:700}}>Tidak ada permohonan</div></div>
          :pendRegs.map(r=><div key={r.id} style={{background:"#FAFAFA",borderRadius:10,border:"1.5px solid #E2E8F0",marginBottom:10,padding:"12px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,color:NAVY,fontSize:14}}>{r.nama}</div>
                <div style={{fontSize:11,color:"#64748B",marginTop:2}}>{r.jabatan} · {ROLE_LABEL[r.role]||r.role}</div>
                <div style={{fontSize:11,color:"#94A3B8",marginTop:1}}>@{r.username}{r.noWA?" · "+r.noWA:""}</div>
                {r.alasan&&<div style={{fontSize:11,color:"#475569",fontStyle:"italic",marginTop:4,background:"#F0F4FF",borderRadius:5,padding:"4px 8px"}}>{r.alasan}</div>}
                <div style={{fontSize:10,color:"#CBD5E1",marginTop:4}}>{new Date(r.tanggal).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}</div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button onClick={()=>{
                  const regs=loadPendingRegs().filter(x=>x.id!==r.id);
                  savePendingRegs(regs);setPendRegs(regs);
                  const newU={username:r.username,password:r.password,nama:r.nama,jabatan:r.jabatan,role:r.role,noWA:r.noWA||""};
                  const all=loadUsers();saveUsers([...all,newU]);setUsers([...all,newU]);
                  dbUpsertUser(newU).catch(()=>{});
                  showT("Akun "+r.username+" diaktifkan ✓");
                }} style={{padding:"6px 12px",borderRadius:8,border:"none",background:"#10b981",color:"white",cursor:"pointer",fontSize:11,fontWeight:700}}>✓ Setujui</button>
                <button onClick={()=>{const regs=loadPendingRegs().filter(x=>x.id!==r.id);savePendingRegs(regs);setPendRegs(regs);showT("Permohonan ditolak","warn");}} style={{padding:"6px 10px",borderRadius:8,border:"1.5px solid #fca5a5",background:"white",color:"#ef4444",cursor:"pointer",fontSize:11,fontWeight:700}}>✕ Tolak</button>
              </div>
            </div>
          </div>)
        }</div>}
        {tabA==="pw"&&<div style={{background:"#fef3c7",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#92400e"}}>Untuk reset password pengguna, gunakan tab Pengguna lalu klik Edit pada akun yang bersangkutan.</div>}
      </div>
    </div>
  </div>;
}


// ==================== FORM UNDANGAN UPLOAD (inline, for FormView) ====================
function FormUndanganUpload({onFile}){
  const ref=useRef();
  const[load,setLoad]=useState(false);
  const handle=f=>{
    if(!f)return;
    if(!f.type.match(/pdf|image/)){alert("Hanya PDF atau gambar.");return;}
    if(f.size>15*1024*1024){alert("Maks 15MB.");return;}
    setLoad(true);
    const reader=new FileReader();
    reader.onload=e=>{onFile(f,f.name,e.target.result);setLoad(false);};
    reader.onerror=()=>setLoad(false);
    reader.readAsDataURL(f);
  };
  return(
    <div style={{background:"#f8fafc",borderRadius:10,padding:11,border:"1.5px dashed #7dd3fc"}}>
      <input ref={ref} type="file" accept="application/pdf,image/*"
        onChange={e=>{handle(e.target.files[0]);e.target.value="";}}
        style={{display:"none"}}/>
      <button type="button" onClick={()=>ref.current.click()} disabled={load}
        style={{width:"100%",padding:"11px",borderRadius:8,border:"1.5px dashed #0284c7",
          background:load?"#f1f5f9":"white",color:"#0284c7",
          cursor:load?"default":"pointer",fontSize:13,fontWeight:700,
          display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        <span style={{fontSize:16}}>📎</span>
        {load?"Memuat...":"Upload PDF / Foto Undangan"}
      </button>
    </div>
  );
}

// ==================== FORM VIEW (top-level - prevents re-mount on every keystroke) ====================

// ═══════════════════════════════════════════════════════
// PENUGASAN PERSONIL MODAL
// ═══════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// EVALUASI PASCA KEGIATAN MODAL
// ═══════════════════════════════════════════════════════
const EVAL_PROTOKOL=[
  "Persiapan tata acara & koordinasi dengan panitia",
  "Pengaturan posisi pimpinan, tamu, dan alur acara",
  "Koordinasi antar petugas protokol di lapangan",
  "Pelaksanaan acara sesuai rundown yang disusun",
  "Penanganan kendala di lapangan secara cepat & tepat",
];
const EVAL_KOMINFO=[
  "Pengambilan foto/video menangkap momen penting",
  "Koordinasi dengan tim protokol terkait momen penting",
  "Kesiapan peralatan dokumentasi & komunikasi",
  "Kecepatan penyiapan bahan publikasi pasca kegiatan",
  "Kelayakan hasil dokumentasi untuk publikasi pimpinan",
];

function EvaluasiModal({ev, onClose, onSave, currentUser}){
  const NAVY="#0A1628",GOLD="#C9A84C",GREEN="#0D6B4F";
  const isKominfo=currentUser.role==="timkom"||currentUser.role==="kasubbag_kominfo";
  const pertanyaan=isKominfo?EVAL_KOMINFO:EVAL_PROTOKOL;
  const tipeTugas=isKominfo?"Komunikasi & Dokumentasi":"Protokol";

  // Load existing eval jika ada
  const existing=(ev.evaluasi||{})[currentUser.username]||{};
  const[scores,setScores]=React.useState(
    Object.fromEntries(pertanyaan.map((_,i)=>[i, existing["s"+i]!==undefined?existing["s"+i]:60]))
  );
  const[catatan,setCatatan]=React.useState(existing.catatan||"");
  const[submitted,setSubmitted]=React.useState(!!existing.submitted);

  const scoreLabel=(v)=>{
    if(v<=20)return{text:"Sangat Kurang",color:"#dc2626"};
    if(v<=40)return{text:"Kurang",color:"#ea580c"};
    if(v<=60)return{text:"Cukup",color:"#d97706"};
    if(v<=80)return{text:"Baik",color:"#16a34a"};
    return{text:"Sangat Baik",color:"#0d6b4f"};
  };

  const avgScore=Math.round(Object.values(scores).reduce((a,b)=>a+b,0)/pertanyaan.length);
  const avgLabel=scoreLabel(avgScore);

  const handleSave=()=>{
    const entry={...Object.fromEntries(Object.entries(scores).map(([i,v])=>["s"+i,v])),catatan,submitted:true,tipe:tipeTugas,savedAt:new Date().toISOString()};
    onSave(entry);
    setSubmitted(true);
  };

  const inp={width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:14,outline:"none",background:"#f8fafc",resize:"vertical"};

  return(
    <div style={{position:"fixed",inset:0,zIndex:3100,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"white",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:600,maxHeight:"94vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 -8px 40px rgba(0,0,0,0.25)"}}>

        {/* Header */}
        <div style={{background:"linear-gradient(135deg,"+NAVY+",#1B4080)",padding:"18px 20px 14px",flexShrink:0}}>
          <div style={{width:36,height:4,background:"rgba(255,255,255,0.3)",borderRadius:4,margin:"0 auto 14px"}}/>
          <div style={{color:GOLD,fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>Evaluasi Pasca Kegiatan · {tipeTugas}</div>
          <div style={{color:"white",fontSize:16,fontWeight:800,lineHeight:1.3}}>{ev.namaAcara}</div>
          <div style={{color:"rgba(255,255,255,0.6)",fontSize:12,marginTop:3}}>{ev.tanggal} · {ev.jam} WITA</div>
        </div>

        {/* Info header */}
        <div style={{background:"#f8fafc",padding:"10px 16px",borderBottom:"1px solid #e2e8f0",display:"flex",gap:16,flexShrink:0}}>
          <div><div style={{fontSize:10,color:"#94a3b8",fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Nama</div><div style={{fontSize:13,fontWeight:700,color:NAVY}}>{currentUser.nama}</div></div>
          <div><div style={{fontSize:10,color:"#94a3b8",fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Jabatan</div><div style={{fontSize:13,fontWeight:700,color:NAVY}}>{currentUser.jabatan}</div></div>
          {avgScore>0&&<div style={{marginLeft:"auto",textAlign:"right"}}>
            <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Rata-rata</div>
            <div style={{fontSize:20,fontWeight:900,color:avgLabel.color}}>{avgScore}<span style={{fontSize:11,fontWeight:500}}>/100</span></div>
          </div>}
        </div>

        <div style={{overflowY:"auto",flex:1,padding:"16px"}}>
          {submitted&&<div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",gap:8,alignItems:"center",fontSize:13,color:"#166534",fontWeight:600}}>
            <span>✅</span> Evaluasi sudah dikirim. Anda masih bisa mengedit dan mengirim ulang.
          </div>}

          {/* Pertanyaan slider */}
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            {pertanyaan.map((q,i)=>{
              const v=scores[i];
              const lbl=scoreLabel(v);
              return(
                <div key={i} style={{background:"#fafbff",borderRadius:12,padding:"14px",border:"1px solid #e8edf4"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,gap:8}}>
                    <div style={{fontSize:12,color:"#334155",fontWeight:600,lineHeight:1.5,flex:1}}>
                      <span style={{color:GOLD,fontWeight:800,marginRight:6}}>{i+1}.</span>{q}
                    </div>
                    <div style={{textAlign:"center",flexShrink:0,minWidth:64}}>
                      <div style={{fontSize:22,fontWeight:900,color:lbl.color,lineHeight:1}}>{v}</div>
                      <div style={{fontSize:9,color:lbl.color,fontWeight:700}}>{lbl.text}</div>
                    </div>
                  </div>
                  {/* Slider */}
                  <div style={{position:"relative",height:36,display:"flex",alignItems:"center"}}>
                    <style>{`
                      .eval-slider-${i}{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:8px;outline:none;cursor:pointer;}
                      .eval-slider-${i}::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;border-radius:50%;background:${lbl.color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);cursor:pointer;}
                      .eval-slider-${i}::-moz-range-thumb{width:24px;height:24px;border-radius:50%;background:${lbl.color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);cursor:pointer;}
                    `}</style>
                    <input type="range" min={0} max={100} step={20}
                      value={v}
                      onChange={e=>setScores(p=>({...p,[i]:Number(e.target.value)}))}
                      className={"eval-slider-"+i}
                      style={{background:`linear-gradient(to right, ${lbl.color} ${v}%, #e2e8f0 ${v}%)`}}
                    />
                  </div>
                  {/* Tick marks */}
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
                    {[0,20,40,60,80,100].map(n=><span key={n} style={{fontSize:9,color:v===n?lbl.color:"#cbd5e1",fontWeight:v===n?800:400,transition:"color 0.2s"}}>{n}</span>)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Catatan */}
          <div style={{marginTop:16,marginBottom:4}}>
            <label style={{display:"block",fontSize:12,color:"#475569",fontWeight:700,marginBottom:6,letterSpacing:0.5}}>CATATAN / SARAN (Opsional)</label>
            <textarea value={catatan} onChange={e=>setCatatan(e.target.value)} rows={3} placeholder="Catatan penting terkait pelaksanaan acara, kendala, atau saran perbaikan..." style={inp}/>
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:"12px 16px",borderTop:"1px solid #e2e8f0",display:"flex",gap:8,flexShrink:0,background:"white"}}>
          <button onClick={onClose} style={{flex:1,padding:"12px",borderRadius:10,border:"1.5px solid #e2e8f0",background:"white",color:"#64748b",cursor:"pointer",fontSize:13,fontWeight:600}}>Tutup</button>
          <button onClick={handleSave} style={{flex:2,padding:"12px",borderRadius:10,border:"none",background:"linear-gradient(135deg,"+NAVY+",#1B4080)",color:"white",cursor:"pointer",fontSize:14,fontWeight:800}}>
            {submitted?"✓ Kirim Ulang Evaluasi":"Kirim Evaluasi"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PenugasanModal({ev, onClose, onSave, currentUser, allUsers, allEvents}){
  const NAVY="#0A1628",GOLD="#C9A84C",GREEN="#0D6B4F";

  // Hanya staf, staf_input, kasubbag, timkom yang bisa ditugaskan
  const eligibleForAssigner=ASSIGN_ROLES[currentUser.role]||["staf","staf_input","timkom"];
  const candidates=allUsers.filter(u=>eligibleForAssigner.includes(u.role));

  const[selected,setSelected]=React.useState(ev.personil||[]);
  const[catatan,setCatatan]=React.useState(ev.catatanPenugasan||"");

  // Cek konflik jadwal untuk satu personil (dalam 2 jam)
  function getConflicts(username){
    const evDate=new Date(ev.tanggal+"T"+ev.jam);
    return allEvents.filter(e=>
      e.id!==ev.id &&
      e.alur==="disetujui" &&
      (e.personil||[]).includes(username)
    ).filter(e=>{
      const d=new Date(e.tanggal+"T"+e.jam);
      return Math.abs(d-evDate)<2*60*60*1000; // dalam 2 jam
    });
  }

  // Cek deadline 12 jam
  const evDateTime=new Date(ev.tanggal+"T"+ev.jam);
  const now=new Date();
  const hoursLeft=(evDateTime-now)/(1000*60*60);
  const past12h=hoursLeft<12;

  const toggle=(username)=>{
    setSelected(p=>p.includes(username)?p.filter(x=>x!==username):[...p,username]);
  };

  const inp={width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:14,outline:"none",background:"#f8fafc",resize:"vertical"};

  return(
    <div style={{position:"fixed",inset:0,zIndex:3000,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"white",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:600,maxHeight:"92vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 -8px 40px rgba(0,0,0,0.2)"}}>
        {/* Header */}
        <div style={{background:"linear-gradient(135deg,"+NAVY+",#1B4080)",padding:"18px 20px 14px",flexShrink:0}}>
          <div style={{width:36,height:4,background:"rgba(255,255,255,0.3)",borderRadius:4,margin:"0 auto 14px"}}/>
          <div style={{color:GOLD,fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>Penugasan Personil</div>
          <div style={{color:"white",fontSize:16,fontWeight:800,lineHeight:1.3}}>{ev.namaAcara}</div>
          <div style={{color:"rgba(255,255,255,0.6)",fontSize:12,marginTop:4}}>{ev.tanggal} · {ev.jam} WITA · {ev.lokasi||"-"}</div>
        </div>

        {/* Warning 12 jam */}
        {past12h&&<div style={{background:"#fff7ed",padding:"9px 16px",borderBottom:"1px solid #fed7aa",display:"flex",gap:8,alignItems:"center",fontSize:12,color:"#9a3412"}}>
          <span>⚠️</span><span><strong>Kurang dari 12 jam</strong> sebelum acara. Penugasan sebaiknya diselesaikan segera.</span>
        </div>}

        <div style={{overflowY:"auto",flex:1,padding:"16px"}}>
          {/* List kandidat */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,color:"#475569",fontWeight:700,marginBottom:8,letterSpacing:0.5}}>PILIH PERSONIL BERTUGAS</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {candidates.map(u=>{
                const conflicts=getConflicts(u.username);
                const isMe=u.username===currentUser.username;
                const checked=selected.includes(u.username);
                return(
                  <div key={u.username} onClick={()=>toggle(u.username)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:"1.5px solid "+(checked?"#0A1628":"#e2e8f0"),background:checked?"#EEF2FF":"#fafafa",cursor:"pointer",transition:"all 0.15s"}}>
                    <div style={{width:22,height:22,borderRadius:6,border:"2px solid "+(checked?NAVY:"#cbd5e1"),background:checked?NAVY:"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                      {checked&&<span style={{color:"white",fontSize:13,lineHeight:1}}>✓</span>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:NAVY,display:"flex",alignItems:"center",gap:6}}>
                        {u.nama}{isMe&&<span style={{fontSize:10,background:"#dbeafe",color:"#1d4ed8",borderRadius:4,padding:"1px 6px",fontWeight:600}}>Saya</span>}
                      </div>
                      <div style={{fontSize:11,color:"#64748b"}}>{u.jabatan}</div>
                    </div>
                    {conflicts.length>0&&<div style={{fontSize:10,background:"#fef2f2",border:"1px solid #fecaca",color:"#dc2626",borderRadius:6,padding:"2px 8px",fontWeight:700,flexShrink:0}}>
                      ⚡ {conflicts.length} acara berdekatan
                    </div>}
                  </div>
                );
              })}
              {candidates.length===0&&<div style={{textAlign:"center",color:"#94a3b8",fontSize:13,padding:20}}>Belum ada akun staf terdaftar</div>}
            </div>
          </div>

          {/* Catatan penugasan */}
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:12,color:"#475569",fontWeight:700,marginBottom:6}}>CATATAN UNTUK PERSONIL</label>
            <textarea value={catatan} onChange={e=>setCatatan(e.target.value)} rows={3} placeholder="Catatan khusus, persiapan, atau arahan untuk personil bertugas..." style={inp}/>
          </div>

          {/* Summary terpilih */}
          {selected.length>0&&<div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"10px 12px",marginBottom:16}}>
            <div style={{fontSize:11,color:"#166534",fontWeight:700,marginBottom:6}}>✓ {selected.length} PERSONIL DITUGASKAN</div>
            {selected.map(un=>{
              const u=candidates.find(x=>x.username===un);
              const cf=getConflicts(un);
              return <div key={un} style={{fontSize:12,color:"#15803d",display:"flex",justifyContent:"space-between"}}>
                <span>• {u?.nama||un}</span>
                {cf.length>0&&<span style={{color:"#dc2626",fontWeight:600}}>⚡ berdekatan dengan {cf.length} acara</span>}
              </div>;
            })}
          </div>}
        </div>

        {/* Footer */}
        <div style={{padding:"12px 16px",borderTop:"1px solid #e2e8f0",display:"flex",gap:8,flexShrink:0}}>
          <button onClick={onClose} style={{flex:1,padding:"12px",borderRadius:10,border:"1.5px solid #e2e8f0",background:"white",color:"#64748b",cursor:"pointer",fontSize:13,fontWeight:600}}>Batal</button>
          <button onClick={()=>onSave(selected,catatan)} style={{flex:2,padding:"12px",borderRadius:10,border:"none",background:NAVY,color:"white",cursor:"pointer",fontSize:14,fontWeight:800}}>
            Simpan Penugasan ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
}

function FormView({form,setForm,editId,isMobile,onSubmit,onCancel,onOpenAI,onUndanganUpload,showT}){
  const fld=(k,l,type="text",full=false)=>(
    <div key={k} style={{marginBottom:12,gridColumn:full?"1 / -1":"auto"}}>
      <label style={{display:"block",fontSize:12,color:"#475569",fontWeight:600,marginBottom:4}}>{l}</label>
      <input
        type={type}
        value={form[k]||""}
        onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
        style={{width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #e2e8f0",
          color:"#1e293b",background:"white",fontSize:14,boxSizing:"border-box"}}
      />
      {k==="tanggal"&&form.tanggal&&
        <div style={{marginTop:4,fontSize:12,color:"#0B2545",fontWeight:700}}>
          {getHari(form.tanggal)}, {fmt(form.tanggal)}
        </div>}
    </div>
  );
  const QUICK_TIMES=["07:00","08:00","09:00","10:00","13:00","14:00","15:00","16:00"];
  const JENIS_COLORS={Sambutan:{bg:"#fdf4ff",a:"#9333ea"},Pengarahan:{bg:"#eff6ff",a:"#2563eb"},Menghadiri:{bg:"#f0fdf4",a:"#16a34a"}};
  return(
    <div style={{background:"white",borderRadius:12,padding:isMobile?"14px":"24px",
      boxShadow:"0 2px 12px rgba(0,0,0,0.07)",border:"1.5px solid #C9A84C"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <h2 style={{margin:0,color:"#0B2545",fontSize:isMobile?15:18,fontWeight:800}}>
          {editId?"Edit Jadwal":"Input Jadwal Baru"}
        </h2>
        {!editId&&<button type="button" onClick={onOpenAI}
          style={{padding:"8px 14px",borderRadius:9,border:"none",
            background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"white",
            cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:6,
            boxShadow:"0 4px 14px rgba(99,102,241,0.35)"}}>
          <span style={{fontSize:15}}>&#x1F916;</span>{isMobile?"AI Auto-Isi":"AI Analisa Undangan"}
        </button>}
      </div>
      <div style={{background:"#f0f9ff",borderRadius:8,padding:"8px 12px",marginBottom:14,
        border:"1px solid #bae6fd",fontSize:12,color:"#0284c7",fontWeight:600}}>
        Alur: Staf &#x2192; Kasubbag Protokol &#x2192; Kabag &#x2192; Tayang
      </div>

      {/* Grid fields */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:"0 20px"}}>
        {fld("tanggal","Tanggal *","date")}

        {/* Jam - simple time input + quick buttons */}
        <div style={{marginBottom:12}}>
          <label style={{display:"block",fontSize:12,color:"#475569",fontWeight:600,marginBottom:4}}>
            Jam Pelaksanaan *
          </label>
          <input
            type="time"
            value={form.jam||""}
            onChange={e=>setForm(p=>({...p,jam:e.target.value}))}
            style={{width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #e2e8f0",
              color:"#1e293b",background:"white",fontSize:15,fontWeight:700,boxSizing:"border-box"}}
          />
          <div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>
            {QUICK_TIMES.map(t=>(
              <button key={t} type="button"
                onClick={()=>setForm(p=>({...p,jam:t}))}
                style={{padding:"3px 8px",borderRadius:14,border:"1.5px solid "+
                  (form.jam===t?"#0B2545":"#e2e8f0"),
                  background:form.jam===t?"#0B2545":"white",
                  color:form.jam===t?"white":"#475569",
                  cursor:"pointer",fontSize:10,fontWeight:700}}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {fld("namaAcara","Nama Acara *","text",true)}
        {fld("penyelenggara","Penyelenggara")}
        {fld("kontak","Kontak")}
        {fld("buktiUndangan","No. Surat / Bukti Undangan")}
      </div>

      {/* Jenis Kegiatan */}
      <div style={{marginBottom:12}}>
        <label style={{display:"block",fontSize:12,color:"#475569",fontWeight:600,marginBottom:4}}>
          Jenis Kegiatan
        </label>
        <div style={{display:"flex",gap:6}}>
          {["Sambutan","Pengarahan","Menghadiri"].map(j=>(
            <button key={j} type="button"
              onClick={()=>setForm(p=>({...p,jenisKegiatan:j}))}
              style={{flex:1,padding:"9px 4px",borderRadius:8,
                border:"1.5px solid "+(form.jenisKegiatan===j?JENIS_COLORS[j].a:"#e2e8f0"),
                background:form.jenisKegiatan===j?JENIS_COLORS[j].bg:"white",
                color:form.jenisKegiatan===j?JENIS_COLORS[j].a:"#64748b",
                cursor:"pointer",fontSize:12,fontWeight:700}}>
              {j}
            </button>
          ))}
        </div>
      </div>

      {/* Pakaian */}
      <div style={{marginBottom:12}}>
        <label style={{display:"block",fontSize:12,color:"#475569",fontWeight:600,marginBottom:4}}>
          Pakaian
        </label>
        <select value={form.pakaian||"PDH"}
          onChange={e=>setForm(p=>({...p,pakaian:e.target.value}))}
          style={{width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #e2e8f0",
            background:"white",color:"#1e293b",fontSize:14,WebkitAppearance:"none",
            boxSizing:"border-box"}}>
          {PAKAIAN.map(x=><option key={x}>{x}</option>)}
        </select>
      </div>

      {/* Catatan */}
      <div style={{marginBottom:12}}>
        <label style={{display:"block",fontSize:12,color:"#475569",fontWeight:600,marginBottom:4}}>
          Catatan Penting
        </label>
        <textarea value={form.catatan||""}
          onChange={e=>setForm(p=>({...p,catatan:e.target.value}))}
          rows={2}
          style={{width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #e2e8f0",
            color:"#1e293b",resize:"vertical",background:"white",fontSize:14,boxSizing:"border-box"}}/>
      </div>

      {/* Lokasi */}
      <div style={{marginBottom:14}}>
        <label style={{display:"block",fontSize:12,color:"#475569",fontWeight:600,marginBottom:4}}>
          Lokasi Acara
        </label>
        <div style={{display:"flex",gap:8}}>
          <input type="text" value={form.lokasi||""}
            onChange={e=>setForm(p=>({...p,lokasi:e.target.value}))}
            placeholder="Nama tempat / alamat"
            style={{flex:1,padding:"10px 12px",borderRadius:9,border:"1.5px solid #e2e8f0",
              color:"#1e293b",background:"white",fontSize:14,boxSizing:"border-box"}}/>
          {form.lokasi&&<a href={"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(form.lokasi)}
            target="_blank" rel="noopener noreferrer"
            style={{padding:"10px 14px",borderRadius:9,background:"#1a73e8",color:"white",
              textDecoration:"none",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",
              flexShrink:0}}>Maps</a>}
        </div>
      </div>

      {/* Untuk Pimpinan */}
      <div style={{marginBottom:18}}>
        <label style={{display:"block",fontSize:12,color:"#475569",fontWeight:600,marginBottom:6}}>
          Untuk Pimpinan
        </label>
        <div style={{display:"flex",gap:10}}>
          {[{key:"walikota",label:"Wali Kota"},{key:"wakilwalikota",label:"Wakil Wali Kota"}].map(p=>(
            <label key={p.key} style={{flex:1,display:"flex",alignItems:"center",
              justifyContent:"center",gap:6,padding:"10px",borderRadius:9,cursor:"pointer",
              border:form.untukPimpinan.includes(p.key)?"2px solid #0B2545":"2px solid #e2e8f0",
              background:form.untukPimpinan.includes(p.key)?"#EBF0FA":"white",
              fontSize:12,fontWeight:700,
              color:form.untukPimpinan.includes(p.key)?"#0B2545":"#94a3b8"}}>
              <input type="checkbox"
                checked={form.untukPimpinan.includes(p.key)}
                style={{display:"none"}}
                onChange={e=>{
                  const v=e.target.checked
                    ?[...form.untukPimpinan,p.key]
                    :form.untukPimpinan.filter(x=>x!==p.key);
                  setForm(prev=>({...prev,untukPimpinan:v}));
                }}/>
              {form.untukPimpinan.includes(p.key)?"[v] ":"[ ] "}{p.label}
            </label>
          ))}
        </div>
      </div>

      {/* Upload Undangan */}
      <div style={{marginBottom:16}}>
        <label style={{display:"block",fontSize:12,color:"#475569",fontWeight:600,marginBottom:6}}>
          Berkas Undangan <span style={{color:"#94a3b8",fontWeight:400}}>(Opsional)</span>
        </label>
        {form.undanganFile
          ?<div style={{background:"#f0f9ff",borderRadius:10,padding:11,border:"1.5px solid #bae6fd"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,background:"white",borderRadius:8,padding:"8px 10px",border:"1px solid #bae6fd",marginBottom:7}}>
              <span style={{fontSize:15,flexShrink:0}}>{form.undanganNama&&form.undanganNama.match(/\.(jpg|jpeg|png)$/i)?"IMG":"PDF"}</span>
              <div style={{flex:1,minWidth:0,fontSize:12,fontWeight:600,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{form.undanganNama||"Berkas Undangan"}</div>
            </div>
            <button type="button" onClick={()=>setForm(p=>({...p,undanganFile:null,undanganNama:""}))}
              style={{width:"100%",padding:"7px",borderRadius:8,border:"1.5px solid #fca5a5",background:"white",color:"#ef4444",cursor:"pointer",fontSize:12,fontWeight:700}}>
              Hapus Berkas
            </button>
          </div>
          :<FormUndanganUpload onFile={(file,name,b64)=>{setForm(p=>({...p,undanganFile:b64,undanganNama:name}));}}/>
        }
      </div>

      {/* Buttons */}
      <div style={{display:"flex",gap:10}}>
        <button type="button" onClick={onCancel}
          style={{flex:1,padding:"12px",borderRadius:10,border:"1.5px solid #e2e8f0",
            background:"white",cursor:"pointer",fontSize:13,fontWeight:600,color:"#64748b"}}>
          Batal
        </button>
        <button type="button" onClick={onSubmit}
          style={{flex:2,padding:"12px",borderRadius:10,border:"none",background:"#0B2545",
            color:"white",cursor:"pointer",fontSize:13,fontWeight:700}}>
          Simpan sebagai Draft
        </button>
      </div>
    </div>
  );
}

// ==================== MAIN APP ====================
// ── API Secret Header Helper ──
const API_SECRET = import.meta.env.VITE_API_SECRET || "";
const apiHeaders = () => ({
  "Content-Type": "application/json",
  ...(API_SECRET ? {"X-API-Secret": API_SECRET} : {})
});

// ==================== LUPA PASSWORD MODAL ====================
function ForgotPasswordModal({onClose}){
  const[step,setStep]=useState("username"); // username → otp → success
  const[un,setUn]=useState("");
  const[otp,setOtp]=useState("");
  const[pw1,setPw1]=useState("");
  const[pw2,setPw2]=useState("");
  const[masked,setMasked]=useState("");
  const[nama,setNama]=useState("");
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState("");
  const inp={width:"100%",padding:"12px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:14,background:"#f8fafc",color:"#1e293b",boxSizing:"border-box",outline:"none"};

  const[channel,setChannel]=useState("wa");
  const[screenCode,setScreenCode]=useState("");

  const requestOTP=async()=>{
    setErr("");if(!un.trim())return setErr("Masukkan username terlebih dahulu.");
    setLoading(true);
    try{
      const r=await fetch("/api/otp",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"request",username:un.toLowerCase().trim()})});
      const d=await r.json();
      if(!r.ok){setErr(d.error||"Gagal mengirim OTP.");setLoading(false);return;}
      setNama(d.nama);setChannel(d.channel);
      if(d.channel==="screen"){setScreenCode(d.code);setOtp(d.code);}
      else{setMasked(d.masked);}
      setStep("otp");
    }catch{setErr("Koneksi gagal.");}
    setLoading(false);
  };

  const verifyOTP=async()=>{
    setErr("");
    if(!otp.trim())return setErr("Masukkan kode OTP.");
    if(!pw1)return setErr("Masukkan password baru.");
    if(pw1.length<6)return setErr("Password minimal 6 karakter.");
    if(pw1!==pw2)return setErr("Konfirmasi password tidak cocok.");
    setLoading(true);
    try{
      const r=await fetch("/api/otp",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"verify",username:un.toLowerCase().trim(),otp,newPassword:pw1})});
      const d=await r.json();
      if(!r.ok)return setErr(d.error||"Verifikasi gagal.");
      setStep("success");
    }catch{setErr("Koneksi gagal.");}
    setLoading(false);
  };

  return <div style={{position:"fixed",inset:0,zIndex:9000,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{background:"white",borderRadius:20,width:"100%",maxWidth:400,overflow:"hidden",boxShadow:"0 24px 64px rgba(0,0,0,0.35)"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#0A1628,#1B4080)",padding:"20px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{color:"white",fontWeight:800,fontSize:16}}>🔑 Lupa Password</div>
          <div style={{color:"rgba(255,255,255,0.6)",fontSize:12,marginTop:2}}>
            {step==="username"?"Masukkan username akun Anda":step==="otp"?"Masukkan kode OTP & password baru":"Password berhasil direset"}
          </div>
        </div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",color:"white",fontSize:13,fontWeight:700}}>✕</button>
      </div>

      <div style={{padding:"24px"}}>
        {err&&<div style={{background:"#fee2e2",borderRadius:9,padding:"10px 13px",marginBottom:14,fontSize:13,color:"#991b1b",fontWeight:600}}>{err}</div>}

        {/* Step 1: Username */}
        {step==="username"&&<>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:12,color:"#475569",fontWeight:700,marginBottom:5}}>USERNAME</label>
            <input value={un} onChange={e=>setUn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&requestOTP()} placeholder="Masukkan username" autoCapitalize="none" style={inp}/>
          </div>
          <div style={{background:"#f0f9ff",borderRadius:9,padding:"10px 13px",marginBottom:16,fontSize:12,color:"#0284c7",border:"1px solid #bae6fd"}}>
            📱 Kode reset akan dikirim ke nomor WhatsApp yang terdaftar pada akun Anda.
          </div>
          <button onClick={requestOTP} disabled={loading} style={{width:"100%",padding:"13px",borderRadius:11,border:"none",background:loading?"#e2e8f0":"linear-gradient(135deg,#0A1628,#1B4080)",color:loading?"#94a3b8":"white",cursor:loading?"default":"pointer",fontSize:14,fontWeight:700}}>
            {loading?"Mengirim...":"Kirim Kode OTP via WhatsApp"}
          </button>
        </>}

        {/* Step 2: OTP + password baru */}
        {step==="otp"&&<>
          {channel==="wa"
            ?<div style={{background:"#f0fdf4",borderRadius:9,padding:"10px 13px",marginBottom:16,fontSize:12,color:"#166534",border:"1px solid #bbf7d0"}}>
              ✅ Kode OTP dikirim ke WA <strong>{masked}</strong> atas nama <strong>{nama}</strong>. Berlaku 10 menit.
            </div>
            :<div style={{background:"#fef3c7",borderRadius:9,padding:"14px",marginBottom:16,border:"1px solid #fde68a",textAlign:"center"}}>
              <div style={{fontSize:11,color:"#92400e",fontWeight:700,marginBottom:6}}>⚠️ WhatsApp belum aktif — Kode OTP Anda:</div>
              <div style={{fontSize:36,fontWeight:900,color:"#0A1628",letterSpacing:8,fontFamily:"monospace"}}>{screenCode}</div>
              <div style={{fontSize:11,color:"#92400e",marginTop:6}}>Berlaku 10 menit. Salin kode ini dan masukkan di bawah.</div>
            </div>
          }
          <div style={{marginBottom:12}}>
            <label style={{display:"block",fontSize:12,color:"#475569",fontWeight:700,marginBottom:5}}>KODE OTP (6 digit)</label>
            <input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="123456" inputMode="numeric" style={{...inp,letterSpacing:8,fontSize:20,textAlign:"center",fontWeight:800}}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{display:"block",fontSize:12,color:"#475569",fontWeight:700,marginBottom:5}}>PASSWORD BARU</label>
            <input type="password" value={pw1} onChange={e=>setPw1(e.target.value)} placeholder="Min. 6 karakter" style={inp}/>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:12,color:"#475569",fontWeight:700,marginBottom:5}}>KONFIRMASI PASSWORD</label>
            <input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} onKeyDown={e=>e.key==="Enter"&&verifyOTP()} placeholder="Ulangi password baru" style={inp}/>
          </div>
          <button onClick={verifyOTP} disabled={loading} style={{width:"100%",padding:"13px",borderRadius:11,border:"none",background:loading?"#e2e8f0":"#0D6B4F",color:loading?"#94a3b8":"white",cursor:loading?"default":"pointer",fontSize:14,fontWeight:700,marginBottom:8}}>
            {loading?"Memverifikasi...":"Reset Password"}
          </button>
          <button onClick={()=>{setStep("username");setOtp("");setPw1("");setPw2("");setErr("");}} style={{width:"100%",padding:"10px",borderRadius:11,border:"1.5px solid #e2e8f0",background:"white",color:"#64748b",cursor:"pointer",fontSize:13,fontWeight:600}}>
            ← Ganti Username
          </button>
        </>}

        {/* Step 3: Sukses */}
        {step==="success"&&<div style={{textAlign:"center",padding:"16px 0"}}>
          <div style={{fontSize:56,marginBottom:12}}>✅</div>
          <div style={{fontSize:17,fontWeight:800,color:"#0D6B4F",marginBottom:6}}>Password Berhasil Direset!</div>
          <div style={{fontSize:13,color:"#64748b",marginBottom:20}}>Silakan login dengan password baru Anda.</div>
          <button onClick={onClose} style={{width:"100%",padding:"13px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#0A1628,#1B4080)",color:"white",cursor:"pointer",fontSize:14,fontWeight:700}}>
            Kembali ke Login
          </button>
        </div>}
      </div>
    </div>
  </div>;
}

// ── WhatsApp Notifikasi Helper ──
async function sendWA(params){
  try{
    await fetch("/api/whatsapp",{
      method:"POST",
      headers:apiHeaders(),
      body:JSON.stringify(params)
    });
  }catch(e){console.warn("WA notif failed:",e);}
}

// ── PWA Push Notifikasi Helper ──
async function sendPush({targetRole,title,body,url,tag}){
  try{
    await fetch("/api/webpush",{
      method:"POST",
      headers:apiHeaders(),
      body:JSON.stringify({action:"send",notify:{title,body,url:url||"/",targetRole,tag}})
    });
  }catch(e){console.warn("Push notif failed:",e);}
}

// ── Daftarkan service worker + subscribe push ──
async function registerPush(username,role){
  if(!("serviceWorker" in navigator)||!("PushManager" in navigator))return;
  try{
    const reg=await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    // Ambil VAPID public key dari server
    const r=await fetch("/api/webpush",{headers:apiHeaders()});
    if(!r.ok)return;
    const{publicKey}=await r.json();
    // Cek apakah sudah subscribe
    let sub=await reg.pushManager.getSubscription();
    if(!sub){
      // Minta izin notifikasi
      const perm=await Notification.requestPermission();
      if(perm!=="granted")return;
      // Subscribe
      sub=await reg.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:urlBase64ToUint8Array(publicKey)
      });
    }
    // Simpan subscription ke server
    await fetch("/api/webpush",{
      method:"POST",
      headers:apiHeaders(),
      body:JSON.stringify({action:"subscribe",subscription:sub,username,role})
    });
  }catch(e){console.warn("Push register failed:",e);}
}

function urlBase64ToUint8Array(base64String){
  const padding="=".repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
  const rawData=window.atob(base64);
  return Uint8Array.from([...rawData].map(c=>c.charCodeAt(0)));
}

export default function App(){
  const width=useWindowWidth();const isMobile=width<768;
  const[user,setUser]=useState(null);const role=user?.role||null;
  const[loginForm,setLF]=useState({username:"",password:""});const[loginErr,setLE]=useState("");const[showPass,setShowPass]=useState(false);
  const[bioLoading,setBioLoading]=useState(false);const[bioErr,setBioErr]=useState("");
  const[events,setEvents]=useState([]);const[dbReady,setDbReady]=useState(false);const[dbError,setDbError]=useState("");
  const[tab,setTab]=useState("jadwal");const[form,setForm]=useState(emptyForm);const[editId,setEditId]=useState(null);
  const[toast,setToast]=useState(null);const[filterDate,setFDate]=useState("");const[filterFrom,setFilterFrom]=useState("");const[filterTo,setFilterTo]=useState("");const[showRangeFilter,setShowRangeFilter]=useState(false);
  const[showAI,setShowAI]=useState(false);const[showReport,setShowReport]=useState(false);const[showSummary,setShowSummary]=useState(false);const[showAdmin,setShowAdmin]=useState(false);const[showProfile,setShowProfile]=useState(false);const[showLaporan,setShowLaporan]=useState(false);
  const[showForgot,setShowForgot]=useState(false);const[showRegister,setShowRegister]=useState(false);const[pendingRegs,setPendingRegs]=useState(()=>loadPendingRegs());
  const[loginLoading,setLoginLoading]=useState(false);const[loginPhase,setLoginPhase]=useState("");
  const[delegTarget,setDelegTarget]= useState(null);const[expandedId,setExp]=useState(null);const[rejectTexts,setRT]=useState({});const[catatanInput,setCatatanInput]=useState({});const[penugasanEv,setPenugasanEv]=useState(null);const[notifPenugasan,setNotifPenugasan]=useState([]);const[evaluasiEv,setEvaluasiEv]=useState(null);const[showMobMenu,setMobMenu]=useState(false);
  const undanganRef=useRef({});

  // Session restore dilakukan di boot() useEffect di atas

  const doLogin=async()=>{
    setLE("");
    const users=loadUsers();
    const candidate=users.find(u=>u.username===loginForm.username.toLowerCase().trim());
    if(!candidate){setLE("Username atau password salah.");return;}
    const ok=await verifyPassword(loginForm.password,candidate.password);
    if(!ok){setLE("Username atau password salah.");return;}
    // Loading screen 2 detik
    setLoginLoading(true);
    setLoginPhase("Memverifikasi identitas...");
    await new Promise(r=>setTimeout(r,800));
    setLoginPhase("Memuat data jadwal...");
    await new Promise(r=>setTimeout(r,900));
    setLoginPhase("Menyiapkan dashboard...");
    await new Promise(r=>setTimeout(r,800));
    setLoginLoading(false);
    setUser(candidate);setTab("jadwal");
    try{localStorage.setItem("jp_session",JSON.stringify({username:candidate.username}));}catch{}
    registerPush(candidate.username,candidate.role);
  };
  const doBioLogin=async()=>{
    const un=loginForm.username.toLowerCase().trim();if(!un){setLE("Isi username terlebih dahulu.");return;}
    const u=loadUsers().find(u=>u.username===un);if(!u){setLE("Username tidak ditemukan.");return;}
    if(!bioIsRegistered(un)){setBioErr("Biometrik belum didaftarkan untuk akun ini. Login dengan password terlebih dahulu, lalu daftarkan biometrik di Pengaturan Akun.");return;}
    setBioLoading(true);setBioErr("");
    try{
      await bioAuthenticate(un);
      setLoginLoading(true);setLoginPhase("Memverifikasi biometrik...");
      await new Promise(r=>setTimeout(r,800));
      setLoginPhase("Memuat data jadwal...");
      await new Promise(r=>setTimeout(r,900));
      setLoginPhase("Menyiapkan dashboard...");
      await new Promise(r=>setTimeout(r,800));
      setLoginLoading(false);
      setUser(u);setTab("jadwal");try{localStorage.setItem("jp_session",JSON.stringify({username:un}));}catch{}registerPush(un,u.role);}
    catch(e){setBioErr("Biometrik gagal: "+e.message);}
    setBioLoading(false);
  };
  const doLogout=()=>{setUser(null);try{localStorage.removeItem("jp_session");}catch{}};

  useEffect(()=>{
    // Load users DAN events bersamaan dari Supabase
    const boot=async()=>{
      // 1. Init users (Supabase → localStorage → default)
      await initUsers().catch(e=>console.warn("initUsers error:",e));
      // 2. Restore session setelah users tersedia
      try{
        const s=localStorage.getItem("jp_session");
        if(s){const d=JSON.parse(s);const u=loadUsers().find(u=>u.username===d.username);if(u)setUser(u);}
      }catch{}
      // 3. Load events
      if(SUPA_OK){
        try{const rows=await dbLoadAll();setEvents(rows&&rows.length>0?rows:seed);}
        catch(err){setDbError(err.message);setEvents(seed);}
      } else {setEvents(seed);}
      setDbReady(true);
    };
    boot();
  },[]);

  const showT=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};
  const updAndSync=useCallback((id,patch)=>{setEvents(p=>{const next=p.map(e=>e.id===id?{...e,...patch}:e);const ev=next.find(e=>e.id===id);if(ev)dbUpsert(ev).catch(console.error);return next;});},[]);
  const deleteAndSync=useCallback((id)=>{setEvents(p=>{const ev=p.find(e=>e.id===id);if(ev?.sambutanFile&&!ev.sambutanFile.startsWith("data:"))storageDelete("sambutan",ev.sambutanFile).catch(()=>{});if(ev?.undanganFile&&!ev.undanganFile.startsWith("data:"))storageDelete("undangan",ev.undanganFile).catch(()=>{});dbDelete(id).catch(console.error);return p.filter(e=>e.id!==id);});},[]);
  const upd=(id,patch)=>updAndSync(id,patch);

  // ── DOCX → PDF via /api/sambutan ──
  const handleSambutanDocx=useCallback(async(evId,file,ev)=>{
    // 1. Baca DOCX sebagai base64
    const docxBase64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
    // 2. Kirim ke /api/sambutan
    const resp=await fetch("/api/sambutan",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({docxBase64,namaAcara:ev.namaAcara,tanggal:ev.tanggal,penyelenggara:ev.penyelenggara,lokasi:ev.lokasi||""})
    });
    if(!resp.ok){const e=await resp.json().catch(()=>({}));throw new Error(e.error||"Gagal konversi");}
    const {pdfBase64,fileName}=await resp.json();
    // 3. Upload ke Supabase storage
    const pdfName=fileName+".pdf";
    const docxName=fileName+".docx";
    let pdfUrl=null,docxUrl=null;
    if(SUPA_OK){
      // Upload PDF
      const pdfBlob=new Blob([Uint8Array.from(atob(pdfBase64),ch=>ch.charCodeAt(0))],{type:"application/pdf"});
      const pdfFile=new File([pdfBlob],pdfName,{type:"application/pdf"});
      pdfUrl=await storageUpload("sambutan",evId+"/pdf",pdfFile).catch(()=>null);
      // Upload DOCX asli
      const docxFile=new File([file],docxName,{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
      docxUrl=await storageUpload("sambutan",evId+"/docx",docxFile).catch(()=>null);
    }
    // Fallback ke data-URI jika storage belum aktif
    if(!pdfUrl) pdfUrl="data:application/pdf;base64,"+pdfBase64;
    if(!docxUrl) docxUrl=URL.createObjectURL(file);
    updAndSync(evId,{sambutanFile:pdfUrl,sambutanNama:pdfName,sambutanDocx:docxUrl,sambutanDocxNama:docxName});
    return {pdfBase64,pdfUrl};
  },[updAndSync]);

  const handleSambutanUpload=useCallback(async(evId,file,name)=>{
    if(SUPA_OK){const url=await storageUpload("sambutan",evId,file);if(url){updAndSync(evId,{sambutanFile:url,sambutanNama:name});return;}}
    const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsDataURL(file);});updAndSync(evId,{sambutanFile:b64,sambutanNama:name});
  },[updAndSync]);

  // ── Simpan penugasan personil ──
  // ── Simpan evaluasi pasca kegiatan ──
  const saveEvaluasi=(evId, entry)=>{
    const ev=events.find(e=>e.id===evId);
    const existing=ev?.evaluasi||{};
    const updated={...existing,[user.username]:entry};
    upd(evId,{evaluasi:updated});
    showT("Evaluasi berhasil dikirim ✓");
  };

    const savePenugasan=async(evId,personilArr,catatanPenugasan)=>{
    upd(evId,{personil:personilArr,catatanPenugasan});
    setPenugasanEv(null);
    showT("Penugasan disimpan untuk "+personilArr.length+" personil ✓");
    // Kirim notifikasi push ke masing-masing personil
    const ev=events.find(e=>e.id===evId);
    for(const un of personilArr){
      const u=loadUsers().find(x=>x.username===un);
      if(u){
        await sendPush({targetRole:u.role,title:"📋 Anda Ditugaskan",body:ev?.namaAcara+" · "+ev?.tanggal+" "+ev?.jam+" WITA"+(catatanPenugasan?" · "+catatanPenugasan:""),url:"/",tag:"penugasan-"+evId+"-"+un});
      }
    }
  };

  // ── Cek jadwal belum ditugaskan (notif H-12) ──
  React.useEffect(()=>{
    if(!["kasubbag","kasubbag_kominfo","timkom"].includes(role))return;
    const now=new Date();
    const unassigned=events.filter(ev=>{
      if(ev.alur!=="disetujui")return false;
      const evTime=new Date(ev.tanggal+"T"+ev.jam);
      const hoursLeft=(evTime-now)/(1000*60*60);
      return hoursLeft>0&&hoursLeft<=12&&(!ev.personil||ev.personil.length===0);
    });
    setNotifPenugasan(unassigned);
  },[events,role]);

  const handleUndanganUpload=useCallback(async(evId,file,name)=>{
    if(SUPA_OK){const url=await storageUpload("undangan",evId,file);if(url){updAndSync(evId,{undanganFile:url,undanganNama:name});return;}}
    const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsDataURL(file);});updAndSync(evId,{undanganFile:b64,undanganNama:name});
  },[updAndSync]);

  const getVisible=()=>{
    if(tab==="tayang"){
      const ws=weekStart(),we=weekEnd();
      return events.filter(e=>{
        if(e.alur!=="disetujui")return false;
        if(filterDate==="range")return(!filterFrom||e.tanggal>=filterFrom)&&(!filterTo||e.tanggal<=filterTo);
        if(filterDate==="week")return e.tanggal>=ws&&e.tanggal<=we;
        if(filterDate)return e.tanggal===filterDate;
        return true;
      }).sort((a,b)=>(a.tanggal+a.jam).localeCompare(b.tanggal+b.jam));
    }
    let base=events;
    // Staf dan staf_input lihat jadwal disetujui yang ditugaskan ke mereka juga
    if(role==="staf"||role==="staf_input"){
      return events.filter(e=>{
        if(e.alur==="disetujui"&&(e.personil||[]).includes(user.username))return true;
        // Jadwal yang mereka submit sendiri
        return !filterDate||e.tanggal===filterDate;
      }).filter(e=>!filterDate||e.tanggal===filterDate).sort((a,b)=>(a.tanggal+a.jam).localeCompare(b.tanggal+b.jam));
    }
    if(role==="walikota")base=events.filter(e=>e.untukPimpinan.includes("walikota")&&e.alur==="disetujui");
    else if(role==="wakilwalikota")base=events.filter(e=>e.alur==="disetujui"&&(e.untukPimpinan.includes("wakilwalikota")||e.delegasiKeWWK));
    else if(role==="ajudan")base=events.filter(e=>e.alur==="disetujui");
    else if(role==="timkom")base=events.filter(e=>e.alur!=="ditolak");
    else if(role==="kasubbag"||role==="kasubbag_kominfo")base=tab==="semua"?events:events.filter(e=>e.alur==="menunggu_kasubbag"||(e.alurHapus&&e.alur==="disetujui"));
    else if(role==="kabag")base=tab==="semua"?events:events.filter(e=>e.alur==="menunggu_kabag"||(e.alurHapus==="menunggu_kabag"));
    if(filterDate==="range"&&(filterFrom||filterTo)){
      base=base.filter(e=>(!filterFrom||e.tanggal>=filterFrom)&&(!filterTo||e.tanggal<=filterTo));
    }else if(filterDate==="week"){
      const ws=weekStart(),we=weekEnd();base=base.filter(e=>e.tanggal>=ws&&e.tanggal<=we);
    }else if(filterDate){
      base=base.filter(e=>e.tanggal===filterDate);
    }
    // Urutkan: yang belum lewat (mulai besok s/d mendatang) duluan, lalu lampau di bawah
    const nowStr=new Date().toISOString().slice(0,16).replace("T"," ");
    const upcoming2=base.filter(e=>(e.tanggal+" "+e.jam)>=nowStr).sort((a,b)=>(a.tanggal+a.jam).localeCompare(b.tanggal+b.jam));
    const past2=base.filter(e=>(e.tanggal+" "+e.jam)<nowStr).sort((a,b)=>(b.tanggal+b.jam).localeCompare(a.tanggal+a.jam));
    return [...upcoming2,...past2];
  };
  const pendingList=events.filter(e=>{
    if(role==="kasubbag"||role==="kasubbag_kominfo")return e.alur==="menunggu_kasubbag"||(e.alurHapus==="menunggu_kasubbag");if(role==="kabag")return e.alur==="menunggu_kabag"||(e.alurHapus==="menunggu_kabag");
    if(role==="timkom")return e.alur==="disetujui"&&!e.sambutanFile&&e.jenisKegiatan==="Sambutan";
    if(role==="walikota")return e.untukPimpinan.includes("walikota")&&e.alur==="disetujui"&&!e.statusWK;
    if(role==="wakilwalikota")return e.alur==="disetujui"&&(e.untukPimpinan.includes("wakilwalikota")||e.delegasiKeWWK)&&!e.statusWWK;
    return false;
  });
  const goToPending=()=>{if(!pendingList.length)return;setFDate("");setExp(pendingList[0].id);setTimeout(()=>document.getElementById("ev-"+pendingList[0].id)?.scrollIntoView({behavior:"smooth",block:"center"}),200);};

  const submit=()=>{
    if(!form.namaAcara||!form.tanggal||!form.jam){showT("Nama acara, tanggal & jam wajib diisi.","error");return;}
    const conflict=hasConflict(events,{...form,id:editId||0,alur:"disetujui"});
    if(editId!==null){setEvents(p=>{const next=p.map(e=>e.id===editId?{...e,...form}:e);const u=next.find(e=>e.id===editId);if(u)dbUpsert(u).catch(console.error);return next;});showT("Jadwal diperbarui");setEditId(null);}
    else{const n={...form,id:Date.now(),alur:"draft",catatanTolak:"",statusWK:null,statusWWK:null,perwakilanWK:"",perwakilanWWK:"",delegasiKeWWK:false,sambutanFile:null,sambutanNama:"",catatanPimpinan:"",tersembunyi:false,alurHapus:null};setEvents(p=>[...p,n]);dbUpsert(n).catch(console.error);if(conflict)showT("Potensi tabrakan jadwal!","warn");else showT("Draft disimpan. Kirim ke Kasubbag.");}
    setForm(emptyForm);setTab("jadwal");
  };

  const TH={walikota:{g:"linear-gradient(135deg,"+NAVY+",#1B4080)",a:GOLD},wakilwalikota:{g:"linear-gradient(135deg,#053f2a,#065f46)",a:"#6ee7b7"},ajudan:{g:"linear-gradient(135deg,#1e293b,#334155)",a:"#94a3b8"},timkom:{g:"linear-gradient(135deg,#3730a3,#4f46e5)",a:"#a5b4fc"},staf:{g:"linear-gradient(135deg,"+NAVY+",#1B4080)",a:GOLD},staf_input:{g:"linear-gradient(135deg,#1e3a5f,#2563eb)",a:"#93c5fd"},kasubbag:{g:"linear-gradient(135deg,#78350f,#d97706)",a:"#fde68a"},kasubbag_kominfo:{g:"linear-gradient(135deg,#1e3a5f,#0284c7)",a:"#7dd3fc"},kabag:{g:"linear-gradient(135deg,#064e3b,#10b981)",a:"#6ee7b7"}};
  const th=TH[role]||TH.staf;
  const roleInfo=ALL_ROLE_DEFS.find(r=>r.key===role)||{icon:"circle",label:"",key:""};
  const kabagNama=loadUsers().find(u=>u.role==="kabag")?.nama||"Kabag Protokol & Komunikasi Pimpinan";
  const canReport=ROLES_WITH_REPORT.includes(role);
  const isStafAny=STAF_ROLES.includes(role)||role==="staf_input";
  const isKasubbagAny=KASUBBAG_ROLES.includes(role);
  const listEvents=getVisible();
  const showForm=tab==="form"&&(role==="staf"||role==="staf_input");
  const showPenugasan=tab==="penugasan";

  const CSS=`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap');
    html,body{margin:0;padding:0;width:100%;overflow-x:hidden;-webkit-text-size-adjust:100%;background:#0A1628;}
    *{box-sizing:border-box;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;}
    input,select,textarea,button{font-family:inherit;}
    input[type=text],input[type=password],input[type=date],input[type=time],input[type=email],select,textarea{font-size:16px!important;-webkit-appearance:none;appearance:none;}
    a{-webkit-tap-highlight-color:transparent;color:inherit;}
    button{-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
    ::-webkit-scrollbar{width:4px;height:4px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.15);border-radius:4px;}

    /* ── Keyframes ── */
    @keyframes up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes upSpring{0%{opacity:0;transform:translateY(20px) scale(0.97)}60%{transform:translateY(-3px) scale(1.005)}100%{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes slideIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
    @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
    @keyframes tapIn{0%{transform:scale(1)}50%{transform:scale(0.95)}100%{transform:scale(1)}}

    /* ── Nav ── */
    .nav-btn{transition:all 0.18s cubic-bezier(0.34,1.56,0.64,1);border-radius:10px!important;}
    .nav-btn:hover{background:rgba(255,255,255,0.13)!important;opacity:1!important;transform:translateX(3px);}
    .nav-btn:active{transform:scale(0.97)!important;}
    .sidebar-link{transition:all 0.18s ease;}
    .sidebar-link:hover{background:rgba(255,255,255,0.11)!important;}

    /* ── Cards ── */
    .ev-card{transition:transform 0.18s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.18s ease;animation:upSpring 0.35s ease both;}
    .ev-card:active{transform:scale(0.985)!important;}
    .card-row{transition:background 0.12s;}
    .card-row:hover{background:#F5F8FF!important;}

    /* ── Buttons ── */
    .btn-ios{transition:all 0.15s cubic-bezier(0.34,1.56,0.64,1);}
    .btn-ios:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(10,22,40,0.22);}
    .btn-ios:active{transform:scale(0.96)!important;}
    .btn-primary{transition:all 0.15s ease;}
    .btn-primary:hover{opacity:0.88;transform:translateY(-1px);}
    .btn-primary:active{transform:scale(0.97);}

    /* ── Table ── */
    table.ev-table{width:100%;border-collapse:collapse;font-size:13px;}
    table.ev-table thead th{background:#F6F9FE;color:#64748B;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;padding:11px 14px;text-align:left;border-bottom:1.5px solid #E4EAF2;white-space:nowrap;}
    table.ev-table tbody td{padding:12px 14px;border-bottom:1px solid #F0F4FA;vertical-align:middle;}
    table.ev-table tbody tr:hover td{background:#F5F8FF;}
    table.ev-table tbody tr:last-child td{border-bottom:none;}

    /* ── Chips & Badges ── */
    .chip{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:0.3px;white-space:nowrap;}
    .chip-wk{background:rgba(10,22,40,0.08);color:#0A1628;}
    .chip-wwk{background:#ECFDF5;color:#0D6B4F;}
    .badge-pill{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10.5px;font-weight:700;white-space:nowrap;}

    /* ── Modals ── */
    .modal-overlay{position:fixed;inset:0;z-index:8100;background:rgba(5,12,25,0.65);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;animation:fadeIn 0.2s ease;}
    @media(min-width:768px){.modal-overlay{align-items:center;padding:24px;}}
    .modal-box{background:white;border-radius:24px 24px 0 0;width:100%;max-width:600px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 -8px 40px rgba(0,0,0,0.2);animation:sheetUp 0.32s cubic-bezier(0.34,1.3,0.64,1);}
    @media(min-width:768px){.modal-box{border-radius:20px;animation:up 0.25s cubic-bezier(0.34,1.3,0.64,1);box-shadow:0 24px 60px rgba(0,0,0,0.25);}}
    .modal-handle{width:36px;height:4px;background:#E2E8F0;border-radius:4px;margin:10px auto 0;flex-shrink:0;}

    /* ── Forms ── */
    .form-section{background:white;border-radius:16px;padding:20px;box-shadow:0 2px 16px rgba(0,0,0,0.06);border:1px solid #E8EDF4;margin-bottom:14px;}
    .form-section h3{margin:0 0 14px;font-size:14px;font-weight:800;color:#0A1628;letter-spacing:-0.2px;}
    input:focus,select:focus,textarea:focus{outline:none;border-color:#0A1628!important;box-shadow:0 0 0 3px rgba(10,22,40,0.07)!important;}
    button:focus-visible{outline:2px solid ${GOLD};outline-offset:2px;}

    /* ── iOS Tab Bar ── */
    .ios-tab-bar{position:fixed;bottom:0;left:0;right:0;z-index:300;background:rgba(248,250,255,0.88);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border-top:0.5px solid rgba(0,0,0,0.1);padding-bottom:env(safe-area-inset-bottom,0px);display:flex;}
    .ios-tab-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 4px 6px;border:none;background:transparent;cursor:pointer;-webkit-tap-highlight-color:transparent;gap:3px;transition:transform 0.15s cubic-bezier(0.34,1.56,0.64,1);}
    .ios-tab-btn:active{transform:scale(0.88);}
    .ios-tab-icon{font-size:22px;line-height:1;transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1);}
    .ios-tab-btn.active .ios-tab-icon{transform:scale(1.1);}
    .ios-tab-label{font-size:10px;font-weight:600;letter-spacing:0.1px;}
  `;

  // ── LOGIN LOADING SCREEN (harus SEBELUM if(!user) agar tidak ter-override) ──
  if(loginLoading)return(
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"linear-gradient(160deg,"+NAVY+" 0%,#142238 60%,#0D1F35 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:0,overflow:"hidden"}}>
      <style>{CSS}</style>
      {/* Lingkaran dekoratif latar */}
      <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",border:"1px solid rgba(201,168,76,0.08)",top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}/>
      <div style={{position:"absolute",width:260,height:260,borderRadius:"50%",border:"1px solid rgba(201,168,76,0.12)",top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}/>
      {/* Logo */}
      <img src="/logo_tarakan.png" alt="" style={{height:80,width:"auto",objectFit:"contain",filter:"drop-shadow(0 4px 24px rgba(201,168,76,0.35))",marginBottom:20,animation:"pulse 2s ease infinite"}} onError={e=>e.target.style.display="none"}/>
      {/* Nama sistem */}
      <div style={{color:"white",fontSize:20,fontWeight:800,letterSpacing:"1px",marginBottom:4}}>Prokopim Tarakan</div>
      <div style={{color:"rgba(201,168,76,0.7)",fontSize:11,fontWeight:500,letterSpacing:"2px",textTransform:"uppercase",marginBottom:32}}>Sistem Informasi Jadwal Pimpinan</div>
      {/* Spinner emas */}
      <div style={{width:44,height:44,position:"relative",marginBottom:20}}>
        <div style={{position:"absolute",inset:0,border:"3px solid rgba(201,168,76,0.15)",borderTopColor:"#C9A84C",borderRadius:"50%",animation:"spin 0.9s linear infinite"}}/>
      </div>
      {/* Fase loading */}
      <div style={{color:"#C9A84C",fontSize:13,fontWeight:600,letterSpacing:"0.5px",marginBottom:40,minHeight:20,animation:"pulse 1.2s ease infinite"}}>{loginPhase}</div>
      {/* Tagline di bawah */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"28px 20px 32px",textAlign:"center",background:"linear-gradient(to top,rgba(0,0,0,0.5),transparent)"}}>
        <div style={{color:"rgba(255,255,255,0.45)",fontSize:10,fontWeight:500,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:8}}>Motto Pelayanan</div>
        <div style={{color:"rgba(255,255,255,0.75)",fontSize:13,fontWeight:600,fontStyle:"italic",lineHeight:1.6}}>
          "Berikan yang terbaik, untuk kota kita"
        </div>
        <div style={{color:"#C9A84C",fontSize:12,fontWeight:800,letterSpacing:"2px",marginTop:6}}>#TARAKANHIBOT</div>
      </div>
    </div>
  );

  // ==================== LOGIN ====================
  if(!user){
    const features=[
      ["📋","Workflow Approval","Staf → Kasubbag → Kabag"],
      ["🤖","Analisa AI","Upload undangan, isi otomatis"],
      ["📄","Laporan PDF","Cetak rekap A4 landscape"],
      ["📱","Multi Platform","Desktop, tablet & mobile"],
    ];
    // Warna tema
    const BG="hsl(215,30%,10%)";
    const CARD="hsl(215,35%,14%)";
    const CARD2="hsl(215,30%,16%)";
    const GOLD2="hsl(42,78%,55%)";
    const GOLD_LIGHT="hsl(42,85%,70%)";
    const SEC="hsl(215,25%,20%)";
    const MUTED="hsl(215,15%,55%)";
    const BORDER="hsl(215,20%,22%)";
    const FG="hsl(210,20%,90%)";
    const inpStyle={
      width:"100%",height:48,padding:"0 14px",borderRadius:10,
      border:"1.5px solid "+BORDER,
      background:"hsla(215,25%,20%,0.5)",
      color:FG,fontSize:14,outline:"none",boxSizing:"border-box",
      fontFamily:"'Plus Jakarta Sans',sans-serif",
    };
    return(
    <div style={{minHeight:"100vh",width:"100%",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:isMobile?"flex-start":"center",padding:isMobile?"0":"24px",overflowY:"auto",position:"relative",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <style>{CSS+`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideRight{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
        @keyframes pulseGlow{0%,100%{box-shadow:0 0 40px -10px hsla(42,78%,55%,0.2)}50%{box-shadow:0 0 40px -10px hsla(42,78%,55%,0.45)}}
        @keyframes focusBorder{to{border-color:hsl(42,78%,55%)}}
        .login-inp:focus{border-color:hsl(42,78%,55%)!important;box-shadow:0 0 0 3px hsla(42,78%,55%,0.15)!important;}
        .login-btn-primary{background:hsl(42,78%,55%);color:hsl(215,30%,10%);border:none;font-weight:800;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;transition:all 0.2s;}
        .login-btn-primary:hover{background:hsl(42,85%,70%);box-shadow:0 4px 20px hsla(42,78%,55%,0.4);transform:translateY(-1px);}
        .login-btn-primary:active{transform:scale(0.97);}
        .login-btn-outline{background:transparent;border:1.5px solid hsla(215,20%,60%,0.25);color:${MUTED};font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;transition:all 0.2s;}
        .login-btn-outline:hover{border-color:hsla(42,78%,55%,0.4);color:${FG};}
        .feat-item{animation:fadeUp 0.6s ease both;}
        .login-card{animation:slideRight 0.6s ease both;}
      `}</style>

      {/* Dekorasi latar — lingkaran blur */}
      <div style={{position:"fixed",top:"-10%",right:"-5%",width:400,height:400,borderRadius:"50%",background:"hsla(42,78%,55%,0.03)",filter:"blur(80px)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:"-15%",left:"-10%",width:500,height:500,borderRadius:"50%",background:"hsla(42,78%,55%,0.02)",filter:"blur(100px)",pointerEvents:"none"}}/>

      {/* ── MOBILE LAYOUT ── */}
      {isMobile&&<>
        {/* Hero strip */}
        <div style={{width:"100%",background:"hsla(215,35%,14%,0.9)",backdropFilter:"blur(20px)",borderBottom:"1px solid "+BORDER,padding:"28px 24px 22px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <img src="/logo_tarakan.png" alt="Logo" style={{height:48,width:"auto",objectFit:"contain",filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.5))",flexShrink:0}} onError={e=>e.target.style.display="none"}/>
            <div>
              <div style={{color:GOLD2,fontSize:9,letterSpacing:2.5,textTransform:"uppercase",fontWeight:700,marginBottom:3}}>Pemerintah Kota Tarakan</div>
              <div style={{color:FG,fontSize:15,fontWeight:800,lineHeight:1.3}}>Protokol &amp; Komunikasi Pimpinan</div>
            </div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {features.map(([ic,t])=><span key={t} style={{background:"hsla(42,78%,55%,0.12)",border:"1px solid hsla(42,78%,55%,0.3)",borderRadius:20,padding:"3px 10px",fontSize:10,color:GOLD2,fontWeight:700}}>{ic} {t}</span>)}
          </div>
        </div>

        {/* Login card mobile */}
        <div style={{width:"100%",flex:1,padding:"28px 24px 40px",display:"flex",flexDirection:"column",background:BG}}>
          <div style={{marginBottom:24}}>
            <div style={{backgroundImage:"linear-gradient(135deg,"+GOLD2+","+GOLD_LIGHT+")",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontSize:22,fontWeight:800,marginBottom:4}}>Masuk ke Sistem</div>
            <div style={{fontSize:13,color:MUTED}}>Masukkan kredensial akun Anda</div>
          </div>

          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:11,color:MUTED,fontWeight:700,marginBottom:6,letterSpacing:1.2,textTransform:"uppercase"}}>Username</label>
            <input className="login-inp" type="text" value={loginForm.username} onChange={e=>setLF(p=>({...p,username:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="Masukkan username" autoCapitalize="none" autoCorrect="off" style={inpStyle}/>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:11,color:MUTED,fontWeight:700,marginBottom:6,letterSpacing:1.2,textTransform:"uppercase"}}>Password</label>
            <div style={{position:"relative"}}>
              <input className="login-inp" type={showPass?"text":"password"} value={loginForm.password} onChange={e=>setLF(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="Masukkan password" style={{...inpStyle,paddingRight:44}}/>
              <button onClick={()=>setShowPass(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:MUTED,fontSize:18,padding:4}}>{showPass?"👁️":"👁️‍🗨️"}</button>
            </div>
          </div>

          {loginErr&&<div style={{background:"hsla(0,84%,60%,0.15)",borderRadius:9,padding:"10px 13px",marginBottom:12,fontSize:13,color:"hsl(0,84%,75%)",fontWeight:600,border:"1px solid hsla(0,84%,60%,0.3)"}}>{loginErr}</div>}
          {(bioErr||bioLoading)&&<div style={{background:"hsla(210,80%,55%,0.12)",borderRadius:9,padding:"10px 13px",marginBottom:12,fontSize:13,color:"hsl(210,80%,75%)",fontWeight:600,border:"1px solid hsla(210,80%,55%,0.25)"}}>{bioLoading?"Memverifikasi biometrik...":bioErr}</div>}

          <button className="login-btn-primary" onClick={doLogin} style={{width:"100%",height:48,borderRadius:12,fontSize:15,fontWeight:800,marginBottom:10,animation:"pulseGlow 3s ease infinite"}}>Masuk</button>
          <button className="login-btn-outline" onClick={()=>setShowForgot(true)} style={{width:"100%",height:44,borderRadius:12,fontSize:13,fontWeight:600,marginBottom:8}}>🔑 Lupa Password?</button>
          <button onClick={()=>setShowRegister(true)} style={{width:"100%",height:42,borderRadius:12,border:"1.5px dashed rgba(201,168,76,0.5)",background:"transparent",color:GOLD2,cursor:"pointer",fontSize:13,fontWeight:600,marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <span>📝</span> Belum punya akun? Daftar di sini
            </button>

          {bioSupported()&&<>
            <button className="login-btn-outline" onClick={doBioLogin} disabled={bioLoading} style={{width:"100%",height:44,borderRadius:12,fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:18}}>🔐</span>{bioLoading?"Memproses...":"Login Biometrik / PIN"}
            </button>
            {loginForm.username&&!bioIsRegistered(loginForm.username.toLowerCase().trim())&&
              <div style={{background:"hsla(42,78%,55%,0.1)",borderRadius:8,padding:"8px 11px",fontSize:12,color:GOLD2,display:"flex",gap:6,alignItems:"flex-start",marginBottom:8,border:"1px solid hsla(42,78%,55%,0.2)"}}>
                <span>⚠️</span><span>Biometrik belum aktif. Login dulu lalu aktifkan di <strong>Pengaturan Akun</strong>.</span>
              </div>}
          </>}

          <details style={{marginTop:20}}>
            <summary style={{fontSize:11,color:MUTED,fontWeight:700,letterSpacing:1.2,cursor:"pointer",userSelect:"none",listStyle:"none",display:"flex",alignItems:"center",gap:6,textTransform:"uppercase"}}>
              <span>&#9660;</span> Akun Demo
            </summary>
            <div style={{marginTop:8,padding:"10px 12px",background:CARD,borderRadius:10,border:"1px solid "+BORDER}}>
              {loadUsers().map(u=><div key={u.username} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:MUTED,padding:"4px 0",borderBottom:"1px solid "+BORDER}}>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,color:FG,opacity:0.7}}>{u.jabatan}</span>
                <span style={{color:GOLD2,fontFamily:"monospace",flexShrink:0,marginLeft:8,fontWeight:700,fontSize:10}}>{u.username}</span>
              </div>)}
            </div>
          </details>
          <div style={{marginTop:"auto",paddingTop:24,textAlign:"center",color:MUTED,fontSize:10,letterSpacing:1.5,opacity:0.5}}>v0.6 Alpha · Release 20260603</div>
        </div>
      </>}

      {/* ── DESKTOP LAYOUT ── */}
      {!isMobile&&<div style={{width:"100%",maxWidth:960,display:"flex",gap:0,borderRadius:20,overflow:"hidden",boxShadow:"0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px "+BORDER,animation:"pulseGlow 3s ease infinite"}}>
        {/* Left panel hero */}
        <div style={{flex:1,background:"linear-gradient(160deg,hsla(215,35%,14%,0.95),hsla(215,30%,11%,0.98))",backdropFilter:"blur(20px)",padding:"48px 44px",display:"flex",flexDirection:"column",justifyContent:"space-between",borderRight:"1px solid "+BORDER}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:32}}>
              <img src="/logo_tarakan.png" alt="Logo" style={{height:64,width:"auto",objectFit:"contain",filter:"drop-shadow(0 2px 12px rgba(0,0,0,0.5))",flexShrink:0}} onError={e=>e.target.style.display="none"}/>
              <div>
                <div style={{color:GOLD2,fontSize:9,letterSpacing:2.5,textTransform:"uppercase",fontWeight:700,marginBottom:4}}>Pemerintah Kota Tarakan</div>
                <div style={{color:FG,fontSize:17,fontWeight:800,lineHeight:1.25}}>Bagian Protokol &amp;</div>
                <div style={{color:FG,fontSize:17,fontWeight:800}}>Komunikasi Pimpinan</div>
              </div>
            </div>
            <div style={{width:40,height:3,background:"linear-gradient(90deg,"+GOLD2+","+GOLD_LIGHT+")",borderRadius:3,marginBottom:24}}/>
            <div style={{color:MUTED,fontSize:13,lineHeight:1.9,marginBottom:36}}>
              Sistem Informasi Jadwal Kegiatan Pimpinan Daerah Kota Tarakan. Mengelola agenda, approval workflow, dan koordinasi tim protokol secara terpadu.
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {features.map(([ic,t,d],i)=><div key={t} className="feat-item" style={{display:"flex",alignItems:"center",gap:12,animationDelay:(i*0.1)+"s"}}>
                <div style={{width:34,height:34,borderRadius:9,background:"hsla(42,78%,55%,0.12)",border:"1px solid hsla(42,78%,55%,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{ic}</div>
                <div><div style={{color:FG,fontSize:13,fontWeight:700}}>{t}</div><div style={{color:MUTED,fontSize:11}}>{d}</div></div>
              </div>)}
            </div>
          </div>
          <div style={{color:MUTED,fontSize:10,letterSpacing:1.5,opacity:0.5}}>v0.6 Alpha · Release 20260603</div>
        </div>

        {/* Right panel login */}
        <div className="login-card" style={{width:370,background:"linear-gradient(160deg,hsla(215,35%,14%,0.8),hsla(215,30%,16%,0.6))",backdropFilter:"blur(20px)",padding:"44px 38px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <div style={{marginBottom:28}}>
            <div style={{backgroundImage:"linear-gradient(135deg,"+GOLD2+","+GOLD_LIGHT+")",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontSize:24,fontWeight:800,marginBottom:6}}>Masuk ke Sistem</div>
            <div style={{fontSize:13,color:MUTED}}>Masukkan kredensial akun Anda</div>
          </div>

          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:11,color:MUTED,fontWeight:700,marginBottom:6,letterSpacing:1.2,textTransform:"uppercase"}}>Username</label>
            <input className="login-inp" type="text" value={loginForm.username} onChange={e=>setLF(p=>({...p,username:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="Masukkan username" autoCapitalize="none" autoCorrect="off" style={inpStyle}/>
          </div>
          <div style={{marginBottom:18}}>
            <label style={{display:"block",fontSize:11,color:MUTED,fontWeight:700,marginBottom:6,letterSpacing:1.2,textTransform:"uppercase"}}>Password</label>
            <div style={{position:"relative"}}>
              <input className="login-inp" type={showPass?"text":"password"} value={loginForm.password} onChange={e=>setLF(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="Masukkan password" style={{...inpStyle,paddingRight:44}}/>
              <button onClick={()=>setShowPass(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:MUTED,fontSize:16,padding:4}}>{showPass?"👁️":"👁️‍🗨️"}</button>
            </div>
          </div>

          {loginErr&&<div style={{background:"hsla(0,84%,60%,0.15)",borderRadius:9,padding:"9px 13px",marginBottom:12,fontSize:13,color:"hsl(0,84%,75%)",fontWeight:600,border:"1px solid hsla(0,84%,60%,0.3)"}}>{loginErr}</div>}
          {(bioErr||bioLoading)&&<div style={{background:"hsla(210,80%,55%,0.12)",borderRadius:9,padding:"9px 13px",marginBottom:12,fontSize:13,color:"hsl(210,80%,75%)",fontWeight:600,border:"1px solid hsla(210,80%,55%,0.25)"}}>{bioLoading?"Memverifikasi biometrik perangkat...":bioErr}</div>}

          <button className="login-btn-primary" onClick={doLogin} style={{width:"100%",height:48,borderRadius:12,fontSize:15,fontWeight:800,marginBottom:10}}>Masuk</button>
          <button className="login-btn-outline" onClick={()=>setShowForgot(true)} style={{width:"100%",height:42,borderRadius:12,fontSize:13,fontWeight:600,marginBottom:8}}>🔑 Lupa Password?</button>
          <button onClick={()=>setShowRegister(true)} style={{width:"100%",height:42,borderRadius:12,border:"1.5px dashed rgba(201,168,76,0.5)",background:"transparent",color:GOLD2,cursor:"pointer",fontSize:13,fontWeight:600,marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <span>📝</span> Belum punya akun? Daftar di sini
            </button>

          {bioSupported()&&<>
            <button className="login-btn-outline" onClick={doBioLogin} disabled={bioLoading} style={{width:"100%",height:42,borderRadius:12,fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:16}}>🔐</span>{bioLoading?"Memproses...":"Login dengan Biometrik / PIN"}
            </button>
            {loginForm.username&&!bioIsRegistered(loginForm.username.toLowerCase().trim())&&
              <div style={{background:"hsla(42,78%,55%,0.1)",borderRadius:8,padding:"7px 11px",fontSize:11,color:GOLD2,display:"flex",gap:6,alignItems:"flex-start",border:"1px solid hsla(42,78%,55%,0.2)"}}>
                <span>⚠️</span><span>Biometrik belum aktif. Login dulu, lalu aktifkan di <strong>Pengaturan Akun</strong>.</span>
              </div>}
          </>}

          <div style={{marginTop:20,padding:"12px 14px",background:"hsla(215,35%,14%,0.6)",borderRadius:10,border:"1px solid "+BORDER}}>
            <div style={{fontSize:10,color:MUTED,marginBottom:6,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase"}}>Akun Demo</div>
            {loadUsers().map(u=><div key={u.username} style={{display:"flex",justifyContent:"space-between",fontSize:10,color:MUTED,padding:"3px 0",borderBottom:"1px solid "+BORDER}}>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,color:FG,opacity:0.7}}>{u.jabatan}</span>
              <span style={{color:GOLD2,fontFamily:"monospace",flexShrink:0,marginLeft:8,fontWeight:700}}>{u.username}</span>
            </div>)}
          </div>
        </div>
      </div>}

      {/* ForgotPassword harus di sini — sebelum user login */}
      {showForgot&&<ForgotPasswordModal onClose={()=>setShowForgot(false)}/> }
    {showRegister&&<RegisterModal onClose={()=>setShowRegister(false)}/>}
    </div>
  );}



  if(!dbReady)return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,"+NAVY+" 0%,#142238 60%,#0D1F35 100%)",display:"flex",alignItems:"center",justifyContent:"center",gap:16,flexDirection:"column"}}><style>{CSS}</style>
      <img src="/logo_tarakan.png" alt="" style={{height:56,width:"auto",objectFit:"contain",filter:"drop-shadow(0 4px 16px rgba(0,0,0,0.4))",marginBottom:8,animation:"pulse 2s ease infinite"}} onError={e=>e.target.style.display="none"}/>
      <div style={{width:40,height:40,border:"3px solid rgba(212,175,90,0.2)",borderTopColor:GOLD,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <div style={{color:"white",fontSize:14,fontWeight:600,letterSpacing:"0.3px",opacity:0.85}}>Memuat data...</div>
      {dbError&&<div style={{color:"#FCA5A5",fontSize:12,maxWidth:260,textAlign:"center",padding:"8px 16px",background:"rgba(220,38,38,0.15)",borderRadius:10,border:"1px solid rgba(220,38,38,0.3)"}}>{dbError}</div>}
    </div>
  );

  // ==================== SIDEBAR ====================
  const navGroups=[
    {label:"MENU UTAMA",items:[
      ...((role==="staf"||role==="staf_input")?[{key:"penugasan",icon:"🎯",label:"Penugasan Saya"},{key:"jadwal",icon:"📅",label:"Jadwal Saya"},{key:"form",icon:"✏️",label:"Input Jadwal Baru"}]:[]),
      ...(KASUBBAG_ROLES.includes(role)||role==="kabag"?[{key:"jadwal",icon:"📋",label:"Antrian Approval"},{key:"semua",icon:"🗓️",label:"Semua Jadwal"}]:[]),
      ...(role==="ajudan"||role==="timkom"?[{key:"jadwal",icon:"📅",label:"Jadwal Saya"},{key:"penugasan",icon:"🎯",label:"Penugasan Saya"}]:[]),
      ...(role==="walikota"||role==="wakilwalikota"?[{key:"jadwal",icon:"📅",label:"Jadwal Saya"}]:[]),
      {key:"tayang",icon:"🏛️",label:"Agenda Tayang"},
    ]},
    {label:"LAPORAN & TOOLS",items:[
      {key:"action:summary",icon:"💬",label:"Rekap WA Hari Ini"},
      {key:"action:report",icon:"📄",label:"Cetak Rekap PDF"},
      ...(canReport?[{key:"action:laporan",icon:"📊",label:"Laporan Mingguan/Bulanan"}]:[]),
    ]},
    {label:"AKUN",items:[
      {key:"action:profile",icon:"👤",label:"Pengaturan Akun"},
      ...(role==="kabag"?[{key:"action:admin",icon:"⚙️",label:"Kelola Pengguna"}]:[]),
    ]},
  ];

  const handleNavClick=key=>{
    if(key==="action:summary"){setShowSummary(true);return;}if(key==="action:report"){setShowReport(true);return;}if(key==="action:laporan"){setShowLaporan(true);return;}if(key==="action:admin"){setShowAdmin(true);return;}if(key==="action:profile"){setShowProfile(true);return;}
    setTab(key);if(key==="form"){setForm(emptyForm);setEditId(null);}
  };

  const sidebarJSX=(<aside style={{width:260,minHeight:"100vh",background:th.g,display:"flex",flexDirection:"column",flexShrink:0,position:"sticky",top:0,height:"100vh",overflowY:"auto",boxShadow:"4px 0 20px rgba(0,0,0,0.18)"}}>
    <div style={{padding:"20px 16px 14px",borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <img src="/logo_tarakan.png" alt="Logo" style={{height:36,width:"auto",objectFit:"contain",filter:"drop-shadow(0 1px 4px rgba(0,0,0,0.3))",flexShrink:0}} onError={e=>e.target.style.display="none"}/>
        <div><div style={{color:th.a,fontSize:8,letterSpacing:1.5,textTransform:"uppercase",fontWeight:700}}>Pemkot Tarakan</div><div style={{color:"white",fontSize:11,fontWeight:700,lineHeight:1.3}}>Protokol &amp; Komunikasi</div></div>
      </div>
      <button onClick={()=>setShowProfile(true)} style={{width:"100%",background:"rgba(255,255,255,0.09)",borderRadius:11,padding:"10px 12px",display:"flex",alignItems:"center",gap:10,border:"1px solid rgba(255,255,255,0.12)",cursor:"pointer",textAlign:"left",transition:"all 0.15s"}} onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.16)"} onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,0.09)"}>
        <div style={{width:34,height:34,borderRadius:9,background:"rgba(255,255,255,0.12)",border:"1.5px solid "+th.a,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,color:"white",fontWeight:700}}>{user?.nama?.slice(0,1)}</div>
        <div style={{flex:1,minWidth:0}}><div style={{color:"white",fontSize:12,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.nama}</div><div style={{color:"rgba(255,255,255,0.5)",fontSize:9,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{roleInfo.label}</div></div>
        <div title={SUPA_OK?"DB OK":"Mode Lokal"} style={{width:7,height:7,borderRadius:"50%",background:SUPA_OK?"#34d399":"#f87171",flexShrink:0}}/>
      </button>
    </div>
    <nav style={{flex:1,padding:"10px 10px",overflowY:"auto"}}>
      {navGroups.map(group=><div key={group.label} style={{marginBottom:8}}>
        <div style={{color:"rgba(255,255,255,0.3)",fontSize:9,fontWeight:800,letterSpacing:1.5,padding:"6px 10px 4px",textTransform:"uppercase"}}>{group.label}</div>
        {group.items.map(item=>{const isActive=tab===item.key&&!item.key.startsWith("action:");return(
          <button key={item.key+item.label} className="nav-btn sidebar-link" onClick={()=>handleNavClick(item.key)} style={{width:"100%",padding:"9px 14px",borderRadius:9,border:"none",background:isActive?"rgba(255,255,255,0.18)":"transparent",color:"white",cursor:"pointer",fontSize:12.5,fontWeight:isActive?700:400,textAlign:"left",display:"flex",alignItems:"center",gap:10,marginBottom:2,borderLeft:isActive?"3px solid "+th.a:"3px solid transparent",opacity:isActive?1:0.72}}>
            <span style={{fontSize:15,minWidth:22,textAlign:"center"}}>{item.icon}</span>{item.label}
          </button>);})}
      </div>)}
    </nav>
    <div style={{padding:"10px",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
      {pendingList.length>0&&<button onClick={goToPending} style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#ef4444,#dc2626)",color:"white",cursor:"pointer",fontSize:12,fontWeight:700,textAlign:"left",display:"flex",alignItems:"center",gap:10,marginBottom:8,boxShadow:"0 4px 12px rgba(239,68,68,0.3)"}}>
        <span style={{background:"white",color:"#ef4444",borderRadius:"50%",width:18,height:18,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,flexShrink:0}}>{pendingList.length}</span>Pending Approval
      </button>}
      <button onClick={doLogout} style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"1px solid rgba(255,255,255,0.18)",background:"transparent",color:"rgba(255,255,255,0.65)",cursor:"pointer",fontSize:12,fontWeight:600,textAlign:"left"}}>Keluar</button>
    </div>
  </aside>);

  // ==================== MOBILE HEADER + iOS BOTTOM TAB BAR ====================
  const mobTabs=[
    ...((role==="staf"||role==="staf_input")?[{key:"penugasan",label:"Tugas",icon:"🎯"},{key:"jadwal",label:"Jadwal",icon:"📅"},{key:"form",label:"Input",icon:"✏️"}]:[]),
    ...(KASUBBAG_ROLES.includes(role)||role==="kabag"?[{key:"jadwal",label:"Antrian",icon:"📋"},{key:"semua",label:"Semua",icon:"🗓️"}]:[]),
    ...(role==="ajudan"||role==="timkom"?[{key:"jadwal",label:"Jadwal",icon:"📅"},{key:"penugasan",label:"Tugas",icon:"🎯"}]:[]),
    ...(role==="walikota"||role==="wakilwalikota"?[{key:"jadwal",label:"Jadwal",icon:"📅"}]:[]),
    {key:"tayang",label:"Tayang",icon:"🏛️"},
    {key:"action:more",label:"Lainnya",icon:"⋯"},
  ];
  const TAB_BAR_H=56;
  const mobileHeaderJSX=(<>
    {/* ── TOP NAV BAR ── */}
    <div style={{background:"linear-gradient(to bottom,"+NAVY+" 0%,"+NAVY+" 100%)",position:"sticky",top:0,zIndex:200,paddingTop:"env(safe-area-inset-top,0px)"}}>
      <div style={{padding:"10px 16px 10px",display:"flex",alignItems:"center",gap:10,borderBottom:"0.5px solid rgba(255,255,255,0.1)"}}>
        <img src="/logo_tarakan.png" alt="" style={{height:32,width:"auto",objectFit:"contain",flexShrink:0,filter:"drop-shadow(0 1px 3px rgba(0,0,0,0.3))"}} onError={e=>e.target.style.display="none"}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:"white",fontSize:13,fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"-0.2px"}}>{user?.nama}</div>
          <div style={{color:GOLD,fontSize:9.5,fontWeight:600,letterSpacing:"0.5px",textTransform:"uppercase"}}>{roleInfo.label}</div>
        </div>
        {pendingList.length>0&&<button onClick={goToPending} className="btn-ios" style={{background:"#EF4444",color:"white",borderRadius:20,padding:"4px 11px",fontSize:11,fontWeight:800,border:"none",cursor:"pointer",flexShrink:0,boxShadow:"0 2px 10px rgba(239,68,68,0.5)",display:"flex",alignItems:"center",gap:5}}>
          <span style={{background:"rgba(255,255,255,0.25)",borderRadius:"50%",width:16,height:16,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900}}>{pendingList.length}</span>Pending
        </button>}
        <div title={SUPA_OK?"Terhubung ke Database":"Mode Lokal"} style={{width:8,height:8,borderRadius:"50%",background:SUPA_OK?"#34D399":"#F87171",flexShrink:0,boxShadow:SUPA_OK?"0 0 6px rgba(52,211,153,0.6)":"none"}}/>
      </div>
    </div>

    {/* ── iOS BOTTOM TAB BAR ── */}
    <div className="ios-tab-bar" style={{height:TAB_BAR_H+"px"}}>
      {mobTabs.map(t=>{
        const isActive=t.key==="action:more"?showMobMenu:(tab===t.key&&!showMobMenu);
        const handleTab=()=>{
          if(t.key==="action:more"){setMobMenu(v=>!v);return;}
          setMobMenu(false);
          if(t.key==="form"){setForm(emptyForm);setEditId(null);}
          setTab(t.key);
        };
        return <button key={t.key} className={"ios-tab-btn"+(isActive?" active":"")} onClick={handleTab} style={{color:isActive?NAVY:"#94A3B8"}}>
          <span className="ios-tab-icon" style={{filter:isActive?"none":"grayscale(0.3)"}}>{t.icon}</span>
          <span className="ios-tab-label" style={{fontWeight:isActive?700:500,color:isActive?NAVY:"#94A3B8"}}>{t.label}</span>
          {t.key==="action:more"&&!showMobMenu&&(
            (pendingList.length>0?<span style={{position:"absolute",top:6,right:"calc(50% - 14px)",background:"#EF4444",color:"white",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{pendingList.length}</span>:null)
          )}
        </button>;
      })}
    </div>

    {/* ── MORE DRAWER (bottom sheet style) ── */}
    {showMobMenu&&<>
      <div style={{position:"fixed",inset:0,zIndex:290,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)",animation:"fadeIn 0.2s ease"}} onClick={()=>setMobMenu(false)}/>
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:295,background:"white",borderRadius:"20px 20px 0 0",padding:"0 16px",paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 8px)",boxShadow:"0 -8px 40px rgba(0,0,0,0.2)",animation:"sheetUp 0.3s cubic-bezier(0.34,1.3,0.64,1)"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:"#E2E8F0",borderRadius:4,margin:"12px auto 16px"}}/>
        <div style={{fontSize:11,fontWeight:700,color:"#94A3B8",letterSpacing:1.5,textTransform:"uppercase",marginBottom:10,paddingLeft:2}}>MENU</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          {[
            {icon:"💬",label:"Rekap WA",action:()=>{setShowSummary(true);setMobMenu(false);}},
            {icon:"📄",label:"Cetak PDF",action:()=>{setShowReport(true);setMobMenu(false);}},
            ...(canReport?[{icon:"📊",label:"Laporan",action:()=>{setShowLaporan(true);setMobMenu(false);}}]:[]),
            {icon:"👤",label:"Profil",action:()=>{setShowProfile(true);setMobMenu(false);}},
            ...(role==="kabag"?[{icon:"⚙️",label:"Kelola User",action:()=>{setShowAdmin(true);setMobMenu(false);}}]:[]),
          ].map((btn,i)=>(
            <button key={i} onClick={btn.action} className="btn-ios" style={{padding:"14px 12px",borderRadius:14,border:"1.5px solid #E4EAF2",background:"#F8FAFF",color:NAVY,cursor:"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              <span style={{fontSize:20}}>{btn.icon}</span>{btn.label}
            </button>
          ))}
        </div>
        <button onClick={()=>{doLogout();setMobMenu(false);}} className="btn-ios" style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:"#FEF2F2",color:"#DC2626",cursor:"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8}}>
          <span style={{fontSize:18}}>🚪</span>Keluar dari Akun
        </button>
      </div>
    </>}
  </>);

  
// ═══════════════════════════════════════════════════════
// PENUGASAN SAYA VIEW
// ═══════════════════════════════════════════════════════
function PenugasanSayaView({events, user, onOpenEvaluasi, isMobile}){
  const NAVY="#0A1628",GOLD="#C9A84C";
  const myEvents=events.filter(e=>e.alur==="disetujui"&&(e.personil||[]).includes(user.username))
    .sort((a,b)=>(a.tanggal+a.jam).localeCompare(b.tanggal+b.jam));
  const allApproved=events.filter(e=>e.alur==="disetujui").sort((a,b)=>(a.tanggal+a.jam).localeCompare(b.tanggal+b.jam));

  const now=new Date();
  const fmt=t=>{const d=new Date(t);return d.toLocaleDateString("id-ID",{weekday:"short",day:"numeric",month:"short",year:"numeric"});};
  const upcoming=myEvents.filter(e=>new Date(e.tanggal+"T"+e.jam)>=now);
  const past=myEvents.filter(e=>new Date(e.tanggal+"T"+e.jam)<now);

  const PenCard=({ev,isMyTask})=>{
    const evDt=new Date(ev.tanggal+"T"+ev.jam);
    const isPast=evDt<now;
    const hoursLeft=(evDt-now)/(1000*60*60);
    const isUrgent=hoursLeft>0&&hoursLeft<=24;
    const sudahEval=!!(ev.evaluasi||{})[user.username]?.submitted;
    return(
      <div style={{background:isMyTask?(isPast?"#F8FFFE":"#FAFFFD"):"#FAFBFF",borderRadius:14,border:"1.5px solid "+(isMyTask?(isPast?"#a7f3d0":"#6ee7b7"):"#E2E8F0"),marginBottom:8,overflow:"hidden",opacity:isPast&&!isMyTask?0.6:1}}>
        {isMyTask&&<div style={{background:isPast?"linear-gradient(90deg,#d1fae5,#a7f3d0)":"linear-gradient(90deg,#ECFDF5,#d1fae5)",padding:"5px 14px",fontSize:10,color:isPast?"#065f46":"#047857",fontWeight:800,letterSpacing:0.5,display:"flex",alignItems:"center",gap:5,borderBottom:"1px solid "+(isPast?"#a7f3d0":"#bbf7d0")}}>
          <span>🎯</span> {isPast?"SUDAH BERTUGAS":"ANDA BERTUGAS"}
          {isUrgent&&<span style={{marginLeft:"auto",background:"#FEF3C7",color:"#92400E",borderRadius:4,padding:"1px 7px",fontSize:9}}>⚠️ {Math.round(hoursLeft)} JAM LAGI</span>}
          {isPast&&!sudahEval&&onOpenEvaluasi&&<button onClick={()=>onOpenEvaluasi(ev)} style={{marginLeft:"auto",background:"#7c3aed",color:"white",border:"none",borderRadius:5,padding:"2px 8px",fontSize:9,fontWeight:700,cursor:"pointer"}}>📝 Isi Evaluasi</button>}
          {isPast&&sudahEval&&<span style={{marginLeft:"auto",background:"#d1fae5",color:"#065f46",borderRadius:4,padding:"1px 7px",fontSize:9,fontWeight:700}}>✅ Dievaluasi</span>}
        </div>}
        <div style={{padding:"12px 14px",display:"flex",gap:12,alignItems:"flex-start"}}>
          <div style={{minWidth:44,textAlign:"center",background:isMyTask?(isPast?"#d1fae5":"#ecfdf5"):"#f1f5f9",borderRadius:10,padding:"6px 0"}}>
            <div style={{fontSize:9,fontWeight:800,color:isMyTask?"#065f46":"#64748B",letterSpacing:0.5,textTransform:"uppercase"}}>{new Date(ev.tanggal).toLocaleDateString("id-ID",{weekday:"short"})}</div>
            <div style={{fontSize:20,fontWeight:900,color:isMyTask?(isPast?"#047857":NAVY):"#334155",lineHeight:1}}>{ev.tanggal.slice(8)}</div>
            <div style={{fontSize:10,color:isMyTask?"#059669":"#94A3B8",fontWeight:600}}>{ev.jam}</div>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:800,color:"#0F1C2E",marginBottom:3,lineHeight:1.3}}>{ev.namaAcara}</div>
            <div style={{fontSize:11,color:"#64748B",marginBottom:3}}>{ev.penyelenggara}{ev.lokasi?" · "+ev.lokasi:""}</div>
            {ev.catatanPenugasan&&<div style={{fontSize:11,color:"#4338CA",background:"#EEF2FF",borderRadius:6,padding:"4px 8px",marginTop:4,fontStyle:"italic"}}>💬 {ev.catatanPenugasan}</div>}
            {(ev.personil||[]).length>0&&isMyTask&&<div style={{fontSize:10,color:"#64748B",marginTop:4}}>Rekan: {(ev.personil||[]).filter(u=>u!==user.username).join(", ")||"-"}</div>}
          </div>
        </div>
      </div>
    );
  };

  return(
    <div style={{padding:isMobile?"12px 14px":"24px 32px",overflowY:"auto"}}>
      {/* SUMMARY BAR */}
      <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
        {[{n:upcoming.length,l:"Akan Datang",c:NAVY,ic:"📅"},{n:past.length,l:"Selesai",c:"#059669",ic:"✅"},{n:myEvents.filter(e=>!(e.evaluasi||{})[user.username]?.submitted&&new Date(e.tanggal+"T"+e.jam)<now).length,l:"Belum Dievaluasi",c:"#7c3aed",ic:"📝"}].map(it=>(
          <div key={it.l} style={{flex:1,minWidth:90,background:"white",borderRadius:12,padding:"12px",boxShadow:"0 1px 8px rgba(0,0,0,0.06)",border:"1.5px solid #E8EDF4",textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:900,color:it.c}}>{it.n}</div>
            <div style={{fontSize:10,color:"#94A3B8",fontWeight:600,marginTop:2}}>{it.ic} {it.l}</div>
          </div>
        ))}
      </div>

      {/* AKAN DATANG */}
      {upcoming.length>0&&<>
        <div style={{fontSize:11,fontWeight:800,color:NAVY,letterSpacing:1.2,textTransform:"uppercase",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
          <span>📅</span> Penugasan Mendatang
        </div>
        {upcoming.map(ev=><PenCard key={ev.id} ev={ev} isMyTask={true}/>)}
      </>}

      {upcoming.length===0&&past.length===0&&(
        <div style={{textAlign:"center",padding:"50px 20px",color:"#94A3B8"}}>
          <div style={{fontSize:48,marginBottom:10}}>🎯</div>
          <div style={{fontSize:16,fontWeight:700,color:"#334155",marginBottom:6}}>Belum Ada Penugasan</div>
          <div style={{fontSize:13}}>Anda belum ditugaskan ke jadwal manapun saat ini.</div>
        </div>
      )}

      {/* RIWAYAT */}
      {past.length>0&&<>
        <div style={{fontSize:11,fontWeight:800,color:"#64748B",letterSpacing:1.2,textTransform:"uppercase",margin:"18px 0 8px",display:"flex",alignItems:"center",gap:6}}>
          <span>📁</span> Riwayat Penugasan
        </div>
        {past.map(ev=><PenCard key={ev.id} ev={ev} isMyTask={true}/>)}
      </>}

      {/* SEMUA JADWAL DISETUJUI */}
      <div style={{fontSize:11,fontWeight:800,color:"#64748B",letterSpacing:1.2,textTransform:"uppercase",margin:"22px 0 8px",display:"flex",alignItems:"center",gap:6,borderTop:"1px solid #E2E8F0",paddingTop:16}}>
        <span>🗓️</span> Semua Jadwal Aktif
      </div>
      <div style={{fontSize:11,color:"#94A3B8",marginBottom:10}}>Jadwal yang sudah disetujui — termasuk yang tidak ada penugasan Anda</div>
      {allApproved.length===0
        ?<div style={{textAlign:"center",padding:"20px",color:"#94A3B8",fontSize:13}}>Belum ada jadwal aktif</div>
        :allApproved.map(ev=>{
          const isMy=(ev.personil||[]).includes(user.username);
          return <PenCard key={ev.id} ev={ev} isMyTask={isMy}/>;
        })
      }
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// TAMPILAN KHUSUS WALI KOTA / WAKIL WALI KOTA
// Simpel, elegan, fokus acara + disposisi
// ═══════════════════════════════════════════════════════
function PimpinanView({events, role, user, onDisposisi, onCatatanSave, setDelegTarget, upd, showT, isMobile}){
  const NAVY="#0A1628",GOLD="#C9A84C",GREEN="#0D6B4F";
  const now=new Date();
  const todayStr=()=>new Date().toISOString().slice(0,10);
  const tomorrowStr=()=>{const d=new Date();d.setDate(d.getDate()+1);return d.toISOString().slice(0,10);};
  const getHari=t=>{const d=new Date(t);return d.toLocaleDateString("id-ID",{weekday:"long"});};
  const fmt=t=>{const d=new Date(t);return d.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"});};

  const myEvs=(
    role==="walikota"
      ?events.filter(e=>e.alur==="disetujui"&&e.untukPimpinan.includes("walikota"))
    :role==="wakilwalikota"
      ?events.filter(e=>e.alur==="disetujui"&&(e.untukPimpinan.includes("wakilwalikota")||e.delegasiKeWWK))
    :role==="kasubbag"||role==="kasubbag_kominfo"
      ?events.filter(e=>e.alur==="menunggu_kasubbag"||e.alur==="disetujui")
    :role==="kabag"
      ?events.filter(e=>e.alur==="menunggu_kabag"||e.alur==="menunggu_kasubbag"||e.alur==="disetujui")
    :role==="ajudan"
      ?events.filter(e=>e.alur==="disetujui")
    // staf, staf_input, timkom — jadwal disetujui + yang ditugaskan ke mereka
    :events.filter(e=>e.alur==="disetujui")
  ).sort((a,b)=>(a.tanggal+a.jam).localeCompare(b.tanggal+b.jam));

  // Mulai dari besok ke atas, lalu hari ini, lalu lampau di bawah
  const tomorrow = tomorrowStr();
  const today = todayStr();
  // Untuk kasubbag/kabag: pisahkan antrian vs disetujui
  const isPending = e => e.alur==="menunggu_kasubbag"||e.alur==="menunggu_kabag";
  const upcoming = myEvs.filter(e=>!isPending(e)&&new Date(e.tanggal+"T"+e.jam)>=now);
  const pendingApproval = myEvs.filter(e=>isPending(e));
  const past = myEvs.filter(e=>!isPending(e)&&new Date(e.tanggal+"T"+e.jam)<now).reverse();

  const [expandedId, setExpanded] = React.useState(null);
  const [catatanLocal, setCatatanLocal] = React.useState({});

  const statusWK = role==="walikota" 
    ? (ev) => ev.statusWK
    : (ev) => ev.statusWWK;
  const byAjudan = role==="walikota"
    ? (ev) => ev.statusWK_by==="ajudan"
    : (ev) => ev.statusWWK_by==="ajudan";

  const DisposisiBar = ({ev}) => {
    const st = statusWK(ev);
    const byAdj = byAjudan(ev);
    // Untuk role non-pimpinan: hanya tampilkan status kehadiran + badge ajudan
    const isViewer = !["walikota","wakilwalikota"].includes(role);
    if(isViewer) {
      // Kumpulkan status kedua pimpinan yang relevan untuk event ini
      const items = [];
      if(ev.untukPimpinan.includes("walikota")) {
        const stWK = ev.statusWK;
        const byWK = ev.statusWK_by==="ajudan";
        const labWK = ev.delegasiKeWWK?"Delegasi ke Wawali":stWK==="hadir"?"Hadir":stWK==="tidak_hadir"?"Tidak Hadir":stWK==="diwakilkan"?(ev.perwakilanWK?"→ "+ev.perwakilanWK:"Diwakilkan"):"Belum konfirmasi";
        const clrWK = ev.delegasiKeWWK||stWK==="hadir"?"#065f46":stWK==="tidak_hadir"?"#991b1b":stWK?"#92400e":"#b45309";
        const bgWK  = ev.delegasiKeWWK||stWK==="hadir"?"#D1FAE5":stWK==="tidak_hadir"?"#FEE2E2":stWK?"#FEF3C7":"#FFFBEB";
        items.push({label:"WK",status:labWK,color:clrWK,bg:bgWK,byAdj:byWK});
      }
      if(ev.untukPimpinan.includes("wakilwalikota")||ev.delegasiKeWWK) {
        const stWWK = ev.statusWWK;
        const byWWK = ev.statusWWK_by==="ajudan";
        const labWWK = stWWK==="hadir"?"Hadir":stWWK==="tidak_hadir"?"Tidak Hadir":stWWK==="diwakilkan"?(ev.perwakilanWWK?"→ "+ev.perwakilanWWK:"Diwakilkan"):"Belum konfirmasi";
        const clrWWK = stWWK==="hadir"?"#065f46":stWWK==="tidak_hadir"?"#991b1b":stWWK?"#92400e":"#b45309";
        const bgWWK  = stWWK==="hadir"?"#D1FAE5":stWWK==="tidak_hadir"?"#FEE2E2":stWWK?"#FEF3C7":"#FFFBEB";
        items.push({label:ev.delegasiKeWWK?"WWK (delegasi)":"WWK",status:labWWK,color:clrWWK,bg:bgWWK,byAdj:byWWK});
      }
      if(items.length===0) return null;
      return (
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
          {items.map(it=>(
            <div key={it.label} style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontSize:9,fontWeight:700,color:"#94A3B8",textTransform:"uppercase"}}>{it.label}:</span>
              <span style={{background:it.bg,color:it.color,borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:700}}>{it.status}</span>
              {it.byAdj&&<span style={{background:"#FFF8DC",color:"#B45309",borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:800,border:"1px solid #FCD34D"}}>✏️ Ajudan</span>}
            </div>
          ))}
        </div>
      );
    }
    if(!st && !ev.delegasiKeWWK) return (
      <div style={{background:"#FEF9EC",border:"1px solid #F59E0B",borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",gap:8,fontSize:12}}>
        <span>🔔</span><span style={{color:"#92400E",fontWeight:600}}>Belum ada konfirmasi kehadiran</span>
      </div>
    );
    const badges = {
      hadir: {bg:"#D1FAE5",color:"#065F46",icon:"✓",text:"Hadir"},
      tidak_hadir: {bg:"#FEE2E2",color:"#991B1B",icon:"✗",text:"Tidak Hadir"},
      diwakilkan: {bg:"#FEF3C7",color:"#92400E",icon:"↗",text:ev.delegasiKeWWK?"Delegasi ke Wakil":"Diwakilkan"},
    };
    const bk = st==="diwakilkan"||ev.delegasiKeWWK?"diwakilkan":st;
    const b = badges[bk]||{bg:"#F1F5F9",color:"#64748B",icon:"–",text:"–"};
    return (
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{background:b.bg,color:b.color,borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:800}}>{b.icon} {b.text}</span>
        {byAdj&&<span style={{fontSize:10,color:"#D97706",background:"#FFF3CD",borderRadius:4,padding:"2px 6px",fontWeight:600}}>diisi Ajudan</span>}
        {ev.delegasiKeWWK&&role==="walikota"&&<span style={{fontSize:10,color:"#7C3AED",background:"#EDE9FE",borderRadius:4,padding:"2px 6px"}}>→ Wawali</span>}
        {ev.perwakilanWK&&role==="walikota"&&<span style={{fontSize:10,color:"#92400E",background:"#FEF3C7",borderRadius:4,padding:"2px 6px"}}>→ {ev.perwakilanWK}</span>}
        {ev.perwakilanWWK&&role==="wakilwalikota"&&<span style={{fontSize:10,color:"#92400E",background:"#FEF3C7",borderRadius:4,padding:"2px 6px"}}>→ {ev.perwakilanWWK}</span>}
      </div>
    );
  };

  const EventBlock = ({ev}) => {
    const isToday = ev.tanggal===today;
    const isTomorrow = ev.tanggal===tomorrow;
    const evDt = new Date(ev.tanggal+"T"+ev.jam);
    const hoursLeft = (evDt-now)/(1000*60*60);
    const isExpanded = expandedId===ev.id;
    const isUrgent = hoursLeft>0&&hoursLeft<=3;
    const st = statusWK(ev);

    return (
      <div style={{background:"white",borderRadius:18,marginBottom:10,overflow:"hidden",boxShadow:"0 2px 16px rgba(10,22,40,0.08)",border:"1.5px solid "+(isToday?"#C9A84C":isUrgent?"#FCA5A5":"#E8EDF4")}}>
        {/* Header strip */}
        {(isToday||isTomorrow||isUrgent)&&<div style={{background:isToday?"linear-gradient(90deg,"+NAVY+",#1B4080)":isUrgent?"#FEF2F2":"#F0F4FF",padding:"5px 16px",display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:10,fontWeight:800,color:isToday?GOLD:isUrgent?"#DC2626":"#4F46E5",letterSpacing:1,textTransform:"uppercase"}}>
            {isToday?"● HARI INI":isUrgent?"⚠️ "+Math.round(hoursLeft)+" JAM LAGI":"BESOK"}
          </span>
        </div>}

        {/* Main card — clickable to expand */}
        <div onClick={()=>setExpanded(isExpanded?null:ev.id)} style={{padding:"16px",cursor:"pointer",userSelect:"none"}}>
          <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
            {/* Date block */}
            <div style={{minWidth:52,textAlign:"center",background:isToday?"linear-gradient(135deg,"+NAVY+",#1B4080)":"#F8FAFF",borderRadius:12,padding:"8px 4px",flexShrink:0}}>
              <div style={{fontSize:9,fontWeight:800,color:isToday?GOLD:"#94A3B8",textTransform:"uppercase",letterSpacing:0.5}}>{getHari(ev.tanggal).slice(0,3)}</div>
              <div style={{fontSize:22,fontWeight:900,color:isToday?"white":"#0F172A",lineHeight:1}}>{ev.tanggal.slice(8)}</div>
              <div style={{fontSize:10,color:isToday?"rgba(255,255,255,0.7)":"#94A3B8",fontWeight:600}}>{ev.jam}</div>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,fontWeight:800,color:"#0F172A",lineHeight:1.3,marginBottom:5}}>{ev.namaAcara}</div>
              <div style={{fontSize:12,color:"#64748B",marginBottom:8}}>{ev.penyelenggara}</div>
              <DisposisiBar ev={ev}/>
            </div>
            <div style={{color:"#C8D4E0",transition:"transform 0.2s",transform:isExpanded?"rotate(180deg)":"none",marginTop:4,fontSize:12}}>▼</div>
          </div>
        </div>

        {/* Detail panel */}
        {isExpanded&&<div style={{borderTop:"1px solid #F1F5F9",padding:"14px 16px",background:"#FAFBFF"}}>
          {/* Info acara */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {[
              {l:"Tanggal",v:getHari(ev.tanggal)+", "+fmt(ev.tanggal)},
              {l:"Pukul",v:ev.jam+" WITA"},
              {l:"Lokasi",v:ev.lokasi||"-"},
              {l:"Pakaian",v:ev.pakaian},
              {l:"Penyelenggara",v:ev.penyelenggara},
              ev.kontak?{l:"Kontak",v:ev.kontak}:null,
              ev.catatan?{l:"Catatan",v:ev.catatan}:null,
            ].filter(Boolean).map(f=>(
              <div key={f.l} style={{gridColumn:f.l==="Tanggal"||f.l==="Catatan"||f.l==="Penyelenggara"?"span 2":"span 1"}}>
                <div style={{fontSize:10,color:"#94A3B8",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>{f.l}</div>
                <div style={{fontSize:13,color:"#0F172A",fontWeight:600}}>{f.v}</div>
              </div>
            ))}
          </div>

          {/* Naskah sambutan untuk pimpinan */}
          {ev.sambutanFile&&<div style={{background:"#F0FDF4",border:"1.5px solid #6EE7B7",borderRadius:10,padding:"10px 12px",marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:800,color:"#065F46",marginBottom:7,display:"flex",alignItems:"center",gap:6}}>
              <span>📄</span> Naskah Sambutan Tersedia
            </div>
            <div style={{display:"flex",gap:7}}>
              <button onClick={e=>{e.stopPropagation();window.open(ev.sambutanFile,"_blank");}} style={{flex:1,padding:"9px",borderRadius:8,border:"none",background:"#065F46",color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>Baca Naskah</button>
              <a href={ev.sambutanFile} download={ev.sambutanNama} onClick={e=>e.stopPropagation()} style={{flex:1,padding:"9px",borderRadius:8,border:"1.5px solid #065F46",background:"white",color:"#065F46",textDecoration:"none",textAlign:"center",fontSize:12,fontWeight:700}}>Unduh PDF</a>
            </div>
          </div>}
          {/* Catatan pimpinan jika ada */}
          {ev.catatanPimpinan&&<div style={{background:"#EEF2FF",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:12,color:"#3730A3",fontStyle:"italic"}}>
            💬 {ev.catatanPimpinan}
          </div>}

          {/* Aksi kehadiran — hanya untuk pimpinan */}
          {(role==="walikota"||role==="wakilwalikota")&&<div style={{marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Konfirmasi Kehadiran</div>
            <div style={{display:"flex",gap:8}}>
              {[{s:"hadir",l:"✓  Saya Hadir",c:GREEN},{s:"tidak_hadir",l:"✗  Tidak Hadir",c:"#991B1B"}].map(({s,l,c})=>(
                <button key={s} onClick={e=>{e.stopPropagation();
                  role==="walikota"?upd(ev.id,{statusWK:s,delegasiKeWWK:false,perwakilanWK:"",statusWK_by:"walikota"}):upd(ev.id,{statusWWK:s,statusWWK_by:"wakilwalikota"});
                  showT("Kehadiran berhasil dikonfirmasi");
                }} style={{flex:1,padding:"13px 8px",borderRadius:12,cursor:"pointer",fontWeight:800,fontSize:13,border:"2px solid "+c,background:statusWK(ev)===s?c:"white",color:statusWK(ev)===s?"white":c,transition:"all 0.15s"}}>{l}</button>
              ))}
            </div>
          </div>}

          {/* Disposisi — hanya Wali Kota */}
          {role==="walikota"&&<div style={{marginBottom:8}}>
            <div style={{fontSize:11,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Disposisi Kehadiran</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={e=>{e.stopPropagation();upd(ev.id,{statusWK:"diwakilkan",delegasiKeWWK:true,perwakilanWK:"",statusWK_by:"walikota"});showT("Didelegasi ke Wakil Wali Kota");}} style={{flex:1,minWidth:140,padding:"11px",borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,background:ev.delegasiKeWWK?GREEN:"#ECFDF5",color:ev.delegasiKeWWK?"white":GREEN}}>
                {ev.delegasiKeWWK?"✓ Delegasi ke Wawali":"Delegasi ke Wakil WK"}
              </button>
              <button onClick={e=>{e.stopPropagation();setDelegTarget({id:ev.id,side:"wk"});}} style={{flex:1,minWidth:140,padding:"11px",borderRadius:10,border:"1.5px solid #CBD5E1",cursor:"pointer",fontWeight:600,fontSize:12,background:"white",color:"#475569"}}>
                Wakilkan Pejabat Lain
              </button>
            </div>
            {(ev.delegasiKeWWK||ev.perwakilanWK)&&<button onClick={e=>{e.stopPropagation();upd(ev.id,{statusWK:null,delegasiKeWWK:false,perwakilanWK:""});showT("Disposisi dicabut","warn");}} style={{marginTop:8,width:"100%",padding:"9px",borderRadius:9,border:"1.5px solid #FCA5A5",background:"white",color:"#EF4444",cursor:"pointer",fontSize:12,fontWeight:700}}>
              Cabut Disposisi
            </button>}
          </div>}

          {/* Catatan pimpinan — hanya pimpinan yang bisa edit */}
          {(role==="walikota"||role==="wakilwalikota")&&<div>
            <div style={{fontSize:11,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Arahan / Catatan untuk Tim</div>
            <textarea key={"cat-pim-"+ev.id} defaultValue={ev.catatanPimpinan||""} onBlur={e=>setCatatanLocal(p=>({...p,[ev.id]:e.target.value}))} rows={2} placeholder="Ketik arahan atau catatan khusus..." style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #E2E8F0",fontSize:13,color:"#0F172A",resize:"none",boxSizing:"border-box"}}/>
            <button onClick={e=>{e.stopPropagation();upd(ev.id,{catatanPimpinan:catatanLocal[ev.id]??ev.catatanPimpinan});showT("Catatan disimpan");}} style={{marginTop:6,padding:"9px 18px",borderRadius:9,border:"none",background:NAVY,color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>Simpan</button>
          </div>}
          {/* Catatan pimpinan — tampil saja untuk role lain jika ada isi */}
          {!(role==="walikota"||role==="wakilwalikota")&&ev.catatanPimpinan&&<div style={{background:"#EEF2FF",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#3730A3",fontStyle:"italic"}}>
            💬 Arahan: {ev.catatanPimpinan}
          </div>}
        </div>}
      </div>
    );
  };

  const greetingHour = new Date().getHours();
  const greeting = greetingHour<11?"Selamat Pagi":greetingHour<15?"Selamat Siang":greetingHour<18?"Selamat Sore":"Selamat Malam";
  const roleTitle = {
    walikota:"Wali Kota Tarakan",wakilwalikota:"Wakil Wali Kota Tarakan",
    kabag:"Kabag Protokol & Komunikasi Pimpinan",
    kasubbag:"Kasubbag Protokol",kasubbag_kominfo:"Kasubbag Komdokpim",
    ajudan:"Ajudan Pimpinan",
    staf:"Staf Protokol",staf_input:"Staf Protokol",
    timkom:"Staf Komunikasi & Dokumentasi",
  };
  const title = roleTitle[role]||"Pengguna";

  return (
    <div style={{flex:1,overflowY:"auto",background:"#F4F7FF"}}>
      {/* Greeting header */}
      <div style={{background:"linear-gradient(135deg,"+NAVY+" 0%,#1B3360 100%)",padding:isMobile?"20px 18px 24px":"28px 36px 32px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-30,right:-30,width:140,height:140,borderRadius:"50%",background:"rgba(201,168,76,0.08)"}}/>
        <div style={{position:"absolute",bottom:-20,right:40,width:80,height:80,borderRadius:"50%",background:"rgba(201,168,76,0.05)"}}/>
        <div style={{color:"rgba(255,255,255,0.6)",fontSize:12,marginBottom:4}}>{greeting},</div>
        <div style={{color:"white",fontSize:isMobile?20:24,fontWeight:900,marginBottom:2}}>{title}</div>
        <div style={{color:GOLD,fontSize:12,fontWeight:600}}>
          {fmt(todayStr())} &nbsp;·&nbsp;{" "}
          {(role==="kasubbag"||role==="kasubbag_kominfo"||role==="kabag")
            ?pendingApproval.length+" menunggu approval · "+upcoming.length+" akan datang"
            :upcoming.length+" agenda akan datang"
          }
        </div>
      </div>

      <div style={{padding:isMobile?"14px":"20px 28px"}}>
        {/* Alert kontekstual per role */}
        {(role==="walikota"||role==="wakilwalikota")&&upcoming.filter(e=>!statusWK(e)&&!e.delegasiKeWWK).length>0&&(
          <div style={{background:"#FFFBEB",border:"1.5px solid #F59E0B",borderRadius:12,padding:"12px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:20}}>📋</span>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#92400E"}}>Ada agenda yang belum dikonfirmasi</div>
              <div style={{fontSize:12,color:"#B45309",marginTop:2}}>{upcoming.filter(e=>!statusWK(e)&&!e.delegasiKeWWK).length} jadwal menunggu konfirmasi kehadiran Bapak/Ibu</div>
            </div>
          </div>
        )}
        {(role==="kasubbag"||role==="kasubbag_kominfo"||role==="kabag")&&pendingApproval.length>0&&(
          <div style={{background:"#F5F3FF",border:"1.5px solid #A78BFA",borderRadius:12,padding:"12px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:20}}>⏳</span>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#5B21B6"}}>{pendingApproval.length} jadwal menunggu persetujuan Anda</div>
              <div style={{fontSize:12,color:"#7C3AED",marginTop:2}}>Klik kartu untuk review dan setujui</div>
            </div>
          </div>
        )}

        {/* Antrian Approval untuk kasubbag/kabag */}
        {pendingApproval.length>0&&<>
          <div style={{fontSize:11,fontWeight:800,color:"#7C3AED",letterSpacing:1.5,textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
            <span>⏳</span> Menunggu Persetujuan Anda ({pendingApproval.length})
          </div>
          {pendingApproval.map(ev=><EventBlock key={ev.id} ev={ev}/>)}
          <div style={{marginBottom:14}}/>
        </>}
        {/* Agenda akan datang */}
        {upcoming.length>0&&<>
          <div style={{fontSize:11,fontWeight:800,color:NAVY,letterSpacing:1.5,textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
            <span>📅</span> Agenda Mendatang
          </div>
          {upcoming.map(ev=><EventBlock key={ev.id} ev={ev}/>)}
        </>}

        {upcoming.length===0&&(
          <div style={{textAlign:"center",padding:"50px 20px",color:"#94A3B8"}}>
            <div style={{fontSize:48,marginBottom:10}}>✅</div>
            <div style={{fontSize:16,fontWeight:700,color:"#334155",marginBottom:4}}>Tidak ada agenda mendatang</div>
            <div style={{fontSize:13}}>Semua agenda telah selesai atau belum dijadwalkan.</div>
          </div>
        )}

        {/* Riwayat singkat */}
        {past.length>0&&<>
          <div style={{fontSize:11,fontWeight:800,color:"#94A3B8",letterSpacing:1.5,textTransform:"uppercase",margin:"20px 0 8px",borderTop:"1px solid #E2E8F0",paddingTop:16,display:"flex",alignItems:"center",gap:6}}>
            <span>📁</span> Riwayat Terakhir
          </div>
          {past.slice(0,3).map(ev=><EventBlock key={ev.id} ev={ev}/>)}
          {past.length>3&&<div style={{textAlign:"center",fontSize:12,color:"#94A3B8",marginTop:4}}>+ {past.length-3} agenda sebelumnya</div>}
        </>}
      </div>
    </div>
  );
}

// ==================== FORM ====================
  // FormView is a top-level component (defined outside App) to prevent re-mount on every keystroke

  // ==================== EVENT CARD (mobile) ====================
  const EventCard=({ev})=>{
    const exp=expandedId===ev.id;const hariEv=getHari(ev.tanggal);const isToday=ev.tanggal===todayStr();
    const isPending=ev.alur==="menunggu_kasubbag"||ev.alur==="menunggu_kabag";
    const isDraft=ev.alur==="draft"||ev.alur==="ditolak";
    // Status waktu
    const nowDt=new Date();
    const evDt=new Date(ev.tanggal+"T"+(ev.jam||"00:00"));
    const isPast=ev.alur==="disetujui"&&evDt<nowDt;
    const isUpcoming=ev.alur==="disetujui"&&evDt>=nowDt;
    const borderColor=isPending?"#F59E0B":isDraft?"#94A3B8":ev.alur==="ditolak"?"#EF4444":isToday&&isUpcoming?NAVY:"transparent";
    const cardBg=isPast?"#F8F9FA":isPending?"#FFFBEB":isDraft?"#F8FAFC":"white";
    const cardOpacity=isPast?0.72:1;
    return <div id={"ev-"+ev.id} className="ev-card" style={{background:cardBg,borderRadius:16,marginBottom:10,boxShadow:"0 2px 12px rgba(0,0,0,0.07),0 0 0 1px rgba(0,0,0,0.04)",border:"1.5px solid "+borderColor,overflow:"hidden",opacity:cardOpacity}}>
      {ev.catatanPimpinan&&<div style={{background:"linear-gradient(90deg,#EEF2FF,#F5F3FF)",padding:"6px 14px",fontSize:11,color:"#4338CA",fontWeight:600,borderBottom:"1px solid #E0E7FF",display:"flex",alignItems:"center",gap:5}}>
        <span style={{fontSize:12}}>💬</span>{ev.catatanPimpinan}
      </div>}
      {/* Banner penugasan — hanya terlihat ajudan, kasubbag, timkom, staf, staf_input */}
      {["kabag","ajudan","kasubbag","timkom","staf","staf_input"].includes(role)&&ev.alur==="disetujui"&&(()=>{
        const all=loadUsers();
        const personilList=(ev.personil||[]).map(un=>all.find(u=>u.username===un)?.nama||un);
        const isAssigned=(ev.personil||[]).includes(user.username);
        const evTime=new Date(ev.tanggal+"T"+ev.jam);
        const hoursLeft=(evTime-new Date())/(1000*60*60);
        const urgent=hoursLeft>0&&hoursLeft<=12&&(!ev.personil||ev.personil.length===0);
        return(
          <div style={{background:isAssigned?"linear-gradient(90deg,#f0fdf4,#dcfce7)":urgent?"linear-gradient(90deg,#fff7ed,#ffedd5)":"linear-gradient(90deg,#f8fafc,#f1f5f9)",padding:"7px 14px",borderBottom:"1px solid "+(isAssigned?"#bbf7d0":urgent?"#fed7aa":"#e2e8f0"),display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{fontSize:13}}>{isAssigned?"🎯":urgent?"⚠️":"👥"}</span>
            <span style={{fontSize:11,fontWeight:700,color:isAssigned?"#166534":urgent?"#9a3412":"#475569"}}>
              {isAssigned?"Anda bertugas di acara ini":urgent?"Belum ada personil ditugaskan!":personilList.length>0?"Personil: "+personilList.join(", "):"Belum ada penugasan"}
            </span>
            {isAssigned&&ev.catatanPenugasan&&<span style={{fontSize:11,color:"#15803d",fontStyle:"italic"}}>· {ev.catatanPenugasan}</span>}
            {["kasubbag","timkom"].includes(role)&&ev.alur==="disetujui"&&<button onClick={e=>{e.stopPropagation();setPenugasanEv(ev);}} style={{marginLeft:"auto",padding:"3px 10px",borderRadius:6,border:"1.5px solid #0A1628",background:"white",color:"#0A1628",cursor:"pointer",fontSize:10,fontWeight:700,flexShrink:0}}>
              {(!ev.personil||ev.personil.length===0)?"+ Tugaskan":"✏️ Edit"}
            </button>}
            {isAssigned&&ev.alur==="disetujui"&&(()=>{
              const sudahEval=!!(ev.evaluasi||{})[user.username]?.submitted;
              const evTime=new Date(ev.tanggal+"T"+ev.jam);
              const sudahLewat=new Date()>evTime;
              if(!sudahLewat)return null;
              return <button onClick={e=>{e.stopPropagation();setEvaluasiEv(ev);}} style={{marginLeft:["kasubbag","timkom"].includes(role)?"4px":"auto",padding:"3px 10px",borderRadius:6,border:"1.5px solid "+(sudahEval?"#16a34a":"#7c3aed"),background:sudahEval?"#f0fdf4":"#faf5ff",color:sudahEval?"#16a34a":"#7c3aed",cursor:"pointer",fontSize:10,fontWeight:700,flexShrink:0}}>
                {sudahEval?"✅ Evaluasi":"📝 Isi Evaluasi"}
              </button>;
            })()}
          </div>
        );
      })()}
      <div onClick={()=>setExp(exp?null:ev.id)} style={{padding:"14px",cursor:"pointer",userSelect:"none"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:11}}>
          {/* Date badge */}
          <div style={{background:isToday?"linear-gradient(145deg,"+NAVY+",#1E3254)":"#F6F8FC",borderRadius:12,padding:"8px 7px",textAlign:"center",minWidth:46,flexShrink:0,boxShadow:isToday?"0 4px 12px rgba(10,22,40,0.25)":"none"}}>
            <div style={{fontSize:8,color:isToday?"rgba(212,175,90,0.9)":"#94A3B8",fontWeight:800,textTransform:"uppercase",letterSpacing:1}}>{hariEv.slice(0,3)}</div>
            <div style={{fontSize:18,fontWeight:900,color:isToday?"white":"#1E293B",lineHeight:1.1}}>{ev.tanggal.slice(8)}</div>
            <div style={{fontSize:9,color:isToday?"rgba(255,255,255,0.6)":"#94A3B8",fontWeight:500,marginTop:1}}>{ev.jam}</div>
          </div>
          {/* Info */}
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap",marginBottom:5}}>
              <JenisBadge j={ev.jenisKegiatan}/><StatusPill alur={ev.alur} hapus={ev.alurHapus}/>
              {isPast&&<span style={{fontSize:9,background:"#E2E8F0",color:"#64748B",borderRadius:4,padding:"1px 5px",fontWeight:700,letterSpacing:0.3}}>SELESAI</span>}
              {isPending&&<span style={{fontSize:9,background:"#FEF3C7",color:"#92400E",borderRadius:4,padding:"1px 5px",fontWeight:700,letterSpacing:0.3}}>DIPROSES</span>}
              {isUpcoming&&!isToday&&<span style={{fontSize:9,background:"#EFF6FF",color:"#1D4ED8",borderRadius:4,padding:"1px 5px",fontWeight:700,letterSpacing:0.3}}>AKAN DATANG</span>}
              {isToday&&isUpcoming&&<span style={{fontSize:9,background:"linear-gradient(90deg,#0A1628,#1B4080)",color:"#C9A84C",borderRadius:4,padding:"1px 5px",fontWeight:700,letterSpacing:0.3}}>HARI INI</span>}
              {ev.untukPimpinan.includes("walikota")&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:10,background:"rgba(10,22,40,0.07)",color:NAVY,fontWeight:700}}>WK</span>}
              {(ev.untukPimpinan.includes("wakilwalikota")||ev.delegasiKeWWK)&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:10,background:"#ECFDF5",color:GREEN,fontWeight:700}}>{ev.delegasiKeWWK?"→WWK":"WWK"}</span>}
            </div>
            <div style={{fontSize:14,fontWeight:700,color:"#0F1C2E",lineHeight:1.35,marginBottom:3,letterSpacing:"-0.1px"}}>{ev.namaAcara}</div>
            <div style={{fontSize:12,color:"#64748B",display:"flex",alignItems:"center",gap:4}}>
              <span>{ev.penyelenggara}</span>
              {ev.lokasi&&<><span style={{color:"#CBD5E1"}}>·</span><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:130}}>{ev.lokasi}</span></>}
            </div>
          </div>
          {/* Chevron */}
          <div style={{color:"#CBD5E1",fontSize:11,flexShrink:0,transition:"transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",transform:exp?"rotate(180deg)":"none",marginTop:4}}>▼</div>
        </div>
      </div>
      {exp&&<ExpandedDetail ev={ev} hariEv={hariEv}/>}
    </div>;
  };

  // ==================== DESKTOP TABLE ROW ====================
  const TableView=({evList})=><div style={{background:"white",borderRadius:12,boxShadow:"0 1px 8px rgba(0,0,0,0.07)",overflow:"hidden"}}>
    <table className="ev-table">
      <thead><tr>
        <th>Tanggal</th><th>Pukul</th><th style={{minWidth:220}}>Nama Acara</th><th>Jenis</th><th>Penyelenggara</th><th>Lokasi</th><th>Pakaian</th><th>Status</th><th>Aksi</th>
      </tr></thead>
      <tbody>
        {evList.map(ev=>{
          const exp=expandedId===ev.id;const hariEv=getHari(ev.tanggal);const isToday=ev.tanggal===todayStr();
          return <><tr key={ev.id} id={"ev-"+ev.id} className="card-row" style={{cursor:"pointer"}} onClick={()=>setExp(exp?null:ev.id)}>
            <td><div style={{fontWeight:700,fontSize:12,color:isToday?NAVY:"#334155",whiteSpace:"nowrap"}}>{hariEv}, {fmtShort(ev.tanggal)}</div>{isToday&&<span style={{fontSize:10,color:"#2563eb",fontWeight:700}}>Hari ini</span>}</td>
            <td><span style={{fontWeight:700,fontSize:13,color:NAVY}}>{ev.jam}</span></td>
            <td><div style={{fontWeight:700,fontSize:13,color:"#0F2040",lineHeight:1.3}}>{ev.namaAcara}</div>
              <div style={{display:"flex",gap:4,marginTop:3,flexWrap:"wrap"}}>
                {ev.untukPimpinan.includes("walikota")&&<span style={{fontSize:9,padding:"1px 5px",borderRadius:10,background:"#EBF0FA",color:NAVY,fontWeight:700}}>WK</span>}
                {(ev.untukPimpinan.includes("wakilwalikota")||ev.delegasiKeWWK)&&<span style={{fontSize:9,padding:"1px 5px",borderRadius:10,background:"#ecfdf5",color:GREEN,fontWeight:700}}>{ev.delegasiKeWWK?"Deleg.WWK":"WWK"}</span>}
              </div>
            </td>
            <td><JenisBadge j={ev.jenisKegiatan}/></td>
            <td style={{fontSize:12,color:"#475569",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.penyelenggara}</td>
            <td style={{fontSize:12,color:"#475569",maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.lokasi||<span style={{color:"#cbd5e1"}}>-</span>}</td>
            <td style={{fontSize:11,color:"#475569",whiteSpace:"nowrap"}}>{ev.pakaian}</td>
            <td><StatusPill alur={ev.alur} hapus={ev.alurHapus}/></td>
            <td><button onClick={e=>{e.stopPropagation();setExp(exp?null:ev.id);}} style={{padding:"5px 10px",borderRadius:7,border:"1.5px solid #e2e8f0",background:exp?"#EBF0FA":"white",color:exp?NAVY:"#64748b",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{exp?"Tutup":"Detail"}</button></td>
          </tr>
          {exp&&<tr key={ev.id+"_exp"}><td colSpan={9} style={{padding:0,background:"#fafbfc",borderBottom:"2px solid #EBF0FA"}}>
            <div style={{padding:"16px 20px"}}><ExpandedDetail ev={ev} hariEv={hariEv}/></div>
          </td></tr>}</>
        })}
      </tbody>
    </table>
  </div>;

  // ==================== EXPANDED DETAIL ====================
  function ExpandedDetail({ev,hariEv}){
    return <div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":ev.jenisKegiatan==="Sambutan"?"1fr 1fr":"1fr",gap:"0 24px",marginBottom:14}}>
        <div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {[{i:"Tgl",l:"Tanggal",v:hariEv+", "+fmt(ev.tanggal)},{i:"Jam",l:"Waktu",v:ev.jam+" WITA"},{i:"Org",l:"Penyelenggara",v:ev.penyelenggara},{i:"Tel",l:"Kontak",v:ev.kontak},{i:"No",l:"Bukti Undangan",v:ev.buktiUndangan},{i:"Bj",l:"Pakaian",v:ev.pakaian},{i:"Ket",l:"Catatan",v:ev.catatan}].filter(f=>f.v).map(f=>(
              <div key={f.l} style={{display:"flex",gap:8,padding:"6px 10px",background:"#f8fafc",borderRadius:8}}>
                <div style={{minWidth:80,fontSize:10,color:"#94a3b8",fontWeight:700,textTransform:"uppercase"}}>{f.l}</div>
                <div style={{fontSize:12,color:"#1e293b",flex:1}}>{f.v}</div>
              </div>
            ))}
            {ev.lokasi&&<div style={{display:"flex",gap:8,padding:"6px 10px",background:"#f0f9ff",borderRadius:8,border:"1px solid #bae6fd",alignItems:"center"}}>
              <div style={{minWidth:80,fontSize:10,color:"#0284c7",fontWeight:700,textTransform:"uppercase"}}>Lokasi</div>
              <div style={{flex:1,fontSize:12,color:"#0c4a6e",fontWeight:600}}>{ev.lokasi}</div>
              <a href={"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(ev.lokasi)} target="_blank" rel="noopener noreferrer" style={{padding:"5px 10px",borderRadius:7,background:"#1a73e8",color:"white",textDecoration:"none",fontSize:11,fontWeight:700,flexShrink:0}}>Maps</a>
            </div>}
            <div style={{marginTop:4}}>
              <UndanganBlock ev={ev} canEdit={role==="staf"&&ev.alur!=="disetujui"} onUpload={(file,name)=>handleUndanganUpload(ev.id,file,name).then(()=>showT("Berkas undangan diupload"))} onRemove={()=>{if(ev.undanganFile&&!ev.undanganFile.startsWith("data:"))storageDelete("undangan",ev.undanganFile).catch(()=>{});updAndSync(ev.id,{undanganFile:null,undanganNama:""}); }}/>
            </div>
          </div>
          <div style={{display:"flex",gap:7,marginTop:8}}>
            <a href={makeICS(ev)} download={(ev.namaAcara||"jadwal")+".ics"} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px",borderRadius:9,border:"1.5px solid #e2e8f0",background:"white",color:"#334155",textDecoration:"none",fontSize:12,fontWeight:700}}>
              <span style={{fontSize:14}}>&#x1F4C5;</span>Simpan .ics
            </a>
            <a href={"https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(ev.namaAcara||"")+"&dates="+((ev.tanggal||"").replace(/-/g,"")+"T"+(ev.jam||"0800").replace(":","")+"00")+"/"+((ev.tanggal||"").replace(/-/g,"")+"T"+String(parseInt((ev.jam||"08:00").split(":")[0])+2).padStart(2,"0")+(ev.jam||"08:00").split(":")[1]+"00")+"&location="+encodeURIComponent(ev.lokasi||"")+"&details="+encodeURIComponent("Penyelenggara: "+(ev.penyelenggara||"")+"%0APakaian: "+(ev.pakaian||""))} target="_blank" rel="noopener noreferrer" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px",borderRadius:9,border:"none",background:"#1a73e8",color:"white",textDecoration:"none",fontSize:12,fontWeight:700}}>
              <span style={{fontSize:14}}>&#x1F4C6;</span>Google Cal
            </a>
          </div>
        </div>
        {ev.jenisKegiatan==="Sambutan"&&<div>
          <SambutanBlock ev={ev} canUpload={role==="timkom"||role==="kasubbag_kominfo"} onUploadDocx={(f)=>handleSambutanDocx(ev.id,f,ev)} onRemove={()=>{if(ev.sambutanFile&&!ev.sambutanFile.startsWith("data:"))storageDelete("sambutan",ev.sambutanFile).catch(()=>{});if(ev.sambutanDocx&&!ev.sambutanDocx.startsWith("data:")&&!ev.sambutanDocx.startsWith("blob:"))storageDelete("sambutan",ev.sambutanDocx).catch(()=>{});updAndSync(ev.id,{sambutanFile:null,sambutanNama:"",sambutanDocx:null,sambutanDocxNama:""});showT("Naskah sambutan dihapus","warn");}}/>
        </div>}
      </div>

      {/* STAF/STAF_INPUT ACTIONS */}
      {(role==="staf"||role==="staf_input")&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
        {ev.alur!=="disetujui"&&<button onClick={()=>{setForm({tanggal:ev.tanggal,jam:ev.jam,namaAcara:ev.namaAcara,penyelenggara:ev.penyelenggara,kontak:ev.kontak||"",buktiUndangan:ev.buktiUndangan||"",pakaian:ev.pakaian,jenisKegiatan:ev.jenisKegiatan,catatan:ev.catatan||"",lokasi:ev.lokasi||"",untukPimpinan:ev.untukPimpinan,undanganFile:ev.undanganFile||null,undanganNama:ev.undanganNama||""});setEditId(ev.id);setTab("form");}} style={{padding:"9px 14px",borderRadius:9,border:"1.5px solid "+NAVY,background:"white",color:NAVY,cursor:"pointer",fontSize:12,fontWeight:700}}>Edit</button>}
        {ev.alur==="draft"&&<button onClick={()=>{upd(ev.id,{alur:"menunggu_kasubbag"});showT("Dikirim ke Kasubbag");
            // Notif WA ke semua Kasubbag
            loadUsers().filter(u=>u.role==="kasubbag"&&u.noWA).forEach(u=>sendWA({to:u.noWA,namaAcara:ev.namaAcara,tanggal:ev.tanggal,jam:ev.jam,penyelenggara:ev.penyelenggara,lokasi:ev.lokasi,event:"submit",submittedBy:user?.nama}));sendPush({targetRole:"kasubbag",title:"📋 Jadwal Baru Masuk",body:ev.namaAcara+" — "+ev.jam+" WITA",url:"/",tag:"submit-"+ev.id});}} style={{padding:"9px 14px",borderRadius:9,border:"none",background:NAVY,color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>Kirim ke Kasubbag</button>}
        {ev.alur==="ditolak"&&<><div style={{padding:"8px 12px",background:"#fff7ed",borderRadius:8,fontSize:12,color:"#92400e",flex:1}}>Ditolak: {ev.catatanTolak}</div><button onClick={()=>{upd(ev.id,{alur:"menunggu_kasubbag",catatanTolak:""});showT("Dikirim ulang");
              loadUsers().filter(u=>u.role==="kasubbag"&&u.noWA).forEach(u=>sendWA({to:u.noWA,namaAcara:ev.namaAcara,tanggal:ev.tanggal,jam:ev.jam,penyelenggara:ev.penyelenggara,lokasi:ev.lokasi,event:"submit",submittedBy:user?.nama}));sendPush({targetRole:"kasubbag",title:"📋 Jadwal Dikirim Ulang",body:ev.namaAcara+" — "+ev.jam+" WITA",url:"/",tag:"submit-"+ev.id});}} style={{padding:"9px 14px",borderRadius:9,border:"none",background:"#d97706",color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>Kirim Ulang</button></>}
        {ev.alur==="disetujui"&&!ev.alurHapus&&<button onClick={()=>{upd(ev.id,{alurHapus:"menunggu_kasubbag"});showT("Permintaan hapus dikirim","warn");}} style={{padding:"9px 14px",borderRadius:9,border:"1.5px solid #fca5a5",background:"white",color:"#ef4444",cursor:"pointer",fontSize:12,fontWeight:700}}>Ajukan Pembatalan</button>}
      </div>}

      {/* KASUBBAG */}
      {role==="kasubbag"&&<div style={{display:"flex",flexDirection:"column",gap:7}}>
        {ev.alur==="menunggu_kasubbag"&&!ev.alurHapus&&<><button onClick={()=>{upd(ev.id,{alur:"menunggu_kabag"});showT("Diteruskan ke Kabag");
            loadUsers().filter(u=>u.role==="kabag"&&u.noWA).forEach(u=>sendWA({to:u.noWA,namaAcara:ev.namaAcara,tanggal:ev.tanggal,jam:ev.jam,penyelenggara:ev.penyelenggara,lokasi:ev.lokasi,event:"kasubbag_approve"}));sendPush({targetRole:"kabag",title:"✅ Menunggu Persetujuan Anda",body:ev.namaAcara+" — "+ev.jam+" WITA",url:"/",tag:"approve-"+ev.id});}} style={{padding:"11px",borderRadius:10,border:"none",background:"#10b981",color:"white",cursor:"pointer",fontSize:13,fontWeight:700}}>Verifikasi & Teruskan ke Kabag</button>
          <div style={{borderRadius:10,overflow:"hidden",border:"1.5px solid #fecaca"}}>
            <textarea placeholder="Catatan penolakan..." value={rejectTexts[ev.id]||""} onChange={e=>setRT(p=>({...p,[ev.id]:e.target.value}))} rows={2} style={{width:"100%",padding:"9px 11px",border:"none",resize:"none",color:"#334155",background:"white",fontSize:13}}/>
            <button onClick={()=>{upd(ev.id,{alur:"ditolak",catatanTolak:rejectTexts[ev.id]||""});showT("Dikembalikan","warn");loadUsers().filter(u=>u.role==="staf"&&u.noWA).forEach(u=>sendWA({to:u.noWA,namaAcara:ev.namaAcara,tanggal:ev.tanggal,jam:ev.jam,penyelenggara:ev.penyelenggara,event:"rejected",catatanTolak:rejectTexts[ev.id]||""}));sendPush({targetRole:"staf",title:"❌ Jadwal Dikembalikan",body:ev.namaAcara+": "+(rejectTexts[ev.id]||"Perlu diperbaiki"),url:"/",tag:"rejected-"+ev.id});}} style={{width:"100%",padding:"10px",border:"none",background:"#fee2e2",color:"#991b1b",cursor:"pointer",fontSize:12,fontWeight:700}}>Tolak & Kembalikan ke Staf</button>
          </div></>}
        {ev.alurHapus==="menunggu_kasubbag"&&<><div style={{background:"#fff1f2",borderRadius:9,padding:"9px 12px",fontSize:13,color:"#e11d48"}}>Staf mengajukan pembatalan jadwal ini</div>
          <div style={{display:"flex",gap:8}}><button onClick={()=>{upd(ev.id,{alurHapus:"menunggu_kabag"});showT("Diteruskan ke Kabag","warn");}} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:"#e11d48",color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>Setuju ke Kabag</button><button onClick={()=>{upd(ev.id,{alurHapus:null});showT("Ditolak");}} style={{flex:1,padding:"10px",borderRadius:10,border:"1.5px solid #94a3b8",background:"white",color:"#334155",cursor:"pointer",fontSize:12,fontWeight:700}}>Tolak Hapus</button></div></>}
        {ev.alur==="disetujui"&&<button onClick={()=>setPenugasanEv(ev)} style={{width:"100%",padding:"10px",borderRadius:10,border:"1.5px dashed #cbd5e1",background:"#f8fafc",color:"#475569",cursor:"pointer",fontSize:12,fontWeight:700}}>
          {(!ev.personil||ev.personil.length===0)?"👥 Tugaskan Personil":"👥 Edit Penugasan ("+(ev.personil?.length||0)+" personil)"}
        </button>}
      </div>}

      {/* KABAG */}
      {role==="kabag"&&<div style={{display:"flex",flexDirection:"column",gap:7}}>
        {ev.alur==="menunggu_kabag"&&!ev.alurHapus&&<><button onClick={()=>{upd(ev.id,{alur:"disetujui"});showT("Jadwal disetujui & dipublikasi");
            loadUsers().filter(u=>u.role==="staf"&&u.noWA).forEach(u=>sendWA({to:u.noWA,namaAcara:ev.namaAcara,tanggal:ev.tanggal,jam:ev.jam,penyelenggara:ev.penyelenggara,lokasi:ev.lokasi,event:"approved"}));sendPush({targetRole:"staf",title:"✅ Jadwal Disetujui",body:ev.namaAcara+" sudah dipublikasi",url:"/",tag:"approved-"+ev.id});}} style={{padding:"11px",borderRadius:10,border:"none",background:NAVY,color:"white",cursor:"pointer",fontSize:13,fontWeight:700}}>Setujui & Publikasi</button>
          <div style={{borderRadius:10,overflow:"hidden",border:"1.5px solid #fecaca"}}>
            <textarea placeholder="Catatan penolakan..." value={rejectTexts[ev.id]||""} onChange={e=>setRT(p=>({...p,[ev.id]:e.target.value}))} rows={2} style={{width:"100%",padding:"9px 11px",border:"none",resize:"none",color:"#334155",background:"white",fontSize:13}}/>
            <button onClick={()=>{upd(ev.id,{alur:"ditolak",catatanTolak:rejectTexts[ev.id]||""});showT("Ditolak","warn");loadUsers().filter(u=>u.role==="staf"&&u.noWA).forEach(u=>sendWA({to:u.noWA,namaAcara:ev.namaAcara,tanggal:ev.tanggal,jam:ev.jam,penyelenggara:ev.penyelenggara,event:"rejected",catatanTolak:rejectTexts[ev.id]||""}));sendPush({targetRole:"staf",title:"❌ Jadwal Dikembalikan",body:ev.namaAcara+": "+(rejectTexts[ev.id]||"Perlu diperbaiki"),url:"/",tag:"rejected-"+ev.id});}} style={{width:"100%",padding:"10px",border:"none",background:"#fee2e2",color:"#991b1b",cursor:"pointer",fontSize:12,fontWeight:700}}>Tolak & Kembalikan</button>
          </div></>}
        {ev.alurHapus==="menunggu_kabag"&&<><div style={{background:"#fff1f2",borderRadius:9,padding:"9px 12px",fontSize:13,color:"#e11d48"}}>Permintaan penghapusan (sudah disetujui Kasubbag)</div>
          <div style={{display:"flex",gap:8}}><button onClick={()=>{deleteAndSync(ev.id);setExp(null);showT("Jadwal dihapus");}} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:"#e11d48",color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>Hapus Permanen</button><button onClick={()=>{upd(ev.id,{alurHapus:null});showT("Ditolak");}} style={{flex:1,padding:"10px",borderRadius:10,border:"1.5px solid #94a3b8",background:"white",color:"#334155",cursor:"pointer",fontSize:12,fontWeight:700}}>Tolak Hapus</button></div></>}
      </div>}

      {/* TIMKOM / KASUBBAG_KOMINFO PENUGASAN */}
      {(role==="timkom"||role==="kasubbag_kominfo")&&ev.alur==="disetujui"&&<div style={{marginBottom:8}}>
        <button onClick={()=>setPenugasanEv(ev)} style={{width:"100%",padding:"10px",borderRadius:10,border:"1.5px dashed #7dd3fc",background:"#f0f9ff",color:"#0369a1",cursor:"pointer",fontSize:12,fontWeight:700}}>
          {(!ev.personil||ev.personil.length===0)?"👥 Tugaskan Personil":"👥 Edit Penugasan ("+(ev.personil?.length||0)+" personil)"}
        </button>
      </div>}

      {/* WALI KOTA */}
      {/* WALI KOTA */}
      {(role==="walikota"||(role==="ajudan"&&ev.untukPimpinan.includes("walikota")))&&ev.alur==="disetujui"&&ev.untukPimpinan.includes("walikota")&&(()=>{
        const isAjudan=role==="ajudan";
        return <div>
          {isAjudan&&<div style={{background:"#FFF8E1",border:"1.5px solid #FBC02D",borderRadius:9,padding:"8px 12px",marginBottom:12,display:"flex",gap:8,alignItems:"flex-start"}}>
            <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
            <div style={{fontSize:11,color:"#7C4D00",lineHeight:1.5}}>
              <strong>Perhatian Ajudan:</strong> Pastikan Anda telah mengkonfirmasi langsung ke Bapak/Ibu Wali Kota sebelum mengisi disposisi ini. Semua input yang Anda buat akan tercatat sebagai <em>"diisi oleh Ajudan"</em>.
            </div>
          </div>}
          {ev.statusWK&&ev.statusWK_by==="ajudan"&&!isAjudan&&<div style={{background:"#FFF3E0",border:"1px solid #FFB74D",borderRadius:7,padding:"6px 10px",marginBottom:8,fontSize:11,color:"#E65100"}}>
            ℹ️ Status kehadiran ini diisi oleh Ajudan — harap konfirmasi langsung ke Bapak Wali Kota.
          </div>}
          <div style={{fontSize:12,fontWeight:700,color:NAVY,marginBottom:7}}>{isAjudan?"Input Kehadiran Wali Kota":"Konfirmasi Kehadiran"}</div>
          <div style={{display:"flex",gap:8,marginBottom:10}}>{[{s:"hadir",l:"✓ Hadir",c:GREEN},{s:"tidak_hadir",l:"✗ Tidak Hadir",c:"#991b1b"}].map(({s,l,c})=><button key={s} onClick={()=>{upd(ev.id,{statusWK:s,delegasiKeWWK:false,perwakilanWK:"",statusWK_by:isAjudan?"ajudan":"walikota"});showT(isAjudan?"Kehadiran Wali Kota berhasil diinput":"Status diperbarui");}} style={{flex:1,padding:"12px",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:13,border:"1.5px solid "+c,background:ev.statusWK===s?c:"white",color:ev.statusWK===s?"white":c}}>{l}</button>)}</div>
          <div style={{background:"#f0fdf4",borderRadius:11,padding:12,border:"1.5px solid #bbf7d0",marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:700,color:GREEN,marginBottom:7}}>Disposisi</div>
            <button onClick={()=>{upd(ev.id,{statusWK:"diwakilkan",delegasiKeWWK:true,perwakilanWK:"",statusWK_by:isAjudan?"ajudan":"walikota"});showT(isAjudan?"Delegasi ke WWK diinput oleh Ajudan":"Didelegasi ke Wakil Wali Kota");}} style={{width:"100%",padding:"10px",borderRadius:9,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,marginBottom:6,background:ev.delegasiKeWWK?GREEN:"#d1fae5",color:ev.delegasiKeWWK?"white":GREEN}}>{ev.delegasiKeWWK?"✓ Didelegasi ke Wakil Wali Kota":"Delegasi ke Wakil Wali Kota"}</button>
            {ev.delegasiKeWWK&&<button onClick={()=>{upd(ev.id,{statusWK:null,delegasiKeWWK:false,perwakilanWK:""});showT("Delegasi dibatalkan","warn");}} style={{width:"100%",padding:"8px",borderRadius:9,border:"1.5px solid #fca5a5",background:"white",color:"#e11d48",cursor:"pointer",fontSize:12,fontWeight:700,marginBottom:6}}>Batalkan Delegasi ke WWK</button>}
            <button onClick={()=>setDelegTarget({id:ev.id,side:"wk"})} style={{width:"100%",padding:"9px",borderRadius:9,border:"1.5px solid #94a3b8",background:"white",color:"#334155",cursor:"pointer",fontSize:12}}>Wakilkan ke Pejabat Lain</button>
            {ev.statusWK==="diwakilkan"&&ev.perwakilanWK&&<><div style={{marginTop:6,padding:"5px 10px",background:"#fef3c7",borderRadius:7,fontSize:12,color:"#92400e",fontWeight:600}}>Diwakilkan ke: {ev.perwakilanWK}</div><button onClick={()=>{upd(ev.id,{statusWK:null,perwakilanWK:"",delegasiKeWWK:false});showT("Disposisi dibatalkan","warn");}} style={{marginTop:5,width:"100%",padding:"7px",borderRadius:8,border:"1.5px solid #fca5a5",background:"white",color:"#e11d48",cursor:"pointer",fontSize:11,fontWeight:700}}>Batalkan Disposisi</button></>}
          </div>
          {!isAjudan&&<div><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:4}}>Catatan untuk Tim</label>
            <textarea key={"cat-wk-"+ev.id} defaultValue={ev.catatanPimpinan||""} onBlur={e=>setCatatanInput(p=>({...p,[ev.id]:e.target.value}))} rows={2} placeholder="Arahan atau permintaan khusus..." style={{width:"100%",padding:"9px 11px",borderRadius:9,border:"1.5px solid #e2e8f0",color:"#1e293b",resize:"none",background:"white",fontSize:13}}/>
            <button onClick={()=>{upd(ev.id,{catatanPimpinan:catatanInput[ev.id]??ev.catatanPimpinan});setCatatanInput(p=>({...p,[ev.id]:undefined}));showT("Catatan disimpan");}} style={{marginTop:6,padding:"8px 16px",borderRadius:8,border:"none",background:NAVY,color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>Simpan Catatan</button>
          </div>}
        </div>;
      })()}

      {/* WAKIL WALI KOTA — dan ajudan bisa input kehadiran WWK */}
      {(role==="wakilwalikota"||(role==="ajudan"&&(ev.untukPimpinan.includes("wakilwalikota")||ev.delegasiKeWWK)))&&ev.alur==="disetujui"&&(ev.untukPimpinan.includes("wakilwalikota")||ev.delegasiKeWWK)&&(()=>{
        const isAjudan=role==="ajudan";
        return <div style={{marginTop:isAjudan?12:0}}>
          {isAjudan&&<div style={{background:"#FFF8E1",border:"1.5px solid #FBC02D",borderRadius:9,padding:"8px 12px",marginBottom:12,display:"flex",gap:8,alignItems:"flex-start"}}>
            <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
            <div style={{fontSize:11,color:"#7C4D00",lineHeight:1.5}}>
              <strong>Perhatian Ajudan:</strong> Pastikan Anda telah mengkonfirmasi ke Bapak/Ibu Wakil Wali Kota. Input ini akan tercatat <em>"diisi oleh Ajudan"</em>.
            </div>
          </div>}
          {ev.statusWWK&&ev.statusWWK_by==="ajudan"&&!isAjudan&&<div style={{background:"#FFF3E0",border:"1px solid #FFB74D",borderRadius:7,padding:"6px 10px",marginBottom:8,fontSize:11,color:"#E65100"}}>
            ℹ️ Status kehadiran ini diisi oleh Ajudan — harap konfirmasi ke Ibu/Bapak Wakil Wali Kota.
          </div>}
          <div style={{fontSize:12,fontWeight:700,color:GREEN,marginBottom:7}}>{isAjudan?"Input Kehadiran Wakil Wali Kota":"Konfirmasi Kehadiran"}</div>
          <div style={{display:"flex",gap:8,marginBottom:10}}>{[{s:"hadir",l:"✓ Hadir",c:GREEN},{s:"tidak_hadir",l:"✗ Tidak Hadir",c:"#991b1b"}].map(({s,l,c})=><button key={s} onClick={()=>{upd(ev.id,{statusWWK:s,statusWWK_by:isAjudan?"ajudan":"wakilwalikota"});showT(isAjudan?"Kehadiran Wakil Wali Kota diinput":"Status diperbarui");}} style={{flex:1,padding:"12px",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:13,border:"1.5px solid "+c,background:ev.statusWWK===s?c:"white",color:ev.statusWWK===s?"white":c}}>{l}</button>)}</div>
          <div style={{background:"#f8fafc",borderRadius:10,padding:11,border:"1.5px solid #e2e8f0",marginBottom:10}}>
            <div style={{fontSize:12,color:"#64748b",fontWeight:700,marginBottom:6}}>Wakilkan ke Pejabat Lain</div>
            <button onClick={()=>setDelegTarget({id:ev.id,side:"wwk"})} style={{width:"100%",padding:"10px",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:ev.statusWWK==="diwakilkan"?700:500,border:"1.5px solid "+(ev.statusWWK==="diwakilkan"?NAVY:"#94a3b8"),background:ev.statusWWK==="diwakilkan"?"#EBF0FA":"white",color:ev.statusWWK==="diwakilkan"?NAVY:"#334155"}}>{ev.statusWWK==="diwakilkan"&&ev.perwakilanWWK?"Diwakilkan ke: "+ev.perwakilanWWK:"Pilih Pejabat Perwakilan"}</button>
            {ev.statusWWK==="diwakilkan"&&ev.perwakilanWWK&&<button onClick={()=>{upd(ev.id,{statusWWK:null,perwakilanWWK:""});showT("Disposisi dibatalkan","warn");}} style={{marginTop:5,width:"100%",padding:"7px",borderRadius:8,border:"1.5px solid #fca5a5",background:"white",color:"#e11d48",cursor:"pointer",fontSize:11,fontWeight:700}}>Batalkan Disposisi</button>}
          </div>
          {!isAjudan&&<div><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:4}}>Catatan untuk Tim</label>
            <textarea key={"cat-wwk-"+ev.id} defaultValue={ev.catatanPimpinan||""} onBlur={e=>setCatatanInput(p=>({...p,[ev.id]:e.target.value}))} rows={2} placeholder="Arahan..." style={{width:"100%",padding:"9px 11px",borderRadius:9,border:"1.5px solid #e2e8f0",color:"#1e293b",resize:"none",background:"white",fontSize:13}}/>
            <button onClick={()=>{upd(ev.id,{catatanPimpinan:catatanInput[ev.id]??ev.catatanPimpinan});setCatatanInput(p=>({...p,[ev.id]:undefined}));showT("Catatan disimpan");}} style={{marginTop:6,padding:"8px 16px",borderRadius:8,border:"none",background:GREEN,color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>Simpan Catatan</button>
          </div>}
        </div>;
      })()}
    </div>;
  }

  // ==================== MAIN CONTENT ====================
  const pageTitle=tab==="tayang"?"Agenda Kegiatan Pimpinan":tab==="form"?"Input Jadwal Baru":tab==="semua"?"Semua Jadwal":tab==="penugasan"?"Penugasan Saya":tab==="jadwal"?KASUBBAG_ROLES.includes(role)||role==="kabag"?"Antrian Approval":role==="staf"||role==="staf_input"?"Jadwal Saya":"Jadwal Saya":"Jadwal";

  const mainContentJSX=(<div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",background:"#F0F4FA",overflow:"hidden"}}>
    {/* ── Desktop top bar ── */}
    {!isMobile&&<div style={{background:"white",borderBottom:"1px solid #E4EAF2",padding:"14px 32px",display:"flex",alignItems:"center",gap:16,flexShrink:0,boxShadow:"0 1px 8px rgba(0,0,0,0.04)"}}>
      <div style={{flex:1}}>
        <div style={{fontSize:20,fontWeight:800,color:NAVY,letterSpacing:"-0.4px"}}>{pageTitle}</div>
        <div style={{fontSize:11.5,color:"#94A3B8",marginTop:2,fontWeight:500}}>{fmt(todayStr())} &nbsp;·&nbsp; {listEvents.length} kegiatan &nbsp;·&nbsp; {SUPA_OK?"● Supabase":"○ Mode Lokal"}</div>
      </div>
      {pendingList.length>0&&<button onClick={goToPending} className="btn-ios" style={{padding:"9px 16px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#EF4444,#DC2626)",color:"white",cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:7,boxShadow:"0 4px 14px rgba(220,38,38,0.35)"}}>
        <span style={{background:"rgba(255,255,255,0.25)",borderRadius:"50%",width:20,height:20,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900}}>{pendingList.length}</span>Pending Approval
      </button>}
      {(role==="staf"||role==="staf_input")&&tab==="jadwal"&&<button onClick={()=>{setTab("form");setForm(emptyForm);setEditId(null);}} className="btn-ios" style={{padding:"9px 18px",borderRadius:10,border:"none",background:"linear-gradient(135deg,"+NAVY+",#1E3254)",color:"white",cursor:"pointer",fontSize:13,fontWeight:700,boxShadow:"0 4px 14px rgba(10,22,40,0.3)"}}>+ Input Jadwal Baru</button>}
    </div>}

    {/* ── Filters ── */}
    {!showForm&&<><div style={{background:"white",borderBottom:"1px solid #E4EAF2",padding:"10px "+(isMobile?"14px":"32px"),display:"flex",gap:6,overflowX:"auto",flexShrink:0,alignItems:"center",scrollbarWidth:"none"}}>
      <style>{"div::-webkit-scrollbar{display:none;}"}</style>
      {[{l:"Hari Ini",v:todayStr()},{l:"Besok",v:tomorrowStr()},{l:"Minggu Ini",v:"week"},{l:"Semua",v:""}].map(q=>{
        const active=(q.v==="week"?filterDate==="week":filterDate===q.v)&&(q.v!==""||filterDate==="");
        return <button key={q.l} onClick={()=>setFDate(q.v==="week"?"week":q.v)} className="btn-ios" style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid "+(active?NAVY:"#E4EAF2"),background:active?"linear-gradient(135deg,"+NAVY+",#1E3254)":"white",color:active?"white":"#64748B",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap",flexShrink:0,boxShadow:active?"0 2px 8px rgba(10,22,40,0.2)":"none"}}>{q.l}</button>;
      })}
      <input type="date" value={filterDate==="week"||filterDate==="range"?"":filterDate} onChange={e=>setFDate(e.target.value)} style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid #E4EAF2",fontSize:11,color:"#64748B",background:"white",flexShrink:0}}/>
      <button onClick={()=>{setFDate("range");setShowRangeFilter(p=>!p);}} className="btn-ios" style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid "+(filterDate==="range"?NAVY:"#E4EAF2"),background:filterDate==="range"?"linear-gradient(135deg,"+NAVY+",#1E3254)":"white",color:filterDate==="range"?"white":"#64748B",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>📆 Rentang</button>
      {filterDate&&<button onClick={()=>{setFDate("");setFilterFrom("");setFilterTo("");setShowRangeFilter(false);}} className="btn-ios" style={{padding:"6px 11px",borderRadius:20,border:"none",background:"#FEF2F2",color:"#DC2626",cursor:"pointer",fontSize:11,fontWeight:700,flexShrink:0}}>✕ Reset</button>}
    </div>
    {showRangeFilter&&filterDate==="range"&&<div style={{background:"#F0F4FF",padding:"10px "+(isMobile?"14px":"32px"),borderBottom:"1px solid #E4EAF2",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
      <span style={{fontSize:11,color:"#475569",fontWeight:700}}>Dari</span>
      <input type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)} style={{padding:"5px 12px",borderRadius:9,border:"1.5px solid #CBD5E1",fontSize:12,color:"#334155",background:"white"}}/>
      <span style={{fontSize:11,color:"#475569",fontWeight:700}}>Sampai</span>
      <input type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)} style={{padding:"5px 12px",borderRadius:9,border:"1.5px solid #CBD5E1",fontSize:12,color:"#334155",background:"white"}}/>
      {filterFrom&&filterTo&&<span style={{fontSize:11,color:"#0A1628",fontWeight:700,background:"#C9A84C22",padding:"4px 10px",borderRadius:6,border:"1px solid #C9A84C44"}}>{filterFrom} — {filterTo}</span>}
    </div>}
    </>}

    {/* ── Content area ── */}
    <div style={{flex:1,overflowY:"auto",padding:isMobile?"12px 14px calc(env(safe-area-inset-bottom,0px) + 72px)":"24px 32px 48px"}}>
      {tab==="tayang"&&!isMobile&&<div style={{background:"linear-gradient(135deg,"+NAVY+" 0%,#1E3254 100%)",padding:"18px 22px",borderRadius:16,marginBottom:20,display:"flex",alignItems:"center",gap:14,boxShadow:"0 6px 24px rgba(10,22,40,0.22)"}}>
        <div style={{width:46,height:46,borderRadius:14,background:"rgba(212,175,90,0.18)",border:"1.5px solid rgba(212,175,90,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🏛️</div>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:"white",letterSpacing:"-0.2px"}}>Agenda Pimpinan Kota Tarakan</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.55)",marginTop:2}}>{listEvents.length} kegiatan disetujui · terlihat semua pengguna</div>
        </div>
      </div>}
      {showPenugasan
        ?<PenugasanSayaView events={events} user={user} onOpenEvaluasi={setEvaluasiEv} isMobile={isMobile}/>
        :tab==="jadwal"&&tab!=="tayang"&&tab!=="semua"
        ?<PimpinanView events={events} role={role} user={user} upd={upd} showT={showT} isMobile={isMobile} setDelegTarget={setDelegTarget}/>
        :showForm
        ?<FormView form={form} setForm={setForm} editId={editId} setEditId={setEditId} setTab={setTab} isMobile={isMobile} onSubmit={submit} onCancel={()=>{setForm(emptyForm);setEditId(null);setTab("jadwal");}} onOpenAI={()=>setShowAI(true)} onUndanganUpload={handleUndanganUpload} showT={showT}/>
        :listEvents.length===0
          ?<div style={{textAlign:"center",padding:"70px 20px",color:"#94A3B8",background:"white",borderRadius:20,boxShadow:"0 2px 16px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:52,marginBottom:12}}>📭</div>
            <div style={{fontSize:16,fontWeight:700,color:"#334155"}}>Tidak ada jadwal</div>
            <div style={{fontSize:13,marginTop:6,color:"#94A3B8"}}>Belum ada data untuk filter yang dipilih</div>
          </div>
          :isMobile
            ?<div>{listEvents.map(ev=><EventCard key={ev.id} ev={ev}/>)}</div>
            :<TableView evList={listEvents}/>
      }
    </div>
  </div>);

  // ==================== RENDER ====================
  return <div style={{minHeight:"100vh",width:"100%",background:NAVY,display:"flex"}}>
    <style>{CSS}</style>
    {toast&&<Toast msg={toast.msg} type={toast.type}/>}

    {/* Notif bar jadwal belum ditugaskan (H-12) */}
    {(role==="kasubbag"||role==="kasubbag_kominfo"||role==="timkom")&&notifPenugasan.length>0&&tab!=="form"&&
      <div style={{position:"fixed",bottom:isMobile?70:20,left:"50%",transform:"translateX(-50%)",zIndex:2000,background:"#7c2d12",color:"white",borderRadius:12,padding:"10px 18px",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:10,boxShadow:"0 4px 20px rgba(0,0,0,0.3)",maxWidth:360,width:"calc(100% - 32px)",cursor:"pointer"}}
        onClick={()=>showT(notifPenugasan.map(e=>e.namaAcara).join(", ")+" — belum ada personil","warn")}>
        <span style={{fontSize:18}}>⚠️</span>
        <div>
          <div>{notifPenugasan.length} jadwal belum ditugaskan personil</div>
          <div style={{fontSize:11,opacity:0.8,fontWeight:500}}>Kurang dari 12 jam sebelum acara dimulai</div>
        </div>
        <button onClick={e=>{e.stopPropagation();setNotifPenugasan([]);}} style={{marginLeft:"auto",background:"rgba(255,255,255,0.2)",border:"none",color:"white",borderRadius:6,padding:"2px 8px",cursor:"pointer",fontSize:12}}>✕</button>
      </div>
    }

    {/* PenugasanModal */}
    {evaluasiEv&&<EvaluasiModal
      ev={evaluasiEv}
      onClose={()=>setEvaluasiEv(null)}
      onSave={(entry)=>{saveEvaluasi(evaluasiEv.id,entry);}}
      currentUser={user}
    />}

    {penugasanEv&&<PenugasanModal
      ev={penugasanEv}
      onClose={()=>setPenugasanEv(null)}
      onSave={(personil,catatan)=>savePenugasan(penugasanEv.id,personil,catatan)}
      currentUser={user}
      allUsers={loadUsers()}
      allEvents={events}
    />}
    {showForgot&&<ForgotPasswordModal onClose={()=>setShowForgot(false)}/>}
    {showAI&&<AIModal onFill={d=>{setForm(p=>({...p,...d}));setShowAI(false);setTab("form");showT("Form terisi dari AI. Periksa sebelum menyimpan.","warn");}} onClose={()=>setShowAI(false)}/>}
    {showReport&&<ReportingModal events={events} kabagNama={kabagNama} cetakOleh={user?.nama||user?.username||""} onClose={()=>setShowReport(false)}/>}
    {showSummary&&<SummaryModal events={events} onToggleHide={id=>upd(id,{tersembunyi:!events.find(e=>e.id===id)?.tersembunyi})} onClose={()=>setShowSummary(false)}/>}
    {showAdmin&&<AdminModal onClose={()=>setShowAdmin(false)} showT={showT}/>}
    {showProfile&&<ProfileModal user={user} onClose={updated=>{setShowProfile(false);if(updated)setUser(updated);}} showT={showT}/>}
    {showLaporan&&<LaporanModal events={events} kabagNama={kabagNama} cetakOleh={user?.nama||user?.username||""} onClose={()=>setShowLaporan(false)}/>}
    {delegTarget&&<DelegateModal label={delegTarget.side==="wk"?"Wali Kota":"Wakil Wali Kota"} onConfirm={name=>{if(delegTarget.side==="wk")upd(delegTarget.id,{statusWK:"diwakilkan",perwakilanWK:name,delegasiKeWWK:false});else upd(delegTarget.id,{statusWWK:"diwakilkan",perwakilanWWK:name});setDelegTarget(null);showT("Diwakilkan ke "+name);}} onCancel={()=>setDelegTarget(null)}/>}
    {isMobile
      ?<div style={{width:"100%",minHeight:"100vh",display:"flex",flexDirection:"column",background:"#F0F4FA",paddingTop:"env(safe-area-inset-top,0px)"}}>
        {mobileHeaderJSX}
        {mainContentJSX}
       </div>
      :<div style={{width:"100%",minHeight:"100vh",display:"flex",background:NAVY}}>{sidebarJSX}{mainContentJSX}</div>
    }
  </div>;
}
