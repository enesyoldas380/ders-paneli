import { useEffect, useMemo, useState } from 'react'

/* --- Örnek veriler (kısaltılmış) --- */
const INITIAL_GROUPS = [
  { id: 'adil', name: 'Adil', students: [
    { id: 's1', name: 'Ahmet Karkur', grade: '8' },
    { id: 's2', name: 'Yiğit', grade: '8' },
  ]},
  { id: 'burhan', name: 'Burhan', students: [
    { id: 's3', name: 'Eymen', grade: '7' },
    { id: 's4', name: 'Vefa', grade: '7' },
  ]},
]

/* --- Şablonlar --- */
const preT = ({ student, day, time, place, topic }) =>
  `Saygıdeğer velimiz, öğrenciniz “${student}”nin bu haftaki dersi “${day}” günü saat “${time}”te “${place}” gerçekleştirilecektir.
Bu hafta işleyeceğimiz konumuz: “${topic}”.
Çok teşekkürler.`
const postT = ({ student, homework }) =>
  `Saygıdeğer velimiz, “${student}”nin bu haftaki ödevi: “${homework}”.
Çok teşekkürler, görüşmek dileğiyle.`

/* --- Giriş (şifre) --- */
function Gate({ children }) {
  const [ok, setOk] = useState(false)
  const [code, setCode] = useState('')

  useEffect(()=>{ setOk(localStorage.getItem('access_ok') === '1') },[])

  const submit = () => {
    const correct = (import.meta.env.VITE_ACCESS_CODE || '2025panel').toString().trim().toLowerCase()
    const typed = (code || '').toString().trim().toLowerCase()
    if (typed === correct) { localStorage.setItem('access_ok','1'); setOk(true) }
    else alert('Kod yanlış. Lütfen yöneticinizden isteyin.')
  }

  if (!ok) {
    return (
      <div className="app">
        <div className="card" style={{maxWidth:460, margin:'40px auto'}}>
          <h2 className="section-title">Ders Mesaj Paneli – Giriş</h2>
          <div className="label">Erişim Kodu</div>
          <input className="input" placeholder="Örn: 2025panel" value={code} onChange={e=>setCode(e.target.value)} />
          <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
            <button className="btn btn-primary" onClick={submit}>Giriş</button>
          </div>
        </div>
      </div>
    )
  }
  return children
}

/* --- Panel --- */
function Panel() {
  const [groups, setGroups] = useState(INITIAL_GROUPS)
  const [activeGroupId, setActiveGroupId] = useState(groups[0]?.id || 'adil')
  const activeGroup = useMemo(()=>groups.find(g=>g.id===activeGroupId),[groups,activeGroupId])

  const [mode, setMode] = useState('pre')
  const [defaults, setDefaults] = useState({ day:'Cuma', time:'15:00', place:'Öğrenci evinde', topic:'Namazın önemi', homework:'Kırk sayfa kitap okuma' })

  const patchStudent = (sid, patch) => {
    setGroups(prev => prev.map(g => g.id!==activeGroupId ? g : {
      ...g, students: g.students.map(s => s.id===sid ? {...s, ...patch} : s)
    }))
  }

  const previews = useMemo(()=>{
    if(!activeGroup) return []
    return activeGroup.students.filter(s=>!s.optedOut).map(s=>{
      const text = mode==='pre'
        ? preT({ student:s.name, day:s.day||defaults.day, time:s.time||defaults.time, place:s.place||defaults.place, topic:s.topic||defaults.topic })
        : postT({ student:s.name, homework:s.homework||defaults.homework })
      return { id:s.id, name:s.name, text }
    })
  },[activeGroup, defaults, mode])

  return (
    <div className="app" style={{marginTop:16}}>
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

      <div className="card" style={{marginBottom:12}}>
        <h3 className="section-title">Varsayılan Bilgiler ({mode==='pre'?'Ders Öncesi':'Ders Sonrası'})</h3>
        {mode==='pre' ? (
          <div className="grid grid-4">
            <div><div className="label">Gün</div><input className="input" value={defaults.day} onChange={e=>setDefaults({...defaults, day:e.target.value})} /></div>
            <div><div className="label">Saat</div><input className="input" value={defaults.time} onChange={e=>setDefaults({...defaults, time:e.target.value})} /></div>
            <div><div className="label">Yer</div><input className="input" value={defaults.place} onChange={e=>setDefaults({...defaults, place:e.target.value})} /></div>
            <div><div className="label">Konu</div><input className="input" value={defaults.topic} onChange={e=>setDefaults({...defaults, topic:e.target.value})} /></div>
          </div>
        ) : (
          <div>
            <div className="label">Ödev</div>
            <textarea className="textarea" value={defaults.homework} onChange={e=>setDefaults({...defaults, homework:e.target.value})} />
          </div>
        )}
        <div style={{display:'flex', gap:8, marginTop:12}}>
          <button className="btn btn-pill" onClick={()=>setMode('pre')}>Ders Öncesi</button>
          <button className="btn btn-pill" onClick={()=>setMode('post')}>Ders Sonrası</button>
        </div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <h3 className="section-title">Öğrenciler</h3>
        <div className="grid">
          {(activeGroup?.students||[]).map(s=>(
            <div key={s.id} className="student">
              <div style={{fontWeight:700}}>{s.name}</div>
              <label style={{display:'flex', gap:8, alignItems:'center', marginTop:8, fontWeight:600}}>
                <input type="checkbox" checked={!s.optedOut} onChange={e=>patchStudent(s.id,{optedOut:!e.target.checked})}/>
                {s.optedOut?'Bu hafta gönderme':'Bu hafta gönder'}
              </label>

              {mode==='pre' ? (
                <div className="grid grid-3" style={{marginTop:8}}>
                  <div><div className="label">Gün</div><input className="input" value={s.day||''} onChange={e=>patchStudent(s.id,{day:e.target.value})} /></div>
                  <div><div className="label">Saat</div><input className="input" value={s.time||''} onChange={e=>patchStudent(s.id,{time:e.target.value})} /></div>
                  <div><div className="label">Yer</div><input className="input" value={s.place||''} onChange={e=>patchStudent(s.id,{place:e.target.value})} /></div>
                  <div style={{gridColumn:'1 / -1'}}><div className="label">Konu</div><input className="input" value={s.topic||''} onChange={e=>patchStudent(s.id,{topic:e.target.value})} /></div>
                </div>
              ) : (
                <div style={{marginTop:8}}>
                  <div className="label">Ödev</div>
                  <textarea className="textarea" value={s.homework||''} onChange={e=>patchStudent(s.id,{homework:e.target.value})} />
                </div>
              )}

              <div style={{marginTop:10}}>
                <div className="label">Önizleme</div>
                <div className="preview">
                  {mode==='pre'
                    ? preT({ student:s.name, day:s.day||defaults.day, time:s.time||defaults.time, place:s.place||defaults.place, topic:s.topic||defaults.topic })
                    : postT({ student:s.name, homework:s.homework||defaults.homework })
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
        <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
          <button className="btn btn-primary" onClick={()=>alert(`${previews.length} mesaj hazır (DEMO)`)}>Şimdi Gönder (DEMO)</button>
        </div>
      </div>
    </div>
  )
}

/* --- Uygulama --- */
export default function App(){
  return (
    <Gate>
      <Panel />
    </Gate>
  )
}
