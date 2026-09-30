// ================= สรุปเคสรายสัปดาห์ถึงผู้บริหาร (Auto Message) =================
// ทุกวันจันทร์ 09:00 ส่งสรุปเคสระดับบริษัทให้ผู้บริหารของลูกค้าแต่ละเจ้า
// ใช้ภาษาที่ลูกค้าเห็นเท่านั้น (ไม่มีข้อความภายใน) — ผู้บริหารรู้สถานะจริงโดยไม่ต้องไปถามต่อ
// Demo: ยังไม่มี server ส่งอีเมลจริง → ดูตัวอย่าง + "ส่งจำลอง" และเก็บประวัติการส่ง

const WEEKLY_KEY = "demoEventWeekly";
const SCHEDULE_TEXT = "ทุกวันจันทร์ 09:00 น.";
const WEEK = 7 * 24 * H;

const page = document.getElementById("page");
const canEditRecipients = ["support", "admin", "customer"].includes(currentRole);
let selected = isStaff ? pageParams().get("company") || Object.keys(COMPANIES)[0] : currentCompany;
if (!COMPANIES[selected]) selected = Object.keys(COMPANIES)[0];

function loadWeekly() {
  let d;
  try { d = JSON.parse(localStorage.getItem(WEEKLY_KEY)); } catch (e) { d = null; }
  if (!d) {
    const lastMon = lastMonday9();
    d = {
      recipients: {
        abc: ["ceo@abc-construction.com", "md@abc-construction.com"],
        sky: ["director@skybuild.co.th"],
        nova: [],
      },
      enabled: { abc: true, sky: true, nova: false },
      sent: [
        { companyId: "sky", at: lastMon, to: ["director@skybuild.co.th"], auto: true },
        { companyId: "abc", at: lastMon, to: ["ceo@abc-construction.com", "md@abc-construction.com"], auto: true },
        { companyId: "abc", at: lastMon - WEEK, to: ["ceo@abc-construction.com"], auto: true },
      ],
    };
    saveWeekly(d);
  }
  return d;
}
function saveWeekly(d) { localStorage.setItem(WEEKLY_KEY, JSON.stringify(d)); }

function lastMonday9(now = new Date()) {
  const d = new Date(now);
  d.setHours(9, 0, 0, 0);
  const back = (d.getDay() + 6) % 7; // จันทร์ = 0
  d.setDate(d.getDate() - back);
  if (d > now) d.setDate(d.getDate() - 7);
  return d.getTime();
}
function nextMonday9() { return lastMonday9() + WEEK; }
const dayRange = (a, b) => `${new Date(a).toLocaleDateString("th-TH", { day: "numeric", month: "short" })} – ${new Date(b).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`;

// ---------- สร้างเนื้อหารายงาน ----------
function buildReport(companyId, end = Date.now()) {
  const start = end - WEEK;
  const all = loadCases().filter((c) => c.companyId === companyId);
  const closedAt = (c) => { const h = [...c.history].reverse().find((x) => x.type === "status" && x.to === "closed"); return h ? h.at : null; };
  const newThis = all.filter((c) => c.createdAt >= start && c.createdAt < end);
  const newPrev = all.filter((c) => c.createdAt >= start - WEEK && c.createdAt < start);
  const closedThis = all.filter((c) => { const t = closedAt(c); return t && t >= start && t < end; });
  const open = all.filter(isOpen).sort((a, b) => a.createdAt - b.createdAt);
  const needYou = open.filter((c) => ownerRole(c) === "customer");
  const soon = open.filter((c) => {
    const d = c.status === "publish" ? c.publishDate : ["queued", "dev", "verify"].includes(c.status) ? c.eta : null;
    return d && new Date(d).getTime() < end + WEEK;
  });
  const co = COMPANIES[companyId];
  return {
    companyId, co, start, end, all, newThis, newPrev, closedThis, open, needYou, soon,
    version: companyVersion(companyId),
    csat: avgRating(closedThis),
    subject: `[Case-Tracking] สรุปเคสประจำสัปดาห์ ${dayRange(start, end - 1)} — ${co.short} (${co.domain})`,
  };
}

function trend(a, b) {
  if (a === b) return `<span class="trend same">เท่าสัปดาห์ก่อน</span>`;
  return a > b ? `<span class="trend up">▲ ${a - b} จากสัปดาห์ก่อน</span>` : `<span class="trend down">▼ ${b - a} จากสัปดาห์ก่อน</span>`;
}

function dueText(c) {
  if (c.status === "publish" && c.publishDate) return `🚀 Publish ${esc(c.fixVersion || "")} ${fmtDay(c.publishDate)}`;
  if (["queued", "dev", "verify"].includes(c.status) && c.eta) return `📅 คาดว่าเสร็จ ${fmtDay(c.eta)}`;
  return "—";
}

function whereText(c) {
  const r = ownerRole(c);
  return r === "customer" ? "⚡ รอบริษัทของคุณ" : r ? `${ROLES[r].icon} ${TEAM[r].team}` : "—";
}

function emailHtml(r) {
  const sup = TEAM.support;
  const row = (c) => `
    <tr>
      <td><b>${c.id}</b><div>${esc(c.title)}</div></td>
      <td>${esc(STATUSES[c.status].custShort)}</td>
      <td>${whereText(c)}</td>
      <td class="${etaOverdue(c) ? "late" : ""}">${dueText(c)}${etaOverdue(c) ? " (เลยกำหนด)" : ""}</td>
      <td>${fmtDuration(Date.now() - c.createdAt)}</td>
    </tr>`;
  return `
    <div class="mail">
      <div class="mail-meta">
        <div><span>จาก</span>Case-Tracking Support &lt;${sup.email}&gt;</div>
        <div><span>ถึง</span>${(loadWeekly().recipients[r.companyId] || []).map(esc).join(", ") || `<i class="muted">ยังไม่ได้ตั้งผู้รับ</i>`}</div>
        <div><span>เรื่อง</span><b>${esc(r.subject)}</b></div>
      </div>
      <div class="mail-body">
        <div class="mail-hero">
          <div class="mail-brand">🎉 Case-Tracking · สรุปเคสประจำสัปดาห์</div>
          <h2>${esc(r.co.name)}</h2>
          <div>🌐 ${esc(r.co.domain)} · เวอร์ชัน ${esc(r.version)}${r.version === LATEST_VERSION ? " (ล่าสุด)" : ` · มีเวอร์ชันใหม่ ${LATEST_VERSION}`}</div>
          <div class="mail-period">${dayRange(r.start, r.end - 1)}</div>
        </div>

        <div class="mail-stats">
          <div><b>${r.newThis.length}</b><span>แจ้งใหม่</span>${trend(r.newThis.length, r.newPrev.length)}</div>
          <div><b>${r.closedThis.length}</b><span>แก้ไขจบแล้ว</span></div>
          <div><b>${r.open.length}</b><span>ยังดำเนินการอยู่</span></div>
          <div><b>${r.csat ? r.csat.toFixed(1) + " / 5" : "—"}</b><span>ความพึงพอใจ</span></div>
        </div>

        ${r.needYou.length ? `
          <div class="mail-callout">⚡ <b>มี ${r.needYou.length} เคสที่รอทางบริษัทของคุณ</b> (ตอบข้อมูลเพิ่ม / ยืนยันผลการแก้ไข):
            ${r.needYou.map((c) => `${c.id} ${esc(c.title)}`).join(" · ")}</div>` : ""}

        <h3>📂 เคสที่ยังดำเนินการอยู่ (${r.open.length})</h3>
        ${r.open.length ? `<table class="mail-tbl"><thead><tr><th>เคส</th><th>สถานะ</th><th>อยู่ที่</th><th>กำหนดการ</th><th>เปิดมาแล้ว</th></tr></thead>
          <tbody>${r.open.map(row).join("")}</tbody></table>` : `<p class="muted">ไม่มีเคสค้าง 🎉</p>`}

        ${r.soon.length ? `<h3>🗓️ กำหนดการภายใน 7 วันข้างหน้า</h3>
          <ul>${r.soon.map((c) => `<li><b>${c.id}</b> ${esc(c.title)} — ${dueText(c)}</li>`).join("")}</ul>` : ""}

        <h3>✅ แก้ไขจบในสัปดาห์นี้ (${r.closedThis.length})</h3>
        ${r.closedThis.length ? `<ul>${r.closedThis.map((c) => `<li><b>${c.id}</b> ${esc(c.title)} — ${esc(c.resolution || "ปิดเคส")}${c.rating ? ` · ${"★".repeat(c.rating.score)}` : ""}</li>`).join("")}</ul>` : `<p class="muted">—</p>`}

        <div class="mail-foot">
          ผู้ประสานงานของคุณ: ${sup.team} · ✉️ ${sup.email} · ☎️ ${sup.phone}<br />
          ดูรายละเอียดและความคืบหน้าแบบ real time ได้ที่ Case Tracking · อีเมลนี้ส่งอัตโนมัติ${SCHEDULE_TEXT}
        </div>
      </div>
    </div>`;
}

// ---------- หน้าจอ ----------
function companyRow(id, w) {
  const co = COMPANIES[id];
  const last = w.sent.filter((s) => s.companyId === id).sort((a, b) => b.at - a.at)[0];
  const rec = w.recipients[id] || [];
  return `
    <button class="wk-co ${id === selected ? "active" : ""}" data-co="${id}">
      <div class="wk-co-top"><b>🏢 ${esc(co.short)}</b>
        <span class="pill" style="--c:${w.enabled[id] ? "#16a34a" : "#94a3b8"}">${w.enabled[id] ? "ส่งอัตโนมัติ" : "ปิดอยู่"}</span></div>
      <div class="muted small">🌐 ${esc(co.domain)} · ${esc(companyVersion(id))}</div>
      <div class="muted small">ผู้รับ ${rec.length} คน · ส่งล่าสุด ${last ? timeAgo(last.at) : "ยังไม่เคยส่ง"}</div>
    </button>`;
}

function render() {
  const w = loadWeekly();
  const r = buildReport(selected);
  const ids = isStaff ? Object.keys(COMPANIES) : [currentCompany];
  const rec = w.recipients[selected] || [];
  const history = w.sent.filter((s) => s.companyId === selected).sort((a, b) => b.at - a.at);

  page.innerHTML = `
    <div class="page-head">
      <div>
        <h1>📨 สรุปเคสรายสัปดาห์ถึงผู้บริหาร</h1>
        <p class="lead">ระบบส่งสรุปเคสระดับบริษัทให้ผู้บริหารของลูกค้า<b>${SCHEDULE_TEXT}</b> — ผู้บริหารเห็นภาพรวมจริงทุกสัปดาห์ (แจ้งอะไรมา, ค้างที่ไหน, จะเสร็จเมื่อไร) ใช้ข้อความเดียวกับที่ลูกค้าเห็น ไม่มีข้อความภายใน</p>
      </div>
    </div>

    <div class="wk-layout">
      <aside>
        ${ids.map((id) => companyRow(id, w)).join("")}
        <div class="card side wk-settings">
          <h3>⚙️ ตั้งค่า ${esc(COMPANIES[selected].short)}</h3>
          <label class="check-inline"><input type="checkbox" id="wkEnabled" ${w.enabled[selected] ? "checked" : ""} ${canEditRecipients ? "" : "disabled"} /> ส่งอัตโนมัติ${SCHEDULE_TEXT}</label>
          <div class="muted small" style="margin:8px 0 6px">รอบถัดไป: ${fmtDate(nextMonday9())}</div>
          <div class="f">ผู้รับ (ผู้บริหาร)
            <div class="chips">${rec.map((e, i) => `<span class="chip">${esc(e)}${canEditRecipients ? `<button data-rm="${i}" title="ลบ">✕</button>` : ""}</span>`).join("") || `<span class="muted small">ยังไม่มีผู้รับ</span>`}</div>
          </div>
          ${canEditRecipients ? `<form id="addRec" class="add-rec"><input name="email" type="email" placeholder="exec@${esc(COMPANIES[selected].domain)}" /><button class="btn ghost sm">เพิ่ม</button></form>` : ""}
          <button class="btn primary" id="sendNow" style="width:100%;margin-top:12px" ${rec.length ? "" : "disabled"}>📤 ส่งสรุปตอนนี้ (จำลอง)</button>
          <div class="muted small" style="margin-top:6px">Demo: บันทึกเป็นประวัติการส่ง — ใช้งานจริงต้องมี server ส่งอีเมลตามเวลา</div>
        </div>
      </aside>

      <section>
        <div class="card no-pad">
          <div class="card-bar"><h3>👁 ตัวอย่างอีเมลที่ผู้บริหารจะได้รับ</h3><span class="muted small">ข้อมูล ณ ตอนนี้</span></div>
          ${emailHtml(r)}
        </div>
        <div class="card">
          <h3 class="sec-title">🕘 ประวัติการส่ง ${esc(COMPANIES[selected].short)}</h3>
          ${history.length ? `<ul class="kv">${history.map((s) => `<li><span>${fmtDate(s.at)} ${s.auto ? "· อัตโนมัติ" : "· ส่งเอง"}</span><b>${s.to.map(esc).join(", ")}</b></li>`).join("")}</ul>` : `<p class="muted small">ยังไม่เคยส่ง</p>`}
        </div>
      </section>
    </div>`;
}

page.addEventListener("click", (e) => {
  const co = e.target.closest("[data-co]");
  if (co) { selected = co.dataset.co; return render(); }
  const rm = e.target.closest("[data-rm]");
  if (rm) {
    const w = loadWeekly();
    w.recipients[selected].splice(+rm.dataset.rm, 1);
    saveWeekly(w);
    return render();
  }
  if (e.target.closest("#sendNow")) {
    const w = loadWeekly();
    w.sent.push({ companyId: selected, at: Date.now(), to: [...(w.recipients[selected] || [])], auto: false });
    saveWeekly(w);
    render();
    toast(`ส่งสรุปของ ${COMPANIES[selected].short} แล้ว (จำลอง)`);
  }
});

page.addEventListener("change", (e) => {
  if (e.target.id !== "wkEnabled") return;
  const w = loadWeekly();
  w.enabled[selected] = e.target.checked;
  saveWeekly(w);
  render();
});

page.addEventListener("submit", (e) => {
  if (e.target.id !== "addRec") return;
  e.preventDefault();
  const email = (new FormData(e.target).get("email") || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast("อีเมลไม่ถูกต้อง");
  const w = loadWeekly();
  w.recipients[selected] = w.recipients[selected] || [];
  if (!w.recipients[selected].includes(email)) w.recipients[selected].push(email);
  saveWeekly(w);
  render();
});

render();
