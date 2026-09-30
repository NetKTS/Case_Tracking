// แปลงไฟล์ Markdown เป็น HTML สำหรับ "คัดลอกไปวางใน Microsoft Teams"
// ใช้: node tools/md-to-teams.js docs/OVERVIEW.md   → ได้ docs/OVERVIEW.teams.html
//
// Teams ไม่ render ไฟล์ .md และตัดตารางเมื่อวาง markdown ดิบ แต่เก็บรูปแบบเมื่อวาง "ข้อความที่ render แล้ว"
// ไฟล์ที่ได้เปิดใน browser แล้วกดปุ่ม "คัดลอก" ทีละส่วน (Teams จำกัดความยาวต่อข้อความ ~28KB) แล้ววางในแชท
// ตัวแปลงอยู่ที่ tools/md-lib.js (ใช้ร่วมกับ build-spec.js)
// ไม่มี dependency (Node 12+)

const fs = require("fs");
const path = require("path");

const src = process.argv[2];
if (!src) { console.error("usage: node tools/md-to-teams.js <file.md>"); process.exit(1); }
const md = fs.readFileSync(src, "utf8").replace(/\r\n/g, "\n");
const out = src.replace(/\.md$/i, "") + ".teams.html";

const { renderMarkdown, splitSections, inline, esc } = require("./md-lib");
const render = (m) => renderMarkdown(m, { teams: true });

// แบ่งเป็นส่วนตามหัวข้อ "## " — แต่ละส่วนคัดลอกเป็น 1 ข้อความใน Teams
const parts = splitSections(md);
const title = parts[0].title || path.basename(src);
const sections = parts.map((p, i) => ({ id: p.id, name: i ? p.title : "หัวเรื่อง", html: render(p.md), size: Buffer.byteLength(render(p.md)) }));

const page = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} · สำหรับ Teams</title>
<style>
  body { font-family: "Segoe UI", "Noto Sans Thai", Tahoma, sans-serif; background: #f3f2f8; color: #242424; margin: 0; padding: 24px 16px 60px; }
  .wrap { max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
  .intro { background: #fff; border-radius: 12px; padding: 16px 20px; font-size: 14px; line-height: 1.6; border: 1px solid #e0e0ea; }
  .sec { background: #fff; border-radius: 12px; border: 1px solid #e0e0ea; overflow: hidden; }
  .bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 16px; background: #eef0f8; font-size: 13px; }
  .bar b { color: #464775; }
  .bar small { color: #666; }
  .bar small.warn { color: #b91c1c; font-weight: 600; }
  button { border: none; background: #5b5fc7; color: #fff; border-radius: 6px; padding: 7px 14px; font: inherit; font-weight: 600; cursor: pointer; white-space: nowrap; }
  button:hover { background: #4f52b2; }
  button.done { background: #107c10; }
  .content { padding: 4px 20px 16px; font-size: 14px; line-height: 1.55; overflow-x: auto; }
  .content table { font-size: 13px; margin: 8px 0; }
  .content code { background: #f0f0f0; padding: 0 4px; border-radius: 3px; font-family: Consolas, monospace; font-size: 12.5px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="intro">
    <b>วิธีใช้:</b> กด <b>คัดลอก</b> ทีละส่วน แล้ววาง (Ctrl+V) ในแชท / โพสต์ของ Microsoft Teams — ส่วนละ 1 ข้อความ
    (Teams จำกัดความยาวต่อข้อความประมาณ 28KB; ส่วนที่ยาวเกินจะขึ้นเตือนสีแดง)<br>
    หรือกด <b>คัดลอกทั้งหมด</b> ถ้าจะวางใน Teams Post / Loop / OneNote ที่รับข้อความยาวได้
    <div style="margin-top:10px"><button data-copy="all">คัดลอกทั้งหมด</button></div>
  </div>
  <div id="all">
  ${sections.map((s) => `
  <section class="sec">
    <div class="bar"><span><b>${inline(s.name)}</b> <small class="${s.size > 26000 ? "warn" : ""}">${(s.size / 1024).toFixed(1)} KB${s.size > 26000 ? " — ยาวเกิน อาจต้องแบ่ง" : ""}</small></span><button data-copy="${s.id}">คัดลอก</button></div>
    <div class="content" id="${s.id}">${s.html}</div>
  </section>`).join("")}
  </div>
</div>
<script>
  // คัดลอกแบบ rich text (เก็บตาราง / ตัวหนา) — ใช้ selection + execCommand เพราะเปิดจากไฟล์ในเครื่องได้
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-copy]");
    if (!b) return;
    const el = document.getElementById(b.dataset.copy);
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (err) {}
    sel.removeAllRanges();
    const label = b.textContent;
    b.textContent = ok ? "✓ คัดลอกแล้ว — วางใน Teams ได้เลย" : "คัดลอกไม่สำเร็จ ลองเลือกข้อความแล้วกด Ctrl+C";
    b.classList.toggle("done", ok);
    setTimeout(() => { b.textContent = label; b.classList.remove("done"); }, 2500);
  });
</script>
</body>
</html>
`;

fs.writeFileSync(out, page);
console.log(`built ${out}`);
sections.forEach((s) => console.log(`  ${(s.size / 1024).toFixed(1).padStart(5)} KB  ${s.name}`));
