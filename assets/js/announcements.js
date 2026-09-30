// ================= หน้าจัดการประกาศ (เฉพาะ Admin) =================
// สร้างประกาศเหตุขัดข้อง, อัปเดตความคืบหน้า, ปิดประกาศเมื่อกลับมาปกติ

const page = document.getElementById("page");

function annCard(a) {
  const st = ANN_STATUS[a.status];
  const open = a.status !== "resolved";
  return `
    <article class="card ann-card" style="--c:${st.color}">
      <div class="ann-card-head">
        <div>
          <div class="ch-top">
            <span class="case-id">${a.id}</span>
            <span class="pill" style="--c:${st.color}">${st.label}</span>
            <span class="muted small">${ANN_IMPACT[a.impact].icon} ${ANN_IMPACT[a.impact].label}</span>
          </div>
          <h3>${esc(a.title)}</h3>
          <div class="muted small">ขอบเขต: ${esc(annScopeText(a))} · สร้าง ${fmtDate(a.createdAt)} · อัปเดต ${timeAgo(a.updatedAt)}</div>
        </div>
        ${open ? `<div class="actions-inline">
          <button class="btn ghost sm" data-update="${a.id}">✏️ อัปเดตความคืบหน้า</button>
          <button class="btn primary sm" data-resolve="${a.id}">✅ กลับมาปกติแล้ว</button>
        </div>` : ""}
      </div>
      <details ${open ? "open" : ""}><summary class="small muted">รายละเอียด / ไทม์ไลน์</summary>${annDetailHtml(a)}</details>
    </article>`;
}

function render() {
  const list = loadAnnouncements();
  const active = list.filter((a) => a.status !== "resolved");
  const past = list.filter((a) => a.status === "resolved");
  page.innerHTML = `
    <div class="page-head">
      <div>
        <h1>📢 ประกาศเหตุขัดข้อง</h1>
        <p class="lead">เมื่อระบบล่มหรือมีปัญหาที่กระทบลูกค้าหลายราย ให้ประกาศไว้ก่อน — แถบประกาศจะแสดงบนทุกหน้าของลูกค้าที่ได้รับผลกระทบ (รวมหน้า Login) ลูกค้าจะรู้ว่าทีมทราบแล้ว ไม่ต้องแจ้งเคสซ้ำ</p>
      </div>
      <button class="btn primary" id="newAnn">＋ สร้างประกาศ</button>
    </div>
    <h3 class="sec-title">กำลังแสดงอยู่ (${active.length})</h3>
    ${active.map(annCard).join("") || `<div class="card empty-state"><div class="big">🌤️</div><p>ไม่มีประกาศที่กำลังแสดง — ระบบปกติ</p></div>`}
    <h3 class="sec-title" style="margin-top:24px">ประวัติ (${past.length})</h3>
    ${past.map(annCard).join("") || `<p class="muted small">ยังไม่มี</p>`}`;
}

function statusOptions(selected) {
  return Object.entries(ANN_STATUS).filter(([k]) => k !== "resolved")
    .map(([k, v]) => `<option value="${k}" ${k === selected ? "selected" : ""}>${v.label}</option>`).join("");
}

function openCreate() {
  openModal({
    title: "📢 สร้างประกาศ",
    subtitle: "ลูกค้าที่อยู่ในขอบเขตจะเห็นแถบประกาศทันที",
    confirmText: "ประกาศ",
    body: `
      <label class="f">หัวข้อ *<input name="title" placeholder="เช่น ระบบใบสั่งซื้อบันทึกไม่ได้" /></label>
      <label class="f">รายละเอียดถึงลูกค้า *<textarea name="message" rows="3" placeholder="อาการที่พบ, ผลกระทบ, สิ่งที่ลูกค้าควรทำ"></textarea></label>
      <div class="form-grid">
        <label class="f">ผลกระทบ
          <select name="impact">${Object.entries(ANN_IMPACT).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join("")}</select>
        </label>
        <label class="f">สถานะ<select name="status">${statusOptions("investigating")}</select></label>
      </div>
      <div class="f">เมนูที่เกี่ยวข้อง
        <div class="check-grid">${MODULES.map((m) => `<label class="check-inline"><input type="checkbox" name="modules" value="${esc(m)}" /> ${esc(m)}</label>`).join("")}</div>
      </div>
      <div class="f">ขอบเขตลูกค้า
        <div class="check-grid">
          <label class="check-inline"><input type="radio" name="scope" value="all" checked /> ทุกบริษัท</label>
          <label class="check-inline"><input type="radio" name="scope" value="some" /> เลือกบริษัท:</label>
          ${Object.entries(COMPANIES).map(([k, co]) => `<label class="check-inline"><input type="checkbox" name="companies" value="${k}" /> ${esc(co.short)}</label>`).join("")}
        </div>
      </div>`,
    onConfirm(form) {
      const fd = new FormData(form);
      const title = (fd.get("title") || "").trim();
      const message = (fd.get("message") || "").trim();
      if (!title || !message) return "กรุณากรอกหัวข้อและรายละเอียด";
      const companies = fd.get("scope") === "all" ? "all" : fd.getAll("companies");
      if (companies !== "all" && !companies.length) return "กรุณาเลือกบริษัทอย่างน้อย 1 บริษัท";
      const list = loadAnnouncements();
      const at = Date.now();
      const num = list.reduce((m, a) => Math.max(m, parseInt(a.id.split("-")[1], 10) || 0), 100) + 1;
      const status = fd.get("status");
      list.unshift({
        id: "AN-" + num, title, message, impact: fd.get("impact"), status, modules: fd.getAll("modules"), companies,
        createdAt: at, updatedAt: at, by: currentUser,
        updates: [{ at, status, text: message, by: currentUser }],
      });
      saveAnnouncements(list);
      render();
      renderAnnouncementBanner();
      toast("ประกาศแล้ว");
    },
  });
}

function openUpdate(id, resolve = false) {
  const list = loadAnnouncements();
  const a = list.find((x) => x.id === id);
  openModal({
    title: resolve ? "✅ ปิดประกาศ — กลับมาใช้งานได้ปกติ" : "✏️ อัปเดตความคืบหน้า",
    subtitle: esc(a.title),
    confirmText: resolve ? "ปิดประกาศ" : "อัปเดต",
    body: `
      ${resolve ? "" : `<label class="f">สถานะ<select name="status">${statusOptions(a.status)}</select></label>`}
      <label class="f">ข้อความถึงลูกค้า *<textarea name="text" rows="3" placeholder="${resolve ? "เช่น แก้ไขเรียบร้อย ใช้งานได้ตามปกติแล้ว" : "ความคืบหน้าล่าสุด / เวลาที่คาดว่าจะกลับมาปกติ"}"></textarea></label>`,
    onConfirm(form) {
      const fd = new FormData(form);
      const text = (fd.get("text") || "").trim();
      if (!text) return "กรุณากรอกข้อความ";
      const at = Date.now();
      a.status = resolve ? "resolved" : fd.get("status");
      a.updatedAt = at;
      a.updates.push({ at, status: a.status, text, by: currentUser });
      saveAnnouncements(list);
      render();
      renderAnnouncementBanner();
      toast(resolve ? "ปิดประกาศแล้ว" : "อัปเดตประกาศแล้ว");
    },
  });
}

page.addEventListener("click", (e) => {
  if (e.target.closest("#newAnn")) return openCreate();
  const u = e.target.closest("[data-update]");
  if (u) return openUpdate(u.dataset.update);
  const r = e.target.closest("[data-resolve]");
  if (r) return openUpdate(r.dataset.resolve, true);
});

render();
