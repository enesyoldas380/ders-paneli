import { useMemo, useState, useEffect } from 'react'

/* ---------- Örnek veri ---------- */
const INITIAL_GROUPS = [
  { id: 'adil', name: 'Adil', students: [
    { id: 's1',  name: 'Ahmet Karkur', grade: '8' },
    { id: 's2',  name: 'Yiğit',        grade: '8' },
    { id: 's3',  name: 'Nusret',       grade: '7' },
    { id: 's4',  name: 'Orhan',        grade: '7' },
  ]},
  { id: 'burhan', name: 'Burhan', students: [
    { id: 's5',  name: 'Eymen', grade: '7' },
    { id: 's6',  name: 'Vefa',  grade: '7' },
    { id: 's7',  name: 'Metin', grade: '7' },
  ]},
  { id: 'necdet', name: 'Necdet', students: [
    { id: 's8',  name: 'Bünyamin', grade: '8' },
    { id: 's9',  name: 'Cevdet',   grade: '8' },
  ]},
  { id: 'mehmet-akif', name: 'Mehmet Akif', students: [
    { id: 's10', name: 'Halil İbrahim', grade: '9'  },
    { id: 's11', name: 'Emrullah',      grade: '11' },
    { id: 's12', name: 'Burhan',        grade: '11' },
    { id: 's13', name: 'Necdet',        grade: '12' },
    { id: 's14', name: 'Ahmet Eser',    grade: '11' },
    { id: 's15', name: 'Ümit',          grade: '11' },
    { id: 's16', name: 'Yahya',         grade: '11' },
  ]},
  { id: 'enes', name: 'Enes', students: [
    { id: 's17', name: 'Oğuzhan', grade: '12' },
    { id: 's18', name: 'Murat',   grade: 'üniversite' },
    { id: 's19', name: 'Ahmet K', grade: '12' },
    { id: 's20', name: 'Ahmet',   grade: '12' },
    { id: 's21', name: 'Adil',    grade: '12' },
  ]},
];

/* ---------- Mesaj şablonları ---------- */
const preT = ({ student, day, time, place, topic }) =>
  `Saygıdeğer velimiz, öğrenciniz “${student}”nin bu haftaki dersi “${day}” günü saat “${time}”te “${place}” gerçekleştirilecektir.\nBu hafta işleyeceğimiz konumuz: “${topic}”.\nÇok teşekkürler.`;
const postT = ({ student, homework }) =>
  `Saygıdeğer velimiz, “${student}”nin bu haftaki ödevi: “${homework}”.\nÇok teşekkürler, görüşmek dileğiyle.`;

/* ---------- Giriş (şifre) bileşeni ---------- */
function Gate({ children }) {
  const [authorized, setAuthorized] = useState(false);
  const [code, setCode] = useState("");

  useEffect(()=>{ setAuthorized(localStorage.getItem('access_ok') === '1') },[]);

  const submit = () => {
    const correct = (import.meta.env.VITE_ACCESS_CODE || '2025panel').toString().trim().toLowerCase();
    const typed   = (code || '').toString().trim().toLowerCase();
    if (typed === correct) {
      localStorage.setItem('access_ok','1'); setAuthorized(true);
    } else alert("Kod yanlış. Lütfen yöneticinizden isteyin.");
  };

  if (!authorized) {
    return (
      <div className="app">
        <div className="topbar"><div className="topbar-inner">
          <div className="brand">
            <div className="brand-logo"></div>
            <div className="brand-title">Ders Mesaj Paneli</div>
          </div>
        </div></div>

        <div style="height:20px"></div>

        <div className="card" style={{maxWidth:460, margin:"40px auto"}}>
          <h2 className="section-title">Erişim Kodu</h2>
          <div className="label">Kod</div>
          <input className="input" placeholder="Örn: 2025panel" value={code} onChange={e=>setCode(e.target.value)} />
          <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:12}}>
            <button className="btn btn-primary" onClick={submit}>Giriş</button>
          </div>
          <div style={{color:'var(--muted)', fontSize:12, marginTop:10}}>Cihaz bir kez doğrulanınca hatırlar.</div>
        </div>
      </div>
    );
  }
  return children;
}

/* ---------- Panel ---------- */
function Panel() {
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  const [activeGroupId, setActiveGroupId] = useState(groups[0]?.id || '');
  const activeGroup = useMemo(()=>groups.find(g=>g.id===activeGroupId),[groups,activeGroupId]);

  const [mode, setMode] = useState('pre'); // 'pre' | 'post'
  const [groupDefaults, setGroupDefaults] = useState({ day:'', time:'', place:'', topic:'', homework:'' });

  const patchStudent = (sid, patch) => {
    setGroups(prev => prev.map(g => g.id!==activeGroupId ? g : {
      ...g, students: g.students.map(s => s.id===sid ? {...s, ...patch} : s)
    }));
  };

  const previews = useMemo(()=>{
    if(!activeGroup) return [];
    return activeGroup.students
      .filter(s => !s.optedOut)
      .map(s=>{
        const day = s.day || groupDefaults.day || '(gün yok)';
        const time = s.time || groupDefaults.time || '(saat yok)';
        const place = s.place || groupDefaults.place || '(yer yok)';
        const topic = s.topic || groupDefaults.topic || '(konu yok)';
        const homework = s.homework || groupDefaults.homework || '(ödev yok)';
        const text = mode==='pre'
          ? preT({ student:s.name, day, time, place, topic })
          : postT({ student:s.name, homework });
        return { id: s.id, name: s.name, text };
      });
  },[activeGroup, groupDefaults, mode]);

  const sendAll = () => {
    alert(`${previews.length} mesaj hazır (DEMO). Gerçek gönderim için backend eklenecek.`);
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-logo"></div>
            <div className="brand-title">Ders Mesaj Paneli</div>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button className="btn btn-pill" onClick={()=>setMode('pre')} style={{borderColor: mode==='pre'?'transparent':'var(--border)', background: mode==='pre'?'linear-gradient(90deg, rgba(34,211,238,.25), rgba(59,130,246,.2))':''}}>Ders Öncesi</button>
            <button className="btn btn-pill" onClick={()=>setMode('post')} style={{borderColor: mode==='post'?'transparent':'var(--border)', background: mode==='post'?'linear-gradient(90deg, rgba(34,211,238,.25), rgba(59,130,246,.2))':''}}>Ders Sonrası</button>
          </div>
        </div>
      </div>

      <div className="app" style={{marginTop:16}}>
        {/* Gruplar */}
        <div className="card" style={{marginBottom:12}}>
          <h2 className="section-title">Gruplar</h2>
          <div className="tabs">
            {groups.map(g=>(
              <div key={g.id}
                   className={`tab ${g.id===activeGroupId?'active':''}`}
                   onClick={()=>setActiveGroupId(g.id)}>{g.name}</div>
            ))}
          </div>
        </div>

        {/* Grup Varsayılanları */}
        <div className="card" style={{marginBottom:12}}>
          <h3 className="section-title">Varsayılan Bilgiler ({mode==='pre'?'Ders Öncesi':'Ders Sonrası'})</h3>

          {mode==='pre' ? (
            <div className="grid grid-4">
              <div>
                <div className="label">Gün</div>
                <input className="input" placeholder="Cuma" value={groupDefaults.day} onChange={e=>setGroupDefaults({...groupDefaults, day:e.target.value})}/>
              </div>
              <div>
                <div className="label">Saat</div>
                <input className="input" placeholder="15:00" value={groupDefaults.time} onChange={e=>setGroupDefaults({...groupDefaults, time:e.target.value})}/>
              </div>
              <div>
                <div className="label">Yer</div>
                <input className="input" placeholder="Öğrenci evinde" value={groupDefaults.place} onChange={e=>setGroupDefaults({...groupDefaults, place:e.target.value})}/>
              </div>
              <div>
                <div className="label">Konu</div>
                <input className="input" placeholder="Namazın önemi" value={groupDefaults.topic} onChange={e=>setGroupDefaults({...groupDefaults, topic:e.target.value})}/>
              </div>
            </div>
          ) : (
            <div>
              <div className="label">Ödev</div>
              <textarea className="textarea" placeholder="Kırk sayfa kitap okuma" value={groupDefaults.homework} onChange={e=>setGroupDefaults({...groupDefaults, homework:e.target.value})}/>
            </div>
          )}
        </div>

        {/* Öğrenciler */}
        <div className="card" style={{marginBottom:12}}>
          <h3 className="section-title">Öğrenciler</h3>
          <div className="grid">
            {(activeGroup?.students || []).map(s=>(
              <div key={s.id} className="student">
                <div style={{display:'grid', gap:10, gridTemplateColumns:'1fr 1fr', alignItems:'start'}}>
                  <div>
                    <div style={{fontWeight:700}}>{s.name}</div>
                    <div style={{color:'var(--muted)', fontSize:12, marginTop:2}}>Sınıf: {s.grade || '—'}</div>
                    <label className="switch" style={{marginTop:8}}>
                      <input type="checkbox" checked={!s.optedOut} onChange={e=>patchStudent(s.id,{ optedOut: !e.target.checked })}/>
                      <span>{s.optedOut ? 'Bu hafta gönderme' : 'Bu hafta gönder'}</span>
                    </label>
                  </div>

                  {mode==='pre' ? (
                    <div className="grid grid-3">
                      <div>
                        <div className="label">Gün</div>
                        <input className="input" value={s.day||''} onChange={e=>patchStudent(s.id,{day:e.target.value})} placeholder="(boş)"/>
                      </div>
                      <div>
                        <div className="label">Saat</div>
                        <input className="input" value={s.time||''} onChange={e=>patchStudent(s.id,{time:e.target.value})} placeholder="(boş)"/>
                      </div>
                      <div>
                        <div className="label">Yer</div>
                        <input className="input" value={s.place||''} onChange={e=>patchStudent(s.id,{place:e.target.value})} placeholder="(boş)"/>
                      </div>
                      <div style={{gridColumn:'1 / -1'}}>
                        <div className="label">Konu</div>
                        <input className="input" value={s.topic||''} onChange={e=>patchStudent(s.id,{topic:e.target.value})} placeholder="(boş)"/>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="label">Ödev</div>
                      <textarea className="textarea" value={s.homework||''} onChange={e=>patchStudent(s.id,{homework:e.target.value})} placeholder="(boş)"/>
                    </div>
                  )}
                </div>

                <div style={{marginTop:10}}>
                  <div className="label">Önizleme</div>
                  <div className="preview">
                    {mode==='pre'
                      ? preT({
                          student: s.name,
                          day: s.day || groupDefaults.day || '(gün yok)',
                          time: s.time || groupDefaults.time || '(saat yok)',
                          place: s.place || groupDefaults.place || '(yer yok)',
                          topic: s.topic || groupDefaults.topic || '(konu yok)',
                        })
                      : postT({
                          student: s.name,
                          homework: s.homework || groupDefaults.homework || '(ödev yok)',
                        })
                    }
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
            {previews.length===0 && <div style={{color:'var(--muted)'}}>Gönderilecek mesaj yok.</div>}
            {previews.map(p=>(
              <div key={p.id} className="student">
                <div style={{fontWeight:700, marginBottom:6}}>{p.name}</div>
                <div className="preview">{p.text}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex', justifyContent:'flex-end', marginTop:12, gap:8}}>
            <button className="btn">Taslak Olarak Kaydet</button>
            <button className="btn btn-primary" onClick={sendAll}>Şimdi Gönder (DEMO)</button>
          </div>
        </div>

        <div className="footer-note">DEMO • WhatsApp gönderimi için backend /send eklenecek.</div>
      </div>
    </>
  );
}

/* ---------- Uygulama ---------- */
export default function App(){
  return (
    <Gate>
      <Panel />
    </Gate>
  );
}
