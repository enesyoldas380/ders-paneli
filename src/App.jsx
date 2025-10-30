import { useEffect, useMemo, useState } from "react";

/* --- Örnek veriler --- */
const INITIAL_GROUPS = [
  {
    id: "adil",
    name: "Adil",
    students: [
      { id: "s1", name: "Ahmet Karkur", grade: "8" },
      { id: "s2", name: "Yiğit", grade: "8" },
    ],
  },
  {
    id: "burhan",
    name: "Burhan",
    students: [
      { id: "s3", name: "Eymen", grade: "7" },
      { id: "s4", name: "Vefa", grade: "7" },
    ],
  },
];

/* --- Yardımcılar --- */
const VOWELS = ["a", "e", "ı", "i", "o", "ö", "u", "ü"];
const endsWithVowel = (s) =>
  VOWELS.includes((s || "").trim().toLowerCase().slice(-1));
const lastVowel = (s) => {
  const t = (s || "").toLowerCase();
  for (let i = t.length - 1; i >= 0; i--)
    if (VOWELS.includes(t[i])) return t[i];
  return null;
};
/** Türkçe özel isim + -in/ın/un/ün çekimi (Ali’nin, Ahmet’in, Korkut’un, Sümeyye’nin) */
function genitive(name) {
  const lv = lastVowel(name) || "e";
  const harmony =
    lv === "a" || lv === "ı"
      ? "ın"
      : lv === "e" || lv === "i"
      ? "in"
      : lv === "o" || lv === "u"
      ? "un"
      : "ün";
  const needsN = endsWithVowel(name);
  return `${name}’${needsN ? "n" : ""}${harmony}`;
}

/* --- Şablonlar --- */
const preT = ({ student, day, time, place, topic }) =>
  `Saygıdeğer velimiz, öğrenciniz ${genitive(
    student
  )} bu haftaki dersi ${day} günü saat ${time}’te ${place} gerçekleştirilecektir.
Bu hafta işleyeceğimiz konumuz: “${topic}”.
Çok teşekkürler.`;
const postT = ({ student, homework }) =>
  `Saygıdeğer velimiz, ${genitive(
    student
  )} bu haftaki ödevi: “${homework}”.
Çok teşekkürler, görüşmek dileğiyle.`;

/* --- Giriş --- */
function Gate({ children }) {
  const [ok, setOk] = useState(false);
  const [code, setCode] = useState("");

  useEffect(() => {
    setOk(localStorage.getItem("access_ok") === "1");
  }, []);

  const submit = () => {
    const correct = (
      import.meta.env.VITE_ACCESS_CODE || "2025panel"
    )
      .toString()
      .trim()
      .toLowerCase();
    const typed = (code || "").toString().trim().toLowerCase();
    if (typed === correct) {
      localStorage.setItem("access_ok", "1");
      setOk(true);
    } else alert("Kod yanlış. Lütfen yöneticinizden isteyin.");
  };

  if (!ok)
    return (
      <div className="app">
        <div className="card" style={{ maxWidth: 460, margin: "40px auto" }}>
          <h2 className="section-title">Ders Mesaj Paneli – Giriş</h2>
          <div className="label">Erişim Kodu</div>
          <input
            className="input"
            placeholder="Örn: 2025panel"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <button className="btn btn-primary" onClick={submit}>
              Giriş
            </button>
          </div>
        </div>
      </div>
    );
  return children;
}

/* --- Ana Panel --- */
function Panel() {
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  const [activeGroupId, setActiveGroupId] = useState(groups[0]?.id || "adil");
  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId),
    [groups, activeGroupId]
  );

  const [mode, setMode] = useState("pre");
  const [defaults, setDefaults] = useState({
    day: "Cuma",
    time: "15:00",
    place: "Öğrenci evinde",
    topic: "Namazın önemi",
    homework: "Kırk sayfa kitap okuma",
  });

  const patchStudent = (sid, patch) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id !== activeGroupId
          ? g
          : { ...g, students: g.students.map((s) => (s.id === sid ? { ...s, ...patch } : s)) }
      )
    );
  };

  const buildText = (s) => {
    if (s.customText && s.customText.trim().length > 0) return s.customText;
    return mode === "pre"
      ? preT({
          student: s.name,
          day: s.day || defaults.day,
          time: s.time || defaults.time,
          place: s.place || defaults.place,
          topic: s.topic || defaults.topic,
        })
      : postT({
          student: s.name,
          homework: s.homework || defaults.homework,
        });
  };

  const previews = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup.students.filter((s) => !s.optedOut).map((s) => ({
      id: s.id,
      name: s.name,
      text: buildText(s),
    }));
  }, [activeGroup, defaults, mode]);

  /* --- Grup işlemleri --- */
  const [newGroupName, setNewGroupName] = useState("");
  const slugify = (str) =>
    (str || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-ğüşöçı]/g, "");
  const addGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    const id = slugify(name);
    setGroups((prev) => [...prev, { id, name, students: [] }]);
    setActiveGroupId(id);
    setNewGroupName("");
  };
  const deleteGroup = () => {
    if (!activeGroup) return;
    if (!confirm(`“${activeGroup.name}” grubunu silmek istiyor musun?`)) return;
    setGroups((prev) => prev.filter((g) => g.id !== activeGroupId));
  };

  /* --- Öğrenci işlemleri --- */
  const [newStudent, setNewStudent] = useState({ name: "", grade: "" });
  const addStudent = () => {
    if (!newStudent.name.trim()) return;
    const sid = "s" + Date.now();
    const student = { id: sid, ...newStudent };
    setGroups((prev) =>
      prev.map((g) =>
        g.id !== activeGroupId ? g : { ...g, students: [...g.students, student] }
      )
    );
    setNewStudent({ name: "", grade: "" });
  };
  const deleteStudent = (sid) => {
    if (!confirm("Bu öğrenciyi silmek istiyor musun?")) return;
    setGroups((prev) =>
      prev.map((g) =>
        g.id !== activeGroupId
          ? g
          : { ...g, students: g.students.filter((s) => s.id !== sid) }
      )
    );
  };

  if (!activeGroup)
    return (
      <div className="app" style={{ marginTop: 16 }}>
        <div className="card">
          <h2 className="section-title">Grup ekleyin</h2>
          <div className="label">Yeni Grup Adı</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              className="input"
              placeholder="Örn: Necdet"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <button className="btn btn-primary" onClick={addGroup}>
              Ekle
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="app" style={{ marginTop: 16 }}>
      {/* Gruplar */}
      <div className="card" style={{ marginBottom: 12 }}>
        <h2 className="section-title">Gruplar</h2>
        <div className="tabs" style={{ marginBottom: 12 }}>
          {groups.map((g) => (
            <div
              key={g.id}
              className={`tab ${g.id === activeGroupId ? "active" : ""}`}
              onClick={() => setActiveGroupId(g.id)}
            >
              {g.name}
            </div>
          ))}
        </div>
        <div className="grid grid-3">
          <div>
            <div className="label">Yeni Grup Adı</div>
            <input
              className="input"
              placeholder="Örn: Necdet"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <button className="btn btn-primary" onClick={addGroup}>
              Grup Ekle
            </button>
            <button
              className="btn"
              style={{
                borderColor: "#5b1f1f",
                background: "#190f0f",
                color: "#ffb4b4",
              }}
              onClick={deleteGroup}
            >
              Grubu Sil
            </button>
          </div>
        </div>
      </div>

      {/* Yeni öğrenci ekleme */}
      <div className="card" style={{ marginBottom: 12 }}>
        <h3 className="section-title">Yeni Öğrenci Ekle</h3>
        <div className="grid grid-3">
          <div>
            <div className="label">Ad Soyad</div>
            <input
              className="input"
              value={newStudent.name}
              onChange={(e) =>
                setNewStudent({ ...newStudent, name: e.target.value })
              }
            />
          </div>
          <div>
            <div className="label">Sınıf</div>
            <input
              className="input"
              value={newStudent.grade}
              onChange={(e) =>
                setNewStudent({ ...newStudent, grade: e.target.value })
              }
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="btn btn-primary" onClick={addStudent}>
              Ekle
            </button>
          </div>
        </div>
      </div>

      {/* Öğrenciler */}
      <div className="card" style={{ marginBottom: 12 }}>
        <h3 className="section-title">Öğrenciler</h3>
        <div className="grid">
          {(activeGroup?.students || []).map((s) => (
            <div key={s.id} className="student">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{s.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    Sınıf: {s.grade || "—"}
                  </div>
                </div>
                <button className="btn" onClick={() => deleteStudent(s.id)}>
                  Sil
                </button>
              </div>

              <div style={{ marginTop: 8 }}>
                <div className="label">Önizleme</div>
                <div className="preview">{buildText(s)}</div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div className="label">Kişiye Özel Düzenle</div>
                <textarea
                  className="textarea"
                  placeholder="Elle mesaj düzenle (opsiyonel)"
                  value={s.customText || ""}
                  onChange={(e) =>
                    patchStudent(s.id, { customText: e.target.value })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --- Ana Uygulama --- */
export default function App() {
  return (
    <Gate>
      <Panel />
    </Gate>
  );
}
