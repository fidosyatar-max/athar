// ===== JajanKu - script.js =====
// 1. Alat bantu
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const rp = (n) => "Rp" + Number(n || 0).toLocaleString("id-ID");
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const dstr = (d) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 6e4)
    .toISOString()
    .slice(0, 10);
const today = () => dstr(new Date());
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dstr(d);
};

// 2. Data (disimpan di LocalStorage)
let db = JSON.parse(
  localStorage.getItem("jajanku") ||
    '{"users":{},"session":null,"theme":"light"}',
);
let me = null;
const save = () => localStorage.setItem("jajanku", JSON.stringify(db));

// 3. Hitungan
const sumBy = (type, fn) =>
  me.tx
    .filter((t) => t.type === type && (!fn || fn(t)))
    .reduce((a, t) => a + t.amount, 0);
const saldo = () => sumBy("saku") - sumBy("jajan") - sumBy("tabung");
const jajanHariIni = () => sumBy("jajan", (t) => t.date === today());
const saved = (g) => sumBy("tabung", (t) => t.goal === g.id);
const level = () => Math.floor(me.xp / 100) + 1;
function streak() {
  const days = new Set(
    me.tx.filter((t) => t.type === "tabung").map((t) => t.date),
  );
  let n = 0,
    i = days.has(today()) ? 0 : 1;
  while (days.has(daysAgo(i))) {
    n++;
    i++;
  }
  return n;
}
const MOTIVASI = [
  "Menabung sedikit demi sedikit lama-lama jadi bukit! ⛰️",
  "Beli yang perlu dulu, baru yang ingin. 💡",
  "Setiap Rp1.000 berarti! 🐷",
  "Impianmu dekat kalau kamu sabar. 🎯",
  "Hemat hari ini, senang esok hari. 😄",
];
const BADGES = [
  ["🥉", "Penabung Pemula", () => me.tx.some((t) => t.type === "tabung")],
  [
    "🥈",
    "Rajin Menabung",
    () => me.tx.filter((t) => t.type === "tabung").length >= 5,
  ],
  ["🥇", "Target Tercapai", () => me.goals.some((g) => g.done)],
  ["💰", "Money Saver", () => sumBy("tabung") >= 100000],
  ["🔥", "Streak 7 Hari", () => streak() >= 7],
];

// 4. Login / Daftar
function toggleAuth(reg) {
  $("#loginForm").hidden = reg;
  $("#regForm").hidden = !reg;
}
function start() {
  me = db.users[db.session];
  if (!me) {
    $("#auth").hidden = false;
    $("#app").hidden = true;
    return;
  }
  $("#auth").hidden = true;
  $("#app").hidden = false;
  $("#hello").textContent = `Halo, ${me.name}! 👋`;
  renderAll();
}
function logout() {
  db.session = null;
  save();
  me = null;
  start();
}

// 5. Form (satu tempat untuk semua)
const forms = {
  loginForm: (d) => {
    const u = db.users[d.email.toLowerCase()];
    if (!u || u.pass !== d.pass) return alert("Email atau password salah.");
    db.session = d.email.toLowerCase();
    save();
    start();
  },
  regForm: (d) => {
    const em = d.email.toLowerCase();
    if (d.pass !== d.pass2) return alert("Konfirmasi password tidak sama.");
    if (db.users[em]) return alert("Email sudah terdaftar.");
    db.users[em] = {
      name: d.name,
      email: em,
      pass: d.pass,
      tx: [],
      goals: [],
      limit: 0,
      xp: 0,
    };
    db.session = em;
    save();
    start();
  },
  sakuForm: (d) =>
    addTx(
      {
        type: "saku",
        name: "Uang saku " + d.cat,
        cat: d.cat,
        amount: +d.amount,
        note: d.note,
        date: today(),
      },
      0,
    ),
  jajanForm: (d) =>
    addTx(
      {
        type: "jajan",
        name: d.name,
        cat: d.cat,
        amount: +d.amount,
        note: d.note,
        date: d.date,
      },
      2,
    ),
  limitForm: (d) => {
    me.limit = +d.limit;
  },
  goalForm: (d) =>
    me.goals.push({
      id: Date.now(),
      name: d.name,
      target: +d.target,
      deadline: d.deadline,
      done: false,
    }),
  saveForm: (d) => {
    const g = me.goals.find((x) => x.id == d.goal);
    if (!g) return alert("Buat target dulu ya!");
    if (+d.amount > saldo()) return alert("Saldo tidak cukup!");
    addTx(
      {
        type: "tabung",
        name: "Tabung: " + g.name,
        cat: "Tabungan",
        amount: +d.amount,
        goal: g.id,
        date: today(),
      },
      10,
    );
    if (!g.done && saved(g) >= g.target) {
      g.done = true;
      me.xp += 30;
      alert("🎉 Target tercapai! +30 XP");
    }
  },
  nameForm: (d) => {
    me.name = d.name;
    $("#hello").textContent = `Halo, ${me.name}! 👋`;
  },
  passForm: (d) => {
    if (d.old !== me.pass) return alert("Password lama salah.");
    me.pass = d.new;
    alert("Password diganti.");
  },
};
function addTx(t, xp) {
  t.id = Date.now();
  t.xp = xp;
  me.tx.push(t);
  me.xp += xp;
}
document.addEventListener("submit", (e) => {
  e.preventDefault();
  const fn = forms[e.target.id];
  if (!fn) return;
  fn(Object.fromEntries(new FormData(e.target)));
  e.target.reset();
  save();
  if (me) renderAll();
});

// 6. Aksi tombol
function del(id) {
  const t = me.tx.find((x) => x.id === id);
  if (!t || !confirm("Hapus transaksi ini?")) return;
  me.xp = Math.max(0, me.xp - (t.xp || 0));
  me.tx = me.tx.filter((x) => x.id !== id);
  save();
  renderAll();
}
function edit(id) {
  const t = me.tx.find((x) => x.id === id);
  const n = prompt("Nama/keterangan:", t.name);
  if (n === null) return;
  const a = +prompt("Jumlah (Rp):", t.amount);
  if (!(a > 0)) return alert("Jumlah tidak valid.");
  t.name = n;
  t.amount = a;
  save();
  renderAll();
}
function undo() {
  if (!me.tx.length) return alert("Belum ada transaksi.");
  del(me.tx[me.tx.length - 1].id);
}
function delGoal(id) {
  if (confirm("Hapus target? Tabungan di target ini tetap tercatat.")) {
    me.goals = me.goals.filter((g) => g.id !== id);
    save();
    renderAll();
  }
}
function setTheme(t) {
  db.theme = t;
  save();
  document.body.dataset.theme = t;
}
function resetXP() {
  if (confirm("Reset XP?")) {
    me.xp = 0;
    save();
    renderAll();
  }
}
function wipe() {
  if (confirm("Hapus SEMUA data & akun di browser ini?")) {
    localStorage.removeItem("jajanku");
    location.reload();
  }
}
function page(p) {
  $$("section").forEach((s) => s.classList.toggle("on", s.id === p));
  $$("#nav button").forEach((b) => b.classList.toggle("on", b.dataset.p === p));
}

// 7. Tampilan
const row = (
  t,
) => `<div class="item"><div>${esc(t.name)}<small>${t.date} · ${esc(t.cat || "")} ${t.note ? "· " + esc(t.note) : ""}</small></div>
  <div><span class="${t.type === "saku" ? "plus" : "minus"}">${t.type === "saku" ? "+" : "-"}${rp(t.amount)}</span>
  <button class="btn small" onclick="edit(${t.id})">✏️</button><button class="btn small danger" onclick="del(${t.id})">🗑️</button></div></div>`;
const list = (arr) =>
  arr.length
    ? arr.slice().reverse().map(row).join("")
    : '<p class="muted">Belum ada data.</p>';

function renderAll() {
  const s = saldo(),
    hari = jajanHariIni(),
    tab = sumBy("tabung");
  const goals = me.goals.map((g) => ({
    g,
    p: Math.min(100, Math.round((saved(g) / g.target) * 100)),
  }));
  const avg = goals.length
    ? Math.round(goals.reduce((a, x) => a + x.p, 0) / goals.length)
    : 0;
  const warns = [];
  if (me.limit && hari > me.limit)
    warns.push("⚠️ Kamu sudah melewati batas jajan hari ini!");
  else if (me.limit && hari >= me.limit * 0.8)
    warns.push("🍔 Batas jajan hampir tercapai.");
  if (s < 10000) warns.push("💸 Saldo hampir habis.");
  goals.forEach(({ g }) => {
    if (
      !g.done &&
      g.deadline &&
      (new Date(g.deadline) - new Date()) / 864e5 <= 3
    )
      warns.push(`⏰ Target "${esc(g.name)}" hampir deadline.`);
  });
  if (!me.tx.some((t) => t.type === "tabung" && t.date === today()))
    warns.push("🐷 Kamu belum menabung hari ini.");
  const tree =
    tab >= 500000 ? "🌲" : tab >= 200000 ? "🌳" : tab >= 50000 ? "🌿" : "🌱";

  $("#dash").innerHTML = `
    <div class="card"><div class="grid">
      <div class="stat">💵 Saldo<b>${rp(s)}</b></div><div class="stat">💸 Total pengeluaran<b>${rp(sumBy("jajan"))}</b></div>
      <div class="stat">🍔 Jajan hari ini<b>${rp(hari)}</b></div><div class="stat">🏦 Total tabungan<b>${rp(tab)}</b></div>
      <div class="stat">🎯 Progress target<b>${avg}%</b></div><div class="stat">⭐ XP · Level<b>${me.xp} · Lv ${level()}</b></div>
      <div class="stat">🔥 Streak<b>${streak()} hari</b></div></div></div>
    <div class="card">💡 ${MOTIVASI[new Date().getDate() % MOTIVASI.length]}</div>
    ${warns.map((w) => `<div class="warn">${w}</div>`).join("")}
    <div class="card"><h3>Pohon Tabungan</h3><div class="tree">${tree}</div><p class="muted" style="text-align:center">🌱 → 🌿 → 🌳 → 🌲 makin besar saat kamu menabung</p></div>
    <div class="card"><h3>🏆 Achievement</h3>${BADGES.map((b) => `<span class="badge ${b[2]() ? "" : "lock"}">${b[2]() ? b[0] : "🔒"} ${b[1]}</span>`).join("")}</div>
    <div class="card"><h3>Transaksi Terbaru</h3>${list(me.tx.slice(-5))}</div>`;

  $("#sakuList").innerHTML = list(me.tx.filter((t) => t.type === "saku"));
  const pct = me.limit ? Math.min(100, Math.round((hari / me.limit) * 100)) : 0;
  $("#limitInfo").innerHTML = me.limit
    ? `<p>Batas: ${rp(me.limit)}<br>Terpakai: ${rp(hari)}<br>Sisa: ${rp(Math.max(0, me.limit - hari))}</p><div class="bar"><i style="width:${pct}%;background:${hari > me.limit ? "var(--bad)" : "var(--ok)"}"></i></div>${hari > me.limit ? '<div class="warn">⚠️ Kamu sudah melewati batas jajan hari ini!</div>' : ""}`
    : '<p class="muted">Belum ada batas.</p>';
  const w = daysAgo(6),
    m = today().slice(0, 7);
  $("#jajanTotals").innerHTML =
    `<div class="grid"><div class="stat">Hari ini<b>${rp(hari)}</b></div><div class="stat">7 hari terakhir<b>${rp(sumBy("jajan", (t) => t.date >= w))}</b></div><div class="stat">Bulan ini<b>${rp(sumBy("jajan", (t) => t.date.startsWith(m)))}</b></div></div>`;
  $("#jajanList").innerHTML = list(me.tx.filter((t) => t.type === "jajan"));
  $("#jajanForm").date.value ||= today();

  $("#goalSel").innerHTML =
    me.goals
      .map((g) => `<option value="${g.id}">${esc(g.name)}</option>`)
      .join("") || '<option value="">(belum ada target)</option>';
  $("#goalList").innerHTML =
    goals
      .map(
        ({
          g,
          p,
        }) => `<div class="card"><b>${esc(g.name)}</b> ${g.done ? "✅" : ""}
    <div>${rp(saved(g))} / ${rp(g.target)}</div><div class="bar"><i style="width:${p}%"></i></div>
    <div>${p}% · Kurang ${rp(Math.max(0, g.target - saved(g)))} ${g.deadline ? "· Deadline " + g.deadline : ""}</div>
    <button class="btn small danger" onclick="delGoal(${g.id})">Hapus</button></div>`,
      )
      .join("") || '<div class="card muted">Belum ada target tabungan.</div>';

  renderHist();
  $("#prof").innerHTML =
    `Nama: <b>${esc(me.name)}</b><br>Email: <b>${esc(me.email)}</b>`;
}
function renderHist() {
  const q = $("#q").value.toLowerCase(),
    f = $("#ftype").value;
  const arr = me.tx.filter(
    (t) =>
      (!f || t.type === f) &&
      (t.name + " " + (t.cat || "") + " " + (t.note || ""))
        .toLowerCase()
        .includes(q),
  );
  $("#hist").innerHTML = list(arr);
}

// 8. Kalkulator
function calc() {
  const v = (id) => parseFloat($("#" + id).value) || 0;
  $("#k1r").textContent = v("k1b")
    ? v("k1b") >= v("k1a")
      ? "Kembalian: " + rp(v("k1b") - v("k1a"))
      : "Uang kurang " + rp(v("k1a") - v("k1b"))
    : "";
  $("#k2r").textContent = v("k2a")
    ? `Hemat ${rp((v("k2a") * v("k2b")) / 100)} → bayar ${rp(v("k2a") - (v("k2a") * v("k2b")) / 100)}`
    : "";
  const h = v("k3a") - v("k3b");
  $("#k3r").textContent = v("k3a")
    ? `Hemat ${rp(h)}/hari · 30 hari: ${rp(h * 30)}`
    : "";
}

// 9. Mulai aplikasi
$$("#nav button").forEach((b) => (b.onclick = () => page(b.dataset.p)));
$$("#kalk input").forEach((i) => (i.oninput = calc));
$("#q").oninput = renderHist;
$("#ftype").onchange = renderHist;
document.body.dataset.theme = db.theme;
page("dash");
start();
