// ==========================
// Configs (GitHub Pages)
// ==========================

// Se abrir o site no GitHub Pages com domínio em HTTP (Enforce HTTPS DESLIGADO)
// ou com um proxy HTTPS que redirecione para o ESP, deixe o IP do ESP:
const BASE = "http://192.168.4.1";   // SoftAP da caixinha
const USE_BACKEND_TIME = true;
const POLL_MS = 80;

const ENDPOINT = (p) => (BASE ? BASE + p : p);

const $        = (q) => document.querySelector(q);
const timerEl  = $("#timer");
const playBtn  = $("#playBtn");
const resetBtn = $("#resetBtn");
const chipConn = $("#conn");

let runningLocal = false, t0 = 0, acc = 0;
let online = false;
let useBackend = USE_BACKEND_TIME;

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

function setConn(v) {
  online = v;
  chipConn.textContent   = v ? "ONLINE" : "OFFLINE";
  chipConn.style.color   = v ? "#b9ffe6" : "#cfe7f6";
  chipConn.style.borderColor = v ? "#1aa67e" : "#77d1f8";
  useBackend = USE_BACKEND_TIME && v;
}

function renderLocal() {
  const elapsed = runningLocal ? (acc + (performance.now() - t0)) : acc;
  timerEl.innerHTML = fmt(elapsed);
  requestAnimationFrame(renderLocal);
}

async function poll() {
  try {
    // IMPORTANTE: usar CORS + credenciais desabilitadas (não precisa cookie)
    const r = await fetch(ENDPOINT("/time"), {
      cache: "no-store",
      mode: "cors"
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    setConn(true);
    if (useBackend) {
      timerEl.innerHTML = fmt(j.ms || 0);
      if (typeof j.running === "boolean") {
        playBtn.textContent = j.running ? "PAUSE" : "PLAY";
      }
    }
  } catch (e) {
    setConn(false);
  } finally {
    setTimeout(poll, POLL_MS);
  }
}

async function playPause() {
  if (useBackend) {
    try {
      await fetch(ENDPOINT("/start"), { method: "POST", mode: "cors" });
    } catch {}
    return;
  }
  if (!runningLocal) {
    runningLocal = true; t0 = performance.now(); playBtn.textContent = "PAUSE";
  } else {
    runningLocal = false; acc += performance.now() - t0; playBtn.textContent = "PLAY";
  }
}

async function reset() {
  if (useBackend) {
    try { await fetch(ENDPOINT("/rearm"), { method: "POST", mode: "cors" }); } catch {}
    timerEl.innerHTML = fmt(0);
    playBtn.textContent = "PLAY";
    return;
  }
  runningLocal = false; acc = 0; playBtn.textContent = "PLAY";
  timerEl.innerHTML = fmt(0);
}

playBtn.addEventListener("click", playPause);
resetBtn.addEventListener("click", reset);
addEventListener("keydown", (e) => {
  if (e.code === "Space") { e.preventDefault(); playPause(); }
  if (e.key && e.key.toLowerCase() === "r") { reset(); }
});

timerEl.innerHTML = fmt(0);
requestAnimationFrame(renderLocal);
poll();
