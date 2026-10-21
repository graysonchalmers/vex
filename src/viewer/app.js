// vex live viewer. Plain browser JS, no build step. SVGs are shown through <img> data URLs,
// so art never runs as page markup.
const $ = (id) => document.getElementById(id);
const view = $("view"), slider = $("slider");
let state, sel = localStorage.getItem("vex.sel") || undefined, cur, step = 0, timer, mode = "steps";

const url = (svg) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

function docFor(a, k) {
  // Step k: every raw step up to k, before mirror/outline. Last index: the finished asset.
  if (k >= a.steps.length) return a.final;
  const b = a.box;
  const body = a.steps.slice(0, k + 1).map((s) => s.body).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.x} ${b.y} ${b.w} ${b.h}" width="${b.w}" height="${b.h}"><defs>${a.defs}</defs>${body}</svg>`;
}

function stepCount(a) { return a.steps.length + 1; }

function show() {
  if (!cur) { view.removeAttribute("src"); $("info").textContent = ""; return; }
  const last = stepCount(cur) - 1;
  view.src = url(docFor(cur, step));
  slider.max = String(last);
  slider.value = String(step);
  $("count").textContent = `${step + 1}/${last + 1}`;
  const s = step < cur.steps.length ? cur.steps[step] : { label: cur.post.length ? `final: ${cur.post.join(", ")}` : "final", loc: cur.loc };
  $("info").innerHTML = `<b>${esc(s.label)}</b>  ${esc(s.loc || "")}`;
  [...$("steps").children].forEach((li, i) => li.classList.toggle("cur", i === step));
  $("steps").children[step]?.scrollIntoView({ block: "nearest" });
}

function esc(s) { return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]); }

function stop() { clearInterval(timer); timer = undefined; $("play").textContent = "▶ steps"; $("anim").textContent = "▶ anim"; }

function playSteps() {
  if (!cur) return;
  stop();
  mode = "steps";
  step = 0;
  show();
  $("play").textContent = "■ stop";
  const last = stepCount(cur) - 1;
  timer = setInterval(() => { if (step >= last) return stop(); step++; show(); }, Math.max(40, Math.min(300, 4000 / last)));
}

function playAnim() {
  if (!cur?.anim) return;
  stop();
  mode = "anim";
  let i = 0;
  $("anim").textContent = "■ stop";
  timer = setInterval(() => { view.src = url(cur.anim[i % cur.anim.length]); $("count").textContent = `frame ${i % cur.anim.length}`; i++; }, 1000 / cur.fps);
}

async function select(name, replay) {
  sel = name;
  localStorage.setItem("vex.sel", name);
  renderList();
  const info = state?.assets.find((a) => a.name === name);
  $("err").style.display = info?.error ? "block" : "none";
  if (info?.error) { $("err").textContent = info.error.message; cur = undefined; show(); return; }
  const r = await fetch(`/api/asset?name=${encodeURIComponent(name)}`);
  if (!r.ok || sel !== name) return;
  const prevLast = cur ? stepCount(cur) - 1 : -1, wasEnd = step >= prevLast;
  cur = await r.json();
  const last = stepCount(cur) - 1;
  $("steps").innerHTML = "";
  [...cur.steps.map((s) => s.label), cur.post.length ? `final: ${cur.post.join(", ")}` : "final"].forEach((l, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="i">${i}</span><span class="l">${esc(l)}</span>`;
    li.onclick = () => { stop(); step = i; show(); };
    $("steps").appendChild(li);
  });
  $("pal").innerHTML = Object.entries(cur.palette).map(([k, v]) => `<span data-c="${esc(v)}" title="click to draw with it"><i style="background:${v}"></i>${esc(k)}</span>`).join("");
  for (const el of $("pal").children) el.onclick = () => { if (!annotating) setAnnotate(true); pen = el.dataset.c; tool = "pen"; renderAnnot(); };
  $("anim").style.display = cur.anim ? "" : "none";
  stop();
  step = wasEnd ? last : Math.min(step, last);
  if (annotating) { step = last; renderAnnot(); }
  if (replay && !annotating) playSteps(); else show();
  drawMarks();
}

function renderList() {
  const box = $("assets"), q = $("filter").value.trim().toLowerCase();
  box.innerHTML = "";
  if (!state) return;
  const groups = [["scenes", (a) => a.kind === "scene"], ["anims", (a) => a.kind === "anim" && !a.part], ["sprites", (a) => a.kind === "sprite" && !a.part], ["parts", (a) => a.part]];
  for (const [title, pred] of groups) {
    const items = state.assets.filter((a) => pred(a) && a.name.toLowerCase().includes(q));
    if (!items.length) continue;
    const h = document.createElement("div");
    h.className = "sect";
    h.textContent = title;
    box.appendChild(h);
    for (const a of items) {
      const row = document.createElement("div");
      row.className = "row" + (a.name === sel ? " sel" : "");
      row.innerHTML = (a.svg ? `<img src="${url(a.svg)}">` : `<span class="x"></span>`) + `<span class="nm">${esc(a.name)}</span>` +
        (a.error ? `<span class="dot err"></span>` : a.changed && state.version > 1 ? `<span class="dot new"></span>` : "");
      row.onclick = () => select(a.name, true);
      box.appendChild(row);
    }
  }
}

$("filter").oninput = renderList;
$("play").onclick = () => (timer && mode === "steps" ? stop() : playSteps());
$("anim").onclick = () => (timer && mode === "anim" ? stop() : playAnim());
slider.oninput = () => { stop(); step = Number(slider.value); show(); };
addEventListener("keydown", (e) => {
  if (e.target === $("filter") || e.target.tagName === "TEXTAREA" || !cur) return;
  if (e.key === "a") return setAnnotate(!annotating);
  if (annotating && "bne".includes(e.key)) { tool = e.key === "b" ? "pen" : e.key === "n" ? "note" : "erase"; return renderAnnot(); }
  if (e.key === "ArrowLeft") { stop(); step = Math.max(0, step - 1); show(); }
  if (e.key === "ArrowRight") { stop(); step = Math.min(stepCount(cur) - 1, step + 1); show(); }
  if (e.key === " ") { e.preventDefault(); $("play").click(); }
});

const es = new EventSource("/events");
es.addEventListener("build", (e) => {
  const prev = state;
  state = JSON.parse(e.data);
  $("file").textContent = `${state.file}  v${state.version}  ${state.ms}ms`;
  const bad = state.error ? 1 : state.assets.filter((a) => a.error).length + state.errors.length;
  $("status").textContent = bad ? `${bad} error${bad > 1 ? "s" : ""}` : "ok";
  $("status").className = "pill " + (bad ? "bad" : "ok");
  if (state.error) { $("err").style.display = "block"; $("err").textContent = state.error.message; renderList(); return; }
  if (!sel || !state.assets.some((a) => a.name === sel)) sel = state.assets.find((a) => !a.part)?.name ?? state.assets[0]?.name;
  // Follow the edit: jump to the first changed asset and replay it.
  const changed = prev && state.assets.find((a) => a.changed && !a.part && !a.error);
  renderList();
  if (changed && changed.name !== sel) select(changed.name, true);
  else if (sel) select(sel, !!(prev && state.assets.find((a) => a.name === sel)?.changed));
});
es.onerror = () => { $("status").textContent = "disconnected"; $("status").className = "pill bad"; };

// ---------------------------------------------------------------- annotate: feedback for Claude
// Strokes and notes live in the asset's own units (its viewBox), kept per asset in localStorage
// until sent. Markup colors point at things; palette colors mean "make it this color".
const MARKUP = ["#ff3df0", "#2ee6ff", "#ffe14a", "#ffffff"], SIZES = [["thin", 3], ["medium", 7], ["thick", 14]];
const ann = $("ann"), g = ann.getContext("2d");
let annotating = false, tool = "pen", pen = MARKUP[0], sizeI = 0, drawing;

const marksKey = () => "vex.marks." + cur?.name;
function marks(create) {
  if (!cur) return undefined;
  cur.marks ??= (() => { try { return JSON.parse(localStorage.getItem(marksKey()) || "null"); } catch { return null; } })();
  if (!cur.marks && create) cur.marks = { strokes: [], notes: [], comment: "" };
  return cur.marks;
}
const save = () => { try { localStorage.setItem(marksKey(), JSON.stringify(cur.marks)); } catch { /* full or blocked */ } };

/** Where the art sits on screen (the <img> letterboxes it). */
function artRect() {
  const r = view.getBoundingClientRect(), s = ann.getBoundingClientRect(), b = cur.box;
  const k = Math.min(r.width / b.w, r.height / b.h);
  return { x: r.left - s.left + (r.width - b.w * k) / 2, y: r.top - s.top + (r.height - b.h * k) / 2, k };
}
const toUnits = (e) => { const a = artRect(), s = ann.getBoundingClientRect(); return [cur.box.x + (e.clientX - s.left - a.x) / a.k, cur.box.y + (e.clientY - s.top - a.y) / a.k]; };

function paintMarks(c, m, ox, oy, k, b) {
  for (const st of m.strokes) {
    c.strokeStyle = st.color; c.lineWidth = Math.max(1.5, st.width * k); c.lineCap = c.lineJoin = "round"; c.globalAlpha = 0.88;
    c.beginPath(); st.points.forEach(([x, y], i) => (i ? c.lineTo : c.moveTo).call(c, ox + (x - b.x) * k, oy + (y - b.y) * k)); c.stroke();
  }
  c.globalAlpha = 1;
  c.font = "700 13px ui-monospace, monospace"; c.textAlign = "center"; c.textBaseline = "middle";
  m.notes.forEach((n, i) => {
    const x = ox + (n.x - b.x) * k, y = oy + (n.y - b.y) * k;
    c.strokeStyle = "#ffb454"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 4, 0, 7); c.stroke();
    c.fillStyle = "#ffb454"; c.beginPath(); c.arc(x + 11, y - 11, 9, 0, 7); c.fill();
    c.fillStyle = "#15131c"; c.fillText(String(i + 1), x + 11, y - 10);
  });
}

function drawMarks() {
  const dpr = devicePixelRatio || 1, w = ann.clientWidth, h = ann.clientHeight;
  if (ann.width !== w * dpr || ann.height !== h * dpr) { ann.width = w * dpr; ann.height = h * dpr; }
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  const m = cur && marks(false);
  if (!m) return;
  const a = artRect();
  paintMarks(g, m, a.x, a.y, a.k, cur.box);
}

function setAnnotate(on) {
  annotating = on;
  document.body.classList.toggle("annotating", on);
  $("annotbtn").classList.toggle("on", on);
  if (on && cur) { stop(); step = stepCount(cur) - 1; show(); }
  renderAnnot(); drawMarks();
}

function renderAnnot() {
  for (const t of ["pen", "note", "erase"]) $("t-" + t).classList.toggle("on", tool === t);
  $("t-size").textContent = SIZES[sizeI][0];
  $("colors").innerHTML = "";
  for (const c of MARKUP.concat(MARKUP.includes(pen) ? [] : [pen])) {
    const b = document.createElement("button");
    b.className = "chip" + (c === pen && tool === "pen" ? " on" : ""); b.style.background = c;
    b.title = MARKUP.includes(c) ? "markup color" : "palette color: make it this";
    b.onclick = () => { pen = c; tool = "pen"; renderAnnot(); };
    $("colors").appendChild(b);
  }
  const m = marks(false);
  $("notes").innerHTML = "";
  m?.notes.forEach((n, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<b>${i + 1}</b><span>${esc(n.text)}</span><a title="remove">×</a>`;
    li.lastChild.onclick = () => { m.notes.splice(i, 1); save(); renderAnnot(); drawMarks(); };
    $("notes").appendChild(li);
  });
  $("comment").value = m?.comment ?? "";
}

function eraseAt(p) {
  const m = marks(false); if (!m) return;
  const a = artRect(), tol = 8 / a.k;
  const i = m.strokes.findIndex((s) => s.points.some(([x, y]) => Math.hypot(x - p[0], y - p[1]) < tol + s.width / 2));
  if (i >= 0) { m.strokes.splice(i, 1); save(); drawMarks(); }
}

ann.addEventListener("contextmenu", (e) => e.preventDefault());
ann.addEventListener("pointerdown", (e) => {
  if (!annotating || !cur) return;
  const p = toUnits(e), m = marks(true);
  if (e.button === 2 || tool === "erase") return eraseAt(p);
  if (tool === "note") {
    const text = prompt(`Note for Claude at ${p[0].toFixed(1)}, ${p[1].toFixed(1)}:`);
    if (text && text.trim()) { m.notes.push({ x: p[0], y: p[1], text: text.trim() }); save(); renderAnnot(); drawMarks(); }
    return;
  }
  drawing = { color: pen, width: SIZES[sizeI][1] / artRect().k, points: [p] };
  m.strokes.push(drawing);
  ann.setPointerCapture(e.pointerId);
});
ann.addEventListener("pointermove", (e) => {
  if (!drawing) return;
  const p = toUnits(e), q = drawing.points[drawing.points.length - 1];
  if (Math.hypot(p[0] - q[0], p[1] - q[1]) * artRect().k > 2) { drawing.points.push(p); drawMarks(); }
});
ann.addEventListener("pointerup", () => { if (drawing) { drawing = undefined; save(); drawMarks(); } });
addEventListener("resize", drawMarks);

async function sendFeedback() {
  const m = marks(false), st = $("fbstatus");
  if (!cur || !m) { st.textContent = "nothing to send yet"; return; }
  // the annotated image: the finished art at ~900 px with the marks and numbered pins
  const b = cur.box, k = 900 / Math.max(b.w, b.h), cv = document.createElement("canvas");
  cv.width = Math.round(b.w * k); cv.height = Math.round(b.h * k);
  const c = cv.getContext("2d"), img = new Image();
  img.src = url(cur.final);
  await img.decode().catch(() => {});
  c.fillStyle = "#14131b"; c.fillRect(0, 0, cv.width, cv.height); c.drawImage(img, 0, 0, cv.width, cv.height);
  paintMarks(c, m, 0, 0, k, b);
  st.textContent = "sending…";
  const r = await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: cur.name, strokes: m.strokes, notes: m.notes, comment: m.comment, annotated: cv.toDataURL("image/png") }) });
  const j = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
  st.textContent = r.ok ? `sent ✓ ${j.summary} — tell Claude to check the feedback` : `not sent: ${j.error}`;
}

$("annotbtn").onclick = () => setAnnotate(!annotating);
$("t-pen").onclick = () => { tool = "pen"; renderAnnot(); };
$("t-note").onclick = () => { tool = "note"; renderAnnot(); };
$("t-erase").onclick = () => { tool = "erase"; renderAnnot(); };
$("t-size").onclick = () => { sizeI = (sizeI + 1) % SIZES.length; renderAnnot(); };
$("t-clear").onclick = () => { if (cur && confirm(`Clear all marks and notes on ${cur.name}?`)) { cur.marks = undefined; localStorage.removeItem(marksKey()); renderAnnot(); drawMarks(); } };
$("comment").oninput = () => { const m = marks(true); if (m) { m.comment = $("comment").value; save(); } };
$("send").onclick = () => sendFeedback();
view.addEventListener("load", drawMarks);
