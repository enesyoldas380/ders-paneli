import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'

// ——— Basit stiller
const box = { border:'1px solid #e5e7eb', borderRadius:12, padding:16, background:'#fff' }
const label = { fontSize:12, color:'#555' }
const input = { padding:'8px 10px', border:'1px solid #ddd', borderRadius:8, width:'100%' }
const btn = (primary=false)=>({
  padding:'10px 14px', borderRadius:10, border:'1px solid ' + (primary?'#2563eb':'#ddd'),
  background: primary? '#2563eb':'#f9fafb', color: primary? '#fff':'#111', cursor:'pointer'
})

// ——— Örnek gruplar/öğrenciler
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

// ——— Mesaj şablonları
const templatePre = ({ student, day, time, place, topic }) =>
  `Saygıdeğer velimiz, öğrenciniz “${student}”nin bu haftaki dersi “${day}” günü saat “${time}”te “${place}” gerçekleştirilecektir.\nBu hafta işleyeceğimiz konumuz: “${topic}”.\nÇok teşekkürler.`
const templatePost = ({ student, homework }) =>
  `Saygıdeğer velimiz, “${student}”nin bu haftaki ödevi: “${homework}”.\nÇok teşekkürler, görüşmek dileğiyle.`

// ——— 1) Kapı (Şifre) Bileşeni — hooks burada kalır
function Gate({ children }) {
  const [authorized, setAuthorized] = useState(false)
  const [codeInput, setCodeInput] = useState('')

  useEffect(() => {
    const ok = localStorage.getItem('access_ok') === '1'
    setAuthorized(ok)
  }, [])

  const checkCode = () => {
    const correct = (import.meta.env.VITE_ACCESS_CODE || '').toString().trim().toLowerCase()
    const typed = (codeInput || '').toString().trim().toLowerCase()
    if (correct && typed === correct) {
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
          <input style={input} placeholder="Örn: 2025
