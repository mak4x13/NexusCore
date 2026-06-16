// NexusCore dashboard — talks to the FastAPI backend.
// Same-origin when served by uvicorn; falls back to localhost:8000 for dev.
const API = location.port === "8000" || location.protocol === "file:"
  ? "http://localhost:8000"
  : location.origin;
const WS = API.replace(/^http/, "ws") + "/ws";

const feed = document.getElementById("feed");
const actionsEl = document.getElementById("actions");
const dot = document.getElementById("dot");
const conn = document.getElementById("conn");

let currentFeature = null;
const actionMap = new Map();

function apiHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("nexuscore_demo_token");
  if (token) headers["X-Demo-Token"] = token;
  return headers;
}

async function writeJson(url, payload) {
  let res = await fetch(url, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify(payload),
  });
  if (res.status === 401) {
    const token = prompt("Demo token required");
    if (token) {
      localStorage.setItem("nexuscore_demo_token", token.trim());
      res = await fetch(url, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(payload),
      });
    }
  }
  return res;
}

// ---- render helpers -------------------------------------------------------
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function renderMessage(m) {
  const div = document.createElement("div");
  div.className = `msg role-${m.role}`;
  div.innerHTML = `
    <div class="head">
      <span class="author">${m.author}</span>
      <span class="time">${fmtTime(m.created_at)}</span>
    </div>
    <div class="body">${escapeHtml(m.content)}</div>`;
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}

function renderAction(a) {
  let el = actionMap.get(a.id);
  if (!el) {
    el = document.createElement("div");
    actionMap.set(a.id, el);
    actionsEl.prepend(el);
  }
  el.className = `action ${a.status}`;
  const held = a.status === "HELD";
  el.innerHTML = `
    <span class="badge ${a.status}">${a.status}</span>
    <div class="risk">by <b>${escapeHtml(a.agent)}</b></div>
    <div class="cmd">${escapeHtml(a.action)}</div>
    <div class="risk">⚠ ${escapeHtml(a.risk)}</div>
    ${a.reason ? `<div class="risk">🧠 ${escapeHtml(a.decided_by || "")}: ${escapeHtml(a.reason)}</div>` : ""}
    ${held ? `<div class="btns">
        <button class="btn-allow" data-id="${a.id}" data-allow="1">ALLOW</button>
        <button class="btn-block" data-id="${a.id}" data-allow="0">BLOCK</button>
      </div>` : ""}`;
  if (held) {
    el.querySelectorAll("button").forEach(b =>
      b.onclick = () => decide(b.dataset.id, b.dataset.allow === "1"));
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// ---- actions --------------------------------------------------------------
async function sendFeature() {
  const input = document.getElementById("feature");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  const res = await writeJson(`${API}/api/features`, { text });
  const f = await res.json();
  currentFeature = f.id;
}

async function triggerBand() {
  const input = document.getElementById("feature");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  const res = await writeJson(`${API}/api/band/trigger`, {
    text,
    mention: ["proposer", "risk", "compliance"],
  });
  if (!res.ok) alert("Band trigger failed: " + (await res.text()));
}

async function simulate() {
  const res = await writeJson(`${API}/api/actions/propose`, {
    feature_id: currentFeature,
    agent: "Engineer Agent",
    action: "DROP DATABASE users; -- cleanup before rebuild",
    risk: "Destroys 1,200 companies' production data. Irreversible.",
  });
  if (!res.ok) alert("Simulation failed: " + (await res.text()));
}

async function decide(id, allow) {
  const res = await writeJson(`${API}/api/actions/${id}/decide`, {
    allow,
    decided_by: "Master Agent",
    reason: allow ? "Verified safe in context." : "Refused: no rollback, hits production.",
  });
  if (!res.ok) alert("Decision failed: " + (await res.text()));
}

// ---- live socket ----------------------------------------------------------
function connect() {
  const sock = new WebSocket(WS);
  sock.onopen = () => { dot.className = "dot on"; conn.textContent = "live"; };
  sock.onclose = () => {
    dot.className = "dot off"; conn.textContent = "reconnecting…";
    setTimeout(connect, 1500);
  };
  sock.onmessage = (e) => {
    const { kind, data } = JSON.parse(e.data);
    if (kind === "snapshot") {
      feed.innerHTML = ""; actionsEl.innerHTML = ""; actionMap.clear();
      data.messages.forEach(renderMessage);
      data.actions.forEach(renderAction);
    } else if (kind === "message") {
      renderMessage(data);
    } else if (kind === "action") {
      renderAction(data);
    }
  };
}

document.getElementById("feature").addEventListener("keydown",
  e => { if (e.key === "Enter") triggerBand(); });
document.getElementById("demo").onclick = simulate;
document.getElementById("band").onclick = triggerBand;
connect();

// Poll the REAL Band room history = live audit trail mirrored into the feed.
const seenBand = new Set();
async function pollBand() {
  try {
    const res = await fetch(`${API}/api/band/messages`);
    if (!res.ok) return;
    const msgs = await res.json();
    for (const m of msgs) {
      if (seenBand.has(m.id)) continue;
      seenBand.add(m.id);
      renderMessage(m);
    }
  } catch (e) { /* room not reachable yet */ }
}
pollBand();
setInterval(pollBand, 3000);

// Show which live Band room the dashboard is mirroring.
async function showRoom() {
  try {
    const r = await fetch(`${API}/api/band/room`);
    if (!r.ok) return;
    const { room, link } = await r.json();
    const el = document.getElementById("roomlink");
    el.href = link;
    el.textContent = "🔗 Band room: " + room.slice(0, 8) + "…";
  } catch (e) { /* ignore */ }
}
showRoom();
