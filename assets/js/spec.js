// ================= หน้า 📖 Spec =================
// แสดงเนื้อหา docs/OVERVIEW.md (สร้างเป็น spec-content.js โดย tools/build-spec.js) พร้อมสารบัญ

(function () {
  const spec = window.SPEC_CONTENT;
  const page = document.getElementById("page");

  // หัวแบบย่อสำหรับคนที่ยังไม่ได้ login
  if (!window.SPEC_LOGGED_IN) {
    document.querySelector(".topbar").innerHTML = `
      <a class="brand" href="../index.html">🎉 Case-Tracking</a>
      <nav class="nav-links"><a class="active" href="spec.html">📖 Spec</a></nav>
      <div class="user"><a class="btn-outline spec-login" href="../index.html">เข้าสู่ระบบเพื่อลองใช้งาน</a></div>`;
  }

  if (!spec) {
    page.innerHTML = `<div class="card empty-state"><div class="big">📖</div><p>ยังไม่มีเนื้อหา — รัน <code>node tools/build-spec.js</code></p></div>`;
    return;
  }

  const [top, ...sections] = spec.sections;
  page.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow-spec">📖 Spec ของระบบ · อัปเดต ${fmtDay(spec.updated)}</div>
        <h1>${spec.title}</h1>
      </div>
    </div>
    <div class="spec-layout">
      <nav class="spec-toc" aria-label="สารบัญ">
        <div class="toc-title">สารบัญ</div>
        ${sections.map((s) => `<a href="#${s.id}" data-target="${s.id}">${s.titleHtml}</a>`).join("")}
      </nav>
      <article class="spec-body">
        <div class="card spec-card">${top.html}</div>
        ${sections.map((s) => `
          <section class="card spec-card" id="${s.id}">
            <h2>${s.titleHtml}</h2>
            ${s.html}
          </section>`).join("")}
      </article>
    </div>`;

  // สารบัญ: เลื่อนไปหัวข้อ (ไม่เปลี่ยน URL) + ไฮไลต์หัวข้อที่กำลังอ่าน
  const links = [...page.querySelectorAll(".spec-toc a")];
  page.querySelector(".spec-toc").addEventListener("click", (e) => {
    const a = e.target.closest("a[data-target]");
    if (!a) return;
    e.preventDefault();
    const el = document.getElementById(a.dataset.target);
    window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 80, behavior: "smooth" });
  });
  const mark = () => {
    let current = links[0];
    links.forEach((a) => {
      if (document.getElementById(a.dataset.target).getBoundingClientRect().top < 140) current = a;
    });
    links.forEach((a) => a.classList.toggle("active", a === current));
  };
  addEventListener("scroll", mark, { passive: true });
  mark();
})();
