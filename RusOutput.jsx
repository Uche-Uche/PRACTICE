import { useState, useEffect } from "react";

// ─── Default phrase data ──────────────────────────────────────────────────────
const DEFAULT_PHRASES = [
  { id: 1, russian: "ну", english: "well / filler", pronunciation: "noo", category: "fillers" },
  { id: 2, russian: "вот", english: "here / you see", pronunciation: "vot", category: "fillers" },
  { id: 3, russian: "как бы", english: "kind of / sort of", pronunciation: "kak by", category: "fillers" },
  { id: 4, russian: "в общем", english: "in general / so", pronunciation: "v obshchem", category: "fillers" },
  { id: 5, russian: "то есть", english: "that is / i.e.", pronunciation: "to yest'", category: "fillers" },
  { id: 6, russian: "получается", english: "it turns out / so", pronunciation: "poluchaetsya", category: "fillers" },
  { id: 7, russian: "честно говоря", english: "honestly speaking", pronunciation: "chestno govorya", category: "fillers" },
  { id: 8, russian: "позвольте мне уточнить", english: "allow me to clarify", pronunciation: "pozvol'te mne utochnit'", category: "presentation" },
  { id: 9, russian: "другими словами", english: "in other words", pronunciation: "drugimi slovami", category: "presentation" },
  { id: 10, russian: "таким образом", english: "thus / in this way", pronunciation: "takim obrazom", category: "presentation" },
  { id: 11, russian: "следует отметить", english: "it should be noted", pronunciation: "sleduyet otmetit'", category: "presentation" },
  { id: 12, russian: "как видно из графика", english: "as can be seen from the graph", pronunciation: "kak vidno iz grafika", category: "presentation" },
  { id: 13, russian: "я хотел бы остановиться на", english: "I'd like to focus on", pronunciation: "ya khotel by ostanovit'sya na", category: "presentation" },
  { id: 14, russian: "есть ли у вас вопросы?", english: "do you have any questions?", pronunciation: "yest' li u vas voprosy?", category: "presentation" },
  { id: 15, russian: "если я правильно понимаю", english: "if I understand correctly", pronunciation: "yesli ya pravil'no ponimayu", category: "presentation" },
  { id: 16, russian: "на самом деле", english: "actually / in reality", pronunciation: "na samom dele", category: "fillers" },
  { id: 17, russian: "кстати", english: "by the way", pronunciation: "kstati", category: "fillers" },
  { id: 18, russian: "подождите, я объясню", english: "wait, let me explain", pronunciation: "podozhite, ya ob'yasnyu", category: "presentation" },
];

// ─── SM-2 SRS ────────────────────────────────────────────────────────────────
function freshCard() {
  return { interval: 1, easeFactor: 2.5, dueDate: Date.now(), repetitions: 0 };
}
function rateCard(card, q) {
  let { interval, easeFactor, repetitions } = card;
  if (q === 1) { interval = 1; repetitions = 0; }
  else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (4 - q) * (0.08 + (4 - q) * 0.02));
    repetitions++;
  }
  return { interval, easeFactor, repetitions, dueDate: Date.now() + interval * 86400000 };
}
function isDue(state) { return (state || freshCard()).dueDate <= Date.now(); }

const noopStorage = {
  get: async () => null,
  set: async () => null,
};

function getStorageApi() {
  if (typeof window === "undefined") return noopStorage;
  if (window.storage?.get && window.storage?.set) return window.storage;
  if (!window.localStorage) return noopStorage;

  return {
    get: async key => {
      const value = window.localStorage.getItem(key);
      return value == null ? null : { value };
    },
    set: async (key, value) => {
      window.localStorage.setItem(key, value);
      return { value };
    },
  };
}

async function saveStoredValue(key, value) {
  try {
    await getStorageApi().set(key, value);
  } catch {}
}

function parseDateInput(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).getTime();
}

function formatDateInput(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sentenceKey(sentence) {
  return sentence.trim().replace(/\s+/g, " ").toLowerCase();
}

// ─── TTS ──────────────────────────────────────────────────────────────────────
function speak(text) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ru-RU"; u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

// ─── Categories ───────────────────────────────────────────────────────────────
const CATS = ["fillers", "presentation", "daily", "topic"];
const CAT_LABEL = { fillers: "Слова-связки", presentation: "Презентация", daily: "Ежедневное", topic: "По теме" };
const CAT_COLOR = { fillers: "#E8823A", presentation: "#CC2200", daily: "#3ABDE8", topic: "#9B6BCC" };

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:"100%",height:"100%"}}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
  book: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:"100%",height:"100%"}}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  flash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:"100%",height:"100%"}}><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>,
  mic: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:"100%",height:"100%"}}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  sound: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:"100%",height:"100%"}}><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:"100%",height:"100%"}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:"100%",height:"100%"}}><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>,
  arrow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:"100%",height:"100%"}}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>,
};

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [phrases, setPhrases] = useState(DEFAULT_PHRASES);
  const [cardStates, setCardStates] = useState({});
  const [presDate, setPresDate] = useState(null);
  const [presScript, setPresScript] = useState("");
  const [stumbles, setStumbles] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const storage = getStorageApi();
      try {
        const p = await storage.get("phrases");
        if (p) setPhrases(JSON.parse(p.value));
        const cs = await storage.get("cardStates");
        if (cs) setCardStates(JSON.parse(cs.value));
        const pd = await storage.get("presDate");
        if (pd) setPresDate(JSON.parse(pd.value));
        const ps = await storage.get("presScript");
        if (ps) setPresScript(ps.value);
        const st = await storage.get("stumbles");
        if (st) setStumbles(JSON.parse(st.value));
      } catch {}
      setLoaded(true);
    }
    load();
  }, []);

  useEffect(() => { if (loaded) saveStoredValue("phrases", JSON.stringify(phrases)); }, [phrases, loaded]);
  useEffect(() => { if (loaded) saveStoredValue("cardStates", JSON.stringify(cardStates)); }, [cardStates, loaded]);
  useEffect(() => { if (loaded) saveStoredValue("presDate", JSON.stringify(presDate)); }, [presDate, loaded]);
  useEffect(() => { if (loaded) saveStoredValue("presScript", presScript); }, [presScript, loaded]);
  useEffect(() => { if (loaded) saveStoredValue("stumbles", JSON.stringify(stumbles)); }, [stumbles, loaded]);

  const daysLeft = presDate ? Math.max(0, Math.ceil((presDate - Date.now()) / 86400000)) : 30;
  const dueCount = phrases.filter(p => isDue(cardStates[p.id])).length;

  const NAV = [
    { id: "dashboard", icon: Ic.home, label: "ГЛАВНАЯ" },
    { id: "phrases", icon: Ic.book, label: "ФРАЗЫ" },
    { id: "drill", icon: Ic.flash, label: "КАРТОЧКИ" },
    { id: "presentation", icon: Ic.mic, label: "ПРЕЗЕНТАЦИЯ" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#f0f0f0", fontFamily: "'JetBrains Mono', 'Courier New', monospace", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Russo+One&family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080808; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #CC2200; }
        ::selection { background: #CC220033; }
        button { cursor: pointer; border: none; font-family: inherit; }
        input, textarea, select { font-family: inherit; }
        textarea { resize: vertical; }
        .btn-hover { transition: all 0.12s ease; }
        .btn-hover:hover { transform: translateY(-1px); filter: brightness(1.15); }
        .btn-hover:active { transform: translateY(0px); }
        .row-hover:hover { background: #111 !important; }
        .appear { animation: appear 0.25s ease; }
        @keyframes appear { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .scanline { background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px); pointer-events: none; position: fixed; inset: 0; z-index: 9999; }
      `}</style>

      <div className="scanline" />

      {/* Header */}
      <header style={{ borderBottom: "1px solid #1a1a1a", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#080808", zIndex: 100 }}>
        <div style={{ fontFamily: "'Russo One', sans-serif", fontSize: 17, letterSpacing: 3, color: "#fff" }}>
          <span style={{ color: "#CC2200" }}>РУС</span>OUTPUT
        </div>
        <nav style={{ display: "flex", gap: 2 }}>
          {NAV.map(({ id, icon, label }) => (
            <button key={id} onClick={() => setPage(id)}
              style={{ background: "none", color: page === id ? "#FF2200" : "#444", padding: "6px 10px", fontSize: 9, letterSpacing: 1.5, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, borderBottom: page === id ? "2px solid #CC2200" : "2px solid transparent", transition: "all 0.12s" }}
              onMouseEnter={e => { if (page !== id) e.currentTarget.style.color = "#888"; }}
              onMouseLeave={e => { if (page !== id) e.currentTarget.style.color = "#444"; }}>
              <span style={{ width: 16, height: 16, display: "block" }}>{icon}</span>
              {label}
            </button>
          ))}
        </nav>
        <div style={{ fontFamily: "'Russo One', sans-serif", fontSize: 13, color: daysLeft <= 7 ? "#FF4444" : daysLeft <= 14 ? "#FF8800" : "#555", letterSpacing: 1 }}>
          {daysLeft}Д
        </div>
      </header>

      <main style={{ flex: 1, overflowY: "auto" }}>
        {page === "dashboard" && <Dashboard daysLeft={daysLeft} dueCount={dueCount} phrases={phrases} presDate={presDate} setPresDate={setPresDate} setPage={setPage} stumbles={stumbles} presScript={presScript} />}
        {page === "phrases" && <PhraseBank phrases={phrases} setPhrases={setPhrases} setCardStates={setCardStates} />}
        {page === "drill" && <FlashcardDrill phrases={phrases} cardStates={cardStates} setCardStates={setCardStates} />}
        {page === "presentation" && <PresentationMode script={presScript} setScript={setPresScript} stumbles={stumbles} setStumbles={setStumbles} />}
      </main>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ daysLeft, dueCount, phrases, presDate, setPresDate, setPage, stumbles, presScript }) {
  const [editingDate, setEditingDate] = useState(false);
  const [dateVal, setDateVal] = useState("");
  const urgency = daysLeft <= 7 ? "#FF3333" : daysLeft <= 14 ? "#FF8800" : "#CC2200";
  const hardSentences = Object.keys(stumbles).filter(k => stumbles[k] > 0).length;

  const tips = [
    "Говори с собой по-русски. Опиши комнату прямо сейчас.",
    "Найди один YouTube-ролик на русском и повтори каждое предложение вслух.",
    "Запиши 2-минутное голосовое сообщение самому себе по-русски.",
    "Сделай заказ в кафе только по-русски сегодня.",
    "Прочитай один абзац из презентации вслух 3 раза подряд.",
  ];
  const tip = tips[new Date().getDay() % tips.length];

  return (
    <div style={{ padding: "28px 20px", maxWidth: 560, margin: "0 auto" }} className="appear">
      {/* Countdown hero */}
      <div style={{ textAlign: "center", padding: "36px 20px 28px", border: "1px solid #1a1a1a", background: "#0a0a0a", marginBottom: 24, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent 0%, ${urgency} 50%, transparent 100%)` }} />
        <div style={{ fontFamily: "'Russo One', sans-serif", fontSize: 88, lineHeight: 1, color: urgency, letterSpacing: -3, textShadow: `0 0 60px ${urgency}44` }}>
          {daysLeft}
        </div>
        <div style={{ color: "#444", fontSize: 10, letterSpacing: 4, marginTop: 8, marginBottom: 16 }}>ДНЕЙ ДО ПРЕЗЕНТАЦИИ</div>
        {!editingDate ? (
          <button onClick={() => { setDateVal(formatDateInput(presDate)); setEditingDate(true); }}
            style={{ background: "none", color: "#333", fontSize: 10, letterSpacing: 1.5, textDecoration: "underline" }}>
            {presDate ? "изменить дату" : "установить дату"}
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <input type="date" value={dateVal} onChange={e => setDateVal(e.target.value)}
              style={{ background: "#111", border: "1px solid #333", color: "#fff", padding: "6px 10px", fontSize: 12 }} />
            <button onClick={() => { if (dateVal) setPresDate(parseDateInput(dateVal)); setEditingDate(false); }}
              className="btn-hover"
              style={{ background: "#CC2200", color: "#fff", padding: "6px 14px", fontSize: 11, letterSpacing: 1 }}>
              OK
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { n: phrases.length, label: "ФРАЗ", sub: "в банке", hot: false },
          { n: dueCount, label: "К ПОВТОРУ", sub: "карточек", hot: dueCount > 0 },
          { n: hardSentences, label: "СЛОЖНЫХ", sub: "предложений", hot: hardSentences > 0 },
        ].map(({ n, label, sub, hot }) => (
          <div key={label} style={{ background: "#0a0a0a", border: `1px solid ${hot ? urgency + "55" : "#1a1a1a"}`, padding: "18px 10px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Russo One', sans-serif", fontSize: 30, color: hot ? "#FF3333" : "#ddd" }}>{n}</div>
            <div style={{ fontSize: 8, letterSpacing: 2, color: "#444", marginTop: 3 }}>{label}</div>
            <div style={{ fontSize: 9, color: "#333", marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        <div style={{ fontSize: 8, letterSpacing: 3, color: "#333", marginBottom: 4 }}>СЕГОДНЯ</div>
        {[
          { label: dueCount > 0 ? `Повторить ${dueCount} карточек` : "Все карточки повторены ✓", target: "drill", hot: dueCount > 0 },
          { label: presScript ? "Отработать презентацию" : "Загрузить текст презентации", target: "presentation", hot: !!presScript },
          { label: "Банк фраз — добавить своё", target: "phrases", hot: false },
        ].map(({ label, target, hot }) => (
          <button key={label} onClick={() => setPage(target)} className="btn-hover"
            style={{ background: hot ? "#CC2200" : "#0e0e0e", border: `1px solid ${hot ? "#CC2200" : "#1e1e1e"}`, color: hot ? "#fff" : "#777", padding: "14px 16px", textAlign: "left", fontSize: 12, letterSpacing: 0.3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{label}</span>
            <span style={{ width: 14, height: 14, opacity: 0.5 }}>{Ic.arrow}</span>
          </button>
        ))}
      </div>

      {/* Tip */}
      <div style={{ padding: "14px 16px", background: "#0a0a0a", borderLeft: "3px solid #CC2200" }}>
        <div style={{ fontSize: 8, letterSpacing: 2.5, color: "#CC2200", marginBottom: 6 }}>СОВЕТ ДНЯ</div>
        <div style={{ fontSize: 11, color: "#666", lineHeight: 1.7 }}>{tip}</div>
      </div>
    </div>
  );
}

// ─── Phrase Bank ──────────────────────────────────────────────────────────────
function PhraseBank({ phrases, setPhrases, setCardStates }) {
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ russian: "", english: "", pronunciation: "", category: "fillers" });

  const list = filter === "all" ? phrases : phrases.filter(p => p.category === filter);

  function add() {
    if (!form.russian.trim() || !form.english.trim()) return;
    setPhrases(prev => [...prev, { ...form, id: Date.now() }]);
    setForm({ russian: "", english: "", pronunciation: "", category: "fillers" });
    setAdding(false);
  }

  function del(id) {
    setPhrases(prev => prev.filter(p => p.id !== id));
    setCardStates(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  return (
    <div style={{ padding: "24px 20px", maxWidth: 580, margin: "0 auto" }} className="appear">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontFamily: "'Russo One', sans-serif", fontSize: 19, letterSpacing: 2 }}>БАНК ФРАЗ</div>
        <button onClick={() => setAdding(!adding)} className="btn-hover"
          style={{ background: "#CC2200", color: "#fff", padding: "8px 16px", fontSize: 10, letterSpacing: 1.5, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 13, height: 13 }}>{Ic.plus}</span> ДОБАВИТЬ
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {["all", ...CATS].map(c => (
          <button key={c} onClick={() => setFilter(c)}
            style={{ background: filter === c ? "#CC2200" : "#111", border: `1px solid ${filter === c ? "#CC2200" : "#222"}`, color: filter === c ? "#fff" : "#555", padding: "4px 12px", fontSize: 9, letterSpacing: 1.5, transition: "all 0.1s" }}>
            {c === "all" ? "ВСЕ" : CAT_LABEL[c].toUpperCase()}
          </button>
        ))}
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ background: "#0d0d0d", border: "1px solid #CC220055", padding: "16px", marginBottom: 18 }} className="appear">
          <div style={{ fontSize: 9, letterSpacing: 2.5, color: "#CC2200", marginBottom: 12 }}>НОВАЯ ФРАЗА</div>
          {[
            { k: "russian", ph: "По-русски..." },
            { k: "english", ph: "In English..." },
            { k: "pronunciation", ph: "Произношение (необязательно)" },
          ].map(({ k, ph }) => (
            <input key={k} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
              placeholder={ph}
              style={{ width: "100%", background: "#111", border: "1px solid #222", color: "#ddd", padding: "10px 12px", fontSize: 12, marginBottom: 8, display: "block" }} />
          ))}
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            style={{ width: "100%", background: "#111", border: "1px solid #222", color: "#ddd", padding: "10px 12px", fontSize: 12, marginBottom: 12 }}>
            {CATS.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
          </select>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={add} className="btn-hover" style={{ flex: 1, background: "#CC2200", color: "#fff", padding: "10px", fontSize: 11, letterSpacing: 1 }}>СОХРАНИТЬ</button>
            <button onClick={() => setAdding(false)} style={{ flex: 1, background: "#1a1a1a", color: "#666", padding: "10px", fontSize: 11 }}>ОТМЕНА</button>
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {list.map(p => (
          <div key={p.id} className="row-hover"
            style={{ background: "#0b0b0b", border: "1px solid #181818", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, transition: "background 0.1s" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'Russo One', sans-serif", fontSize: 15 }}>{p.russian}</span>
                <span style={{ width: 15, height: 15, color: "#444", cursor: "pointer", flexShrink: 0 }}
                  onClick={() => speak(p.russian)}
                  onMouseEnter={e => e.currentTarget.style.color = "#CC2200"}
                  onMouseLeave={e => e.currentTarget.style.color = "#444"}>
                  {Ic.sound}
                </span>
                <span style={{ fontSize: 8, padding: "2px 7px", background: CAT_COLOR[p.category] + "18", color: CAT_COLOR[p.category], letterSpacing: 1.2, flexShrink: 0 }}>
                  {CAT_LABEL[p.category]}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#666" }}>{p.english}</div>
              {p.pronunciation && <div style={{ fontSize: 10, color: "#383838", marginTop: 2, fontStyle: "italic" }}>{p.pronunciation}</div>}
            </div>
            <button onClick={() => del(p.id)} style={{ background: "none", color: "#2a2a2a", width: 18, height: 18, flexShrink: 0, transition: "color 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.color = "#FF4444"}
              onMouseLeave={e => e.currentTarget.style.color = "#2a2a2a"}>
              {Ic.trash}
            </button>
          </div>
        ))}
        {list.length === 0 && (
          <div style={{ textAlign: "center", color: "#333", padding: "40px", fontSize: 12 }}>Нет фраз в этой категории</div>
        )}
      </div>
    </div>
  );
}

// ─── Flashcard Drill ──────────────────────────────────────────────────────────
function FlashcardDrill({ phrases, cardStates, setCardStates }) {
  const [session, setSession] = useState(null); // null | { queue, idx, stats, done }
  const [flipped, setFlipped] = useState(false);

  const dueCount = phrases.filter(p => isDue(cardStates[p.id])).length;
  const hasAnyPhrases = phrases.length > 0;

  function start(all) {
    let pool = all ? [...phrases] : phrases.filter(p => isDue(cardStates[p.id]));
    pool = pool.sort(() => Math.random() - 0.5);
    if (!pool.length) return;
    setSession({ queue: pool, idx: 0, stats: { done: 0, again: 0 }, done: false });
    setFlipped(false);
  }

  function rate(q) {
    const card = session.queue[session.idx];
    setCardStates(prev => ({ ...prev, [card.id]: rateCard(prev[card.id] || freshCard(), q) }));
    const newStats = { done: session.stats.done + 1, again: session.stats.again + (q === 1 ? 1 : 0) };
    if (session.idx + 1 >= session.queue.length) {
      setSession(s => ({ ...s, stats: newStats, done: true }));
    } else {
      setSession(s => ({ ...s, idx: s.idx + 1, stats: newStats }));
      setFlipped(false);
    }
  }

  // Lobby
  if (!session) return (
    <div style={{ padding: "32px 20px", maxWidth: 460, margin: "0 auto", textAlign: "center" }} className="appear">
      <div style={{ fontFamily: "'Russo One', sans-serif", fontSize: 19, letterSpacing: 2, marginBottom: 28 }}>ФЛЕШ-КАРТОЧКИ</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
        <Stat n={dueCount} label="К ПОВТОРУ" hot={dueCount > 0} />
        <Stat n={phrases.length} label="ВСЕГО" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        <button onClick={() => start(false)} disabled={dueCount === 0} className="btn-hover"
          style={{ background: dueCount > 0 ? "#CC2200" : "#111", border: `1px solid ${dueCount > 0 ? "#CC2200" : "#222"}`, color: dueCount > 0 ? "#fff" : "#444", padding: "16px", fontSize: 12, letterSpacing: 1.5, opacity: dueCount > 0 ? 1 : 0.5 }}>
          {dueCount > 0 ? `ПОВТОРИТЬ (${dueCount})` : "ВСЁПОВТОРЕНО ✓"}
        </button>
        <button onClick={() => start(true)} disabled={!hasAnyPhrases} className="btn-hover"
          style={{ background: hasAnyPhrases ? "#0e0e0e" : "#111", border: "1px solid #222", color: hasAnyPhrases ? "#666" : "#444", padding: "16px", fontSize: 12, letterSpacing: 1.5, opacity: hasAnyPhrases ? 1 : 0.5 }}>
          ПОВТОРИТЬ ВСЕ {phrases.length}
        </button>
      </div>
      <div style={{ fontSize: 11, color: "#333", lineHeight: 1.7 }}>
        Интервальное повторение: карточки возвращаются именно тогда, когда ты должен забыть.
      </div>
    </div>
  );

  // Results
  if (session.done) return (
    <div style={{ padding: "32px 20px", maxWidth: 460, margin: "0 auto", textAlign: "center" }} className="appear">
      <div style={{ fontFamily: "'Russo One', sans-serif", fontSize: 56, color: "#CC2200", lineHeight: 1, marginBottom: 8 }}>✓</div>
      <div style={{ fontFamily: "'Russo One', sans-serif", fontSize: 18, letterSpacing: 1, marginBottom: 24 }}>СЕССИЯ ЗАВЕРШЕНА</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
        <Stat n={session.stats.done} label="ПРОЙДЕНО" />
        <Stat n={session.stats.again} label="СНОВА" hot={session.stats.again > 0} />
      </div>
      <button onClick={() => setSession(null)} className="btn-hover"
        style={{ background: "#CC2200", color: "#fff", padding: "14px 36px", fontSize: 12, letterSpacing: 2 }}>
        НАЗАД
      </button>
    </div>
  );

  const card = session.queue[session.idx];
  if (!card) return (
    <div style={{ padding: "32px 20px", maxWidth: 460, margin: "0 auto", textAlign: "center" }} className="appear">
      <div style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>РЎРµСЃСЃРёСЏ РЅРµРґРѕСЃС‚СѓРїРЅР°</div>
      <button onClick={() => setSession(null)} className="btn-hover"
        style={{ background: "#CC2200", color: "#fff", padding: "12px 24px", fontSize: 11, letterSpacing: 1.5 }}>
        РќРђР—РђР”
      </button>
    </div>
  );

  return (
    <div style={{ padding: "24px 20px", maxWidth: 460, margin: "0 auto" }} className="appear">
      {/* Progress bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 10, color: "#444", flexShrink: 0 }}>{session.idx + 1}/{session.queue.length}</span>
        <div style={{ flex: 1, height: 2, background: "#1a1a1a", borderRadius: 2 }}>
          <div style={{ height: "100%", background: "#CC2200", width: `${(session.idx / session.queue.length) * 100}%`, transition: "width 0.3s" }} />
        </div>
        <button onClick={() => setSession(null)} style={{ background: "none", color: "#333", fontSize: 13, transition: "color 0.1s" }}
          onMouseEnter={e => e.currentTarget.style.color = "#aaa"}
          onMouseLeave={e => e.currentTarget.style.color = "#333"}>✕</button>
      </div>

      {/* Card face */}
      <div onClick={() => { if (!flipped) { setFlipped(true); speak(card.russian); } }}
        key={session.idx + "-" + flipped}
        style={{ background: "#0a0a0a", border: `1px solid ${flipped ? "#CC220055" : "#1e1e1e"}`, minHeight: 220, padding: "32px 24px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", cursor: flipped ? "default" : "pointer", marginBottom: 16, transition: "border-color 0.2s" }}
        className="appear">
        {!flipped ? (
          <>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#333", marginBottom: 20 }}>СКАЖИ ВСЛУХ → ОТКРОЙ</div>
            <div style={{ fontFamily: "'Russo One', sans-serif", fontSize: 30, letterSpacing: 1 }}>{card.russian}</div>
            {card.pronunciation && <div style={{ fontSize: 12, color: "#444", marginTop: 8, fontStyle: "italic" }}>{card.pronunciation}</div>}
            <div style={{ marginTop: 20, width: 22, height: 22, color: "#333" }}>{Ic.sound}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#CC2200", marginBottom: 16 }}>ПЕРЕВОД</div>
            <div style={{ fontFamily: "'Russo One', sans-serif", fontSize: 24, marginBottom: 8 }}>{card.russian}</div>
            <div style={{ fontSize: 14, color: "#aaa", marginBottom: 8 }}>{card.english}</div>
            {card.pronunciation && <div style={{ fontSize: 11, color: "#444", fontStyle: "italic", marginBottom: 12 }}>{card.pronunciation}</div>}
            <div style={{ fontSize: 8, padding: "3px 8px", background: CAT_COLOR[card.category] + "18", color: CAT_COLOR[card.category], letterSpacing: 1.5 }}>
              {CAT_LABEL[card.category]}
            </div>
            <button onClick={() => speak(card.russian)} style={{ marginTop: 14, background: "none", color: "#444", width: 20, height: 20, transition: "color 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.color = "#CC2200"}
              onMouseLeave={e => e.currentTarget.style.color = "#444"}>
              {Ic.sound}
            </button>
          </>
        )}
      </div>

      {/* Rating */}
      {flipped ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 7 }} className="appear">
          {[
            { q: 1, label: "СНОВА", color: "#FF3333" },
            { q: 2, label: "ТРУДНО", color: "#FF8800" },
            { q: 3, label: "ХОРОШО", color: "#44BB66" },
            { q: 4, label: "ЛЕГКО", color: "#4499FF" },
          ].map(({ q, label, color }) => (
            <button key={q} onClick={() => rate(q)} className="btn-hover"
              style={{ background: "#0e0e0e", border: `1px solid ${color}44`, color, padding: "12px 4px", fontSize: 8, letterSpacing: 1.5 }}
              onMouseEnter={e => { e.currentTarget.style.background = color + "1a"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#0e0e0e"; }}>
              {label}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", fontSize: 10, color: "#2a2a2a", letterSpacing: 1 }}>
          нажми на карточку чтобы открыть
        </div>
      )}
    </div>
  );
}

// ─── Presentation Mode ────────────────────────────────────────────────────────
function PresentationMode({ script, setScript, stumbles: storedStumbles, setStumbles }) {
  const [view, setView] = useState("edit"); // edit | drill | results
  const [sentences, setSentences] = useState([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionStumbles, setSessionStumbles] = useState({});

  function parse(text) {
    return text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 8);
  }

  function startDrill() {
    const s = parse(script);
    if (!s.length) return;
    setSentences(s);
    setIdx(0);
    setRevealed(false);
    setSessionStumbles({});
    setView("drill");
  }

  function next(stumbled) {
    speak(sentences[idx]);
    const key = sentenceKey(sentences[idx]);
    const newSS = stumbled ? { ...sessionStumbles, [key]: (sessionStumbles[key] || 0) + 1 } : sessionStumbles;
    if (stumbled) setSessionStumbles(newSS);
    if (idx + 1 >= sentences.length) {
      // Merge into global stumbles
      const merged = { ...storedStumbles };
      Object.keys(newSS).forEach(k => { merged[k] = (merged[k] || 0) + newSS[k]; });
      setStumbles(merged);
      setView("results");
    } else {
      setIdx(i => i + 1);
      setRevealed(false);
    }
  }

  const parsedScript = parse(script);
  const stumbles = parsedScript.reduce((mapped, sentence, index) => {
    mapped[index] = storedStumbles[sentenceKey(sentence)] || 0;
    return mapped;
  }, {});
  const totalStumbles = parsedScript.reduce((total, sentence) => total + (storedStumbles[sentenceKey(sentence)] || 0), 0);

  // Edit view
  if (view === "edit") return (
    <div style={{ padding: "24px 20px", maxWidth: 580, margin: "0 auto" }} className="appear">
      <div style={{ fontFamily: "'Russo One', sans-serif", fontSize: 19, letterSpacing: 2, marginBottom: 8 }}>ПРЕЗЕНТАЦИЯ</div>
      <div style={{ fontSize: 11, color: "#555", marginBottom: 18, lineHeight: 1.7 }}>
        Вставь текст своей презентации. Приложение разберёт его на предложения и отследит где ты запинаешься.
      </div>
      <textarea value={script} onChange={e => setScript(e.target.value)}
        placeholder="Вставь текст презентации по-русски..."
        style={{ width: "100%", height: 240, background: "#0a0a0a", border: "1px solid #1e1e1e", color: "#ddd", padding: "14px 16px", fontSize: 12, lineHeight: 1.8 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 10, color: "#444" }}>{parse(script).length} предложений</span>
        <button onClick={startDrill} disabled={parse(script).length === 0} className="btn-hover"
          style={{ background: script.trim() ? "#CC2200" : "#111", border: `1px solid ${script.trim() ? "#CC2200" : "#222"}`, color: script.trim() ? "#fff" : "#444", padding: "12px 24px", fontSize: 11, letterSpacing: 1.5 }}>
          НАЧАТЬ ПРОГОН →
        </button>
      </div>

      {/* Hard sentences panel */}
      {totalStumbles > 0 && (
        <div>
          <div style={{ fontSize: 8, letterSpacing: 3, color: "#CC2200", marginBottom: 12 }}>СЛОЖНЫЕ МЕСТА (всего прогонов)</div>
          {parsedScript.map((s, i) => stumbles[i] > 0 && (
            <div key={`${sentenceKey(s)}-${i}`} style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderLeft: `3px solid #FF3333`, padding: "10px 12px", marginBottom: 5, display: "flex", justifyContent: "space-between", gap: 10, cursor: "pointer" }}
              onClick={() => speak(s)}>
              <span style={{ fontSize: 11, color: "#888", lineHeight: 1.5 }}>{s}</span>
              <span style={{ fontSize: 11, color: "#FF3333", flexShrink: 0 }}>×{stumbles[i]}</span>
            </div>
          ))}
          <button onClick={() => setStumbles({})} style={{ marginTop: 8, background: "none", color: "#333", fontSize: 9, letterSpacing: 1, textDecoration: "underline" }}>
            сбросить статистику
          </button>
        </div>
      )}
    </div>
  );

  // Results view
  if (view === "results") {
    const hard = [...new Set(sentences.filter(sentence => sessionStumbles[sentenceKey(sentence)]))];
    return (
      <div style={{ padding: "32px 20px", maxWidth: 460, margin: "0 auto", textAlign: "center" }} className="appear">
        <div style={{ fontFamily: "'Russo One', sans-serif", fontSize: 52, color: "#CC2200", lineHeight: 1, marginBottom: 8 }}>✓</div>
        <div style={{ fontFamily: "'Russo One', sans-serif", fontSize: 18, letterSpacing: 1, marginBottom: 8 }}>ПРОГОН ЗАВЕРШЁН</div>
        <div style={{ fontSize: 12, color: "#555", marginBottom: 28 }}>
          {hard.length > 0 ? `${hard.length} сложных из ${sentences.length} предложений` : `Отлично — ни одной запинки!`}
        </div>
        {hard.length > 0 && (
          <div style={{ textAlign: "left", marginBottom: 24 }}>
            <div style={{ fontSize: 8, letterSpacing: 3, color: "#CC2200", marginBottom: 10 }}>ПОВТОРИ ЭТИ:</div>
            {hard.map((s, i) => (
              <div key={i} style={{ background: "#0a0a0a", border: "1px solid #CC220033", padding: "10px 12px", marginBottom: 5, fontSize: 11, color: "#888", lineHeight: 1.5, cursor: "pointer" }}
                onClick={() => speak(s)}>{s}</div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={startDrill} className="btn-hover" style={{ background: "#CC2200", color: "#fff", padding: "12px 24px", fontSize: 11, letterSpacing: 1.5 }}>ЕЩЁ РАЗ</button>
          <button onClick={() => setView("edit")} className="btn-hover" style={{ background: "#111", border: "1px solid #222", color: "#888", padding: "12px 24px", fontSize: 11, letterSpacing: 1.5 }}>НАЗАД</button>
        </div>
      </div>
    );
  }

  // Drill view
  const sentence = sentences[idx];
  return (
    <div style={{ padding: "24px 20px", maxWidth: 460, margin: "0 auto" }} className="appear">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 10, color: "#444", flexShrink: 0 }}>{idx + 1}/{sentences.length}</span>
        <div style={{ flex: 1, height: 2, background: "#1a1a1a" }}>
          <div style={{ height: "100%", background: "#CC2200", width: `${(idx / sentences.length) * 100}%`, transition: "width 0.3s" }} />
        </div>
        <button onClick={() => setView("edit")} style={{ background: "none", color: "#333", fontSize: 13, transition: "color 0.1s" }}
          onMouseEnter={e => e.currentTarget.style.color = "#aaa"}
          onMouseLeave={e => e.currentTarget.style.color = "#333"}>✕</button>
      </div>

      <div key={idx} style={{ background: "#0a0a0a", border: `1px solid ${revealed ? "#CC220055" : "#1a1a1a"}`, minHeight: 200, padding: "28px 22px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", marginBottom: 16, transition: "border-color 0.2s" }}
        className="appear">
        {!revealed ? (
          <>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#333", marginBottom: 24 }}>СКАЖИ ПО-РУССКИ:</div>
            <button onClick={() => { setRevealed(true); speak(sentence); }} className="btn-hover"
              style={{ background: "#151515", border: "1px solid #282828", color: "#888", padding: "14px 24px", fontSize: 11, letterSpacing: 1 }}>
              ПОКАЗАТЬ ТЕКСТ
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#CC2200", marginBottom: 18 }}>ПРЕДЛОЖЕНИЕ:</div>
            <div style={{ fontFamily: "'Russo One', sans-serif", fontSize: 18, lineHeight: 1.6, letterSpacing: 0.3 }}>{sentence}</div>
            <button onClick={() => speak(sentence)} style={{ marginTop: 18, background: "none", color: "#444", width: 20, height: 20, transition: "color 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.color = "#CC2200"}
              onMouseLeave={e => e.currentTarget.style.color = "#444"}>
              {Ic.sound}
            </button>
          </>
        )}
      </div>

      {revealed ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="appear">
          <button onClick={() => next(true)} className="btn-hover"
            style={{ background: "#0e0e0e", border: "1px solid #FF333344", color: "#FF3333", padding: "14px", fontSize: 10, letterSpacing: 1.5 }}>
            ✗ ЗАПНУЛСЯ
          </button>
          <button onClick={() => next(false)} className="btn-hover"
            style={{ background: "#0e0e0e", border: "1px solid #44BB6644", color: "#44BB66", padding: "14px", fontSize: 10, letterSpacing: 1.5 }}>
            ✓ ЧИСТО
          </button>
        </div>
      ) : (
        <div style={{ textAlign: "center", fontSize: 10, color: "#252525", letterSpacing: 1 }}>
          попробуй сказать предложение до того как откроешь
        </div>
      )}
    </div>
  );
}

// ─── Stat box helper ──────────────────────────────────────────────────────────
function Stat({ n, label, hot = false }) {
  return (
    <div style={{ background: "#0a0a0a", border: `1px solid ${hot ? "#CC220055" : "#1a1a1a"}`, padding: "22px 12px", textAlign: "center" }}>
      <div style={{ fontFamily: "'Russo One', sans-serif", fontSize: 36, color: hot ? "#FF3333" : "#ddd" }}>{n}</div>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#444", marginTop: 4 }}>{label}</div>
    </div>
  );
}
