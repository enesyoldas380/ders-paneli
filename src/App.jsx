import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

/* -------- YARDIMCILAR (Türkçe ekler) -------- */
const VOWELS = ["a","e","ı","i","o","ö","u","ü"];
const endsWithVowel = (s) => VOWELS.includes(((s||"") ).trim().toLowerCase().slice(-1));
const lastVowel = (s) => {
  const t = (s||"").toLowerCase();
  for (let i = t.length - 1; i >= 0; i--) if (VOWELS.includes(t[i])) return t[i];
  return null;
};
function genitive(name){
  const lv = lastVowel(name) || "e";
  const harmony = (lv==="a"||lv==="ı")?"ın":(lv==="e"||lv==="i")?"in":(lv==="o"||lv==="u")?"un":"ün";
  const needsN = endsWithVowel(name);
  return `${name}’${needsN?"n":""}${harmony}`;
}

const preT = ({ student, day, time, place, topic }) => (
  `Saygıdeğer velimiz, öğrenciniz ${genitive(student)} bu haftaki dersi ${day} günü saat ${time}’te ${place} gerçekleştirilecektir.\n`+
  `Bu hafta işleyeceğimiz konumuz: “${topic}”. Çok teşekkürler.`
);

const postT = ({ student, homework }) => (
  `Saygıdeğer velimiz, ${genitive(student)} bu haftaki ödevi: “${homework}”.\n`+
  `Çok teşekkürler, görüşmek dileğiyle.`
);

/* -------- GİRİŞ -------- */
function Gate({ children }){
  const [ok,setOk] = useState(false);
  const [code,setCode] = useState("");

  useEffect(()=>{ setOk(localStorage.getItem("access_ok")==="1") },[]);

  const submit = (e) => {
    e?.preventDefault();
    const correct = (import.meta.env.VITE_ACCESS_CODE||"2025panel").toString().trim().toLowerCase();
    const typed = (code||"").toString().trim().toLowerCase();
    if(typed===correct){
      localStorage.setItem("access_ok","1");
      setOk(true);
    } else {
      alert("Kod yanlış.\nLütfen yöneticinizden isteyin.");
    }
  };

  if(!ok) return (
    <div className="container mx-auto max-w-md p-6">
      <div className="card p-6 rounded-2xl shadow">
        <h2 className="text-2xl font-bold mb-4">Ders Mesaj Paneli – Giriş</h2>
        <form onSubmit={submit}>
          <label className="label mb-1 block">Erişim Kodu</label>
          <input
            className="input w-full mb-4"
            type="password"
            value={code}
            onChange={(e)=>setCode(e.target.value)}
            placeholder="2025panel"
          />
          <button type="submit" className="btn btn-primary w-full">Giriş</button>
        </form>
      </div>
    </div>
  );

  return <>{children}</>;
}

/* -------- PANEL -------- */
function Panel(){
  const [screen,setScreen] = useState("groups");
  const [loading,setLoading] = useState(false);
  const [groups,setGroups] = useState([]); // {id,name,students:[...]}
  const [activeGroupId,setActiveGroupId] = useState("");
  const activeGroup = useMemo(()=>groups.find(g=>g.id===activeGroupId),[groups,activeGroupId]);

  const [mode,setMode] = useState("pre"); // pre | post

  // Ders sonrası için varsayılan yok; sadece ders öncesi:
  const [defaults,setDefaults] = useState({ day:"Cuma", time:"15:00", place:"Öğrenci evinde", topic:"Namazın önemi" });

  const [newGroupName,setNewGroupName] = useState("");
  // Sınıf alanı kaldırıldı → sadece name + parent_phone
  const [newStudent,setNewStudent] = useState({name:"",parent_phone:""});

  // --- Supabase: Gruplar + öğrenciler ---
  const fetchAll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("groups")
      .select(`
        id, name, created_at,
        students (
          id, name, parent_phone, day, time, place, topic, homework, custom_text, opted_out, created_at
        )
      `)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      alert("Veriler çekilirken hata oluştu.");
    } else {
      setGroups((data||[]).map((g)=>({ ...g, students: g.students || [] })));
      if (!activeGroupId && (data||[])[0]) setActiveGroupId((data)[0].id);
    }
    setLoading(false);
  };

  useEffect(()=>{ fetchAll(); /* eslint-disable-next-line */ },[]);

  // --- Grup ekle/sil ---
  const addGroup = async () => {
    const name = newGroupName.trim();
    if(!name) return;
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
    if(!newStudent.name.trim() || !activeGroupId) return;
    const payload = { ...newStudent, group_id: activeGroupId };
    const { data, error } = await supabase.from("students").insert(payload).select().single();
    if (error) return alert("Öğrenci eklenemedi.");
    setGroups(prev=>prev.map(g=> g.id!==activeGroupId ? g : ({ ...g, students: [ ...(g.students||[]), data ] })));
    setNewStudent({ name:"", parent_phone:"" });
  };

  const deleteStudent = async (sid) => {
    if (!confirm("Bu öğrenciyi silmek istiyor musun?")) return;
    const { error } = await supabase.from("students").delete().eq("id", sid);
    if (error) return alert("Öğrenci silinemedi.");
    setGroups(prev=>prev.map(g=> g.id!==activeGroupId ? g : ({ ...g, students: (g.students||[]).filter(s=>s.id!==sid) })));
  };

  const patchStudent = async (sid, patch) => {
    // Optimistic UI
    setGroups(prev=>prev.map(g=> g.id!==activeGroupId ? g : ({ ...g, students: (g.students||[]).map(s=> s.id===sid ? ({ ...s, ...patch }) : s) }))));
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
    return (
      <div className="container mx-auto p-6">
        <div className="card p-6 rounded-2xl shadow">Yükleniyor…</div>
      </div>
    );
  }

  /* -------- EKRAN 1: GRUPLAR -------- */
  if (screen==="groups"){
    return (
      <div className="container mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Gruplar</h2>

        <div className="grid gap-3 mb-6">
          {groups.map(g=> (
            <div key={g.id} className="card p-4 rounded-xl shadow flex items-center justify-between">
              <div>
                <div className="font-semibold">{g.name}</div>
                <div className="text-sm opacity-70">{(g.students||[]).length} öğrenci</div>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn"
                  onClick={()=>{ setActiveGroupId(g.id); setScreen("groupDetail"); }}
                >Aç</button>
                <button className="btn btn-danger" onClick={()=>deleteGroup(g.id)}>Sil</button>
              </div>
            </div>
          ))}
          {groups.length===0 && (
            <div className="text-sm opacity-70">Henüz grup yok.</div>
          )}
        </div>

        <div className="card p-4 rounded-xl shadow">
          <h3 className="text-lg font-semibold mb-3">Yeni Grup Ekle</h3>
          <label className="label mb-1 block">Grup Adı</label>
          <input
            className="input w-full mb-3"
            value={newGroupName}
            onChange={e=>setNewGroupName(e.target.value)}
            placeholder="Örn: 7A"
          />
          <button className="btn btn-primary" onClick={addGroup}>Ekle</button>
        </div>
      </div>
    );
  }

  /* -------- EKRAN 2: GRUP DETAY -------- */
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">{activeGroup?.name}</h2>
          <div className="text-sm opacity-70">{activeGroup?.students.length||0} öğrenci</div>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={()=>setScreen("groups")}>← Gruplara Dön</button>
          <button className="btn" style={{opacity: mode==="pre"?1:.8}} onClick={()=>setMode("pre")}>Ders Öncesi</button>
          <button className="btn" style={{opacity: mode==="post"?1:.8}} onClick={()=>setMode("post")}>Ders Sonrası</button>
        </div>
      </div>

      {/* DERS ÖNCESİ: Varsayılanlar */}
      {mode==="pre" && (
        <div className="card p-4 rounded-xl shadow mb-6">
          <h3 className="text-lg font-semibold mb-3">Varsayılan Bilgiler (Ders Öncesi)</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="label mb-1 block">Gün</label>
              <input className="input w-full" value={defaults.day} onChange={e=>setDefaults({...defaults,day:e.target.value})} placeholder="Cuma" />
            </div>
            <div>
              <label className="label mb-1 block">Saat</label>
              <input className="input w-full" value={defaults.time} onChange={e=>setDefaults({...defaults,time:e.target.value})} placeholder="15:00" />
            </div>
            <div>
              <label className="label mb-1 block">Yer</label>
              <input className="input w-full" value={defaults.place} onChange={e=>setDefaults({...defaults,place:e.target.value})} placeholder="Öğrenci evinde" />
            </div>
            <div>
              <label className="label mb-1 block">Konu</label>
              <input className="input w-full" value={defaults.topic} onChange={e=>setDefaults({...defaults,topic:e.target.value})} placeholder="Namazın önemi" />
            </div>
          </div>
        </div>
      )}

      {/* Yeni öğrenci ekle */}
      <div className="card p-4 rounded-xl shadow mb-6">
        <h3 className="text-lg font-semibold mb-3">Yeni Öğrenci Ekle</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="label mb-1 block">Ad Soyad</label>
            <input className="input w-full" value={newStudent.name} onChange={e=>setNewStudent({...newStudent,name:e.target.value})} />
          </div>
          <div>
            <label className="label mb-1 block">Veli Telefonu</label>
            <input className="input w-full" value={newStudent.parent_phone} onChange={e=>setNewStudent({...newStudent,parent_phone:e.target.value})} />
          </div>
        </div>
        <div className="mt-3">
          <button className="btn btn-primary" onClick={addStudent} disabled={!activeGroupId}>Ekle</button>
        </div>
      </div>

      {/* Öğrenciler */}
      <div className="card p-4 rounded-xl shadow mb-6">
        <h3 className="text-lg font-semibold mb-3">Öğrenciler</h3>
        <div className="grid gap-4">
          {(activeGroup?.students||[]).map((s)=>(
            <div key={s.id} className="student border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-sm opacity-70">Veli: {s.parent_phone || "—"}</div>
                </div>
                <button className="btn btn-danger" onClick={()=>deleteStudent(s.id)}>Sil</button>
              </div>

              {mode==="pre" ? (
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="label mb-1 block">Gün</label>
                    <input className="input w-full" value={s.day||""} onChange={e=>patchStudent(s.id,{day:e.target.value})} placeholder="(boş=varsayılan)" />
                  </div>
                  <div>
                    <label className="label mb-1 block">Saat</label>
                    <input className="input w-full" value={s.time||""} onChange={e=>patchStudent(s.id,{time:e.target.value})} placeholder="(boş=varsayılan)" />
                  </div>
                  <div>
                    <label className="label mb-1 block">Yer</label>
                    <input className="input w-full" value={s.place||""} onChange={e=>patchStudent(s.id,{place:e.target.value})} placeholder="(boş=varsayılan)" />
                  </div>
                  <div>
                    <label className="label mb-1 block">Konu</label>
                    <input className="input w-full" value={s.topic||""} onChange={e=>patchStudent(s.id,{topic:e.target.value})} placeholder="(boş=varsayılan)" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="label mb-1 block">Ödev</label>
                  <input className="input w-full" value={s.homework||""} onChange={e=>patchStudent(s.id,{homework:e.target.value})} placeholder="Bu haftaki ödev" />
                </div>
              )}

              {/* Veli telefonu düzenleme */}
              <div style={{marginTop:8}}>
                <div className="label">Veli Telefonu</div>
                <input className="input w-full" placeholder="+44..." value={s.parent_phone||""} onChange={e=>patchStudent(s.id,{parent_phone:e.target.value})} />
              </div>

              {/* Önizleme + Kişiye özel metin */}
              <div style={{marginTop:10}}>
                <div className="label">Önizleme</div>
                <div className="preview border rounded p-3 whitespace-pre-wrap">{previews.find(p=>p.id===s.id)?.text || ""}</div>
              </div>

              <div style={{marginTop:8}}>
                <div className="label">Kişiye Özel Düzenle</div>
                <textarea className="textarea w-full" placeholder="Elle mesaj yaz (boşsa otomatik şablon kullanılır)" value={s.custom_text||""} onChange={e=>patchStudent(s.id,{custom_text:e.target.value})} />
                <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:6}}>
                  <button className="btn" onClick={()=>patchStudent(s.id,{custom_text:""})}>Sıfırla</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toplu Önizleme */}
      <div className="card p-4 rounded-xl shadow">
        <h3 className="section-title text-lg font-semibold mb-3">Toplu Önizleme</h3>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              console.log("Toplu gönderim tetiklendi!");
              console.log("Gönderilecek mesajlar:", previews);
              alert("Test: Toplu gönderim simülasyonu çalıştı (henüz gerçek mesaj yok)");
            }}
          >
            Toplu Gönder
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {previews.length===0 && <div style={{color:"var(--muted)"}}>Gönderilecek mesaj yok.</div>}
          {previews.map(p=> (
            <div key={p.id} className="student border rounded-xl p-3">
              <div style={{fontWeight:700,marginBottom:6}}>{p.name}</div>
              <div className="preview whitespace-pre-wrap">{p.text}</div>
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
