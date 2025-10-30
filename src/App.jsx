import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'

// --- Basit stiller (inline) ---
const box = { border:'1px solid #e5e7eb', borderRadius:12, padding:16, background:'#fff' }
const label = { fontSize:12, color:'#555' }
const input = { padding:'8px 10px', border:'1px solid #ddd', borderRadius:8, width:'100%' }
const btn = (primary=false)=>({
  padding:'10px 14px', borderRadius:10, border:'1px solid ' + (primary?'#2563eb':'#ddd'),
  background: primary? '#2563eb':'#f9fafb', color: primary? '#fff':'#111', cursor:'pointer'
})

const INITIAL_GROUPS = [
  { id: 'adil', name: 'Adil', students: [
    { id: 's1', name: 'Ahmet Karkur', grade: '8' },
    { id: 's2', name: 'Yiğit', grade: '8' },
    { id: 's3', name: 'Nusret', grade: '7' },
    { id: 's4', name: 'Orhan', grade: '7' },
  ]},
  { id: 'burhan', name: 'Burhan', students: [
    { id: 's5', name: 'Eymen', grade: '7' },
    { id: 's6', name: 'Vefa', grade: '7' },
    { id: 's7', name: 'Metin', grade: '7' },
  ]},
  { id: 'necdet', name: 'Necdet', students: [
    { id: 's8', name: 'Bünyamin', grade: '8' },
    { id: 's9', name: 'Cevdet', grade: '8' },
  ]},
  { id: 'mehmet-akif', name: 'Mehmet Akif', students: [
    { id: 's10', name: 'Halil İbrahim', grade: '9' },
    { id: 's11', name: 'Emrullah', grade: '11' },
    { id: 's12', name: 'Burhan', grade: '11' },
    { id: 's13', name: 'Necdet', grade: '12' },
    { id: 's14', name: 'Ahmet Eser', grade: '11' },
    { id: 's15', name: 'Ümit', grade: '11' },
    { id: 's16', name: 'Yahya', grade: '11' },
  ]},
  { id: 'enes', name: 'Enes', students: [
    { id: 's17', name: 'Oğuzhan', grade: '12' },
    { id: 's18', name: 'Murat', grade: 'üniversite' },
    { id: 's19', name: 'Ahmet K', grade: '12' },
    { id: 's20', name: 'Ahmet', grade: '12' },
    { id: 's21', name: 'Adil', grade: '12' },
  ]},
]

const templatePre = ({ student, day, time, place, topic }) =>
  `Saygıdeğer velimiz, öğrenciniz “${student}”nin bu haftaki dersi “${day}” günü saat “${time}”te “${place}” gerçekleştirilecektir.\nBu hafta işleyeceğimiz konumuz: “${topic}”.\nÇok teşekkürler.`

const templatePost = ({ student, homework }) =>
  `Saygıdeğer velimiz, “${student}”nin bu haftaki ödevi: “${homework}”.\nÇok teşekkürler, görüşmek dileğiyle.`

export default function App() {
  // --- Erişim kodu kapısı ---
  const [authorized, setAuthorized] = useState(false)
  const [codeInput, setCodeInput] = useState('')

  useEffect(()=>{
    const ok = localStorage.getItem('access_ok') === '1'
    setAuthorized(ok)
  },[])

  const checkCode = () => {
    // Kod Vercel'de ENV olarak ayarlanacak: VITE_ACCESS_CODE
    const correct = import.meta.env.VITE_ACCESS_CODE || ''
    if (codeInput && correct && codeInput.trim() === correct.trim()) {
      localStorage.setItem('access_ok', '1')
      setAuthorized(true)
    } else {
      alert('Kod yanlış. Lütfen yöneticinizden isteyin.')
    }
  }

  if (!authorized) {
    return (
      <div style={{minHeight:'100vh', display:'grid', placeItems:'center', background:'#f5f7fb', fontFamily:'ui-sans-serif'}}>
        <div style={{...box, width:420}}>
          <h2 style={{marginTop:0}}>Ders Paneli – Erişim Kodu</h2>
          <div style={{...label, marginBottom:6}}>Kod</div>
          <input style={input} placeholder="Örn: 2025panel" value={codeInput} onChange={e=>setCodeInput(e.target.value)} />
          <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
            <button style={btn(true)} onClick={checkCode}>Giriş</button>
          </div>
          <div style={{fontSize:12, color:'#666', marginTop:10}}>Bu ekranı bir kez geçince cihazınız hatırlar.</div>
        </div>
      </div>
    )
  }

  // --- Panel ---
  const [groups, setGroups] = useState(INITIAL_GROUPS)
  const [activeGroupId, setActiveGroupId] = useState(groups[0]?.id || '')
  const activeGroup = useMemo(()=>groups.find(g=>g.id===activeGroupId),[groups,activeGroupId])

  const [mode, setMode] = useState('pre') // 'pre' | 'post'
  const [groupDefaults, setGroupDefaults] = useState({ day:'', time:'', place:'', topic:'', homework:'' })

  const patchStudent = (sid, patch) => {
    setGroups(prev => prev.map(g => g.id!==activeGroupId ? g : {
      ...g, students: g.students.map(s => s.id===sid ? {...s, ...patch} : s)
    }))
  }

  const [newGroupName, setNewGroupName] = useState('')
  const [rename, setRename] = useState('')
  const addGroup = () => {
    const name = newGroupName.trim(); if(!name) return
    const id = name.toLowerCase().replace(/\s+/g,'-')
    setGroups(prev => [...prev, { id, name, students: [] }])
    setActiveGroupId(id)
    setNewGroupName('')
  }
  const renameGroup = () => {
    const val = rename.trim(); if(!val) return
    setGroups(prev => prev.map(g => g.id===activeGroupId ? {...g, name: val} : g))
    setRename('')
  }
  const removeGroup = () => {
    setGroups(prev => prev.filter(g => g.id!==activeGroupId))
    const rest = groups.filter(g=>g.id!==activeGroupId)
    setActiveGroupId(rest[0]?.id || '')
  }

  const templatePre = ({ student, day, time, place, topic }) =>
    `Saygıdeğer velimiz, öğrenciniz “${student}”nin bu haftaki dersi “${day}” günü saat “${time}”te “${place}” gerçekleştirilecektir.\nBu hafta işleyeceğimiz konumuz: “${topic}”.\nÇok teşekkürler.`

  const templatePost = ({ student, homework }) =>
    `Saygıdeğer velimiz, “${student}”nin bu haftaki ödevi: “${homework}”.\nÇok teşekkürler, görüşmek dileğiyle.`

  const previews = useMemo(()=>{
    if(!activeGroup) return []
    return activeGroup.students
      .filter(s => !s.optedOut)
      .map(s=>{
        const day = s.day || groupDefaults.day || '(gün yok)'
        const time = s.time || groupDefaults.time || '(saat yok)'
        const place = s.place || groupDefaults.place || '(yer yok)'
        const topic = s.topic || groupDefaults.topic || '(konu yok)'
        const homework = s.homework || groupDefaults.homework || '(ödev yok)'
        const text = mode==='pre'
          ? templatePre({ student:s.name, day, time, place, topic })
          : templatePost({ student:s.name, homework })
        return { id: s.id, name: s.name, text }
      })
  },[activeGroup, groupDefaults, mode])

  const sendAll = async () => {
    alert(previews.length + ' mesaj hazır (DEMO).\nGerçek gönderim için arka uç (backend) bağlanacak.')
    // İLERİDE: fetch(import.meta.env.VITE_API_BASE + '/send', { method:'POST', body: JSON.stringify({...}) })
  }

  if(!activeGroup) return <div style={{padding:20}}>Henüz grup yok.</div>

  return (
    <div style={{maxWidth:1200, margin:'20px auto', fontFamily:'ui-sans-serif', padding:'0 12px'}}>
      {/* Gruplar */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
        <div style={{...box}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
            <h2 style={{margin:0}}>Gruplar</h2>
            <div style={{display:'flex', gap:8}}>
              <input style={input} placeholder="Yeni grup adı" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} />
              <button style={btn()} onClick={addGroup}>Grup Ekle</button>
              <input style={input} placeholder="Yeni isim" value={rename} onChange={e=>setRename(e.target.value)} />
              <button style={btn()} onClick={renameGroup}>İsmi Değiştir</button>
              <button style={btn()} onClick={removeGroup}>Sil</button>
            </div>
          </div>
          <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
            {groups.map(g=>(
              <button key={g.id}
                style={{...btn(g.id===activeGroupId), padding:'8px 12px'}}
                onClick={()=>setActiveGroupId(g.id)}>{g.name}</button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Mesaj Türü + Grup Varsayılanları */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} style={{marginTop:14}}>
        <div style={{...box}}>
          <h3 style={{marginTop:0}}>Mesaj Türü</h3>
          <div style={{display:'flex', gap:8, marginBottom:10}}>
            <button style={btn(mode==='pre')} onClick={()=>setMode('pre')}>Ders Öncesi</button>
            <button style={btn(mode==='post')} onClick={()=>setMode('post')}>Ders Sonrası</button>
          </div>

          {mode==='pre' ? (
            <div style={{display:'grid', gap:10, gridTemplateColumns:'repeat(4, 1fr)'}}>
              <div><div style={label}>Gün</div><input style={input} placeholder="Cuma" value={groupDefaults.day} onChange={e=>setGroupDefaults({...groupDefaults, day:e.target.value})}/></div>
              <div><div style={label}>Saat</div><input style={input} placeholder="15:00" value={groupDefaults.time} onChange={e=>setGroupDefaults({...groupDefaults, time:e.target.value})}/></div>
              <div style={{gridColumn:'span 2'}}><div style={label}>Yer</div><input style={input} placeholder="Öğrenci evinde" value={groupDefaults.place} onChange={e=>setGroupDefaults({...groupDefaults, place:e.target.value})}/></div>
              <div style={{gridColumn:'1 / -1'}}><div style={label}>Konu</div><textarea style={{...input, height:70}} placeholder="Namazın önemi" value={groupDefaults.topic} onChange={e=>setGroupDefaults({...groupDefaults, topic:e.target.value})}/></div>
            </div>
          ) : (
            <div>
              <div style={label}>Ödev</div>
              <textarea style={{...input, height:80}} placeholder="Kırk sayfa kitap okuma" value={groupDefaults.homework} onChange={e=>setGroupDefaults({...groupDefaults, homework:e.target.value})}/>
            </div>
          )}
        </div>
      </motion.div>

      {/* Öğrenciler */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} style={{marginTop:14}}>
        <div style={{...box}}>
          <h3 style={{marginTop:0}}>Öğrenciler (Opt-out & Kişiye Özel Bilgi)</h3>
          <div style={{display:'grid', gap:12}}>
            {(groups.find(g=>g.id===activeGroupId)?.students || []).map(s=>(
              <div key={s.id} style={{border:'1px solid #eee', borderRadius:12, padding:12}}>
                <div style={{display:'grid', gap:10, gridTemplateColumns:'repeat(12, 1fr)', alignItems:'start'}}>
                  <div style={{gridColumn:'span 3'}}>
                    <div style={{fontWeight:600}}>{s.name}</div>
                    <div style={{fontSize:12, color:'#666'}}>Sınıf: {s.grade || '—'}</div>
                    <label style={{display:'flex', gap:8, alignItems:'center', marginTop:8, fontSize:14}}>
                      <input type="checkbox" checked={!s.optedOut} onChange={e=>patchStudent(s.id,{ optedOut: !e.target.checked })}/>
                      {s.optedOut ? 'Bu hafta gönderme' : 'Bu hafta gönder'}
                    </label>
                  </div>

                  {mode==='pre' ? (
                    <>
                      <div style={{gridColumn:'span 2'}}><div style={label}>Gün</div><input style={input} value={s.day||''} onChange={e=>patchStudent(s.id,{day:e.target.value})} placeholder="(boş)"/></div>
                      <div style={{gridColumn:'span 2'}}><div style={label}>Saat</div><input style={input} value={s.time||''} onChange={e=>patchStudent(s.id,{time:e.target.value})} placeholder="(boş)"/></div>
                      <div style={{gridColumn:'span 2'}}><div style={label}>Yer</div><input style={input} value={s.place||''} onChange={e=>patchStudent(s.id,{place:e.target.value})} placeholder="(boş)"/></div>
                      <div style={{gridColumn:'span 3'}}><div style={label}>Konu</div><input style={input} value={s.topic||''} onChange={e=>patchStudent(s.id,{topic:e.target.value})} placeholder="(boş)"/></div>
                    </>
                  ) : (
                    <div style={{gridColumn:'span 8'}}><div style={label}>Ödev</div><textarea style={{...input, height:60}} value={s.homework||''} onChange={e=>patchStudent(s.id,{homework:e.target.value})} placeholder="(boş)"/></div>
                  )}

                  <div style={{gridColumn:'1 / -1', marginTop:8}}>
                    <div style={label}>Önizleme</div>
                    <div style={{whiteSpace:'pre-wrap', background:'#f9fafb', border:'1px solid #eee', borderRadius:10, padding:10, fontSize:14}}>
                      {mode==='pre'
                        ? templatePre({
                            student: s.name,
                            day: s.day || groupDefaults.day || '(gün yok)',
                            time: s.time || groupDefaults.time || '(saat yok)',
                            place: s.place || groupDefaults.place || '(yer yok)',
                            topic: s.topic || groupDefaults.topic || '(konu yok)',
                          })
                        : templatePost({
                            student: s.name,
                            homework: s.homework || groupDefaults.homework || '(ödev yok)',
                          })
                      }
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Toplu Önizleme & Gönder */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} style={{marginTop:14}}>
        <div style={{...box}}>
          <h3 style={{marginTop:0}}>Toplu Önizleme & Gönder</h3>
          <div style={{color:'#666', fontSize:14, marginBottom:10}}>Opt-out edilmeyen tüm öğrenciler listelenir.</div>
          <div style={{display:'grid', gap:10}}>
            {previews.map(p=>(
              <div key={p.id} style={{border:'1px solid #eee', borderRadius:10, padding:10}}>
                <div style={{fontWeight:600, marginBottom:6}}>{p.name}</div>
                <div style={{whiteSpace:'pre-wrap'}}>{p.text}</div>
              </div>
            ))}
            {previews.length===0 && <div style={{color:'#666'}}>Gönderilecek mesaj yok.</div>}
          </div>
          <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
            <button style={btn(true)} onClick={sendAll}>Şimdi Gönder (DEMO)</button>
          </div>
        </div>
      </motion.div>

      <div style={{textAlign:'center', fontSize:12, color:'#666', marginTop:8}}>
        DEMO: Gerçek WhatsApp gönderimi için backend /send entegrasyonu eklenecek.
      </div>
    </div>
  )
}
