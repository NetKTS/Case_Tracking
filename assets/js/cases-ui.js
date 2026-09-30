// ================= Case Tracking: UI helper ที่ใช้ร่วมกัน =================

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ลูกค้าเห็นชื่อสถานะแบบเข้าใจง่าย ทีมงานเห็นชื่อสถานะภายใน
function statusLabel(status, role = currentRole) {
  const s = STATUSES[status];
  return role === "customer" ? s.custShort : s.label;
}

function statusPill(status, role = currentRole) {
  const s = STATUSES[status];
  return `<span class="pill" style="--c:${s.color}">${s.icon} ${esc(statusLabel(status, role))}</span>`;
}

function severityChip(sev) {
  const s = SEVERITY[sev] || SEVERITY.medium;
  return `<span class="sev" style="--c:${s.color}">${s.label}</span>`;
}

function roleBadge(role) {
  const r = ROLES[role];
  return r ? `<span class="role-badge" style="--c:${r.color}">${r.icon} ${r.label}</span>` : "";
}

function slaBadge(c) {
  if (!isOpen(c)) return "";
  const s = slaInfo(c);
  const icon = { ok: "🟢", warn: "🟡", over: "🔴", none: "⚪" }[s.level];
  const tip = s.target ? `อยู่ขั้นนี้ ${s.text} / เป้าหมาย ${s.targetText}` : `อยู่ขั้นนี้ ${s.text}`;
  return `<span class="sla sla-${s.level}" title="${tip}">${icon} ${s.text}</span>`;
}

// ป้ายเตือนสำหรับทีมงาน: ยกระดับ / ยังไม่มีคนรับ / เลยกำหนด ETA
function alertBadges(c) {
  if (!isOpen(c)) return "";
  const out = [];
  const e = escalation(c);
  const owner = ownerRole(c);
  if (e) out.push(`<span class="flag flag-l${e.level}" title="${esc(e.reasons.join(" · "))}">${e.level === 2 ? "🚨 ยกระดับ 2" : "⚠️ ยกระดับ 1"}</span>`);
  if (owner && owner !== "customer" && !c.assignees[owner]) out.push(`<span class="flag flag-take">✋ ยังไม่มีคนรับ</span>`);
  if (etaOverdue(c)) out.push(`<span class="flag flag-l2">📅 เลยกำหนด</span>`);
  return out.length ? `<div class="flags">${out.join("")}</div>` : "";
}

// แถบความคืบหน้าที่ลูกค้าเห็น
function stepper(c, { compact = false } = {}) {
  const cur = stageOf(c);
  const closed = c.status === "closed";
  // เคสที่จบโดยไม่ต้องแก้โปรแกรม (Support แก้ให้ / เป็นไปตาม Spec / ยกเลิก) ขั้นแก้ไขและ Publish ถูกข้าม
  const passed = (stage) => c.history.some((h) => h.type === "status" && STATUSES[h.to].stage === stage);
  return `
    <ol class="stepper ${compact ? "compact" : ""}">
      ${STAGES.map((label, i) => {
        if (FIX_STAGES.includes(i) && cur > i && !passed(i)) {
          return `
            <li class="step skipped" style="--c:${STATUSES[c.status].color}">
              <span class="step-dot">–</span>
              ${compact ? "" : `<span class="step-label">${i === 2 ? "ไม่ต้องแก้ไขโปรแกรม" : "ไม่ต้อง Publish"}</span>`}
            </li>`;
        }
        const state = closed || i < cur ? "done" : i === cur ? "current" : "todo";
        const waitBadge = i === cur && c.status === "waiting" ? `<em class="wait-badge">รอข้อมูลจากลูกค้า</em>` : "";
        return `
          <li class="step ${state}" style="--c:${STATUSES[c.status].color}">
            <span class="step-dot">${state === "done" ? "✓" : i + 1}</span>
            ${compact ? "" : `<span class="step-label">${label}</span>${waitBadge}`}
          </li>`;
      }).join("")}
    </ol>`;
}

// ---------- Modal ----------
// fields: HTML ของฟอร์ม, onConfirm(formEl) คืนค่า string = error, คืนค่าอื่น = ปิด modal
function openModal({ title, subtitle = "", body, confirmText = "ยืนยัน", tone = "primary", onConfirm }) {
  const wrap = document.createElement("div");
  wrap.className = "modal";
  wrap.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div><h3>${title}</h3>${subtitle ? `<div class="modal-sub">${subtitle}</div>` : ""}</div>
        <button class="icon-close" data-close>✕</button>
      </div>
      <form class="modal-body" novalidate>
        ${body}
        <div class="form-error" hidden></div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close>ยกเลิก</button>
          <button type="submit" class="btn ${tone}">${confirmText}</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(wrap);
  document.body.classList.add("no-scroll");

  const close = () => { wrap.remove(); document.body.classList.remove("no-scroll"); };
  wrap.addEventListener("click", (e) => { if (e.target === wrap || e.target.closest("[data-close]")) close(); });
  document.addEventListener("keydown", function onKey(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", onKey); }
  });

  const form = wrap.querySelector("form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const err = onConfirm(form);
    if (typeof err === "string") {
      const box = form.querySelector(".form-error");
      box.textContent = err;
      box.hidden = false;
    } else close();
  });
  const first = form.querySelector("input:not([type=checkbox]), textarea, select");
  if (first) first.focus();
}

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2200);
}

// ---------- ฟอร์มแจ้งปัญหาใหม่ (ใช้ได้จากทุกหน้า) ----------
function openNewCaseModal(onCreated) {
  const staffFields = isStaff ? `
    <label class="f">บริษัทลูกค้า *
      <select name="companyId">${Object.entries(COMPANIES).map(([k, co]) => `<option value="${k}">${esc(co.name)} — ${esc(co.domain)} (${esc(companyVersion(k))})</option>`).join("")}</select>
    </label>
    <div class="form-grid">
      <label class="f">ชื่อผู้แจ้ง (ลูกค้า)<input name="reporterName" placeholder="เช่น สมชาย (จัดซื้อ)" /></label>
      <label class="f">ช่องทางที่แจ้ง
        <select name="channel"><option>โทรศัพท์</option><option>Email</option><option>LINE</option><option>เว็บไซต์</option></select>
      </label>
    </div>` : "";

  // มีประกาศเหตุขัดข้องอยู่ → เตือนก่อนแจ้งเคสซ้ำ
  const anns = typeof activeAnnouncements === "function" ? activeAnnouncements() : [];
  const annNotice = anns.length ? `
    <div class="ann-notice">
      <b>📢 ขณะนี้มีประกาศแจ้งปัญหาที่ทีมงานทราบแล้ว</b>
      <ul>${anns.map((a) => `<li>${ANN_IMPACT[a.impact].icon} ${esc(a.title)} — <i>${ANN_STATUS[a.status].label}</i></li>`).join("")}</ul>
      <span>ถ้าปัญหาของคุณเป็นเรื่องเดียวกัน <b>ไม่ต้องแจ้งเคสเพิ่ม</b> ติดตามได้จากแถบประกาศด้านบน</span>
    </div>` : "";

  openModal({
    title: "📝 แจ้งปัญหาใหม่",
    subtitle: "กรอกข้อมูลให้ครบ จะช่วยให้ทีมตรวจสอบได้เร็วขึ้น",
    confirmText: "ส่งเรื่อง",
    body: `
      ${annNotice}
      ${staffFields}
      ${isStaff ? "" : `<div class="owner-preview">ระบบแนบข้อมูลให้อัตโนมัติ: 🌐 <b>${esc(companyDomain(currentCompany))}</b> · เวอร์ชัน <b>${esc(companyVersion(currentCompany))}</b></div>`}
      <label class="f">หัวข้อปัญหา *<input name="title" placeholder="สรุปปัญหาสั้นๆ" /></label>
      <div class="form-grid">
        <label class="f">เมนู / ส่วนของโปรแกรม
          <select name="module">${MODULES.map((m) => `<option>${m}</option>`).join("")}</select>
        </label>
        <label class="f">ความรุนแรง
          <select name="severity">${Object.entries(SEVERITY).map(([k, v]) => `<option value="${k}" ${k === "medium" ? "selected" : ""}>${v.label}</option>`).join("")}</select>
        </label>
      </div>
      <label class="f">รายละเอียด *<textarea name="description" rows="5" placeholder="ทำอะไร → เกิดอะไรขึ้น → ควรเป็นอย่างไร"></textarea></label>`,
    onConfirm(form) {
      const v = Object.fromEntries(new FormData(form));
      if (!v.title.trim() || !v.description.trim()) return "กรุณากรอกหัวข้อและรายละเอียด";
      const list = loadCases();
      const c = createCase(list, {
        title: v.title.trim(), description: v.description.trim(), module: v.module, severity: v.severity,
        reporter: currentUser, reporterName: (v.reporterName || "").trim() || currentUser,
        role: currentRole, channel: v.channel || "เว็บไซต์",
        companyId: isStaff ? v.companyId : currentCompany,
      });
      saveCases(list);
      onCreated(c);
    },
  });
}
