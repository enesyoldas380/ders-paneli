import { useEffect, useMemo, useState } from "react";

/* --- Örnek veriler --- */
const INITIAL_GROUPS = [
  { id: "adil", name: "Adil", students: [
    { id: "s1", name: "Ahmet Karkur", grade: "8" },
    { id: "s2", name: "Yiğit", grade: "8" },
  ]},
  { id: "burhan", name: "Burhan", students: [
    { id: "s3", name: "Eymen", grade: "7" },
    { id: "s4", name: "Vefa", grade: "7" },
  ]},
];

/* --- Yardımcılar (Türkçe ekler) --- */
const VOWELS = ["a","e","ı","i","o","ö","u","ü"];
const endsWithVowel = s => VOWELS.includes((s||"").trim().toLowerCase().slice(-1));
const lastVowel = s => { const t=(s||"").toLowerCase(); for(let i=t.length-1;i>=0;i--) if (VOWELS.includes(t[i])) return t[i]; return null; };
function genitive(name){
  const lv = lastVowel(name)||"e";
  const harmony = (lv==="a"||lv==="ı")?"ın":(lv==="e"||lv==="i")?"in":(lv==="o"||lv==="u")?"un":"ün";
  const needsN = endsWithVowel(name);
  return `${name}’${needsN?"n":""}${harmony}`;
}

/* --- Şablonlar --- */
const preT = ({ student, day, time, place, topic }) =>
  `Saygıdeğer velimiz, öğrenciniz ${genitive(student)} bu haftaki dersi ${day} günü saat ${time}’te ${place} gerçekleştirilecektir.\nBu hafta işleyeceğimiz konumuz: “${topic}”.\nÇok teşekkürler.`;
const postT = ({ student, homework }) =>
  `Saygıdeğer velimiz, ${genitive(student)} bu haftaki ödevi: “${homework}”.\nÇok teşekkürler, görüşmek dileğiyle.`;

/* --- Giriş --- */
function Gate({ children }){
  const [ok,setOk]=useState(false); const [code,setCode]=useState("");
  useEffect(()=>{ setOk(localStorage.getItem("access_ok")==="1") },[]);
  const submit=()=>{
    const correct=(import.meta.env.VITE_ACCESS_CODE||"2025panel").toString().trim().toLowerCase();
    const typed=(code||"").toString().trim().toLowerCase();
    if(typed===correct){ localStorage.setItem("access_ok","1"); setOk(true); }
    else alert("Kod yanlış. Lütfen yöneticinizden isteyin.");
  };
  if(!ok) return (
    <div className="app">
      <div className="card" style={{maxWidth:460, margin:"40px auto"}}>
        <h2 className="section-title">Ders Mesaj Paneli – Giriş</h2>
        <div className="label">Erişim Kodu</div>
        <input className="input" placeholder="Örn: 2025panel" value={code} onChange={e=>setCode(e.target.value)} />
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}>
          <button className="btn btn-primary" onClick={submit}>Giriş</button>
        </div>
      </div>
    </div>
  );
  return children;
}

/* --- Ana Panel --- */
function Panel(){
  const [groups,setGroups]=useState(INITIAL_GROUPS);
  const [activeGroupId,setActiveGroupId]=useState(groups[0]?.id||"adil");
  const activeGroup=useMemo(()=>groups.find(g=>g.id===activeGroupId),[groups,activeGroupId]);

  const [mode,setMode]=useState("pre"); // 'pre' | 'post'
  const [defaults,setDefaults]=useState({
    day:"Cuma", time:"15:00", place:"Öğrenci evinde", topic:"Namazın önemi", homework:"Kırk sayfa kitap okuma"
  });

  // öğrenci alanlarını güncelle
  const patchStudent=(sid,patch)=>{
    setGroups(prev=>prev.map(g=>g.id!==activeGroupId?g:{...g,students:g.students.map(s=>s.id===sid?{...s,...patch}:s)}));
  };

  // Mesaj metnini oluştur (kişiye özel varsa onu kullan)
  const buildText = (s) => {
    if (s.customText && s.customText.trim()) return s.customText;
    return mode==="pre"
      ? preT({ student:s.name, day:s.day||defaults.day, time:s.time||defaults.time, place:s.place||defaults.place, topic:s.topic||defaults.topic })
      : postT({ student:s.name, homework:s.homework||defaults.homework });
  };

  const previews=useMemo(()=>{
    if(!activeGroup) return [];
    return activeGroup.students.filter(s=>!s.optedOut).map(s=>({id:s.id,name:s.name,text:buildText(s)}));
  },[activeGroup,defaults,mode]);

  /* --- Grup işlemleri --- */
  const [newGroupName,setNewGroupName]=useState("");
  const slugify=str=>(str||"").toString().trim().toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9\-ğüşöçı]/g,"");
  const addGroup=()=>{
    const name=newGroupName.trim(); if(!name) return;
    const id=slugify(name);
    setGroups(prev=>[...prev,{id,name,students:[]}]); setActiveGroupId(id); setNewGroupName("");
  };
  const deleteGroup=()=>{
    if(!activeGroup) return;
    if(!confirm(`“${activeGroup.name}” grubunu silmek istiyor musun?`)) return;
    setGroups(prev=>prev.filter(g=>g.id!==activeGroupId));
  };

  /* --- Öğrenci işlemleri --- */
  const [newStudent,setNewStudent]=useState({name:"",grade:""});
  const addStudent=()=>{
    if(!newStudent.name.trim()) return;
    const sid="s"+Date.now();
    setGroups(prev=>prev.map(g=>g.id!==activeGroupId?g:{...g,students:[...g.students,{id:sid,...newStudent}]}));
    setNewStudent({name:"",grade:""});
  };
  const deleteStudent=(sid)=>{
    if(!confirm("Bu öğrenciyi silmek istiyor musun?")) return;
    setGroups(prev=>prev.map(g=>g.id!==activeGroupId?g:{...g,students:g.students.filter(s=>s.id!==sid)}));
  };

  if(!activeGroup) return (
    <div className="app" style={{marginTop:16}}>
      <div className="card">
        <h2 className="section-title">Grup ekleyin</h2>
        <div className="label">Yeni Grup Adı</div>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <input className="input" placeholder="Örn: Necdet" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} />
          <button className="btn btn-primary" onClick={addGroup}>Ekle</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app" style={{marginTop:16}}>
      {/* Gruplar */}
      <div className="card" style={{marginBottom:12}}>
        <h2 className="section-title">Gruplar</h2>
        <div className="tabs" style={{marginBottom:12}}>
          {groups.map(g=>(
            <div key={g.id} className={`tab ${g.id===activeGroupId?"active":""}`} onClick={()=>setActiveGroupId(g.id)}>{g.name}</div>
          ))}
        </div>
        <div className="grid grid-3">
          <div>
            <div className="label">Yeni Grup Adı</div>
            <input className="input" placeholder="Örn: Necdet" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} />
          </div>
          <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
            <button className="btn btn-primary" onClick={addGroup}>Grup Ekle</button>
            <button className="btn" style={{borderColor:"#5b1f1f",background:"#190f0f",color:"#ffb4b4"}} onClick={deleteGroup}>Grubu Sil</button>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"flex-end",justifyContent:"flex-end"}}>
            <button className="btn btn-pill" onClick={()=>setMode("pre")} style={{opacity: mode==="pre"?1:.8}}>Ders Öncesi</button>
            <button className="btn btn-pill" onClick={()=>setMode("post")} style={{opacity: mode==="post"?1:.8}}>Ders Sonrası</button>
          </div>
        </div>
      </div>

      {/* Varsayılan Bilgiler */}
      <div className="card" style={{marginBottom:12}}>
        <h3 className="section-title">Varsayılan Bilgiler ({mode==="pre"?"Ders Öncesi":"Ders Sonrası"})</h3>
        {mode==="pre" ? (
          <div className="grid grid-4">
            <div><div className="label">Gün</div><input className="input" value={defaults.day} onChange={e=>setDefaults({...defaults,day:e.target.value})} placeholder="Cuma" /></div>
            <div><div className="label">Saat</div><input className="input" value={defaults.time} onChange={e=>setDefaults({...defaults,time:e.target.value})} placeholder="15:00" /></div>
            <div><div className="label">Yer</div><input className="input" value={defaults.place} onChange={e=>setDefaults({...defaults,place:e.target.value})} placeholder="Öğrenci evinde" /></div>
            <div><div className="label">Konu</div><input className="input" value={defaults.topic} onChange={e=>setDefaults({...defaults,topic:e.target.value})} placeholder="Namazın önemi" /></div>
          </div>
        ) : (
          <div>
            <div className="label">Ödev</div>
            <textarea className="textarea" value={defaults.homework} onChange={e=>setDefaults({...defaults,homework:e.target.value})} placeholder="Kırk sayfa kitap okuma" />
          </div>
        )}
      </div>

      {/* Yeni öğrenci ekleme */}
      <div className="card" style={{marginBottom:12}}>
        <h3 className="section-title">Yeni Öğrenci Ekle</h3>
        <div className="grid grid-3">
          <div><div className="label">Ad Soyad</div>
            <input className="input" value={newStudent.name} onChange={e=>setNewStudent({...newStudent,name:e.target.value})} />
          </div>
          <div><div className="label">Sınıf</div>
            <input className="input" value={newStudent.grade} onChange={e=>setNewStudent({...newStudent,grade:e.target.value})} />
          </div>
          <div style={{display:"flex",alignItems:"flex-end"}}>
            <button className="btn btn-primary" onClick={addStudent}>Ekle</button>
          </div>
        </div>
      </div>

      {/* Öğrenciler */}
      <div className="card" style={{marginBottom:12}}>
        <h3 className="section-title">Öğrenciler</h3>
        <div className="grid">
          {(activeGroup?.students||[]).map(s=>(
            <div key={s.id} className="student">
              <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
                <div>
                  <div style={{fontWeight:700}}>{s.name}</div>
                  <div style={{color:"var(--muted)",fontSize:12}}>Sınıf: {s.grade||"—"}</div>
                </div>
                <button className="btn" onClick={()=>deleteStudent(s.id)}>Sil</button>
              </div>

              {/* Kişiye özel alanlar (isteğe bağlı) */}
              {mode==="pre" ? (
                <div className="grid grid-3" style={{marginTop:8}}>
                  <div><div className="label">Gün</div><input className="input" value={s.day||""} onChange={e=>patchStudent(s.id,{day:e.target.value})} placeholder="(boş=varsayılan)" /></div>
                  <div><div className="label">Saat</div><input className="input" value={s.time||""} onChange={e=>patchStudent(s.id,{time:e.target.value})} placeholder="(boş=varsayılan)" /></div>
                  <div><div className="label">Yer</div><input className="input" value={s.place||""} onChange={e=>patchStudent(s.id,{place:e.target.value})} placeholder="(boş=varsayılan)" /></div>
                  <div style={{gridColumn:"1 / -1"}}><div className="label">Konu</div><input className="input" value={s.topic||""} onChange={e=>patchStudent(s.id,{topic:e.target.value})} placeholder="(boş=varsayılan)" /></div>
                </div>
              ) : (
                <div style={{marginTop:8}}>
                  <div className="label">Ödev</div>
                  <textarea className="textarea" value={s.homework||""} onChange={e=>patchStudent(s.id,{homework:e.target.value})} placeholder="(boş=varsayılan)" />
                </div>
              )}

              {/* Önizleme + Kişiye özel metin */}
              <div style={{marginTop:10}}>
                <div className="label">Önizleme</div>
                <div className="preview">{buildText(s)}</div>
              </div>
              <div style={{marginTop:8}}>
                <div className="label">Kişiye Özel Düzenle</div>
                <textarea className="textarea" placeholder="Elle mesaj yaz (boşsa otomatik şablon kullanılır)" value={s.customText||""} onChange={e=>patchStudent(s.id,{customText:e.target.value})}/>
                <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:6}}>
                  <button className="btn" onClick={()=>patchStudent(s.id,{customText:""})}>Sıfırla</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toplu Önizleme & Gönder */}
      <div className="card">
        <h3 className="section-title">Toplu Önizleme & Gönder</h3>
        <div className="grid">
          {previews.length===0 && <div style={{color:"var(--muted)"}}>Gönderilecek mesaj yok.</div>}
          {previews.map(p=>(
            <div key={p.id} className="student">
              <div style={{fontWeight:700,marginBottom:6}}>{p.name}</div>
              <div className="preview">{p.text}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}>
          <button className="btn btn-primary" onClick={()=>alert(`${previews.length} mesaj hazır (DEMO)`)}>Şimdi Gönder (DEMO)</button>
        </div>
      </div>
    </div>
  );
}

/* --- Uygulama --- */
export default function App(){
  return (
    <Gate>
      <Panel />
    </Gate>
  );
}
