// ================= กระดิ่งแจ้งเตือน (ในเว็บ) =================
// รวมเคสที่ต้องการความสนใจจาก role นี้: ยกระดับ (เคสนิ่ง/เกิน SLA), ยังไม่มีคนรับ, ถูกทวงถาม, รอลูกค้า
// โหลดหลัง cases-data.js และ auth.js

(function renderBell() {
  const host = document.querySelector(".topbar .user");
  if (!host || typeof alertsFor !== "function") return;

  const items = alertsFor(currentRole, currentUser);
  const urgent = items.filter((i) => i.level > 0).length;
  const e = annEsc;

  const wrap = document.createElement("div");
  wrap.className = "bell";
  wrap.innerHTML = `
    <button class="bell-btn" type="button" aria-label="การแจ้งเตือน" aria-expanded="false">🔔${items.length ? `<span class="bell-count ${urgent ? "" : "calm"}">${items.length}</span>` : ""}</button>
    <div class="bell-panel" hidden>
      <div class="bell-head"><b>การแจ้งเตือน</b><span>${ROLES[currentRole].icon} ${ROLES[currentRole].label}</span></div>
      <div class="bell-list">
        ${items.length ? items.map((i) => `
          <a class="bell-item lv${i.level}" href="case.html?id=${encodeURIComponent(i.c.id)}">
            <span class="bi-icon">${i.icon}</span>
            <span class="bi-body"><b>${i.c.id}</b> ${e(i.c.title)}<small>${e(i.text)}</small></span>
          </a>`).join("") : `<div class="bell-empty">ไม่มีเรื่องค้างสำหรับคุณ 🎉</div>`}
      </div>
      <div class="bell-foot">${currentRole === "customer" ? "แจ้งเตือนเคสที่รอคุณดำเนินการ" : "แจ้งเตือนตามกฎยกระดับเคสนิ่ง — ดูได้ที่หน้า Workflow"}</div>
    </div>`;
  host.prepend(wrap);

  const btn = wrap.querySelector(".bell-btn");
  const panel = wrap.querySelector(".bell-panel");
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    panel.hidden = !panel.hidden;
    btn.setAttribute("aria-expanded", !panel.hidden);
  });
  document.addEventListener("click", (ev) => {
    if (!wrap.contains(ev.target)) { panel.hidden = true; btn.setAttribute("aria-expanded", false); }
  });
})();
