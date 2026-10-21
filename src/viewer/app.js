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
  $("pal").innerHTML = Object.entries(cur.palette).map(([k, v]) => `<span><i style="background:${v}"></i>${esc(k)}</span>`).join("");
  $("anim").style.display = cur.anim ? "" : "none";
  stop();
  step = wasEnd ? last : Math.min(step, last);
  if (replay) playSteps(); else show();
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
  if (e.target === $("filter") || !cur) return;
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
