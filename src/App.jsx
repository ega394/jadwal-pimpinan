import { useState, useRef, useEffect, useCallback } from "react";

// ==================== CONSTANTS ====================
const NAVY="#0B2545", GOLD="#C9A84C", GREEN="#065f46";
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
const PAKAIAN=["PDH","PDH Batik Tarakan","Batik Lengan Panjang","PSL","PSR","PSH","PDUB","Pakaian Lapangan","Pakaian Olahraga","Bebas Rapi"];
const JENIS=["Menghadiri","Sambutan","Pengarahan"];
const PEJABAT=["Sekda","Asisten Pemerintahan dan Kesra","Asisten Perekonomian dan Pembangunan","Asisten Administrasi Umum"];
const ROLES_WITH_REPORT=["staf","kasubbag","kabag","timkom"];

// ==================== USERS ====================
const DEFAULT_USERS=[
  {username:"walikota",      password:"WK@2025",      role:"walikota",      nama:"Wali Kota Tarakan",                jabatan:"Wali Kota Tarakan"},
  {username:"wakilwalikota", password:"WWK@2025",     role:"wakilwalikota", nama:"Wakil Wali Kota Tarakan",          jabatan:"Wakil Wali Kota Tarakan"},
  {username:"ajudan",        password:"Ajudan@2025",  role:"ajudan",        nama:"Ajudan Pimpinan",                  jabatan:"Ajudan"},
  {username:"timkom",        password:"Timkom@2025",  role:"timkom",        nama:"Tim Komunikasi & Dokumentasi",     jabatan:"Tim Komunikasi & Dokumentasi Pimpinan"},
  {username:"staf",          password:"Staf@2025",    role:"staf",          nama:"Staf Protokol",                    jabatan:"Staf Protokol"},
  {username:"kasubbag",      password:"Ksbg@2025",    role:"kasubbag",      nama:"Kasubbag Protokol",                jabatan:"Kasubbag Protokol"},
  {username:"kabag",         password:"Kabag@2025",   role:"kabag",         nama:"Kabag Protokol & Komunikasi",      jabatan:"Kepala Bagian Protokol & Komunikasi Pimpinan"},
];
function loadUsers(){try{const s=localStorage.getItem("jp_users");return s?JSON.parse(s):DEFAULT_USERS;}catch{return DEFAULT_USERS;}}
function saveUsers(u){try{localStorage.setItem("jp_users",JSON.stringify(u));}catch{}}

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
const forDB=ev=>{const d={...ev};if(d.sambutanFile?.startsWith("data:"))d.sambutanFile=null;if(d.undanganFile?.startsWith("data:"))d.undanganFile=null;return d;};
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
    ...(desc?["DESCRIPTION:"+desc.replace(/
/g,"\n")]:[]),
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
const mkEv=o=>({alur:"disetujui",catatanTolak:"",statusWK:null,statusWWK:null,perwakilanWK:"",perwakilanWWK:"",delegasiKeWWK:false,sambutanFile:null,sambutanNama:"",undanganFile:null,undanganNama:"",catatanPimpinan:"",tersembunyi:false,alurHapus:null,lokasi:"",...o});
const seed=[
  mkEv({id:1,tanggal:T,jam:"09:00",namaAcara:"Rapat Koordinasi Infrastruktur",penyelenggara:"Dinas PUPR",kontak:"Budi 0812-3456-7890",buktiUndangan:"No.045/PUPR/2025",pakaian:"PDH",lokasi:"Ruang Rapat Lt.3 Balaikota Tarakan",jenisKegiatan:"Sambutan",catatan:"Ruang Rapat Lt.3",untukPimpinan:["walikota","wakilwalikota"]}),
  mkEv({id:2,tanggal:T,jam:"14:00",namaAcara:"Peresmian Taman Kota Baru",penyelenggara:"Dinas LH",kontak:"Sari 0813-9876-5432",buktiUndangan:"No.023/DLH/2025",pakaian:"Batik Lengan Panjang",lokasi:"Taman Kota Baru Tarakan",jenisKegiatan:"Sambutan",catatan:"Outdoor, bawa payung.",untukPimpinan:["walikota"],statusWK:"hadir"}),
  mkEv({id:3,tanggal:TMR,jam:"10:00",namaAcara:"Audiensi DPRD - Pembahasan APBD",penyelenggara:"Sekretariat DPRD",kontak:"Ahmad 0811-2222-3333",buktiUndangan:"No.110/DPRD/2025",pakaian:"PSH",lokasi:"Gedung DPRD Kota Tarakan",jenisKegiatan:"Pengarahan",catatan:"Bawa dokumen APBD",untukPimpinan:["walikota","wakilwalikota"],alur:"menunggu_kasubbag"}),
  mkEv({id:4,tanggal:TMR,jam:"08:00",namaAcara:"Apel Pagi Gabungan",penyelenggara:"Sekretariat Daerah",kontak:"Hendra 0815-1111-2222",buktiUndangan:"Memo No.5/2025",pakaian:"PDH",lokasi:"Halaman Kantor Wali Kota Tarakan",jenisKegiatan:"Menghadiri",catatan:"",untukPimpinan:["walikota"],alur:"menunggu_kabag"}),
];
const emptyForm={tanggal:"",jam:"",namaAcara:"",penyelenggara:"",kontak:"",buktiUndangan:"",pakaian:"PDH",jenisKegiatan:"Menghadiri",catatan:"",lokasi:"",untukPimpinan:["walikota"],undanganFile:null,undanganNama:""};

// ==================== SMALL COMPONENTS ====================
const StatusPill=({alur,hapus})=>{
  if(hapus)return <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:"#fff1f2",color:"#e11d48",whiteSpace:"nowrap"}}>Minta Hapus</span>;
  const c=WF[alur]||WF.draft;
  return <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:c.bg,color:c.color,whiteSpace:"nowrap"}}>{c.label}</span>;
};
const JenisBadge=({j})=>{const m={Sambutan:{bg:"#fdf4ff",c:"#9333ea"},Pengarahan:{bg:"#eff6ff",c:"#2563eb"},Menghadiri:{bg:"#f0fdf4",c:"#16a34a"}};const x=m[j]||{bg:"#f1f5f9",c:"#64748b"};return <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:x.bg,color:x.c}}>{j}</span>;};
function Toast({msg,type}){return <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:9999,padding:"12px 20px",borderRadius:12,maxWidth:"520px",textAlign:"center",background:type==="error"?"#fee2e2":type==="warn"?"#fef3c7":NAVY,color:type==="error"?"#991b1b":type==="warn"?"#92400e":"white",boxShadow:"0 8px 32px rgba(0,0,0,0.18)",fontSize:14,fontWeight:600,whiteSpace:"pre-wrap",border:type==="error"?"1.5px solid #fca5a5":type==="warn"?"1.5px solid #fde68a":"none"}}>{msg}</div>;}

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

// ==================== SAMBUTAN BLOCK ====================
function SambutanBlock({ev,canUpload,onUpload,onRemove}){
  const ref=useRef();const[load,setL]=useState(false);const[view,setV]=useState(false);
  const handleFile=f=>{if(!f)return;if(f.type!=="application/pdf"){alert("Hanya PDF.");return;}if(f.size>10*1024*1024){alert("Maks 10MB.");return;}setL(true);onUpload(f,f.name).finally(()=>setL(false));};
  if(ev.sambutanFile)return <>
    {view&&<FileViewModal file={ev.sambutanFile} nama={ev.sambutanNama} onClose={()=>setV(false)}/>}
    <div style={{background:"#f0fdf4",borderRadius:10,padding:11,border:"1.5px solid #bbf7d0"}}>
      <div style={{fontSize:12,color:GREEN,fontWeight:700,marginBottom:7}}>Naskah Sambutan</div>
      <div style={{display:"flex",alignItems:"center",gap:8,background:"white",borderRadius:8,padding:"8px 10px",border:"1px solid #d1fae5",marginBottom:7}}>
        <span style={{fontSize:16}}>PDF</span>
        <div style={{flex:1,minWidth:0,fontSize:12,fontWeight:600,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.sambutanNama}</div>
      </div>
      <div style={{display:"flex",gap:7}}>
        <button onClick={()=>setV(true)} style={{flex:1,padding:"8px",borderRadius:8,border:"1.5px solid "+NAVY,background:"white",color:NAVY,cursor:"pointer",fontSize:12,fontWeight:700}}>Lihat</button>
        <a href={ev.sambutanFile} download={ev.sambutanNama} style={{flex:1,padding:"8px",borderRadius:8,border:"none",background:NAVY,color:"white",textDecoration:"none",textAlign:"center",fontSize:12,fontWeight:700,display:"block"}}>Unduh</a>
        {canUpload&&<button onClick={onRemove} style={{padding:"8px 10px",borderRadius:8,border:"1.5px solid #fca5a5",background:"white",color:"#ef4444",cursor:"pointer",fontSize:11,fontWeight:700}}>Ganti</button>}
      </div>
    </div>
  </>;
  if(canUpload)return <div style={{background:"#fafafa",borderRadius:10,padding:11,border:"1.5px dashed #c4b5fd"}}>
    <div style={{fontSize:12,color:"#64748b",fontWeight:700,marginBottom:6}}>Upload Naskah Sambutan</div>
    <input ref={ref} type="file" accept="application/pdf" onChange={e=>{handleFile(e.target.files[0]);e.target.value="";}} style={{display:"none"}}/>
    <button onClick={()=>ref.current.click()} disabled={load} style={{width:"100%",padding:"11px",borderRadius:8,border:"1.5px dashed #6366f1",background:load?"#f1f5f9":"white",color:"#6366f1",cursor:load?"default":"pointer",fontSize:13,fontWeight:700}}>{load?"Memproses...":"Upload PDF Sambutan"}</button>
  </div>;
  return <div style={{padding:"8px 10px",background:"#fef9c3",borderRadius:8,fontSize:12,color:"#92400e",fontWeight:600}}>Naskah sambutan belum diupload</div>;
}

// ==================== AI MODAL ====================
function AIModal({onFill,onClose}){
  const ref=useRef();const[drag,setDrag]=useState(false);const[loading,setLoading]=useState(false);const[result,setResult]=useState(null);const[edited,setEdited]=useState(null);const[err,setErr]=useState("");
  const analyze=async f=>{
    setLoading(true);setErr("");setResult(null);setEdited(null);
    try{
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(f);});
      const isPdf=f.type==="application/pdf";
      const bodyContent=isPdf
        ?[{type:"document",source:{type:"base64",media_type:"application/pdf",data:b64}},{type:"text",text:'Kamu adalah asisten ekstraksi data undangan resmi pemerintah. Baca dokumen undangan ini dan ekstrak informasi. Jawab HANYA dengan satu objek JSON, tanpa penjelasan, tanpa markdown: {"namaAcara":"","tanggal":"YYYY-MM-DD","jam":"HH:MM","penyelenggara":"","kontak":"","pakaian":"PDH","jenisKegiatan":"Menghadiri","catatan":"","buktiUndangan":"","lokasi":"","untukPimpinan":["walikota"]}'}]
        :[{type:"image",source:{type:"base64",media_type:f.type,data:b64}},{type:"text",text:'Kamu adalah asisten ekstraksi data undangan resmi pemerintah. Baca teks undangan di gambar ini dan ekstrak informasi. Jawab HANYA dengan satu objek JSON, tanpa penjelasan, tanpa markdown: {"namaAcara":"","tanggal":"YYYY-MM-DD","jam":"HH:MM","penyelenggara":"","kontak":"","pakaian":"PDH","jenisKegiatan":"Menghadiri","catatan":"","buktiUndangan":"","lokasi":"","untukPimpinan":["walikota"]}'}];
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
      if(resp.status===404){
        throw new Error("File api/ai.js belum ada di GitHub. Upload file api-ai.js ke repositori sebagai api/ai.js (bukan di folder src/).");
      }
      if(!resp.ok){
        const errMsg=data&&data.error?(typeof data.error==="string"?data.error:JSON.stringify(data.error)):"Server error ("+resp.status+"). Cek GEMINI_API_KEY di Vercel.";
        throw new Error(errMsg);
      }
      if(data&&data.error){const em=typeof data.error==="string"?data.error:JSON.stringify(data.error);throw new Error(em);}
      if(!data||!data.content){throw new Error("Respons tidak valid: "+(data?JSON.stringify(data).slice(0,200):"null"));}
      const txt=(data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
      const m=txt.match(/\{[\s\S]*\}/);
      if(!m)throw new Error("AI tidak mengembalikan data JSON. Coba upload gambar yang lebih jelas.");
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
  const shareText=["*AGENDA KEGIATAN PIMPINAN*","*"+getHari(today)+", "+fmt(today)+"*","",...pub.flatMap((ev,i)=>[`*${i+1}. ${ev.namaAcara}*`,ev.jam+" WIB",ev.penyelenggara,...(ev.lokasi?["Lokasi: "+ev.lokasi]:[]),"Pakaian: "+ev.pakaian,...(ev.catatan?["Catatan: "+ev.catatan]:[]),""]),"_Bagian Protokol & Komunikasi Pimpinan_"].join("\n");
  const copy=()=>{navigator.clipboard.writeText(shareText).catch(()=>{const ta=document.createElement("textarea");ta.value=shareText;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);});};
  const print=()=>{const w=window.open("","_blank");w.document.write("<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Agenda</title><style>@page{size:A4;margin:2cm}body{font-family:Arial,sans-serif;font-size:12pt}.h1{font-size:14pt;font-weight:900;color:#0B2545;text-align:center;margin:0 0 4px}.h2{text-align:center;font-size:11pt;color:#475569;margin:0 0 14px}.ev{margin-bottom:14px;padding:10px 14px;border-left:4px solid #0B2545;background:#f8fafc}.ev-t{font-size:13pt;font-weight:700;color:#0B2545;margin-bottom:3px}.ev-r{font-size:10pt;color:#334155;margin:2px 0}.footer{margin-top:20px;text-align:center;font-size:9pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px}</style></head><body><p class='h1'>AGENDA KEGIATAN PIMPINAN</p><p class='h2'>"+getHari(today)+", "+fmt(today)+"</p>"+pub.map((ev,i)=>"<div class='ev'><div class='ev-t'>"+(i+1)+". "+ev.namaAcara+"</div><div class='ev-r'>"+ev.jam+" WIB | "+ev.penyelenggara+"</div>"+(ev.lokasi?"<div class='ev-r'>Lokasi: "+ev.lokasi+"</div>":"")+"<div class='ev-r'>Pakaian: "+ev.pakaian+"</div>"+(ev.catatan?"<div class='ev-r'>Catatan: "+ev.catatan+"</div>":"")+"</div>").join("")+"<div class='footer'>Bagian Protokol &amp; Komunikasi Pimpinan</div></body></html>");w.document.close();w.focus();setTimeout(()=>w.print(),400);};
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
function ReportingModal({events,onClose,kabagNama}){
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
    const printDate=new Date().toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"});
    const rows=filtered.map((ev,i)=>{
      const wkS=ev.untukPimpinan.includes("walikota")?(ev.delegasiKeWWK?"Delegasi WWK":ev.statusWK==="hadir"?"Hadir":ev.statusWK==="tidak_hadir"?"Tidak Hadir":ev.statusWK==="diwakilkan"?"Diwakilkan"+(ev.perwakilanWK?" ("+ev.perwakilanWK+")":""):"-"):"-";
      const wwkS=(ev.untukPimpinan.includes("wakilwalikota")||ev.delegasiKeWWK)?(ev.statusWWK==="hadir"?"Hadir":ev.statusWWK==="tidak_hadir"?"Tidak Hadir":ev.statusWWK==="diwakilkan"?"Diwakilkan"+(ev.perwakilanWWK?" ("+ev.perwakilanWWK+")":""):"-"):"-";
      return "<tr><td class='c'>"+(i+1)+"</td><td class='nw'><strong>"+getHari(ev.tanggal)+"</strong><br>"+fmtShort(ev.tanggal)+"</td><td class='c'><strong>"+ev.jam+"</strong></td><td><strong>"+ev.namaAcara+"</strong><br><span style='font-size:7.5pt;color:#64748b'>"+ev.penyelenggara+"</span></td><td class='c "+(ev.jenisKegiatan==="Sambutan"?"u":ev.jenisKegiatan==="Pengarahan"?"b":"g")+"'>"+ev.jenisKegiatan+"</td><td>"+(ev.lokasi||"<em style='color:#cbd5e1'>-</em>")+"</td><td class='c' style='font-size:7pt'>"+ev.pakaian+"</td><td class='c'>"+wkS+"</td><td class='c'>"+wwkS+"</td><td class='cat'></td></tr>";
    }).join("");
    w.document.write("<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Rekap Kegiatan</title><style>@page{size:A4 landscape;margin:1.5cm 1.8cm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:8.5pt;color:#1a1a1a}.kop{display:flex;align-items:center;gap:14px;border-bottom:3px solid #0B2545;padding-bottom:10px;margin-bottom:8px}.kop img{width:52px;height:52px;object-fit:contain}.kop h1{font-size:12pt;font-weight:900;color:#0B2545;margin:0 0 1px}.kop h2{font-size:9pt;font-weight:700;color:#0B2545;margin:0 0 2px}.kop p{font-size:7.5pt;color:#475569;margin:0}.jdl{text-align:center;margin:8px 0}.jdl h3{font-size:12pt;font-weight:900;color:#0B2545;margin:0;text-transform:uppercase;letter-spacing:1px}.jdl p{font-size:8.5pt;color:#475569;margin:3px 0 0}table{width:100%;border-collapse:collapse;font-size:8pt}thead th{background:#0B2545;color:white;padding:7px 6px;text-align:left;font-size:7.5pt}thead th.c{text-align:center}tbody td{padding:6px;border-bottom:1px solid #e2e8f0;vertical-align:top;line-height:1.4}tbody tr:nth-child(even) td{background:#f8fafc}tbody tr:last-child td{border-bottom:2px solid #0B2545}.c{text-align:center}.nw{white-space:nowrap}.cat{min-width:90px;border-left:1px dashed #94a3b8}.u{color:#7c3aed;font-weight:700}.b{color:#2563eb;font-weight:700}.g{color:#065f46;font-weight:700}.ttd{margin-top:18px;display:flex;justify-content:flex-end}.ttd-box{text-align:center;min-width:220px}.ttd-box p{margin:0;font-size:8pt}.ttd-box .jab{font-weight:700;color:#0B2545;margin-bottom:46px}.ttd-box .garis{border-bottom:1.5px solid #0B2545;margin:0 10px 4px}.ttd-box .nm{font-size:8.5pt;font-weight:900;color:#0B2545}.ttd-box .nip{font-size:7pt;color:#64748b}.foot{margin-top:6px;font-size:7pt;color:#94a3b8;text-align:center}</style></head><body><div class='kop'><img src='/logo_tarakan.png' onerror=\"this.style.display='none'\"/><div><h1>PEMERINTAH KOTA TARAKAN</h1><h2>BAGIAN PROTOKOL DAN KOMUNIKASI PIMPINAN</h2><p>Sekretariat Daerah Kota Tarakan</p></div></div><div class='jdl'><h3>Rekap Agenda Kegiatan Pimpinan</h3><p>Periode: "+rangeLabel()+" &bull; Dicetak: "+printDate+" &bull; Total: <strong>"+filtered.length+" kegiatan</strong></p></div><table><thead><tr><th class='c' style='width:24px'>No</th><th style='width:78px'>Hari/Tgl</th><th class='c' style='width:42px'>Pukul</th><th style='width:195px'>Nama Acara</th><th class='c' style='width:60px'>Jenis</th><th style='width:128px'>Tempat/Lokasi</th><th class='c' style='width:80px'>Pakaian</th><th class='c' style='width:58px'>WK</th><th class='c' style='width:58px'>WWK</th><th style='width:90px'>Catatan<br>Kepala Daerah</th></tr></thead><tbody>"+rows+"</tbody></table><div class='ttd'><div class='ttd-box'><p>Tarakan, "+printDate+"</p><p class='jab'>Kepala Bagian Protokol dan Komunikasi Pimpinan</p><div class='garis'></div><p class='nm'>"+kabag+"</p><p class='nip'>NIP. ___________________________</p></div></div><p class='foot'>Sistem Informasi Jadwal Kegiatan Pimpinan &mdash; Setda Kota Tarakan</p></body></html>");
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
function LaporanModal({events,onClose,kabagNama}){
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
    const printDate=new Date().toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"});
    const kabag=kabagNama||"Kabag Protokol & Komunikasi Pimpinan";
    const rows=Object.keys(byDay).sort().flatMap(tgl=>byDay[tgl].map((ev,i)=>"<tr>"+(i===0?"<td class='c' rowspan='"+byDay[tgl].length+"' style='background:#EBF0FA;font-weight:700;color:#0B2545'>"+getHari(tgl)+"<br><span style='font-size:7pt'>"+fmtShort(tgl)+"</span></td>":"")+"<td class='c'><strong>"+ev.jam+"</strong></td><td><strong>"+ev.namaAcara+"</strong><br><span style='font-size:7.5pt;color:#64748b'>"+ev.penyelenggara+"</span></td><td class='c "+(ev.jenisKegiatan==="Sambutan"?"u":ev.jenisKegiatan==="Pengarahan"?"b":"g")+"'>"+ev.jenisKegiatan+"</td><td>"+(ev.lokasi||"<em style='color:#cbd5e1'>-</em>")+"</td><td class='c' style='font-size:7pt'>"+ev.pakaian+"</td><td class='c'>"+(ev.untukPimpinan.includes("walikota")?(ev.delegasiKeWWK?"Delegasi":ev.statusWK==="hadir"?"Hadir":ev.statusWK==="tidak_hadir"?"Tdk Hadir":"-"):"-")+"</td><td class='c'>"+(ev.untukPimpinan.includes("wakilwalikota")||ev.delegasiKeWWK?(ev.statusWWK==="hadir"?"Hadir":ev.statusWWK==="tidak_hadir"?"Tdk Hadir":"-"):"-")+"</td></tr>")).join("");
    const statRow="<div style='display:flex;gap:10px;margin:8px 0;flex-wrap:wrap'>"+[["Total",stats.total,"#0B2545"],["Wali Kota",stats.wk,"#1B4080"],["Wakil WK",stats.wwk,"#065f46"],["Sambutan",stats.sambutan,"#7c3aed"],["Pengarahan",stats.pengarahan,"#2563eb"],["Menghadiri",stats.menghadiri,"#16a34a"]].map(([l,v,c])=>"<div style='background:"+c+";color:white;border-radius:8px;padding:6px 12px;font-size:10pt;font-weight:700;text-align:center'><div style='font-size:8pt;font-weight:400;opacity:0.8'>"+l+"</div>"+v+"</div>").join("")+"</div>";
    w.document.write("<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Laporan Kegiatan</title><style>@page{size:A4 landscape;margin:1.5cm 1.8cm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:8.5pt;color:#1a1a1a}.kop{display:flex;align-items:center;gap:14px;border-bottom:3px solid #0B2545;padding-bottom:10px;margin-bottom:8px}.kop img{width:52px;height:52px;object-fit:contain}.kop h1{font-size:12pt;font-weight:900;color:#0B2545;margin:0 0 1px}.kop h2{font-size:9pt;font-weight:700;color:#0B2545;margin:0 0 2px}.kop p{font-size:7.5pt;color:#475569;margin:0}.jdl{text-align:center;margin:8px 0}.jdl h3{font-size:12pt;font-weight:900;color:#0B2545;margin:0;text-transform:uppercase;letter-spacing:1px}.jdl p{font-size:8.5pt;color:#475569;margin:3px 0 0}table{width:100%;border-collapse:collapse;font-size:8pt}thead th{background:#0B2545;color:white;padding:7px 6px;text-align:left;font-size:7.5pt}thead th.c{text-align:center}tbody td{padding:6px;border-bottom:1px solid #e2e8f0;vertical-align:middle;line-height:1.4}tbody tr:nth-child(even) td:not(:first-child){background:#f8fafc}.c{text-align:center}.u{color:#7c3aed;font-weight:700}.b{color:#2563eb;font-weight:700}.g{color:#065f46;font-weight:700}.ttd{margin-top:18px;display:flex;justify-content:flex-end}.ttd-box{text-align:center;min-width:220px}.ttd-box p{margin:0;font-size:8pt}.ttd-box .jab{font-weight:700;color:#0B2545;margin-bottom:46px}.ttd-box .garis{border-bottom:1.5px solid #0B2545;margin:0 10px 4px}.ttd-box .nm{font-size:8.5pt;font-weight:900;color:#0B2545}.ttd-box .nip{font-size:7pt;color:#64748b}.foot{margin-top:6px;font-size:7pt;color:#94a3b8;text-align:center}</style></head><body><div class='kop'><img src='/logo_tarakan.png' onerror=\"this.style.display='none'\"/><div><h1>PEMERINTAH KOTA TARAKAN</h1><h2>BAGIAN PROTOKOL DAN KOMUNIKASI PIMPINAN</h2><p>Sekretariat Daerah Kota Tarakan</p></div></div><div class='jdl'><h3>LAPORAN KEGIATAN PIMPINAN</h3><p>"+range.label+" &bull; Dicetak: "+printDate+"</p></div>"+statRow+"<table><thead><tr><th style='width:80px'>Hari/Tgl</th><th class='c' style='width:42px'>Pukul</th><th style='width:200px'>Nama Acara</th><th class='c' style='width:62px'>Jenis</th><th style='width:130px'>Tempat/Lokasi</th><th class='c' style='width:78px'>Pakaian</th><th class='c' style='width:50px'>WK</th><th class='c' style='width:50px'>WWK</th></tr></thead><tbody>"+rows+"</tbody></table><div class='ttd'><div class='ttd-box'><p>Tarakan, "+printDate+"</p><p class='jab'>Kepala Bagian Protokol dan Komunikasi Pimpinan</p><div class='garis'></div><p class='nm'>"+kabag+"</p><p class='nip'>NIP. ___________________________</p></div></div><p class='foot'>Sistem Informasi Jadwal Kegiatan Pimpinan &mdash; Setda Kota Tarakan</p></body></html>");
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
  const changePassword=()=>{
    setErr("");
    if(!pw.old||!pw.next||!pw.confirm)return setErr("Semua kolom wajib diisi.");
    if(pw.next.length<6)return setErr("Password minimal 6 karakter.");
    if(pw.next!==pw.confirm)return setErr("Konfirmasi tidak cocok.");
    const users=loadUsers();const cur=users.find(u=>u.username===user.username);
    if(!cur||cur.password!==pw.old)return setErr("Password lama salah.");
    saveUsers(users.map(u=>u.username===user.username?{...u,password:pw.next}:u));
    setPw({old:"",next:"",confirm:""});showT("Password berhasil diubah ✓");
  };
  const changeUsername=()=>{
    setErr("");
    if(!uname.newUsername.trim())return setErr("Username baru wajib diisi.");
    const un=uname.newUsername.toLowerCase().trim();
    const users=loadUsers();const cur=users.find(u=>u.username===user.username);
    if(!cur||cur.password!==uname.pwConfirm)return setErr("Password tidak cocok.");
    if(users.find(u=>u.username===un&&u.username!==user.username))return setErr("Username sudah dipakai.");
    saveUsers(users.map(u=>u.username===user.username?{...u,username:un}:u));
    try{localStorage.setItem("jp_session",JSON.stringify({username:un}));}catch{}
    localStorage.removeItem(bioKey(user.username));
    showT("Username diubah. Silakan login ulang.","warn");
    setTimeout(()=>{localStorage.removeItem("jp_session");window.location.reload();},1800);
  };
  const tabs=[{k:"profile",l:"Profil"},{k:"password",l:"Ganti Password"},{k:"username",l:"Ganti Username"},{k:"biometric",l:"Biometrik"}];
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
  const[users,setUsers]=useState(loadUsers);const[tabA,setTabA]=useState("users");const[editUser,setEditUser]=useState(null);const[newUser,setNewUser]=useState({username:"",password:"",nama:"",jabatan:"",role:"staf"});const[err,setErr]=useState("");
  const save=u=>{setUsers(u);saveUsers(u);};
  const doAdd=()=>{setErr("");if(!newUser.username||!newUser.password||!newUser.nama)return setErr("Username, password & nama wajib.");if(users.find(u=>u.username===newUser.username.toLowerCase()))return setErr("Username sudah ada.");save([...users,{...newUser,username:newUser.username.toLowerCase()}]);setNewUser({username:"",password:"",nama:"",jabatan:"",role:"staf"});showT("Pengguna ditambahkan ✓");};
  const doDelete=un=>{if(!window.confirm("Hapus pengguna "+un+"?"))return;save(users.filter(u=>u.username!==un));showT("Pengguna dihapus");};
  const doSaveEdit=()=>{setErr("");if(!editUser.nama)return setErr("Nama wajib.");save(users.map(u=>u.username===editUser.username?editUser:u));setEditUser(null);showT("Data disimpan ✓");};
  const inp={width:"100%",padding:"9px 11px",borderRadius:8,border:"1.5px solid #e2e8f0",fontSize:13,background:"white",color:"#1e293b"};
  return <div style={{position:"fixed",inset:0,zIndex:8200,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:560,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"16px 20px 0",borderBottom:"1px solid #f1f5f9",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><div style={{flex:1,fontSize:16,fontWeight:700,color:NAVY}}>Panel Admin</div><button onClick={onClose} style={{background:"#f1f5f9",border:"none",borderRadius:7,padding:"6px 10px",cursor:"pointer",fontSize:13,fontWeight:700,color:"#64748b"}}>Tutup</button></div>
        <div style={{display:"flex",gap:0}}>{[{k:"users",l:"Pengguna"},{k:"add",l:"Tambah"},{k:"pw",l:"Reset Password"}].map(t=><button key={t.k} onClick={()=>{setTabA(t.k);setErr("");}} style={{padding:"9px 16px",border:"none",background:"transparent",color:tabA===t.k?NAVY:"#94a3b8",fontWeight:tabA===t.k?700:500,fontSize:13,cursor:"pointer",borderBottom:tabA===t.k?"2.5px solid "+NAVY:"2.5px solid transparent"}}>{t.l}</button>)}</div>
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
          <div style={{marginBottom:8}}><label style={{display:"block",fontSize:11,color:"#64748b",fontWeight:600,marginBottom:2}}>Password Baru (kosong = tidak ubah)</label><input type="password" onChange={e=>setEditUser(p=>({...p,password:e.target.value||p.password}))} style={inp}/></div>
          <div style={{marginBottom:12}}><label style={{display:"block",fontSize:11,color:"#64748b",fontWeight:600,marginBottom:2}}>Role / Hak Akses</label><select value={editUser.role} onChange={e=>setEditUser(p=>({...p,role:e.target.value}))} style={{...inp,WebkitAppearance:"none"}}>{ALL_ROLE_DEFS.map(r=><option key={r.key} value={r.key}>{r.label}</option>)}</select></div>
          <div style={{display:"flex",gap:8}}><button onClick={()=>setEditUser(null)} style={{flex:1,padding:"10px",borderRadius:9,border:"1.5px solid #e2e8f0",background:"white",color:"#64748b",cursor:"pointer",fontSize:13,fontWeight:600}}>Batal</button><button onClick={doSaveEdit} style={{flex:2,padding:"10px",borderRadius:9,border:"none",background:NAVY,color:"white",cursor:"pointer",fontSize:13,fontWeight:700}}>Simpan</button></div>
        </div>}</>}
        {tabA==="add"&&<>{[{k:"username",l:"Username *"},{k:"nama",l:"Nama Lengkap *"},{k:"jabatan",l:"Jabatan"}].map(f=><div key={f.k} style={{marginBottom:10}}><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:3}}>{f.l}</label><input value={newUser[f.k]||""} onChange={e=>setNewUser(p=>({...p,[f.k]:e.target.value}))} autoCapitalize="none" style={inp}/></div>)}
          <div style={{marginBottom:10}}><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:3}}>Password *</label><input type="password" value={newUser.password||""} onChange={e=>setNewUser(p=>({...p,password:e.target.value}))} style={inp}/></div>
          <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:3}}>Role / Hak Akses</label><select value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))} style={{...inp,WebkitAppearance:"none"}}>{ALL_ROLE_DEFS.map(r=><option key={r.key} value={r.key}>{r.label}</option>)}</select></div>
          <button onClick={doAdd} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:NAVY,color:"white",cursor:"pointer",fontSize:14,fontWeight:700}}>Tambahkan Pengguna</button></>}
        {tabA==="pw"&&<div style={{background:"#fef3c7",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#92400e"}}>Untuk reset password pengguna, gunakan tab Pengguna lalu klik Edit pada akun yang bersangkutan.</div>}
      </div>
    </div>
  </div>;
}


// ==================== FORM VIEW (top-level - prevents re-mount on every keystroke) ====================
function FormView({form,setForm,editId,isMobile,onSubmit,onCancel,onOpenAI,showT}){
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
export default function App(){
  const width=useWindowWidth();const isMobile=width<768;
  const[users,setUsers]=useState(loadUsers);
  const[user,setUser]=useState(null);const role=user?.role||null;
  const[loginForm,setLF]=useState({username:"",password:""});const[loginErr,setLE]=useState("");const[showPass,setShowPass]=useState(false);
  const[bioLoading,setBioLoading]=useState(false);const[bioErr,setBioErr]=useState("");
  const[events,setEvents]=useState([]);const[dbReady,setDbReady]=useState(false);const[dbError,setDbError]=useState("");
  const[tab,setTab]=useState("jadwal");const[form,setForm]=useState(emptyForm);const[editId,setEditId]=useState(null);
  const[toast,setToast]=useState(null);const[filterDate,setFDate]=useState("");
  const[showAI,setShowAI]=useState(false);const[showReport,setShowReport]=useState(false);const[showSummary,setShowSummary]=useState(false);const[showAdmin,setShowAdmin]=useState(false);const[showProfile,setShowProfile]=useState(false);const[showLaporan,setShowLaporan]=useState(false);
  const[delegTarget,setDelegTarget]=useState(null);const[expandedId,setExp]=useState(null);const[rejectTexts,setRT]=useState({});const[catatanInput,setCatatanInput]=useState({});const[showMobMenu,setMobMenu]=useState(false);
  const undanganRef=useRef({});

  // Session restore
  useEffect(()=>{try{const s=localStorage.getItem("jp_session");if(s){const d=JSON.parse(s);const u=loadUsers().find(u=>u.username===d.username);if(u)setUser(u);}}catch{}}, []);

  const doLogin=()=>{
    const u=loadUsers().find(u=>u.username===loginForm.username.toLowerCase().trim()&&u.password===loginForm.password);
    if(!u){setLE("Username atau password salah.");return;}
    setUser(u);setTab("jadwal");setLE("");
    try{localStorage.setItem("jp_session",JSON.stringify({username:u.username}));}catch{}
  };
  const doBioLogin=async()=>{
    const un=loginForm.username.toLowerCase().trim();if(!un){setLE("Isi username terlebih dahulu.");return;}
    const u=loadUsers().find(u=>u.username===un);if(!u){setLE("Username tidak ditemukan.");return;}
    if(!bioIsRegistered(un)){setBioErr("Biometrik belum didaftarkan untuk akun ini. Login dengan password terlebih dahulu, lalu daftarkan biometrik di Pengaturan Akun.");return;}
    setBioLoading(true);setBioErr("");
    try{await bioAuthenticate(un);setUser(u);setTab("jadwal");try{localStorage.setItem("jp_session",JSON.stringify({username:un}));}catch{}}
    catch(e){setBioErr("Biometrik gagal: "+e.message);}
    setBioLoading(false);
  };
  const doLogout=()=>{setUser(null);try{localStorage.removeItem("jp_session");}catch{}};

  useEffect(()=>{
    if(SUPA_OK){dbLoadAll().then(rows=>{setEvents(rows&&rows.length>0?rows:seed);setDbReady(true);}).catch(err=>{setDbError(err.message);setEvents(seed);setDbReady(true);});}
    else{setEvents(seed);setDbReady(true);}
  },[]);

  const showT=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};
  const updAndSync=useCallback((id,patch)=>{setEvents(p=>{const next=p.map(e=>e.id===id?{...e,...patch}:e);const ev=next.find(e=>e.id===id);if(ev)dbUpsert(ev).catch(console.error);return next;});},[]);
  const deleteAndSync=useCallback((id)=>{setEvents(p=>{const ev=p.find(e=>e.id===id);if(ev?.sambutanFile&&!ev.sambutanFile.startsWith("data:"))storageDelete("sambutan",ev.sambutanFile).catch(()=>{});if(ev?.undanganFile&&!ev.undanganFile.startsWith("data:"))storageDelete("undangan",ev.undanganFile).catch(()=>{});dbDelete(id).catch(console.error);return p.filter(e=>e.id!==id);});},[]);
  const upd=(id,patch)=>updAndSync(id,patch);

  const handleSambutanUpload=useCallback(async(evId,file,name)=>{
    if(SUPA_OK){const url=await storageUpload("sambutan",evId,file);if(url){updAndSync(evId,{sambutanFile:url,sambutanNama:name});return;}}
    const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsDataURL(file);});updAndSync(evId,{sambutanFile:b64,sambutanNama:name});
  },[updAndSync]);
  const handleUndanganUpload=useCallback(async(evId,file,name)=>{
    if(SUPA_OK){const url=await storageUpload("undangan",evId,file);if(url){updAndSync(evId,{undanganFile:url,undanganNama:name});return;}}
    const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsDataURL(file);});updAndSync(evId,{undanganFile:b64,undanganNama:name});
  },[updAndSync]);

  const getVisible=()=>{
    if(tab==="tayang")return events.filter(e=>e.alur==="disetujui"&&(!filterDate||e.tanggal===filterDate)).sort((a,b)=>(a.tanggal+a.jam).localeCompare(b.tanggal+b.jam));
    let base=events;
    if(role==="walikota")base=events.filter(e=>e.untukPimpinan.includes("walikota")&&e.alur==="disetujui");
    else if(role==="wakilwalikota")base=events.filter(e=>e.alur==="disetujui"&&(e.untukPimpinan.includes("wakilwalikota")||e.delegasiKeWWK));
    else if(role==="ajudan")base=events.filter(e=>e.alur==="disetujui");
    else if(role==="timkom")base=events.filter(e=>e.alur!=="ditolak");
    else if(role==="kasubbag")base=tab==="semua"?events:events.filter(e=>e.alur==="menunggu_kasubbag"||(e.alurHapus&&e.alur==="disetujui"));
    else if(role==="kabag")base=tab==="semua"?events:events.filter(e=>e.alur==="menunggu_kabag"||(e.alurHapus==="menunggu_kabag"));
    if(filterDate)base=base.filter(e=>e.tanggal===filterDate);
    return base.sort((a,b)=>(a.tanggal+a.jam).localeCompare(b.tanggal+b.jam));
  };
  const pendingList=events.filter(e=>{
    if(role==="kasubbag")return e.alur==="menunggu_kasubbag"||(e.alurHapus==="menunggu_kasubbag");if(role==="kabag")return e.alur==="menunggu_kabag"||(e.alurHapus==="menunggu_kabag");
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

  const TH={walikota:{g:"linear-gradient(135deg,"+NAVY+",#1B4080)",a:GOLD},wakilwalikota:{g:"linear-gradient(135deg,#053f2a,#065f46)",a:"#6ee7b7"},ajudan:{g:"linear-gradient(135deg,#1e293b,#334155)",a:"#94a3b8"},timkom:{g:"linear-gradient(135deg,#3730a3,#4f46e5)",a:"#a5b4fc"},staf:{g:"linear-gradient(135deg,"+NAVY+",#1B4080)",a:GOLD},kasubbag:{g:"linear-gradient(135deg,#78350f,#d97706)",a:"#fde68a"},kabag:{g:"linear-gradient(135deg,#064e3b,#10b981)",a:"#6ee7b7"}};
  const th=TH[role]||TH.staf;
  const roleInfo=ALL_ROLE_DEFS.find(r=>r.key===role)||{icon:"circle",label:"",key:""};
  const kabagNama=loadUsers().find(u=>u.role==="kabag")?.nama||"Kabag Protokol & Komunikasi Pimpinan";
  const canReport=ROLES_WITH_REPORT.includes(role);
  const listEvents=getVisible();
  const showForm=tab==="form"&&role==="staf";

  const CSS=`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    html,body{margin:0;padding:0;width:100%;overflow-x:hidden;-webkit-text-size-adjust:100%;background:${NAVY};}
    *{box-sizing:border-box;-webkit-font-smoothing:antialiased;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
    input,select,textarea{font-family:inherit;}
    input[type=text],input[type=password],input[type=date],input[type=time],input[type=email],select,textarea{font-size:14px!important;-webkit-appearance:none;}
    a{-webkit-tap-highlight-color:transparent;color:inherit;}
    ::-webkit-scrollbar{width:5px;height:5px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px;}
    ::-webkit-scrollbar-thumb:hover{background:#94a3b8;}
    @keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
    @keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .nav-btn{transition:all 0.15s ease;border-radius:8px!important;}
    .nav-btn:hover{background:rgba(255,255,255,0.14)!important;opacity:1!important;transform:translateX(2px);}
    .card-row{transition:background 0.1s;}
    .card-row:hover{background:#f5f7ff!important;}
    .btn-primary{transition:all 0.15s ease;}
    .btn-primary:hover{opacity:0.88;transform:translateY(-1px);box-shadow:0 4px 16px rgba(11,37,69,0.25);}
    .btn-primary:active{transform:scale(0.98);opacity:1;}
    .sidebar-link{transition:all 0.15s ease;}
    .sidebar-link:hover{background:rgba(255,255,255,0.12)!important;padding-left:18px!important;}
    table.ev-table{width:100%;border-collapse:collapse;font-size:13.5px;}
    table.ev-table thead th{background:#f1f5f9;color:#475569;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;padding:12px 14px;text-align:left;border-bottom:2px solid #e2e8f0;white-space:nowrap;}
    table.ev-table tbody td{padding:12px 14px;border-bottom:1px solid #f1f5f9;vertical-align:middle;}
    table.ev-table tbody tr:hover td{background:#f5f7ff;}
    table.ev-table tbody tr:last-child td{border-bottom:none;}
    .chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:10.5px;font-weight:700;white-space:nowrap;}
    .chip-wk{background:#EBF0FA;color:${NAVY};}
    .chip-wwk{background:#ecfdf5;color:#065f46;}
    .badge-pill{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;}
    .form-section{background:white;border-radius:14px;padding:24px 28px;box-shadow:0 1px 12px rgba(0,0,0,0.06);border:1px solid #e8ecf0;margin-bottom:16px;}
    .form-section h3{margin:0 0 16px;font-size:15px;font-weight:800;color:${NAVY};}
    .stat-card{border-radius:12px;padding:16px 18px;display:flex;align-items:center;gap:12;}
    .modal-overlay{position:fixed;inset:0;z-index:8100;background:rgba(11,37,69,0.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn 0.15s ease;}
    .modal-box{background:white;border-radius:18px;width:100%;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,0.2);animation:up 0.2s ease;}
    input:focus,select:focus,textarea:focus{outline:none;border-color:${NAVY}!important;box-shadow:0 0 0 3px rgba(11,37,69,0.08);}
    button:focus-visible{outline:2px solid ${GOLD};outline-offset:2px;}
  `;

  // ==================== LOGIN ====================
  if(!user){
    const features=[["Workflow Approval","Staf - Kasubbag - Kabag"],["Analisa AI","Upload undangan, isi otomatis"],["Laporan PDF","Cetak rekap A4 landscape"],["Multi Platform","Desktop, tablet & mobile"]];
    return(
    <div style={{minHeight:"100vh",width:"100%",background:"linear-gradient(160deg,"+NAVY+" 0%,#1B4080 55%,#0d3d2e 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:isMobile?"flex-start":"center",padding:isMobile?"0":"24px",overflowY:"auto"}}>
      <style>{CSS}</style>

      {/* ── MOBILE LAYOUT ── */}
      {isMobile&&<>
        {/* Mobile hero strip */}
        <div style={{width:"100%",background:"rgba(255,255,255,0.06)",backdropFilter:"blur(20px)",padding:"28px 24px 24px",borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
            <img src="/logo_tarakan.png" alt="Logo" style={{height:48,width:"auto",objectFit:"contain",filter:"drop-shadow(0 2px 6px rgba(0,0,0,0.4))",flexShrink:0}} onError={e=>e.target.style.display="none"}/>
            <div>
              <div style={{color:GOLD,fontSize:9,letterSpacing:2,textTransform:"uppercase",fontWeight:700}}>Pemerintah Kota Tarakan</div>
              <div style={{color:"white",fontSize:15,fontWeight:800,lineHeight:1.3}}>Protokol &amp; Komunikasi Pimpinan</div>
            </div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {features.map(([t])=><span key={t} style={{background:"rgba(201,168,76,0.15)",border:"1px solid rgba(201,168,76,0.35)",borderRadius:20,padding:"3px 10px",fontSize:10,color:GOLD,fontWeight:700}}>{t}</span>)}
          </div>
        </div>
        {/* Mobile login card */}
        <div style={{width:"100%",background:"white",flex:1,padding:"28px 24px 36px",display:"flex",flexDirection:"column"}}>
          <div style={{fontSize:20,fontWeight:800,color:NAVY,marginBottom:3}}>Masuk ke Sistem</div>
          <div style={{fontSize:13,color:"#64748b",marginBottom:22}}>Masukkan kredensial akun Anda</div>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:12,color:"#475569",fontWeight:600,marginBottom:5}}>USERNAME</label>
            <input type="text" value={loginForm.username} onChange={e=>setLF(p=>({...p,username:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="Masukkan username" autoCapitalize="none" autoCorrect="off" style={{width:"100%",padding:"13px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",color:"#1e293b",fontSize:15,outline:"none",background:"#f8fafc",boxSizing:"border-box"}}/>
          </div>
          <div style={{marginBottom:8}}>
            <label style={{display:"block",fontSize:12,color:"#475569",fontWeight:600,marginBottom:5}}>PASSWORD</label>
            <div style={{position:"relative"}}>
              <input type={showPass?"text":"password"} value={loginForm.password} onChange={e=>setLF(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="Masukkan password" style={{width:"100%",padding:"13px 44px 13px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",color:"#1e293b",fontSize:15,outline:"none",background:"#f8fafc",boxSizing:"border-box"}}/>
              <button onClick={()=>setShowPass(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#94a3b8",fontSize:18,padding:4}}>{showPass?"👁️":"👁️‍🗨️"}</button>
            </div>
          </div>
          {loginErr&&<div style={{background:"#fee2e2",borderRadius:8,padding:"10px 12px",marginBottom:10,fontSize:13,color:"#991b1b",fontWeight:600}}>{loginErr}</div>}
          {(bioErr||bioLoading)&&<div style={{background:bioLoading?"#f0f9ff":"#fee2e2",borderRadius:8,padding:"10px 12px",marginBottom:10,fontSize:13,color:bioLoading?"#0284c7":"#991b1b",fontWeight:600}}>{bioLoading?"Memverifikasi biometrik...":bioErr}</div>}
          <button onClick={doLogin} style={{width:"100%",padding:"15px",borderRadius:11,border:"none",background:"linear-gradient(135deg,"+NAVY+",#1B4080)",color:"white",cursor:"pointer",fontSize:15,fontWeight:700,marginBottom:10,boxShadow:"0 4px 16px rgba(11,37,69,0.3)"}}>Masuk</button>
          {bioSupported()&&<>
            <button onClick={doBioLogin} disabled={bioLoading} style={{width:"100%",padding:"13px",borderRadius:11,border:"1.5px solid #e2e8f0",background:"white",color:NAVY,cursor:bioLoading?"default":"pointer",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:20}}>🔐</span>{bioLoading?"Memproses...":"Login Biometrik / PIN"}
            </button>
            {loginForm.username&&!bioIsRegistered(loginForm.username.toLowerCase().trim())&&<div style={{background:"#fef9c3",borderRadius:8,padding:"8px 11px",fontSize:12,color:"#92400e",display:"flex",gap:6,alignItems:"flex-start",marginBottom:8}}>
              <span>⚠️</span><span>Biometrik belum aktif. Login dulu lalu aktifkan di <strong>Pengaturan Akun</strong>.</span>
            </div>}
          </>}
          <details style={{marginTop:16}}>
            <summary style={{fontSize:12,color:"#94a3b8",fontWeight:700,letterSpacing:1,cursor:"pointer",userSelect:"none",listStyle:"none",display:"flex",alignItems:"center",gap:6}}>
              <span>&#9660;</span> AKUN DEMO
            </summary>
            <div style={{marginTop:8,padding:"10px 12px",background:"#f8fafc",borderRadius:10,border:"1px solid #e2e8f0"}}>
              {loadUsers().map(u=><div key={u.username} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#64748b",padding:"3px 0",borderBottom:"1px solid #f1f5f9"}}>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{u.jabatan}</span>
                <span style={{color:NAVY,fontFamily:"monospace",flexShrink:0,marginLeft:8,fontWeight:700}}>{u.username}/{u.password}</span>
              </div>)}
            </div>
          </details>
          <div style={{marginTop:"auto",paddingTop:20,textAlign:"center",color:"#cbd5e1",fontSize:10,letterSpacing:1}}>PROTOTYPE v2.0 | 2025</div>
        </div>
      </>}

      {/* ── DESKTOP LAYOUT ── */}
      {!isMobile&&<div style={{width:"100%",maxWidth:960,display:"flex",gap:0,borderRadius:20,overflow:"hidden",boxShadow:"0 32px 80px rgba(0,0,0,0.45)"}}>
        {/* Left panel */}
        <div style={{flex:1,background:"rgba(255,255,255,0.06)",backdropFilter:"blur(20px)",padding:"48px 40px",display:"flex",flexDirection:"column",justifyContent:"space-between",borderRight:"1px solid rgba(255,255,255,0.08)"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:32}}>
              <img src="/logo_tarakan.png" alt="Logo" style={{height:64,width:"auto",objectFit:"contain",filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.4))",flexShrink:0}} onError={e=>e.target.style.display="none"}/>
              <div>
                <div style={{color:GOLD,fontSize:10,letterSpacing:2,textTransform:"uppercase",fontWeight:700,marginBottom:2}}>Pemerintah Kota Tarakan</div>
                <div style={{color:"white",fontSize:18,fontWeight:800,lineHeight:1.25}}>Bagian Protokol &amp;</div>
                <div style={{color:"white",fontSize:18,fontWeight:800}}>Komunikasi Pimpinan</div>
              </div>
            </div>
            <div style={{width:48,height:3,background:GOLD,borderRadius:3,marginBottom:24}}/>
            <div style={{color:"rgba(255,255,255,0.55)",fontSize:14,lineHeight:1.8,marginBottom:32}}>Sistem Informasi Jadwal Kegiatan Pimpinan Daerah Kota Tarakan. Mengelola agenda, approval workflow, dan koordinasi tim protokol secara terpadu.</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {features.map(([t,d])=><div key={t} style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:7,height:7,borderRadius:"50%",background:GOLD,flexShrink:0}}/><div><span style={{color:"white",fontSize:13,fontWeight:600}}>{t}</span><span style={{color:"rgba(255,255,255,0.45)",fontSize:12}}> — {d}</span></div></div>)}
            </div>
          </div>
          <div style={{color:"rgba(255,255,255,0.2)",fontSize:10,letterSpacing:1}}>PROTOTYPE v2.0 | 2025</div>
        </div>
        {/* Right panel */}
        <div style={{width:360,background:"white",padding:"40px 36px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <div style={{fontSize:22,fontWeight:800,color:NAVY,marginBottom:4}}>Masuk ke Sistem</div>
          <div style={{fontSize:13,color:"#64748b",marginBottom:28}}>Masukkan kredensial akun Anda</div>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:12,color:"#475569",fontWeight:600,marginBottom:5}}>USERNAME</label>
            <input type="text" value={loginForm.username} onChange={e=>setLF(p=>({...p,username:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="Masukkan username" autoCapitalize="none" autoCorrect="off" style={{width:"100%",padding:"12px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",color:"#1e293b",fontSize:14,outline:"none",background:"#f8fafc"}}/>
          </div>
          <div style={{marginBottom:6}}>
            <label style={{display:"block",fontSize:12,color:"#475569",fontWeight:600,marginBottom:5}}>PASSWORD</label>
            <div style={{position:"relative"}}>
              <input type={showPass?"text":"password"} value={loginForm.password} onChange={e=>setLF(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="Masukkan password" style={{width:"100%",padding:"12px 44px 12px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",color:"#1e293b",fontSize:14,outline:"none",background:"#f8fafc"}}/>
              <button onClick={()=>setShowPass(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#94a3b8",fontSize:15,padding:4}}>{showPass?"👁️":"👁️‍🗨️"}</button>
            </div>
          </div>
          {loginErr&&<div style={{background:"#fee2e2",borderRadius:8,padding:"9px 12px",marginBottom:10,fontSize:12,color:"#991b1b",fontWeight:600}}>{loginErr}</div>}
          {(bioErr||bioLoading)&&<div style={{background:bioLoading?"#f0f9ff":"#fee2e2",borderRadius:8,padding:"9px 12px",marginBottom:10,fontSize:12,color:bioLoading?"#0284c7":"#991b1b",fontWeight:600}}>{bioLoading?"Memverifikasi biometrik perangkat...":bioErr}</div>}
          <button onClick={doLogin} className="btn-primary" style={{width:"100%",padding:"13px",borderRadius:11,border:"none",background:"linear-gradient(135deg,"+NAVY+",#1B4080)",color:"white",cursor:"pointer",fontSize:14,fontWeight:700,marginBottom:10,boxShadow:"0 4px 16px rgba(11,37,69,0.3)"}}>Masuk</button>
          {bioSupported()&&<>
            <button onClick={doBioLogin} disabled={bioLoading} className="btn-primary" style={{width:"100%",padding:"12px",borderRadius:11,border:"1.5px solid #e2e8f0",background:bioLoading?"#f8fafc":"white",color:NAVY,cursor:bioLoading?"default":"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:18}}>🔐</span>{bioLoading?"Memproses...":"Login dengan Biometrik / PIN"}
            </button>
            {loginForm.username&&!bioIsRegistered(loginForm.username.toLowerCase().trim())&&<div style={{background:"#fef9c3",borderRadius:8,padding:"7px 11px",fontSize:11,color:"#92400e",display:"flex",gap:6,alignItems:"flex-start"}}>
              <span>⚠️</span><span>Biometrik belum aktif untuk akun ini. Login dengan password dulu, lalu aktifkan di menu <strong>Pengaturan Akun</strong>.</span>
            </div>}
          </>}
          <div style={{marginTop:20,padding:"12px 14px",background:"#f8fafc",borderRadius:10,border:"1px solid #e2e8f0"}}>
            <div style={{fontSize:10,color:"#94a3b8",marginBottom:6,fontWeight:700,letterSpacing:1}}>AKUN DEMO</div>
            {loadUsers().map(u=><div key={u.username} style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#64748b",padding:"2px 0",borderBottom:"1px solid #f1f5f9"}}>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{u.jabatan}</span>
              <span style={{color:NAVY,fontFamily:"monospace",flexShrink:0,marginLeft:8,fontWeight:700}}>{u.username}/{u.password}</span>
            </div>)}
          </div>
        </div>
      </div>}
    </div>
  );}

  if(!dbReady)return(
    <div style={{minHeight:"100vh",background:NAVY,display:"flex",alignItems:"center",justifyContent:"center",gap:14,flexDirection:"column"}}><style>{CSS}</style>
      <div style={{width:44,height:44,border:"4px solid rgba(255,255,255,0.15)",borderTopColor:"white",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
      <div style={{color:"white",fontSize:15,fontWeight:700}}>Memuat data...</div>
      {dbError&&<div style={{color:"#fca5a5",fontSize:12,maxWidth:280,textAlign:"center"}}>{dbError}</div>}
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  // ==================== SIDEBAR ====================
  const navGroups=[
    {label:"MENU UTAMA",items:[
      ...(role==="staf"?[{key:"jadwal",icon:"📅",label:"Jadwal Saya"},{key:"form",icon:"✏️",label:"Input Jadwal Baru"}]:[]),
      ...(role==="kasubbag"||role==="kabag"?[{key:"jadwal",icon:"📋",label:"Antrian Approval"},{key:"semua",icon:"🗓️",label:"Semua Jadwal"}]:[]),
      ...(role==="walikota"||role==="wakilwalikota"||role==="ajudan"||role==="timkom"?[{key:"jadwal",icon:"📅",label:"Jadwal Saya"}]:[]),
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

  // ==================== MOBILE HEADER (inline JSX, no inner component) ====================
  const mobTabs=[
      ...(role==="staf"?[{key:"jadwal",label:"Jadwal",icon:"📅"},{key:"form",label:"Input",icon:"✏️"}]:[]),
      ...(role==="kasubbag"||role==="kabag"?[{key:"jadwal",label:"Antrian",icon:"📋"},{key:"semua",label:"Semua",icon:"🗓️"}]:[]),
      ...(role==="walikota"||role==="wakilwalikota"||role==="ajudan"||role==="timkom"?[{key:"jadwal",label:"Jadwal",icon:"📅"}]:[]),
    {key:"tayang",label:"Tayang",icon:"🏛️"},
  ];
  const mobileHeaderJSX=(<>
      {/* Sticky top header */}
      <div style={{background:th.g,position:"sticky",top:0,zIndex:200,boxShadow:"0 2px 16px rgba(0,0,0,0.25)"}}>
        <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
          <img src="/logo_tarakan.png" alt="" style={{height:30,width:"auto",objectFit:"contain",flexShrink:0}} onError={e=>e.target.style.display="none"}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:"white",fontSize:12,fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.nama}</div>
            <div style={{color:"rgba(255,255,255,0.5)",fontSize:9,fontWeight:500}}>{roleInfo.label}</div>
          </div>
          {pendingList.length>0&&<button onClick={goToPending} style={{background:"#ef4444",color:"white",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:800,border:"none",cursor:"pointer",flexShrink:0,boxShadow:"0 2px 8px rgba(239,68,68,0.4)"}}>
            {pendingList.length} pending
          </button>}
          <div style={{width:8,height:8,borderRadius:"50%",background:SUPA_OK?"#34d399":"#f87171",flexShrink:0}}/>
          {/* Hamburger menu */}
          <button onClick={()=>setMobMenu(v=>!v)} style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,color:"white",padding:"6px 9px",cursor:"pointer",fontSize:16,fontWeight:700,flexShrink:0,lineHeight:1}}>
            {showMobMenu?"✕":"☰"}
          </button>
        </div>
        {/* Tab bar */}
        <div style={{display:"flex",borderTop:"1px solid rgba(255,255,255,0.1)",overflowX:"auto",background:"rgba(0,0,0,0.12)"}}>
          {mobTabs.map(t=>(
            <button key={t.key} onClick={()=>{setTab(t.key);if(t.key==="form"){setForm(emptyForm);setEditId(null);}setMobMenu(false);}} style={{padding:"9px 16px",border:"none",cursor:"pointer",background:"transparent",color:"white",fontSize:11,fontWeight:700,borderBottom:tab===t.key?"3px solid "+th.a:"3px solid transparent",opacity:tab===t.key?1:0.5,whiteSpace:"nowrap",flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <span style={{fontSize:14}}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Slide-down menu drawer */}
      {showMobMenu&&<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:190}} onClick={()=>setMobMenu(false)}>
        <div style={{position:"absolute",top:0,left:0,right:0,background:th.g,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",paddingTop:104,paddingBottom:16,animation:"slideDown 0.2s ease"}} onClick={e=>e.stopPropagation()}>
          <div style={{padding:"0 14px 8px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[
              {icon:"💬",label:"Rekap WA",action:()=>{setShowSummary(true);setMobMenu(false);}},
              {icon:"📄",label:"Cetak PDF",action:()=>{setShowReport(true);setMobMenu(false);}},
              ...(canReport?[{icon:"📊",label:"Laporan",action:()=>{setShowLaporan(true);setMobMenu(false);}}]:[]),
              {icon:"👤",label:"Profil/Akun",action:()=>{setShowProfile(true);setMobMenu(false);}},
              ...(role==="kabag"?[{icon:"⚙️",label:"Kelola User",action:()=>{setShowAdmin(true);setMobMenu(false);}}]:[]),
              {icon:"🚪",label:"Keluar",action:()=>doLogout(),danger:true},
            ].map((btn,i)=>(
              <button key={i} onClick={btn.action} style={{padding:"12px 10px",borderRadius:12,border:"1.5px solid "+(btn.danger?"rgba(239,68,68,0.5)":"rgba(255,255,255,0.15)"),background:btn.danger?"rgba(239,68,68,0.15)":"rgba(255,255,255,0.08)",color:btn.danger?"#fca5a5":"white",cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                <span style={{fontSize:18}}>{btn.icon}</span>{btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>}
  </>);

  // ==================== FORM ====================
  // FormView is a top-level component (defined outside App) to prevent re-mount on every keystroke

  // ==================== EVENT CARD (mobile) ====================
  const EventCard=({ev})=>{const exp=expandedId===ev.id;const hariEv=getHari(ev.tanggal);const isToday=ev.tanggal===todayStr();
    return <div id={"ev-"+ev.id} style={{background:"white",borderRadius:12,marginBottom:8,boxShadow:"0 1px 6px rgba(0,0,0,0.07)",border:"1.5px solid "+(ev.alur==="menunggu_kasubbag"||ev.alur==="menunggu_kabag"?"#fde68a":"#e2e8f0"),overflow:"hidden",animation:"up 0.2s ease"}}>
      {ev.catatanPimpinan&&<div style={{background:"#f0f4ff",padding:"5px 12px",fontSize:11,color:"#3730a3",fontWeight:600,borderBottom:"1px solid #e0e7ff"}}>Catatan Pimpinan: {ev.catatanPimpinan}</div>}
      <div onClick={()=>setExp(exp?null:ev.id)} style={{padding:"12px 13px",cursor:"pointer",userSelect:"none"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <div style={{background:isToday?"#EBF0FA":"#f8fafc",borderRadius:8,padding:"5px 7px",textAlign:"center",minWidth:44,flexShrink:0}}>
            <div style={{fontSize:8,color:isToday?NAVY:"#94a3b8",fontWeight:700,textTransform:"uppercase"}}>{hariEv.slice(0,3)}</div>
            <div style={{fontSize:15,fontWeight:900,color:isToday?NAVY:"#334155"}}>{ev.tanggal.slice(8)}</div>
            <div style={{fontSize:9,color:"#94a3b8"}}>{ev.jam}</div>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",marginBottom:4}}>
              <JenisBadge j={ev.jenisKegiatan}/><StatusPill alur={ev.alur} hapus={ev.alurHapus}/>
              {ev.untukPimpinan.includes("walikota")&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:10,background:"#EBF0FA",color:NAVY,fontWeight:700}}>WK</span>}
              {(ev.untukPimpinan.includes("wakilwalikota")||ev.delegasiKeWWK)&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:10,background:"#ecfdf5",color:GREEN,fontWeight:700}}>{ev.delegasiKeWWK?"Deleg.WWK":"WWK"}</span>}
            </div>
            <div style={{fontSize:13,fontWeight:700,color:"#0F2040",lineHeight:1.3,marginBottom:2}}>{ev.namaAcara}</div>
            <div style={{fontSize:11,color:"#64748b"}}>{ev.penyelenggara}{ev.lokasi&&" \u00B7 "+ev.lokasi}</div>
          </div>
          <div style={{color:"#94a3b8",fontSize:14,flexShrink:0,transition:"transform 0.2s",transform:exp?"rotate(180deg)":"none"}}>v</div>
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
            {[{i:"Tgl",l:"Tanggal",v:hariEv+", "+fmt(ev.tanggal)},{i:"Jam",l:"Waktu",v:ev.jam+" WIB"},{i:"Org",l:"Penyelenggara",v:ev.penyelenggara},{i:"Tel",l:"Kontak",v:ev.kontak},{i:"No",l:"Bukti Undangan",v:ev.buktiUndangan},{i:"Bj",l:"Pakaian",v:ev.pakaian},{i:"Ket",l:"Catatan",v:ev.catatan}].filter(f=>f.v).map(f=>(
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
          <SambutanBlock ev={ev} canUpload={role==="timkom"} onUpload={(f,n)=>handleSambutanUpload(ev.id,f,n).then(()=>showT("Sambutan diupload"))} onRemove={()=>{if(ev.sambutanFile&&!ev.sambutanFile.startsWith("data:"))storageDelete("sambutan",ev.sambutanFile).catch(()=>{});updAndSync(ev.id,{sambutanFile:null,sambutanNama:""});}}/>
        </div>}
      </div>

      {/* STAF ACTIONS */}
      {role==="staf"&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
        {ev.alur!=="disetujui"&&<button onClick={()=>{setForm({tanggal:ev.tanggal,jam:ev.jam,namaAcara:ev.namaAcara,penyelenggara:ev.penyelenggara,kontak:ev.kontak||"",buktiUndangan:ev.buktiUndangan||"",pakaian:ev.pakaian,jenisKegiatan:ev.jenisKegiatan,catatan:ev.catatan||"",lokasi:ev.lokasi||"",untukPimpinan:ev.untukPimpinan,undanganFile:ev.undanganFile||null,undanganNama:ev.undanganNama||""});setEditId(ev.id);setTab("form");}} style={{padding:"9px 14px",borderRadius:9,border:"1.5px solid "+NAVY,background:"white",color:NAVY,cursor:"pointer",fontSize:12,fontWeight:700}}>Edit</button>}
        {ev.alur==="draft"&&<button onClick={()=>{upd(ev.id,{alur:"menunggu_kasubbag"});showT("Dikirim ke Kasubbag");}} style={{padding:"9px 14px",borderRadius:9,border:"none",background:NAVY,color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>Kirim ke Kasubbag</button>}
        {ev.alur==="ditolak"&&<><div style={{padding:"8px 12px",background:"#fff7ed",borderRadius:8,fontSize:12,color:"#92400e",flex:1}}>Ditolak: {ev.catatanTolak}</div><button onClick={()=>{upd(ev.id,{alur:"menunggu_kasubbag",catatanTolak:""});showT("Dikirim ulang");}} style={{padding:"9px 14px",borderRadius:9,border:"none",background:"#d97706",color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>Kirim Ulang</button></>}
        {ev.alur==="disetujui"&&!ev.alurHapus&&<button onClick={()=>{upd(ev.id,{alurHapus:"menunggu_kasubbag"});showT("Permintaan hapus dikirim","warn");}} style={{padding:"9px 14px",borderRadius:9,border:"1.5px solid #fca5a5",background:"white",color:"#ef4444",cursor:"pointer",fontSize:12,fontWeight:700}}>Ajukan Pembatalan</button>}
      </div>}

      {/* KASUBBAG */}
      {role==="kasubbag"&&<div style={{display:"flex",flexDirection:"column",gap:7}}>
        {ev.alur==="menunggu_kasubbag"&&!ev.alurHapus&&<><button onClick={()=>{upd(ev.id,{alur:"menunggu_kabag"});showT("Diteruskan ke Kabag");}} style={{padding:"11px",borderRadius:10,border:"none",background:"#10b981",color:"white",cursor:"pointer",fontSize:13,fontWeight:700}}>Verifikasi & Teruskan ke Kabag</button>
          <div style={{borderRadius:10,overflow:"hidden",border:"1.5px solid #fecaca"}}>
            <textarea placeholder="Catatan penolakan..." value={rejectTexts[ev.id]||""} onChange={e=>setRT(p=>({...p,[ev.id]:e.target.value}))} rows={2} style={{width:"100%",padding:"9px 11px",border:"none",resize:"none",color:"#334155",background:"white",fontSize:13}}/>
            <button onClick={()=>{upd(ev.id,{alur:"ditolak",catatanTolak:rejectTexts[ev.id]||""});showT("Dikembalikan","warn");}} style={{width:"100%",padding:"10px",border:"none",background:"#fee2e2",color:"#991b1b",cursor:"pointer",fontSize:12,fontWeight:700}}>Tolak & Kembalikan ke Staf</button>
          </div></>}
        {ev.alurHapus==="menunggu_kasubbag"&&<><div style={{background:"#fff1f2",borderRadius:9,padding:"9px 12px",fontSize:13,color:"#e11d48"}}>Staf mengajukan pembatalan jadwal ini</div>
          <div style={{display:"flex",gap:8}}><button onClick={()=>{upd(ev.id,{alurHapus:"menunggu_kabag"});showT("Diteruskan ke Kabag","warn");}} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:"#e11d48",color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>Setuju ke Kabag</button><button onClick={()=>{upd(ev.id,{alurHapus:null});showT("Ditolak");}} style={{flex:1,padding:"10px",borderRadius:10,border:"1.5px solid #94a3b8",background:"white",color:"#334155",cursor:"pointer",fontSize:12,fontWeight:700}}>Tolak Hapus</button></div></>}
      </div>}

      {/* KABAG */}
      {role==="kabag"&&<div style={{display:"flex",flexDirection:"column",gap:7}}>
        {ev.alur==="menunggu_kabag"&&!ev.alurHapus&&<><button onClick={()=>{upd(ev.id,{alur:"disetujui"});showT("Jadwal disetujui & dipublikasi");}} style={{padding:"11px",borderRadius:10,border:"none",background:NAVY,color:"white",cursor:"pointer",fontSize:13,fontWeight:700}}>Setujui & Publikasi</button>
          <div style={{borderRadius:10,overflow:"hidden",border:"1.5px solid #fecaca"}}>
            <textarea placeholder="Catatan penolakan..." value={rejectTexts[ev.id]||""} onChange={e=>setRT(p=>({...p,[ev.id]:e.target.value}))} rows={2} style={{width:"100%",padding:"9px 11px",border:"none",resize:"none",color:"#334155",background:"white",fontSize:13}}/>
            <button onClick={()=>{upd(ev.id,{alur:"ditolak",catatanTolak:rejectTexts[ev.id]||""});showT("Ditolak","warn");}} style={{width:"100%",padding:"10px",border:"none",background:"#fee2e2",color:"#991b1b",cursor:"pointer",fontSize:12,fontWeight:700}}>Tolak & Kembalikan</button>
          </div></>}
        {ev.alurHapus==="menunggu_kabag"&&<><div style={{background:"#fff1f2",borderRadius:9,padding:"9px 12px",fontSize:13,color:"#e11d48"}}>Permintaan penghapusan (sudah disetujui Kasubbag)</div>
          <div style={{display:"flex",gap:8}}><button onClick={()=>{deleteAndSync(ev.id);setExp(null);showT("Jadwal dihapus");}} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:"#e11d48",color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>Hapus Permanen</button><button onClick={()=>{upd(ev.id,{alurHapus:null});showT("Ditolak");}} style={{flex:1,padding:"10px",borderRadius:10,border:"1.5px solid #94a3b8",background:"white",color:"#334155",cursor:"pointer",fontSize:12,fontWeight:700}}>Tolak Hapus</button></div></>}
      </div>}

      {/* WALI KOTA */}
      {role==="walikota"&&ev.alur==="disetujui"&&ev.untukPimpinan.includes("walikota")&&<div>
        <div style={{fontSize:13,fontWeight:700,color:NAVY,marginBottom:8}}>Konfirmasi Kehadiran</div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>{[{s:"hadir",l:"Hadir",c:GREEN},{s:"tidak_hadir",l:"Tidak Hadir",c:"#991b1b"}].map(({s,l,c})=><button key={s} onClick={()=>{upd(ev.id,{statusWK:s,delegasiKeWWK:false,perwakilanWK:""});showT("Status diperbarui");}} style={{flex:1,padding:"11px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,border:"1.5px solid "+c,background:ev.statusWK===s?c:"white",color:ev.statusWK===s?"white":c}}>{l}</button>)}</div>
        <div style={{background:"#f0fdf4",borderRadius:11,padding:12,border:"1.5px solid #bbf7d0",marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:700,color:GREEN,marginBottom:7}}>Disposisi</div>
          <button onClick={()=>{upd(ev.id,{statusWK:"diwakilkan",delegasiKeWWK:true,perwakilanWK:""});showT("Didelegasi ke Wakil Wali Kota");}} style={{width:"100%",padding:"10px",borderRadius:9,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,marginBottom:6,background:ev.delegasiKeWWK?GREEN:"#d1fae5",color:ev.delegasiKeWWK?"white":GREEN}}>{ev.delegasiKeWWK?"Didelegasi ke Wakil Wali Kota":"Delegasi ke Wakil Wali Kota"}</button>
          {ev.delegasiKeWWK&&<button onClick={()=>{upd(ev.id,{statusWK:null,delegasiKeWWK:false,perwakilanWK:""});showT("Delegasi dibatalkan","warn");}} style={{width:"100%",padding:"8px",borderRadius:9,border:"1.5px solid #fca5a5",background:"white",color:"#e11d48",cursor:"pointer",fontSize:12,fontWeight:700,marginBottom:6}}>Batalkan Delegasi ke WWK</button>}
          <button onClick={()=>setDelegTarget({id:ev.id,side:"wk"})} style={{width:"100%",padding:"9px",borderRadius:9,border:"1.5px solid #94a3b8",background:"white",color:"#334155",cursor:"pointer",fontSize:12}}>Wakilkan ke Pejabat Lain</button>
          {ev.statusWK==="diwakilkan"&&ev.perwakilanWK&&<><div style={{marginTop:6,padding:"5px 10px",background:"#fef3c7",borderRadius:7,fontSize:12,color:"#92400e",fontWeight:600}}>Diwakilkan ke: {ev.perwakilanWK}</div><button onClick={()=>{upd(ev.id,{statusWK:null,perwakilanWK:"",delegasiKeWWK:false});showT("Disposisi dibatalkan","warn");}} style={{marginTop:5,width:"100%",padding:"7px",borderRadius:8,border:"1.5px solid #fca5a5",background:"white",color:"#e11d48",cursor:"pointer",fontSize:11,fontWeight:700}}>Batalkan Disposisi</button></>}
        </div>
        <div><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:4}}>Catatan untuk Tim</label>
          <textarea value={catatanInput[ev.id]!==undefined?catatanInput[ev.id]:(ev.catatanPimpinan||"")} onChange={e=>setCatatanInput(p=>({...p,[ev.id]:e.target.value}))} rows={2} placeholder="Arahan atau permintaan khusus..." style={{width:"100%",padding:"9px 11px",borderRadius:9,border:"1.5px solid #e2e8f0",color:"#1e293b",resize:"none",background:"white",fontSize:13}}/>
          <button onClick={()=>{upd(ev.id,{catatanPimpinan:catatanInput[ev.id]??ev.catatanPimpinan});setCatatanInput(p=>({...p,[ev.id]:undefined}));showT("Catatan disimpan");}} style={{marginTop:6,padding:"8px 16px",borderRadius:8,border:"none",background:NAVY,color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>Simpan Catatan</button>
        </div>
      </div>}

      {/* WAKIL WALI KOTA */}
      {role==="wakilwalikota"&&ev.alur==="disetujui"&&<div>
        <div style={{fontSize:13,fontWeight:700,color:GREEN,marginBottom:8}}>Konfirmasi Kehadiran</div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>{[{s:"hadir",l:"Hadir",c:GREEN},{s:"tidak_hadir",l:"Tidak Hadir",c:"#991b1b"}].map(({s,l,c})=><button key={s} onClick={()=>{upd(ev.id,{statusWWK:s});showT("Status diperbarui");}} style={{flex:1,padding:"11px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,border:"1.5px solid "+c,background:ev.statusWWK===s?c:"white",color:ev.statusWWK===s?"white":c}}>{l}</button>)}</div>
        <div style={{background:"#f8fafc",borderRadius:10,padding:11,border:"1.5px solid #e2e8f0",marginBottom:10}}>
          <div style={{fontSize:12,color:"#64748b",fontWeight:700,marginBottom:6}}>Wakilkan ke Pejabat Lain</div>
          <button onClick={()=>setDelegTarget({id:ev.id,side:"wwk"})} style={{width:"100%",padding:"10px",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:ev.statusWWK==="diwakilkan"?700:500,border:"1.5px solid "+(ev.statusWWK==="diwakilkan"?NAVY:"#94a3b8"),background:ev.statusWWK==="diwakilkan"?"#EBF0FA":"white",color:ev.statusWWK==="diwakilkan"?NAVY:"#334155"}}>{ev.statusWWK==="diwakilkan"&&ev.perwakilanWWK?"Diwakilkan ke: "+ev.perwakilanWWK:"Pilih Pejabat Perwakilan"}</button>
          {ev.statusWWK==="diwakilkan"&&ev.perwakilanWWK&&<button onClick={()=>{upd(ev.id,{statusWWK:null,perwakilanWWK:""});showT("Disposisi dibatalkan","warn");}} style={{marginTop:5,width:"100%",padding:"7px",borderRadius:8,border:"1.5px solid #fca5a5",background:"white",color:"#e11d48",cursor:"pointer",fontSize:11,fontWeight:700}}>Batalkan Disposisi</button>}
        </div>
        <div><label style={{display:"block",fontSize:12,color:"#64748b",fontWeight:600,marginBottom:4}}>Catatan untuk Tim</label>
          <textarea value={catatanInput[ev.id]!==undefined?catatanInput[ev.id]:(ev.catatanPimpinan||"")} onChange={e=>setCatatanInput(p=>({...p,[ev.id]:e.target.value}))} rows={2} placeholder="Arahan..." style={{width:"100%",padding:"9px 11px",borderRadius:9,border:"1.5px solid #e2e8f0",color:"#1e293b",resize:"none",background:"white",fontSize:13}}/>
          <button onClick={()=>{upd(ev.id,{catatanPimpinan:catatanInput[ev.id]??ev.catatanPimpinan});setCatatanInput(p=>({...p,[ev.id]:undefined}));showT("Catatan disimpan");}} style={{marginTop:6,padding:"8px 16px",borderRadius:8,border:"none",background:GREEN,color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>Simpan Catatan</button>
        </div>
      </div>}
    </div>;
  }

  // ==================== MAIN CONTENT ====================
  const pageTitle=tab==="tayang"?"Agenda Kegiatan Pimpinan":tab==="form"?"Input Jadwal Baru":tab==="semua"?"Semua Jadwal":tab==="jadwal"?role==="kasubbag"||role==="kabag"?"Antrian Approval":"Jadwal Saya":"Jadwal";

  const mainContentJSX=(<div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",background:"#F2F4F8",overflow:"hidden"}}>
    {/* Top bar */}
    {!isMobile&&<div style={{background:"white",borderBottom:"1.5px solid #e8ecf0",padding:"14px 32px",display:"flex",alignItems:"center",gap:16,flexShrink:0,boxShadow:"0 1px 6px rgba(0,0,0,0.04)"}}>
      <div style={{flex:1}}>
        <div style={{fontSize:21,fontWeight:800,color:NAVY,letterSpacing:"-0.3px"}}>{pageTitle}</div>
        <div style={{fontSize:12,color:"#64748b",marginTop:1}}>{fmt(todayStr())} | {listEvents.length} kegiatan ditampilkan {SUPA_OK?"| Database: Supabase":"| Mode: Lokal"}</div>
      </div>
      {pendingList.length>0&&<button onClick={goToPending} style={{padding:"9px 16px",borderRadius:9,border:"none",background:"#ef4444",color:"white",cursor:"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
        <span style={{background:"rgba(255,255,255,0.25)",borderRadius:"50%",width:20,height:20,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900}}>{pendingList.length}</span>Pending
      </button>}
      {role==="staf"&&tab==="jadwal"&&<button onClick={()=>{setTab("form");setForm(emptyForm);setEditId(null);}} className="btn-primary" style={{padding:"9px 18px",borderRadius:9,border:"none",background:NAVY,color:"white",cursor:"pointer",fontSize:13,fontWeight:700}}>+ Input Jadwal Baru</button>}
    </div>}
    {/* Filters */}
    {!showForm&&<div style={{background:"white",borderBottom:"1px solid #e8ecf0",padding:"8px "+(isMobile?"12px":"32px"),display:"flex",gap:6,overflowX:"auto",flexShrink:0,alignItems:"center"}}>
      {[{l:"Hari Ini",v:todayStr()},{l:"Besok",v:tomorrowStr()},{l:"Minggu Ini",v:"week"},{l:"Semua",v:""}].map(q=>{const active=(q.v==="week"?filterDate==="week":filterDate===q.v)&&(q.v!==""||filterDate==="");return <button key={q.l} onClick={()=>setFDate(q.v==="week"?"week":q.v)} style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid "+(active?NAVY:"#e2e8f0"),background:active?NAVY:"white",color:active?"white":"#475569",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>{q.l}</button>;})}
      <input type="date" value={filterDate==="week"?"":filterDate} onChange={e=>setFDate(e.target.value)} style={{padding:"4px 10px",borderRadius:20,border:"1.5px solid #e2e8f0",fontSize:11,color:"#475569",background:"white",flexShrink:0}}/>
      {filterDate&&<button onClick={()=>setFDate("")} style={{padding:"5px 9px",borderRadius:20,border:"none",background:"#fee2e2",color:"#991b1b",cursor:"pointer",fontSize:11,fontWeight:700,flexShrink:0}}>x Hapus Filter</button>}
    </div>}
    {/* Content area */}
    <div style={{flex:1,overflowY:"auto",padding:isMobile?"10px 12px 100px":"24px 32px 48px"}}>
      {tab==="tayang"&&!isMobile&&<div style={{background:"linear-gradient(135deg,"+NAVY+",#1B4080)",padding:"16px 20px",borderRadius:14,marginBottom:18,display:"flex",alignItems:"center",gap:14,boxShadow:"0 4px 20px rgba(11,37,69,0.2)"}}>
        <div style={{width:44,height:44,borderRadius:12,background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🏛️</div>
        <div><div style={{fontSize:15,fontWeight:700,color:"white"}}>Agenda Kegiatan Pimpinan yang Telah Disetujui</div><div style={{fontSize:12,color:"rgba(255,255,255,0.65)"}}>{listEvents.length} kegiatan dipublikasikan dan terlihat oleh semua pengguna</div></div>
      </div>}
      {showForm?<FormView form={form} setForm={setForm} editId={editId} setEditId={setEditId} setTab={setTab} isMobile={isMobile} onSubmit={submit} onCancel={()=>{setForm(emptyForm);setEditId(null);setTab("jadwal");}} onOpenAI={()=>setShowAI(true)} onUndanganUpload={handleUndanganUpload} showT={showT}/>:listEvents.length===0?<div style={{textAlign:"center",padding:"60px 20px",color:"#94a3b8",background:"white",borderRadius:12,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}}><div style={{fontSize:48,marginBottom:14}}>Inbox</div><div style={{fontSize:16,fontWeight:600}}>Tidak ada jadwal</div><div style={{fontSize:13,marginTop:4}}>Belum ada data untuk filter yang dipilih</div></div>:
      isMobile?<div>{listEvents.map(ev=><EventCard key={ev.id} ev={ev}/>)}</div>:<TableView evList={listEvents}/>}
    </div>
    {isMobile&&role==="staf"&&tab==="jadwal"&&<button onClick={()=>{setTab("form");setForm(emptyForm);setEditId(null);}} style={{position:"fixed",bottom:24,right:16,width:54,height:54,borderRadius:"50%",background:"linear-gradient(135deg,"+NAVY+",#1B4080)",color:"white",border:"none",fontSize:26,cursor:"pointer",boxShadow:"0 6px 18px rgba(11,37,69,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}} onTouchStart={e=>e.currentTarget.style.transform="scale(0.9)"} onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"}>+</button>}
  </div>);

  // ==================== RENDER ====================
  return <div style={{minHeight:"100vh",width:"100%",background:NAVY,display:"flex"}}>
    <style>{CSS}</style>
    {toast&&<Toast msg={toast.msg} type={toast.type}/>}
    {showAI&&<AIModal onFill={d=>{setForm(p=>({...p,...d}));setShowAI(false);setTab("form");showT("Form terisi dari AI. Periksa sebelum menyimpan.","warn");}} onClose={()=>setShowAI(false)}/>}
    {showReport&&<ReportingModal events={events} kabagNama={kabagNama} onClose={()=>setShowReport(false)}/>}
    {showSummary&&<SummaryModal events={events} onToggleHide={id=>upd(id,{tersembunyi:!events.find(e=>e.id===id)?.tersembunyi})} onClose={()=>setShowSummary(false)}/>}
    {showAdmin&&<AdminModal onClose={()=>{setShowAdmin(false);setUsers(loadUsers());}} showT={showT}/>}
    {showProfile&&<ProfileModal user={user} onClose={updated=>{setShowProfile(false);if(updated)setUser(updated);setUsers(loadUsers());}} showT={showT}/>}
    {showLaporan&&<LaporanModal events={events} kabagNama={kabagNama} onClose={()=>setShowLaporan(false)}/>}
    {delegTarget&&<DelegateModal label={delegTarget.side==="wk"?"Wali Kota":"Wakil Wali Kota"} onConfirm={name=>{if(delegTarget.side==="wk")upd(delegTarget.id,{statusWK:"diwakilkan",perwakilanWK:name,delegasiKeWWK:false});else upd(delegTarget.id,{statusWWK:"diwakilkan",perwakilanWWK:name});setDelegTarget(null);showT("Diwakilkan ke "+name);}} onCancel={()=>setDelegTarget(null)}/>}
    {isMobile?<div style={{width:"100%",minHeight:"100vh",display:"flex",flexDirection:"column",background:"#F2F4F8"}}>{mobileHeaderJSX}{mainContentJSX}</div>:<div style={{width:"100%",minHeight:"100vh",display:"flex",background:NAVY}}>{sidebarJSX}{mainContentJSX}</div>}
  </div>;
}
