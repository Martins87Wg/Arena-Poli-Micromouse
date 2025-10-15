// ==========================
// Configs
// ==========================
const USE_BACKEND_TIME = true;   // queremos tempo do ESP
const POLL_MS = 50;
// Se o site NÃO estiver hospedado no ESP, informe o IP do ESP:
const BASE = ""; // ex.: "http://192.168.0.45"
const ENDPOINT = (p) => (BASE ? BASE + p : p);

// ==========================
const $        = (q) => document.querySelector(q);
const timerEl  = $("#timer");
const playBtn  = $("#playBtn");
const resetBtn = $("#resetBtn");
const chipConn = $("#conn");

// Estado local (fallback)
let runningLocal = false, t0 = 0, acc = 0;
// Estado de conectividade
let online = false;
// Habilita/desabilita “usar back-end” dinamicamente conforme conexão
let useBackend = USE_BACKEND_TIME;

// ========= Formatação =========
function fmt(ms) {
  const t  = Math.max(0, Math.floor(ms));
  const mm = Math.floor(t / 60000);
  const ss = Math.floor((t % 60000) / 1000);
  const cc = Math.floor((t % 1000) / 10);
  const MM = String(mm).padStart(2, "0");
  const SS = String(ss).padStart(2, "0");
  const CC = String(cc).padStart(2, "0");
  return `${MM}<span class="sep">:</span>${SS}<span class="sep">:</span>${CC}`;
}

// ========= UI =========
function setConn(v) {
  online = v;
  chipConn.textContent = v ? "ONLINE" : "OFFLINE";
  chipConn.style.color = v ? "#b9ffe6" : "#cfe7f6";
  chipConn.style.borderColor = v ? "#1aa67e" : "#77d1f8";
  // alterna modo
  useBackend = USE_BACKEND_TIME && v;
}

function renderLocal() {
  const elapsed = runningLocal ? (acc + (performance.now() - t0)) : acc;
  timerEl.innerHTML = fmt(elapsed);
  requestAnimationFrame(renderLocal);
}

// ========= Poll do ESP =========
async function poll() {
  try {
    const r = await fetch(ENDPOINT("/time"), { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    setConn(true);

    if (useBackend) {
      timerEl.innerHTML = fmt(j.ms || 0);
      if (typeof j.running === "boolean") {
        playBtn.textContent = j.running ? "PAUSE" : "PLAY";
      }
    }
  } catch (_) {
    setConn(false);
  } finally {
    setTimeout(poll, POLL_MS);
  }
}

// ========= Controles =========
async function playPause() {
  if (useBackend) {
    try { await fetch(ENDPOINT("/start"), { method: "POST" }); } catch {}
    return;
  }
  // modo local (offline)
  if (!runningLocal) {
    runningLocal = true; t0 = performance.now(); playBtn.textContent = "PAUSE";
  } else {
    runningLocal = false; acc += performance.now() - t0; playBtn.textContent = "PLAY";
  }
}

async function reset() {
  if (useBackend) {
    try { await fetch(ENDPOINT("/rearm"), { method: "POST" }); } catch {}
    timerEl.innerHTML = fmt(0);
    playBtn.textContent = "PLAY";
    return;
  }
  // local
  runningLocal = false; acc = 0; playBtn.textContent = "PLAY";
  timerEl.innerHTML = fmt(0);
}

// ========= Eventos =========
playBtn.addEventListener("click", playPause);
resetBtn.addEventListener("click", reset);
addEventListener("keydown", (e) => {
  if (e.code === "Space") { e.preventDefault(); playPause(); }
  if (e.key && e.key.toLowerCase() === "r") { reset(); }
});

// ========= Boot =========
timerEl.innerHTML = fmt(0);
requestAnimationFrame(renderLocal); // sempre renderiza local; backend sobrescreve
poll();
