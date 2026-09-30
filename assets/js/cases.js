// ================= หน้า Case Tracking (รายการเคส) =================
// ทีมงาน: Board (คอลัมน์ตามสถานะ) / List   ·   ลูกค้า: การ์ดความคืบหน้าของเคสตัวเอง

const VIEW_KEY = "demoCasesView";
let view = (() => { try { return localStorage.getItem(VIEW_KEY) || "board"; } catch (e) { return "board"; } })();
let mineOnly = false;

const $ = (id) => document.getElementById(id);
const openCase = (id) => goTo("case.html?id=" + encodeURIComponent(id));

$("lead").textContent = isStaff
  ? `คุณกำลังใช้งานในบทบาท ${ROLES[currentRole].icon} ${ROLES[currentRole].label} — เคสที่ "รอฉันดำเนินการ" คือเคสที่อยู่ในความรับผิดชอบของบทบาทนี้`
  : `🏢 ${companyName(currentCompany)} — ติดตามความคืบหน้าของปัญหาที่บริษัทของคุณแจ้งไว้ ทุกการเปลี่ยนแปลงจะแสดงให้คุณเห็นทันที`;

$("q").placeholder = "🔍 ค้นหาเลขเคส / หัวข้อ / ผู้แจ้ง / domain";
$("fSeverity").innerHTML += Object.entries(SEVERITY).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
$("fCompany").innerHTML += Object.entries(COMPANIES).map(([k, co]) => `<option value="${k}">🏢 ${esc(co.short)}</option>`).join("");
if (!isStaff) $("fCompany").hidden = true;
// มาจาก Dashboard: cases.html?company=abc
const qsCompany = pageParams().get("company");
if (isStaff && COMPANIES[qsCompany]) $("fCompany").value = qsCompany;
if (!isStaff) $("viewSeg").hidden = true;
$("mineToggle").textContent = isStaff ? "⚡ รอฉันดำเนินการ" : "⚡ รอคุณดำเนินการ";

function filtered() {
  const q = $("q").value.trim().toLowerCase();
  const sev = $("fSeverity").value;
  const co = $("fCompany").value;
  const showClosed = $("showClosed").checked || (isStaff && view === "board");
  return loadCases()
    .filter((c) => canSeeCase(c, currentRole))
    .filter((c) => showClosed || isOpen(c))
    .filter((c) => !sev || c.severity === sev)
    .filter((c) => !co || c.companyId === co)
    .filter((c) => !mineOnly || waitingFor(c, currentRole))
    .filter((c) => !q || (c.id + " " + c.title + " " + (c.reporterName || "") + " " + c.domain).toLowerCase().includes(q))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function renderKpis() {
  const all = loadCases().filter((c) => canSeeCase(c, currentRole));
  const open = all.filter(isOpen);
  const mine = open.filter((c) => waitingFor(c, currentRole));
  const escalated = open.filter((c) => escalation(c));
  const unassigned = open.filter((c) => { const o = ownerRole(c); return o && o !== "customer" && !c.assignees[o]; });
  const closed = all.filter((c) => !isOpen(c));
  const tiles = isStaff
    ? [
        { label: "เคสที่เปิดอยู่", value: open.length, icon: "📂", tone: "indigo" },
        { label: "รอฉันดำเนินการ", value: mine.length, icon: "⚡", tone: "amber", act: "mine" },
        { label: "เคสนิ่ง / ถูกยกระดับ", value: escalated.length, icon: "🚨", tone: "red", act: "esc" },
        { label: "ยังไม่มีคนรับ", value: unassigned.length, icon: "✋", tone: "amber" },
        { label: "ปิดแล้ว", value: closed.length, icon: "✅", tone: "green" },
      ]
    : [
        { label: "เคสที่กำลังดำเนินการ", value: open.length, icon: "📂", tone: "indigo" },
        { label: "รอคุณดำเนินการ", value: mine.length, icon: "⚡", tone: "amber", act: "mine" },
        { label: "แก้ไขเรียบร้อย", value: closed.length, icon: "✅", tone: "green" },
      ];
  $("kpis").innerHTML = tiles.map((t) => `
    <div class="kpi kpi-${t.tone} ${t.act ? "clickable" : ""}" ${t.act ? `data-act="${t.act}"` : ""}>
      <span class="kpi-icon">${t.icon}</span>
      <div><div class="kpi-value">${t.value}</div><div class="kpi-label">${t.label}</div></div>
    </div>`).join("");
}

function ownerLine(c) {
  const o = ownerInfo(c);
  if (!o.role) return `<span class="muted">—</span>`;
  if (o.role === "customer") return `<span class="owner">${ROLES.customer.icon} ${isStaff ? esc(o.name) : "คุณ"}</span>`;
  // ลูกค้าเห็นเป็นทีม / บทบาทที่ดูแลการ์ดอยู่ · ทีมงานเห็นชื่อคนที่รับเคส
  if (!isStaff) return `<span class="owner">${ROLES[o.role].icon} ${esc(o.team)}</span>`;
  if (!o.assigned) return `<span class="owner muted">${ROLES[o.role].icon} ${esc(o.team)}</span>`;
  return `<span class="owner">${ROLES[o.role].icon} ${esc(o.name)}</span>`;
}

function boardCard(c) {
  return `
    <article class="case-card" data-id="${c.id}" tabindex="0">
      <div class="cc-top"><span class="case-id">${c.id}</span>${severityChip(c.severity)}</div>
      <h4>${esc(c.title)}</h4>
      <div class="cc-meta">🌐 ${esc(c.domain)} <span class="ver">${esc(c.reportedVersion)}</span></div>
      <div class="cc-meta">${esc(c.reporterName || c.reporter)} · ${esc(c.module)}</div>
      ${alertBadges(c)}
      <div class="cc-foot">${ownerLine(c)}${slaBadge(c)}</div>
    </article>`;
}

// Board กว้างกว่าจอ (10 คอลัมน์) → มีแถบนำทางด้านบน: ชิปทุกสถานะ (คลิกเลื่อนไป), ปุ่ม ◀ ▶, scrollbar บนสุด, เงาขอบเมื่อยังเลื่อนได้
function renderBoard(list) {
  const cols = Object.entries(STATUSES).map(([k, s]) => ({ k, s, items: list.filter((c) => c.status === k) }));
  return `
    <div class="board-nav">
      <button class="bn-arrow" data-scroll="-1" aria-label="เลื่อนไปสถานะก่อนหน้า">◀</button>
      <div class="bn-chips">
        ${cols.map(({ k, s, items }) => `
          <button class="bn-chip" data-jump="${k}" style="--c:${s.color}" title="${esc(s.label)}">
            ${s.icon} <span>${esc(s.label)}</span><b>${items.length}</b>
          </button>`).join("")}
      </div>
      <button class="bn-arrow" data-scroll="1" aria-label="เลื่อนไปสถานะถัดไป">▶</button>
    </div>
    <div class="bn-hint" id="boardHint"></div>
    <div class="board-top-scroll" id="boardTopScroll"><div></div></div>
    <div class="board-frame" id="boardFrame">
      <div class="board" id="board">
        ${cols.map(({ k, s, items }) => {
          const owner = s.owner ? ROLES[s.owner] : null;
          return `
            <section class="col" data-col="${k}" style="--c:${s.color}">
              <header class="col-head">
                <div class="col-title">${s.icon} ${s.label}<span class="count">${items.length}</span></div>
                <div class="col-owner">${owner ? `ผู้รับผิดชอบ: ${owner.icon} ${owner.label}` : "จบกระบวนการ"}</div>
              </header>
              <div class="col-body">${items.map(boardCard).join("") || `<div class="col-empty">ไม่มีเคส</div>`}</div>
            </section>`;
        }).join("")}
      </div>
    </div>`;
}

let boardScrollLeft = 0; // จำตำแหน่งเลื่อนไว้ตอน render ใหม่ (เช่นเปลี่ยน filter)
let boardUpdate = null;  // อัปเดตเงาขอบ / ชิป / ข้อความ ของ Board ที่แสดงอยู่
addEventListener("resize", () => boardUpdate && boardUpdate());

function bindBoard() {
  const board = $("board");
  boardUpdate = null;
  if (!board) return;
  const frame = $("boardFrame");
  const top = $("boardTopScroll");
  const chips = [...document.querySelectorAll(".bn-chip")];
  const arrows = [...document.querySelectorAll(".bn-arrow")];
  const colsEl = [...board.querySelectorAll(".col")];
  const smooth = () => (matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
  // เลื่อนแบบนุ่ม ถ้า browser ไม่เลื่อนให้ (บางสภาพแวดล้อมไม่รองรับ smooth หรือถูกขัดจังหวะ) กระโดดไปตำแหน่งเลย
  const scrollBoardTo = (left) => {
    const target = Math.max(0, Math.min(left, board.scrollWidth - board.clientWidth));
    board.scrollTo({ left: target, behavior: smooth() });
    setTimeout(() => {
      if (Math.abs(board.scrollLeft - target) > 2) board.scrollLeft = target;
      top.scrollLeft = board.scrollLeft;
      update();
    }, 700);
  };

  const update = () => {
    boardScrollLeft = board.scrollLeft;
    const max = board.scrollWidth - board.clientWidth;
    frame.classList.toggle("fade-left", board.scrollLeft > 4);
    frame.classList.toggle("fade-right", board.scrollLeft < max - 4);
    arrows[0].disabled = board.scrollLeft <= 4;
    arrows[1].disabled = board.scrollLeft >= max - 4;
    // ไฮไลต์ชิปของคอลัมน์ที่มองเห็นอยู่ (กึ่งกลางคอลัมน์อยู่ในจอ)
    const vl = board.scrollLeft, vr = vl + board.clientWidth;
    let visible = 0;
    colsEl.forEach((col, i) => {
      const mid = col.offsetLeft + col.offsetWidth / 2;
      const inView = mid > vl && mid < vr;
      chips[i].classList.toggle("in-view", inView);
      if (inView) visible++;
    });
    $("boardHint").textContent = max > 4
      ? `👉 เห็นอยู่ ${visible} จาก ${colsEl.length} สถานะ — เลื่อนซ้าย/ขวา, กด ◀ ▶ หรือคลิกชื่อสถานะด้านบนเพื่อดูสถานะอื่น`
      : "";
    top.hidden = max <= 4;
    top.firstElementChild.style.width = board.scrollWidth + "px";
  };
  boardUpdate = update;

  // scrollbar ด้านบน sync กับ board — รับค่าจากแถบบนเฉพาะตอนผู้ใช้กำลังลาก/เลื่อนแถบบนเอง
  // (ไม่อย่างนั้น event ย้อนกลับจะไปยกเลิก smooth scroll ของ board)
  let topActive = false, topTimer;
  const markTop = () => { topActive = true; clearTimeout(topTimer); topTimer = setTimeout(() => (topActive = false), 400); };
  top.addEventListener("pointerdown", () => { topActive = true; clearTimeout(topTimer); });
  top.addEventListener("wheel", markTop, { passive: true });
  addEventListener("pointerup", markTop);
  top.addEventListener("scroll", () => { if (topActive) board.scrollLeft = top.scrollLeft; });
  board.addEventListener("scroll", () => {
    if (!topActive) top.scrollLeft = board.scrollLeft;
    update();
  }, { passive: true });

  // ล้อเมาส์บนหัวคอลัมน์ = เลื่อนแนวนอน
  board.addEventListener("wheel", (e) => {
    if (!e.target.closest(".col-head") || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    board.scrollLeft += e.deltaY;
  }, { passive: false });

  document.querySelector(".board-nav").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-jump]");
    const arrow = e.target.closest("[data-scroll]");
    if (chip) {
      const col = board.querySelector(`[data-col="${chip.dataset.jump}"]`);
      scrollBoardTo(col.offsetLeft - 8);
      col.classList.remove("flash");
      void col.offsetWidth; // เริ่ม animation ใหม่
      col.classList.add("flash");
    } else if (arrow) {
      scrollBoardTo(board.scrollLeft + Number(arrow.dataset.scroll) * (colsEl[0].offsetWidth + 14) * 2);
    }
  });

  const restore = boardScrollLeft; // update() จะเขียนทับค่านี้ จึงเก็บไว้ก่อน
  update(); // ตั้งความกว้าง scrollbar ด้านบนก่อน ถึงจะเลื่อนแถบบนได้
  board.scrollLeft = restore;
  top.scrollLeft = restore;
  update();
}

function renderList(list) {
  if (!list.length) return emptyState();
  return `
    <div class="card no-pad"><div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>เคส</th><th>สถานะ</th><th>ผู้รับผิดชอบตอนนี้</th><th>ความรุนแรง</th><th>อยู่ขั้นนี้</th><th>อัปเดตล่าสุด</th></tr></thead>
      <tbody>
        ${list.map((c) => `
          <tr class="row-link" data-id="${c.id}">
            <td><div class="case-id">${c.id}</div><div class="t-title">${esc(c.title)}</div><div class="muted small">🌐 ${esc(c.domain)} <span class="ver">${esc(c.reportedVersion)}</span> · ${esc(c.reporterName || c.reporter)} · ${esc(c.module)}</div>${alertBadges(c)}</td>
            <td>${statusPill(c.status)}</td>
            <td>${ownerLine(c)}</td>
            <td>${severityChip(c.severity)}</td>
            <td>${slaBadge(c) || `<span class="muted">—</span>`}</td>
            <td class="muted small">${timeAgo(c.updatedAt)}</td>
          </tr>`).join("")}
      </tbody>
    </table></div></div>`;
}

// การ์ดสำหรับลูกค้า: เน้นความคืบหน้า + ตอนนี้อยู่ที่ใคร + ขั้นถัดไป
function renderCustomer(list) {
  if (!list.length) return emptyState();
  const sorted = [...list].sort((a, b) => (waitingFor(b, "customer") - waitingFor(a, "customer")) || b.updatedAt - a.updatedAt);
  return `
    <div class="cust-grid">
      ${sorted.map((c) => {
        const s = STATUSES[c.status];
        const needMe = waitingFor(c, "customer");
        return `
          <article class="cust-card ${needMe ? "need-me" : ""}" data-id="${c.id}" tabindex="0" style="--c:${s.color}">
            ${needMe ? `<div class="need-banner">⚡ รอคุณดำเนินการ</div>` : ""}
            <div class="cc-top"><span class="case-id">${c.id}</span>${statusPill(c.status)}</div>
            <h4>${esc(c.title)}</h4>
            ${stepper(c)}
            <p class="cust-text">${esc(s.customerText)}</p>
            ${custDates(c)}
            <div class="cust-foot">
              <span>ตอนนี้อยู่ที่: ${ownerLine(c)}</span>
              <span class="muted small">อัปเดต ${timeAgo(c.updatedAt)}</span>
            </div>
          </article>`;
      }).join("")}
    </div>`;
}

// วันที่คาดว่าจะเสร็จ / วัน Publish ที่ลูกค้าเห็น
function custDates(c) {
  if (["queued", "dev", "verify"].includes(c.status) && c.eta)
    return `<div class="cust-date ${etaOverdue(c) ? "late" : ""}">📅 กำหนดแก้ไขเสร็จ: <b>${fmtDay(c.eta)}</b></div>`;
  if (c.status === "publish" && c.publishDate)
    return `<div class="cust-date ${etaOverdue(c) ? "late" : ""}">🚀 กำหนด Publish ${esc(c.fixVersion || "")}: <b>${fmtDay(c.publishDate)}</b></div>`;
  return "";
}

function emptyState() {
  return `<div class="card empty-state"><div class="big">🗂️</div><p>ไม่พบเคสตามเงื่อนไข</p></div>`;
}

function render() {
  renderKpis();
  $("mineToggle").setAttribute("aria-pressed", mineOnly);
  document.querySelectorAll("#viewSeg button").forEach((b) => b.classList.toggle("active", b.dataset.v === view));
  $("showClosed").parentElement.hidden = isStaff && view === "board";
  const list = filtered();
  const prevBoard = $("board");
  if (prevBoard) boardScrollLeft = prevBoard.scrollLeft; // คงตำแหน่งเลื่อนเมื่อเปลี่ยน filter
  $("content").innerHTML = !isStaff ? renderCustomer(list) : view === "board" ? renderBoard(list) : renderList(list);
  if (isStaff && view === "board") bindBoard();
  else boardUpdate = null;
}

// ---------- Events ----------
["q", "fSeverity", "fCompany", "showClosed"].forEach((id) => $(id).addEventListener("input", render));
$("mineToggle").addEventListener("click", () => { mineOnly = !mineOnly; render(); });
$("viewSeg").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  view = b.dataset.v;
  try { localStorage.setItem(VIEW_KEY, view); } catch (err) {}
  render();
});
$("kpis").addEventListener("click", (e) => {
  if (e.target.closest('[data-act="mine"]')) { mineOnly = true; render(); }
  if (e.target.closest('[data-act="esc"]')) { view = "list"; mineOnly = false; render(); $("content").scrollIntoView({ behavior: "smooth" }); }
});
$("content").addEventListener("click", (e) => {
  const el = e.target.closest("[data-id]");
  if (el) openCase(el.dataset.id);
});
$("content").addEventListener("keydown", (e) => {
  const el = e.target.closest("[data-id]");
  if (el && e.key === "Enter") openCase(el.dataset.id);
});
$("newCaseBtn").addEventListener("click", () =>
  openNewCaseModal((c) => { toast(`ส่งเรื่องแล้ว เลขที่เคส ${c.id}`); setTimeout(() => openCase(c.id), 600); })
);

render();
