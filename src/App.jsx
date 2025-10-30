import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

/* -------- YARDIMCILAR (Türkçe ekler) -------- */
const VOWELS = ["a","e","ı","i","o","ö","u","ü"];
const endsWithVowel = s => VOWELS.includes((s||"").trim().toLowerCase().slice(-1));
const lastVowel = s => { const t=(s||"").toLowerCase(); for(let i=t.length-1;i>=0;i--) if(VOWELS.includes(t[i])) return t[i]; return null; };
function genitive(name){
  const lv = lastVowel(name)||"e";
  const harmony = (lv==="a"||lv==="ı")?"ın":(lv==="e"||lv==="i")?"in":(lv==="o"||lv==="u")?"un":"ün";
  const needsN = endsWithVowel(name);
  return `${name}’${needsN?"n":""}${harmony}`;
}

const preT = ({ student, day, time, place, topic }) =>
  `Saygıdeğer velimiz, öğrenciniz ${genitive(student)} bu haftaki dersi ${day} günü saat ${time}’te ${place} gerçekleştirilecektir.
Bu hafta işleyeceğimiz konumuz: “${topic}”.
Çok teşekkürler.`;

const postT = ({ student, homework }) =>
  `Saygıdeğer velimiz, ${genitive(student)} bu haftaki ödevi: “${homework}”.
Çok teşekkürler, görüşmek dileğiyle.`;

/* -------- GİRİŞ -------- */
function Gate({ children }){
  const [ok,setOk]=useState(false); const [code,setCode]=useState("");
  useEffect(()=>{ setOk(localStorage.getItem("access_ok")==="1") },[]);
  const submit=()=>{
    const correct=(import.meta.env.VITE_ACCESS_CODE||"2025panel").toString().trim().toLowerCase();
    const typed=(code||"").toString().trim().toLowerCase();
    if(typed===correct){ localStorage.setItem("access_ok","1"); setOk(true) }
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

/* -------- PANEL -------- */
function Panel(){
  const [screen,setScreen]=useState("groups"); // "groups" | "groupDetail"
  const [loading,setLoading]=useState(false);
  const [groups,setGroups]=useState([]);           // {id,name,students:[...]}
  const [activeGroupId,setActiveGroupId]=useState("");
  const activeGroup=useMemo(()=>groups.find(g=>g.id===activeGroupId),[groups,activeGroupId]);

  const [mode,setMode]=useState("pre"); // pre | post
  // Ders sonrası için varsayılan yok; sadece ders öncesi:
  const [defaults,setDefaults]=useState({ day:"Cuma", time:"15:00", place:"Öğrenci evinde", topic:"Namazın önemi" });

  const [newGroupName,setNewGroupName]=useState("");
  // Sınıf alanı kaldırıldı → sadece name + parent_phone
  const [newStudent,setNewStudent]=useState({name:"",parent_phone:""});

  // --- Supabase: Gruplar + öğrenciler ---
  const fetchAll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("groups")
      .select(`
        id, name, created_at,
        students (
          id, name, parent_phone,
          day, time, place, topic, homework, custom_text, opted_out,
          created_at
        )
      `)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      alert("Veriler çekilirken hata oluştu.");
    } else {
      setGroups((data||[]).map(g=>({ ...g, students: g.students || [] })));
      if (!activeGroupId && (data||[])[0]) setActiveGroupId((data||[])[0].id);
    }
    setLoading(false);
  };
  useEffect(()=>{ fetchAll(); /* eslint-disable-next-line */ },[]);

  // --- Grup ekle/sil ---
  const addGroup = async () => {
    const name = newGroupName.trim(); if(!name) return;
    const { data, error } = await supabase.from("groups").insert({ name }).select().single();
    if (error) return alert("Grup eklenemedi.");
    setGroups(prev=>[...prev, { ...data, students: [] }]);
    setNewGroupName("");
  };
  const deleteGroup = async (id) => {
    if(!confirm("Bu grubu silmek istiyor musun?")) return;
    const { error } = await supabase.from("groups").delete().eq("id", id);
    if (error) return alert("Grup silinemedi.");
    setGroups(prev=>prev.filter(g=>g.id!==id));
    if (id===activeGroupId) setActiveGroupId("");
  };

  // --- Öğrenci ekle/sil/güncelle ---
  const addStudent = async () => {
    if(!newStudent.name.trim()) return;
    const payload = { ...newStudent, group_id: activeGroupId };
    const { data, error } = await supabase.from("students").insert(payload).select().single();
    if (error) return alert("Öğrenci eklenemedi.");
    setGroups(prev=>prev.map(g=> g.id!==activeGroupId ? g : ({ ...g, students: [...g.students, data] })));
    setNewStudent({ name:"", parent_phone:"" });
  };
  const deleteStudent = async (sid) => {
    if (!confirm("Bu öğrenciyi silmek istiyor musun?")) return;
    const { error } = await supabase.from("students").delete().eq("id", sid);
    if (error) return alert("Öğrenci silinemedi.");
    setGroups(prev=>prev.map(g=> g.id!==activeGroupId ? g : ({ ...g, students: g.students.filter(s=>s.id!==sid) })));
  };
  const patchStudent = async (sid, patch) => {
    // Optimistic UI
    setGroups(prev=>prev.map(g=> g.id!==activeGroupId ? g : ({
      ...g, students: g.students.map(s=> s.id===sid ? ({ ...s, ...patch }) : s)
    })));
    const { error } = await supabase.from("students").update(patch).eq("id", sid);
    if (error) console.error(error);
  };

  // Mesaj üretimi
  const buildText = (s) => {
    if (s.custom_text && s.custom_text.trim()) return s.custom_text;
    return mode==="pre"
      ? preT({ student:s.name, day:s.day||defaults.day, time:s.time||defaults.time, place:s.place||defaults.place, topic:s.topic||defaults.topic })
      : postT({ student:s.name, homework:(s.homework?.trim() || "—") });
  };
  const previews = useMemo(()=>{
    if(!activeGroup) return [];
    return (activeGroup.students||[]).filter(s=>!s.opted_out).map(s=>({ id:s.id, name:s.name, text:buildText(s) }));
  },[activeGroup,defaults,mode]);

  if (loading) {
    return <div className="app"><div className="card">Yükleniyor…</div></div>;
  }

  /* -------- EKRAN 1: GRUPLAR -------- */
  if (screen==="groups"){
    return (
      <div className="app" style={{marginTop:16}}>
        <div className="card" style={{marginBottom:12}}>
          <h2 className="section-title">Gruplar</h2>

          <div className="grid">
            {groups.map(g=>(
              <div key={g.id} className="student" style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:700}}>{g.name}</div>
                  <div style={{color:"var(--muted)", fontSize:12}}>
                    {(g.students||[]).length} öğrenci
                  </div>
                </div>
                <div style={{display:"flex", gap:8}}>
                  <button className="btn btn-primary" onClick={()=>{ setActiveGroupId(g.id); setScreen("groupDetail"); }}>
                    Aç
                  </button>
                  <button className="btn" onClick={()=>deleteGroup(g.id)}>Sil</button>
                </div>
              </div>
            ))}
            {groups.length===0 && <div style={{color:"var(--muted)"}}>Henüz grup yok.</div>}
          </div>

          <div style={{marginTop:12}}>
            <h3 className="section-title">Yeni Grup Ekle</h3>
            <div className="grid grid-3">
              <div>
                <div className="label">Grup Adı</div>
                <input className="input" placeholder="Örn: Necdet" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} />
              </div>
              <div style={{display:"flex", alignItems:"flex-end"}}>
                <button className="btn btn-primary" onClick={addGroup}>Ekle</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* -------- EKRAN 2: GRUP DETAY -------- */
  return (
    <div className="app" style={{marginTop:16}}>
      <div className="card" style={{marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <h2 className="section-title" style={{marginBottom:4}}>{activeGroup?.name}</h2>
          <div style={{color:"var(--muted)", fontSize:12}}>{activeGroup?.students.length||0} öğrenci</div>
        </div>
        <div style={{display:"flex", gap:8}}>
          <button className="btn" onClick={()=>setScreen("groups")}>← Gruplara Dön</button>
          <button className="btn btn-pill" onClick={()=>setMode("pre")} style={{opacity: mode==="pre"?1:.8}}>Ders Öncesi</button>
          <button className="btn btn-pill" onClick={()=>setMode("post")} style={{opacity: mode==="post"?1:.8}}>Ders Sonrası</button>
        </div>
      </div>

      {/* DERS ÖNCESİ: Varsayılanlar */}
      {mode==="pre" && (
        <div className="card" style={{marginBottom:12}}>
          <h3 className="section-title">Varsayılan Bilgiler (Ders Öncesi)</h3>
          <div className="grid grid-4">
            <div><div className="label">Gün</div><input className="input" value={defaults.day} onChange={e=>setDefaults({...defaults,day:e.target.value})} placeholder="Cuma" /></div>
            <div><div className="label">Saat</div><input className="input" value={defaults.time} onChange={e=>setDefaults({...defaults,time:e.target.value})} placeholder="15:00" /></div>
            <div><div className="label">Yer</div><input className="input" value={defaults.place} onChange={e=>setDefaults({...defaults,place:e.target.value})} placeholder="Öğrenci evinde" /></div>
            <div><div className="label">Konu</div><input className="input" value={defaults.topic} onChange={e=>setDefaults({...defaults,topic:e.target.value})} placeholder="Namazın önemi" /></div>
          </div>
        </div>
      )}

      {/* Yeni öğrenci ekle (artık sadece Ad Soyad + Veli Telefonu) */}
      <div className="card" style={{marginBottom:12}}>
        <h3 className="section-title">Yeni Öğrenci Ekle</h3>
        <div className="grid grid-3">
          <div><div className="label">Ad Soyad</div>
            <input className="input" value={newStudent.name} onChange={e=>setNewStudent({...newStudent,name:e.target.value})} />
          </div>
          <div><div className="label">Veli Telefonu</div>
            <input className="input" placeholder="+44..." value={newStudent.parent_phone} onChange={e=>setNewStudent({...newStudent,parent_phone:e.target.value})} />
          </div>
          <div style={{display:"flex", alignItems:"flex-end"}}>
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
                  <div style={{color:"var(--muted)",fontSize:12, marginTop:4}}>Veli: {s.parent_phone || "—"}</div>
                </div>
                <button className="btn" onClick={()=>deleteStudent(s.id)}>Sil</button>
              </div>

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
                  <textarea className="textarea" value={s.homework||""} onChange={e=>patchStudent(s.id,{homework:e.target.value})} placeholder="Bu haftaki ödev" />
                </div>
              )}

              {/* Veli telefonu düzenleme */}
              <div style={{marginTop:8}}>
                <div className="label">Veli Telefonu</div>
                <input className="input" placeholder="+44..." value={s.parent_phone||""} onChange={e=>patchStudent(s.id,{parent_phone:e.target.value})} />
              </div>

              {/* Önizleme + Kişiye özel metin */}
              <div style={{marginTop:10}}>
                <div className="label">Önizleme</div>
                <div className="preview">
                  {previews.find(p=>p.id===s.id)?.text || ""}
                </div>
              </div>
              <div style={{marginTop:8}}>
                <div className="label">Kişiye Özel Düzenle</div>
                <textarea className="textarea" placeholder="Elle mesaj yaz (boşsa otomatik şablon kullanılır)" value={s.custom_text||""} onChange={e=>patchStudent(s.id,{custom_text:e.target.value})}/>
                <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:6}}>
                  <button className="btn" onClick={()=>patchStudent(s.id,{custom_text:""})}>Sıfırla</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toplu Önizleme */}
      <div className="card">
        <h3 className="section-title">Toplu Önizleme</h3>
        <div className="grid">
          {previews.length===0 && <div style={{color:"var(--muted)"}}>Gönderilecek mesaj yok.</div>}
          {previews.map(p=>(
            <div key={p.id} className="student">
              <div style={{fontWeight:700,marginBottom:6}}>{p.name}</div>
              <div className="preview">{p.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------- UYGULAMA -------- */
export default function App(){
  return (
    <Gate>
      <Panel />
    </Gate>
  );
}
