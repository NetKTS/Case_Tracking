// ================= หน้ารายละเอียดเคส =================
// ความคืบหน้า, ผู้รับผิดชอบตอนนี้, ปุ่มเปลี่ยนสถานะ / action ตามสิทธิ์ของ role, การยกระดับเคสนิ่ง, timeline, ผู้ติดต่อ

const caseId = pageParams().get("id");
const page = document.getElementById("page");
let cases = loadCases();
let c = cases.find((x) => x.id === caseId);
// ความคิดเห็นที่กำลังแก้ไขอยู่ (เวลาที่ส่ง) — แก้ได้เฉพาะของตัวเอง
let editingAt = null;
// เวลาที่เปิดดูเคสนี้ครั้งก่อน — ข้อความที่ใหม่กว่านี้ติดป้าย "ใหม่" (เปิดหน้านี้ = อ่านแล้ว)
const prevRead = lastRead(currentUser, caseId);

const STAFF_ROLES = ["support", "product", "dev", "tester"];

function actorName(h) {
  if (h.role === "customer") return isStaff ? h.by : h.by === currentUser ? "คุณ" : h.by;
  return h.by;
}

function renderNotFound() {
  page.innerHTML = `
    <a class="back" href="cases.html">← กลับรายการเคส</a>
    <div class="card empty-state"><div class="big">🔎</div><p>ไม่พบเคส ${esc(caseId || "")} หรือคุณไม่มีสิทธิ์ดูเคสนี้</p></div>`;
}

function whoText(o) {
  if (!o.role) return "";
  if (o.role === "customer") return isStaff ? `ลูกค้า (${esc(o.name)})` : "คุณ";
  // ลูกค้าเห็นเป็นทีม / บทบาทที่ดูแลการ์ดอยู่ · ทีมงานเห็นชื่อคนที่รับเคส
  if (!isStaff) return esc(o.team);
  return o.assigned ? `${esc(o.team)} · ${esc(o.name)}` : `${esc(o.team)} <span class="flag flag-take">ยังไม่มีคนรับเคส</span>`;
}

function escalationBox() {
  if (!isStaff) return "";
  const e = escalation(c);
  if (!e) return "";
  const lead = TEAM[e.owner].lead;
  return `
    <div class="esc-box lv${e.level}">
      <b>${e.level === 2 ? "🚨 ยกระดับ 2 — แจ้งหัวหน้าทีมและ Admin แล้ว" : "⚠️ ยกระดับ 1 — แจ้งทีมที่ถือเคสและ CX (Support) แล้ว"}</b>
      <div>${e.reasons.map(esc).join(" · ")}</div>
      <div class="muted small">ผู้ถือเคส: ${TEAM[e.owner].team}${e.level === 2 ? ` · หัวหน้าทีม: ${esc(lead)}` : ""} — กด "รับเคสนี้" หรือเปลี่ยนสถานะเพื่อปลดการยกระดับ</div>
    </div>`;
}

function datesBox() {
  const rows = [];
  if (["queued", "dev", "verify"].includes(c.status) && c.eta)
    rows.push(`📅 กำหนดแก้ไขเสร็จ (ETA): <b>${fmtDay(c.eta)}</b>${etaOverdue(c) ? ` <span class="flag flag-l2">เลยกำหนด</span>` : ""}`);
  if (c.status === "publish") {
    rows.push(`🚀 จะ Publish เป็น <b>${esc(c.fixVersion || LATEST_VERSION)}</b> ให้ ${esc(companyName(c.companyId))} วันที่ <b>${fmtDay(c.publishDate)}</b>${etaOverdue(c) ? ` <span class="flag flag-l2">เลยกำหนด</span>` : ""}`);
    rows.push(`<span class="muted small">เวอร์ชันปัจจุบันของบริษัทนี้: ${esc(companyVersion(c.companyId))} — แต่ละบริษัท Publish แยกกัน การแก้ไขมีผลหลัง Publish เท่านั้น</span>`);
  }
  if (c.publishedAt && ["resolved", "closed"].includes(c.status))
    rows.push(`🚀 Publish เป็น <b>${esc(c.fixVersion)}</b> แล้วเมื่อ ${fmtDate(c.publishedAt)}`);
  return rows.map((r) => `<div class="next">${r}</div>`).join("");
}

function currentCard() {
  const s = STATUSES[c.status];
  const sla = slaInfo(c);
  const o = ownerInfo(c);
  const trs = transitionsFor(c, currentRole);
  const acts = actionsFor(c, currentRole, currentUser);

  const slaBar = sla.target && isOpen(c) ? `
    <div class="sla-bar sla-${sla.level}">
      <div class="sla-track"><span style="width:${Math.min(100, sla.ratio * 100)}%"></span></div>
      <div class="sla-text">อยู่ขั้นนี้ <b>${sla.text}</b> · เป้าหมายไม่เกิน ${sla.targetText}
        ${sla.level === "over" ? `<b class="over-text">· เกินกำหนด</b>` : ""}
        ${c.status === "waiting" ? `<span class="muted"> (SLA ของทีมหยุดนับระหว่างรอลูกค้า)</span>` : ""}</div>
    </div>` : "";

  const noActionText = !isOpen(c) ? "เคสนี้ปิดแล้ว"
    : o.role ? `ขั้นตอนนี้รอ ${o.role === "customer" ? "ลูกค้า" : TEAM[o.role].team} ดำเนินการ — บทบาทของคุณยังเปลี่ยนสถานะไม่ได้` : "";

  const lastAsk = lastFollowUp(c);
  const followUpNote = currentRole === "customer" && lastAsk && ownerRole(c) !== "customer"
    ? `<div class="muted small">🙋 คุณสอบถามความคืบหน้าล่าสุดเมื่อ ${timeAgo(lastAsk)} — ทีม Support จะติดต่อกลับ</div>` : "";

  return `
    <div class="card current-card" style="--c:${s.color}">
      <div class="current-head">
        <span class="current-icon">${s.icon}</span>
        <div>
          <div class="eyebrow">สถานะตอนนี้</div>
          <h2>${esc(statusLabel(c.status))}</h2>
          <p>${esc(isStaff ? s.desc : s.customerText)}</p>
        </div>
      </div>
      ${escalationBox()}
      ${o.role ? `<div class="ball">🏐 ตอนนี้อยู่ที่: <b>${ROLES[o.role].icon} ${whoText(o)}</b></div>` : ""}
      ${isOpen(c) ? `<div class="next">➡️ ขั้นตอนถัดไป: ${esc(s.nextStep)}</div>` : ""}
      ${datesBox()}
      ${slaBar}
      <div class="actions">
        ${trs.length
          ? trs.map((t) => `<button class="btn ${t.tone === "danger" ? "danger-ghost" : t.primary ? "primary" : "ghost"}" data-tr="${t.id}">${esc(t.label)}</button>`).join("")
          : `<div class="muted small">${noActionText}</div>`}
      </div>
      ${acts.length ? `<div class="actions sub">${acts.map((a) => `<button class="btn ghost sm" data-act="${a.id}" title="${esc(a.desc)}">${esc(a.label)}</button>`).join("")}</div>` : ""}
      ${followUpNote}
      ${currentRole === "admin" && trs.length ? `<div class="muted small" style="margin-top:8px">🛡️ Admin ทำได้ทุกการเปลี่ยนสถานะ</div>` : ""}
    </div>`;
}

function bubble(h, text) {
  return `<div class="bubble ${h.public ? "" : "internal"}">${h.public ? "" : `<span class="int-tag">🔒 Internal · ลูกค้าไม่เห็น</span>`}${esc(text)}</div>`;
}

function timelineItem(h) {
  if (!isStaff && !h.public) {
    // ลูกค้าเห็นการเปลี่ยนสถานะเสมอ แต่ไม่เห็นข้อความภายใน / การทวงถามภายใน
    if (h.type !== "status") return "";
  }
  const role = ROLES[h.role];
  const showText = h.text && (isStaff || h.public);
  let icon, head, body = "", color = role ? role.color : "#94a3b8";

  if (h.type === "create") {
    icon = "📝";
    head = `<b>${esc(actorName(h))}</b> แจ้งปัญหา`;
    body = showText ? bubble(h, h.text) : "";
  } else if (h.type === "status") {
    icon = STATUSES[h.to].icon;
    color = STATUSES[h.to].color;
    head = `<b>${esc(actorName(h))}</b> ${esc(h.label)}`;
    body = `<div class="tl-status">${statusPill(h.from)} <span class="arrow">→</span> ${statusPill(h.to)}</div>`;
    if (showText) body += bubble(h, h.text);
  } else if (h.type === "assign") {
    icon = "✋";
    head = `<b>${esc(actorName(h))}</b> ${esc(h.label)}`;
    if (showText) body = bubble(h, h.text);
  } else if (h.type === "nudge") {
    icon = h.action === "follow_up" ? "🙋" : "🔔";
    head = `<b>${esc(actorName(h))}</b> ${esc(h.label)}`;
    if (showText) body = bubble(h, h.text);
  } else if (h.type === "date") {
    icon = "📅";
    head = `<b>${esc(actorName(h))}</b> ${esc(h.label)}`;
    body = `<div class="tl-status"><span class="date-chip old">${fmtDay(h.fromDate)}</span> <span class="arrow">→</span> <span class="date-chip">${fmtDay(h.toDate)}</span></div>`;
    if (showText) body += bubble(h, h.text);
  } else {
    icon = h.public ? "💬" : "🔒";
    const mine = h.by === currentUser;
    head = `<b>${esc(actorName(h))}</b> ${h.public ? "แสดงความคิดเห็น" : "บันทึกภายใน"}`
      + (h.editedAt ? ` <span class="edited-tag" title="แก้ไขเมื่อ ${fmtDate(h.editedAt)}">(แก้ไขแล้ว)</span>` : "")
      + (mine && editingAt !== h.at ? ` <button type="button" class="link-btn" data-edit="${h.at}">✏️ แก้ไข</button>` : "");
    body = mine && editingAt === h.at
      ? `<form class="comment-box edit-box" id="editForm" data-at="${h.at}">
           <textarea name="text" rows="3">${esc(h.text)}</textarea>
           <div class="comment-actions"><span></span><span>
             <button type="button" class="btn sm" data-edit-cancel>ยกเลิก</button>
             <button class="btn primary sm" type="submit">บันทึก</button>
           </span></div>
         </form>`
      : bubble(h, h.text);
  }

  const isNew = isMessage(h) && h.at > prevRead && h.by !== currentUser;

  return `
    <li class="tl-item ${isNew ? "is-new" : ""}" style="--c:${color}">
      <span class="tl-dot">${icon}</span>
      <div class="tl-content">
        <div class="tl-head">${head} ${role ? roleBadge(h.role) : ""}${isNew ? `<span class="new-tag">ใหม่</span>` : ""}<span class="tl-time" title="${fmtDate(h.at)}">${timeAgo(h.at)}</span></div>
        ${body}
      </div>
    </li>`;
}

function personBlock(name, sub, color, note = "") {
  return `
    <div class="person">
      <span class="p-avatar" style="--c:${color}">${esc((name || "?").charAt(0))}</span>
      <div><b>${esc(name)}</b>${note}<div class="muted small">${sub}</div></div>
    </div>`;
}

function sidePanel() {
  const o = ownerInfo(c);
  const sup = TEAM.support;
  const supName = c.assignees.support;

  // ลูกค้า: ติดต่อ Support (CX) คนเดิมตลอด — ถ้ายังไม่มีคนรับ บอกตรงๆ ว่ายังไม่มี
  const contact = !isStaff
    ? `
      <div class="card side">
        <h3>📞 ผู้ประสานงานของคุณ</h3>
        ${supName
          ? personBlock(supName, `${sup.team} · ดูแลเคสนี้`, ROLES.support.color)
          : `<div class="muted small">ยังไม่มีเจ้าหน้าที่รับเรื่อง — ทีม Support จะรับเรื่องภายใน 4 ชม. ทำการ</div>`}
        <ul class="contact-list">
          <li>✉️ ${sup.email}</li><li>☎️ ${sup.phone}</li><li>🕘 ${sup.hours}</li>
        </ul>
        <p class="hint-box">คุณคุยกับคนจริงเสมอ — ${supName ? `คุณ${esc(supName)}` : "เจ้าหน้าที่ Support"} เป็นผู้ประสานงานหลักตลอดเคส แม้เคสจะถูกส่งต่อให้ทีมอื่น</p>
      </div>`
    : `
      <div class="card side">
        <h3>📞 ติดต่อผู้ถือเคสตอนนี้</h3>
        ${!o.role ? `<p class="muted small">เคสปิดแล้ว</p>`
          : o.role === "customer" ? personBlock(o.name, `ลูกค้า · ${esc(companyName(c.companyId))}`, ROLES.customer.color)
          : `${o.assigned
                ? personBlock(o.name, o.team, ROLES[o.role].color)
                : personBlock(o.lead, `${o.team} · หัวหน้าทีม`, ROLES[o.role].color, ` <span class="flag flag-take">ยังไม่มีคนรับ</span>`)}
             <ul class="contact-list"><li>✉️ ${o.email}</li><li>☎️ ${o.phone}</li></ul>`}
      </div>`;

  // ทีมงานเห็นชื่อคนที่ดูแลแต่ละทีม · ลูกค้าเห็นเฉพาะว่าทีมไหนกำลังดูแล / เคยดูแลแล้ว
  const involved = (r) => !!c.assignees[r] || c.history.some((h) => h.role === r);
  const team = STAFF_ROLES.map((r) => {
    const value = isStaff
      ? `<b class="${c.assignees[r] ? "" : "muted"}">${esc(c.assignees[r] || "—")}</b>`
      : ownerRole(c) === r ? `<b class="team-now">● กำลังดูแล</b>`
      : involved(r) ? `<b>✓ ดูแลแล้ว</b>` : `<b class="muted">—</b>`;
    return `<li><span>${ROLES[r].icon} ${isStaff ? ROLES[r].label : TEAM[r].team}</span>${value}</li>`;
  }).join("");

  return `
    ${contact}
    <div class="card side">
      <h3>👥 ${isStaff ? "คนที่ดูแลเคสนี้" : "ทีมที่ดูแลเคสนี้"}</h3>
      <ul class="kv">${team}</ul>
    </div>
    <div class="card side">
      <h3>📋 ข้อมูลเคส</h3>
      <ul class="kv">
        <li><span>บริษัท</span><b>${esc(COMPANIES[c.companyId].short)}</b></li>
        <li><span>Domain</span><b>${esc(c.domain)}</b></li>
        <li><span>เวอร์ชันตอนแจ้ง</span><b>${esc(c.reportedVersion)}</b></li>
        <li><span>เวอร์ชันปัจจุบัน</span><b>${esc(companyVersion(c.companyId))}${companyVersion(c.companyId) === LATEST_VERSION ? " ✓" : ` <span class="flag flag-l1">ล่าสุด ${LATEST_VERSION}</span>`}</b></li>
        <li><span>ความรุนแรง</span>${severityChip(c.severity)}</li>
        <li><span>เมนู</span><b>${esc(c.module)}</b></li>
        <li><span>ช่องทาง</span><b>${esc(c.channel)}</b></li>
        <li><span>วันที่แจ้ง</span><b>${fmtDate(c.createdAt)}</b></li>
        <li><span>ETA</span><b>${fmtDay(c.eta)}</b></li>
        <li><span>แก้ไขใน version</span><b>${esc(c.fixVersion || "—")}</b></li>
        <li><span>วัน Publish</span><b>${fmtDay(c.publishDate)}</b></li>
        <li><span>ผลสรุป</span><b>${esc(c.resolution || "—")}</b></li>
        <li><span>ความพึงพอใจ</span><b>${c.rating ? `<span class="star-read">${"★".repeat(c.rating.score)}<i>${"★".repeat(5 - c.rating.score)}</i></span> ${RATING_LABELS[c.rating.score]}` : "—"}</b></li>
      </ul>
    </div>`;
}

function render() {
  if (!c || !canSeeCase(c, currentRole)) return renderNotFound();
  document.title = `${c.id} · ${c.title}`;
  markRead(currentUser, c.id); // เปิดดูเคส = อ่านข้อความทั้งหมดแล้ว
  const history = [...c.history].reverse();

  page.innerHTML = `
    <a class="back" href="cases.html">← กลับรายการเคส</a>

    <div class="card case-head">
      <div class="ch-top">
        <span class="case-id big">${c.id}</span>${statusPill(c.status)}${severityChip(c.severity)}
        ${isStaff ? alertBadges(c) : ""}
      </div>
      <h1>${esc(c.title)}</h1>
      <div class="muted small">แจ้งโดย ${esc(c.reporterName || c.reporter)} · 🏢 ${esc(companyName(c.companyId))} · ${fmtDate(c.createdAt)}</div>
      <div class="env-line">🌐 <b>${esc(c.domain)}</b> <span class="ver">พบปัญหาบน ${esc(c.reportedVersion)}</span>
        ${companyVersion(c.companyId) !== c.reportedVersion ? `<span class="ver now">ตอนนี้ ${esc(companyVersion(c.companyId))}</span>` : ""}</div>
      ${stepper(c)}
    </div>

    <div class="detail-grid">
      <div class="detail-main">
        ${currentCard()}

        <div class="card">
          <h3 class="sec-title">🕘 ประวัติและความคืบหน้า</h3>
          <form class="comment-box" id="commentForm">
            <textarea name="text" rows="2" placeholder="${isStaff ? "เพิ่มความคิดเห็น / อัปเดตให้ลูกค้า" : "พิมพ์ข้อความถึงทีมงาน"}"></textarea>
            <div class="comment-actions">
              ${isStaff ? `<label class="check-inline"><input type="checkbox" name="internal" /> 🔒 บันทึกภายใน (ลูกค้าไม่เห็น)</label>` : `<span></span>`}
              <button class="btn primary sm" type="submit">ส่งข้อความ</button>
            </div>
          </form>
          <ol class="timeline">${history.map(timelineItem).join("")}</ol>
        </div>
      </div>
      <aside class="detail-side">${sidePanel()}</aside>
    </div>`;
}

function persist(msg) {
  const i = cases.findIndex((x) => x.id === c.id);
  cases[i] = c;
  saveCases(cases);
  render();
  if (msg) toast(msg);
}

function fieldInputs(fields = []) {
  return fields.map((f) => {
    if (f === "eta") return `<label class="f">กำหนดแก้ไขเสร็จ (ETA) *<input type="date" name="eta" value="${c.eta || ""}" /></label>`;
    if (f === "rating") return `
      <div class="f">ประเมินความพึงพอใจ *
        <div class="stars">${[5, 4, 3, 2, 1].map((n) => `<input type="radio" name="rating" id="r${n}" value="${n}" /><label for="r${n}" title="${RATING_LABELS[n]}">★</label>`).join("")}</div>
        <span class="muted small">การประเมินช่วยให้ทีมปรับปรุงการดูแลลูกค้า</span>
      </div>`;
    if (f === "publishDate") return `<label class="f">วันที่จะ Publish ให้ ${esc(COMPANIES[c.companyId].short)} *<input type="date" name="publishDate" value="${c.publishDate || ""}" /></label>`;
    return `<label class="f">แก้ไขใน version *<input name="version" placeholder="เช่น ${LATEST_VERSION}" value="${esc(c.fixVersion || LATEST_VERSION)}" /></label>`;
  }).join("");
}

function validateFields(fields = [], v) {
  if (fields.includes("rating") && !v.rating) return "กรุณาให้คะแนนความพึงพอใจ";
  if (fields.includes("eta") && !v.eta) return "กรุณาระบุ ETA";
  if (fields.includes("publishDate") && !v.publishDate) return "กรุณาระบุวันที่จะ Publish";
  if (fields.includes("version") && !(v.version || "").trim()) return "กรุณาระบุ version";
  return null;
}

function ownerAfter(to) {
  const r = STATUSES[to].owner;
  return r ? `${ROLES[r].icon} ${r === "customer" ? "ลูกค้า" : TEAM[r].team}` : "ปิดเคส";
}

function openTransition(t) {
  const to = resolveTo(t, c);
  const needNote = t.note === "required";
  const publicToggle = isStaff
    ? `<label class="check-inline"><input type="checkbox" name="public" ${t.public ? "checked" : ""} /> 👁 แสดงข้อความนี้ให้ลูกค้าเห็น</label>`
    : "";

  openModal({
    title: esc(t.label),
    subtitle: `${statusPill(c.status)} <span class="arrow">→</span> ${statusPill(to)}`,
    tone: t.tone === "danger" ? "danger" : "primary",
    body: `
      ${fieldInputs(t.fields)}
      <label class="f">${esc(t.noteLabel || "หมายเหตุ")}${needNote ? " *" : " (ไม่บังคับ)"}
        <textarea name="note" rows="4" placeholder="${t.public ? "ข้อความนี้ลูกค้าจะเห็น" : "ข้อความภายในทีม"}"></textarea>
      </label>
      ${publicToggle}
      <div class="owner-preview">หลังเปลี่ยนสถานะ เคสจะอยู่ที่: <b>${ownerAfter(to)}</b></div>`,
    onConfirm(form) {
      const v = Object.fromEntries(new FormData(form));
      const note = (v.note || "").trim();
      if (needNote && !note) return "กรุณากรอก" + (t.noteLabel || "หมายเหตุ");
      const err = validateFields(t.fields, v);
      if (err) return err;
      applyTransition(c, t, {
        by: currentUser, role: currentRole, note,
        isPublic: isStaff ? !!v.public : true,
        eta: v.eta, version: (v.version || "").trim(), publishDate: v.publishDate, rating: v.rating,
      });
      persist(`เปลี่ยนสถานะเป็น "${statusLabel(c.status)}" แล้ว`);
    },
  });
}

function openAction(a) {
  const needNote = a.note === "required";
  const target = a.id === "follow_up" ? "support" : ownerRole(c);
  openModal({
    title: esc(a.label),
    subtitle: esc(a.desc),
    body: `
      ${fieldInputs(a.fields)}
      <label class="f">${esc(a.noteLabel)}${needNote ? " *" : ""}
        <textarea name="note" rows="3"></textarea>
      </label>
      ${a.id === "nudge" || a.id === "follow_up" ? `<div class="owner-preview">แจ้งเตือนจะไปที่: <b>${ROLES[target].icon} ${TEAM[target].team}</b></div>` : ""}
      ${a.id === "take" ? `<div class="owner-preview">คุณจะเป็นผู้รับผิดชอบของ <b>${TEAM[ownerRole(c)].team}</b> ในเคสนี้ — ลูกค้าเห็นชื่อคุณ</div>` : ""}`,
    onConfirm(form) {
      const v = Object.fromEntries(new FormData(form));
      const note = (v.note || "").trim();
      if (needNote && !note) return "กรุณากรอก" + a.noteLabel;
      const err = validateFields(a.fields, v);
      if (err) return err;
      applyAction(c, a, { by: currentUser, role: currentRole, note, eta: v.eta, publishDate: v.publishDate });
      persist({ take: "รับเคสแล้ว", nudge: "ส่งการทวงถามแล้ว", follow_up: "ส่งคำถามถึงทีม Support แล้ว" }[a.id] || "บันทึกแล้ว");
    },
  });
}

// อ่านข้อมูลล่าสุดก่อนทำรายการ เผื่อมีการแก้จาก tab อื่น
function reload() {
  cases = loadCases();
  c = cases.find((x) => x.id === caseId);
}

page.addEventListener("click", (e) => {
  const eb = e.target.closest("[data-edit]");
  if (eb || e.target.closest("[data-edit-cancel]")) {
    reload();
    editingAt = eb ? Number(eb.dataset.edit) : null;
    render();
    const ta = eb && document.querySelector("#editForm textarea");
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
    return;
  }
  const tb = e.target.closest("[data-tr]");
  const ab = e.target.closest("[data-act]");
  if (!tb && !ab) return;
  reload();
  if (tb) {
    const t = transitionsFor(c, currentRole).find((x) => x.id === tb.dataset.tr);
    return t ? openTransition(t) : render();
  }
  const a = actionsFor(c, currentRole, currentUser).find((x) => x.id === ab.dataset.act);
  return a ? openAction(a) : render();
});

page.addEventListener("submit", (e) => {
  if (e.target.id === "editForm") {
    e.preventDefault();
    const text = (new FormData(e.target).get("text") || "").trim();
    if (!text) return toast("ข้อความว่างไม่ได้");
    const at = Number(e.target.dataset.at);
    editingAt = null;
    reload();
    return editComment(c, { at, by: currentUser, text }) ? persist("แก้ไขข้อความแล้ว") : render();
  }
  if (e.target.id !== "commentForm") return;
  e.preventDefault();
  const v = Object.fromEntries(new FormData(e.target));
  const text = (v.text || "").trim();
  if (!text) return;
  reload();
  addComment(c, { by: currentUser, role: currentRole, text, internal: isStaff && !!v.internal });
  persist("ส่งข้อความแล้ว");
});

render();
