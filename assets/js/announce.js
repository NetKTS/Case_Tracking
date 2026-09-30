// ================= ประกาศแจ้งเหตุ (Broadcast) =================
// Admin สร้างประกาศเมื่อระบบล่ม/มีปัญหากระทบลูกค้าหลายราย → แสดงแถบบนทุกหน้า (รวมหน้า Login)
// ลูกค้าจะรู้ว่า "เป็นกันทุกที่ ทีมรู้แล้ว" ไม่ต้องแจ้งเคสเพิ่ม
// โหลดหลัง cases-data.js และ auth.js (ถ้ามี)

const ANN_KEY = "demoEventAnnouncements";

const ANN_STATUS = {
  investigating: { label: "กำลังตรวจสอบ", color: "#d97706" },
  fixing: { label: "กำลังแก้ไข", color: "#dc2626" },
  monitoring: { label: "แก้ไขแล้ว · เฝ้าติดตาม", color: "#2563eb" },
  resolved: { label: "กลับมาใช้งานได้ปกติ", color: "#16a34a" },
};

const ANN_IMPACT = {
  outage: { label: "ใช้งานไม่ได้", icon: "🚨" },
  degraded: { label: "ใช้งานได้บางส่วน / ช้า", icon: "⚠️" },
  maintenance: { label: "ปิดปรับปรุงตามแผน", icon: "🛠️" },
};

const annEsc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadAnnouncements() {
  let list;
  try { list = JSON.parse(localStorage.getItem(ANN_KEY)); } catch (e) { list = null; }
  if (!Array.isArray(list)) { list = seedAnnouncements(); saveAnnouncements(list); }
  return list;
}
function saveAnnouncements(list) { localStorage.setItem(ANN_KEY, JSON.stringify(list)); }

function seedAnnouncements() {
  const now = Date.now();
  return [
    {
      id: "AN-102", title: "รายงานทุกประเภทโหลดช้ากว่าปกติ", impact: "degraded", status: "fixing",
      message: "ผู้ใช้งานอาจพบว่าการเปิดรายงานใช้เวลานานกว่าปกติ หรือขึ้นหน้าจอว่าง ข้อมูลของท่านไม่ได้รับผลกระทบ",
      modules: ["รายงาน"], companies: "all", createdAt: now - 2 * H, updatedAt: now - 25 * 60000, by: "admin",
      updates: [
        { at: now - 2 * H, status: "investigating", text: "ได้รับแจ้งว่ารายงานโหลดช้า กำลังตรวจสอบสาเหตุ", by: "admin" },
        { at: now - 25 * 60000, status: "fixing", text: "พบสาเหตุจากฐานข้อมูลรายงานทำงานหนัก กำลังเพิ่มทรัพยากร คาดว่ากลับมาปกติภายใน 16:00 น.", by: "admin" },
      ],
    },
    {
      id: "AN-101", title: "ปิดปรับปรุงระบบประจำเดือน", impact: "maintenance", status: "resolved",
      message: "ปิดปรับปรุงระบบ 22:00–23:00 น. เพื่ออัปเดตความปลอดภัย",
      modules: [], companies: "all", createdAt: now - 150 * H, updatedAt: now - 148 * H, by: "admin",
      updates: [
        { at: now - 150 * H, status: "investigating", text: "แจ้งล่วงหน้า: ปิดปรับปรุงคืนนี้ 22:00–23:00 น.", by: "admin" },
        { at: now - 148 * H, status: "resolved", text: "ปรับปรุงเสร็จ ใช้งานได้ตามปกติ", by: "admin" },
      ],
    },
  ];
}

function annAffects(a, companyId) {
  return a.companies === "all" || (Array.isArray(a.companies) && a.companies.includes(companyId));
}

// ประกาศที่ยังไม่จบ และกระทบผู้ใช้คนนี้ (ทีมงานเห็นทุกประกาศ, หน้า Login เห็นเฉพาะที่กระทบทุกบริษัท)
function activeAnnouncements() {
  const role = typeof currentRole !== "undefined" ? currentRole : null;
  const company = typeof currentCompany !== "undefined" ? currentCompany : null;
  return loadAnnouncements().filter((a) => {
    if (a.status === "resolved") return false;
    if (!role) return a.companies === "all";
    return role !== "customer" || annAffects(a, company);
  });
}

function annScopeText(a) {
  if (a.companies === "all") return "ลูกค้าทุกบริษัท";
  return a.companies.map((id) => (COMPANIES[id] ? COMPANIES[id].short : id)).join(", ");
}

function annDetailHtml(a) {
  return `
    <p>${annEsc(a.message)}</p>
    <div class="ann-facts">
      <span>ผลกระทบ: <b>${ANN_IMPACT[a.impact].icon} ${ANN_IMPACT[a.impact].label}</b></span>
      ${a.modules.length ? `<span>เมนูที่เกี่ยวข้อง: <b>${a.modules.map(annEsc).join(", ")}</b></span>` : ""}
      <span>ขอบเขต: <b>${annEsc(annScopeText(a))}</b></span>
    </div>
    <ol class="ann-updates">
      ${[...a.updates].reverse().map((u) => `
        <li><span class="ann-dot" style="--c:${ANN_STATUS[u.status].color}"></span>
          <div><b style="color:${ANN_STATUS[u.status].color}">${ANN_STATUS[u.status].label}</b>
          <span class="ann-time">${fmtDate(u.at)}</span><div>${annEsc(u.text)}</div></div></li>`).join("")}
    </ol>`;
}

function renderAnnouncementBanner() {
  document.querySelectorAll(".ann-wrap").forEach((el) => el.remove());
  const list = activeAnnouncements();
  if (!list.length) return;

  const wrap = document.createElement("div");
  wrap.className = "ann-wrap";
  wrap.innerHTML = list.map((a) => `
    <section class="ann-bar ann-${a.impact}" style="--c:${ANN_STATUS[a.status].color}">
      <div class="ann-inner">
        <span class="ann-icon">${ANN_IMPACT[a.impact].icon}</span>
        <div class="ann-text">
          <div><b>${annEsc(a.title)}</b> <span class="ann-status">${ANN_STATUS[a.status].label}</span>
            <span class="ann-meta">อัปเดต ${timeAgo(a.updatedAt)}</span></div>
          <div class="ann-sub">ทีมงานทราบปัญหานี้แล้วและกำลังดำเนินการ — ไม่ต้องแจ้งเคสเพิ่มสำหรับเรื่องนี้</div>
        </div>
        <button class="ann-toggle" type="button" aria-expanded="false">รายละเอียด ▾</button>
      </div>
      <div class="ann-detail" hidden>${annDetailHtml(a)}</div>
    </section>`).join("");

  wrap.addEventListener("click", (e) => {
    const b = e.target.closest(".ann-toggle");
    if (!b) return;
    const d = b.closest(".ann-bar").querySelector(".ann-detail");
    d.hidden = !d.hidden;
    b.setAttribute("aria-expanded", !d.hidden);
    b.textContent = d.hidden ? "รายละเอียด ▾" : "ย่อ ▴";
  });

  const bar = document.querySelector(".topbar");
  if (bar) bar.after(wrap);
  else { wrap.classList.add("ann-fixed"); document.body.prepend(wrap); }
}

renderAnnouncementBanner();
