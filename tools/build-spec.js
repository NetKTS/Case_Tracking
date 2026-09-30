// สร้างเนื้อหาหน้า 📖 Spec ในเว็บจาก docs/OVERVIEW.md
// ใช้: node tools/build-spec.js   → เขียน assets/js/spec-content.js
//
// หน้า pages/spec.html อ่าน window.SPEC_CONTENT จากไฟล์นี้ (ไม่ fetch .md เพราะเปิดจากไฟล์ในเครื่องแล้ว fetch ไม่ได้)
// แก้ spec → แก้ docs/OVERVIEW.md แล้วรันสคริปต์นี้ (build-netlify.js รันให้อัตโนมัติ)

const fs = require("fs");
const path = require("path");
const { renderMarkdown, splitSections, inline } = require("./md-lib");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "docs", "OVERVIEW.md");
const OUT = path.join(ROOT, "assets", "js", "spec-content.js");

const md = fs.readFileSync(SRC, "utf8");
const sections = splitSections(md).map((s, i) => ({
  id: i ? "sec-" + i : "top",
  title: i ? s.title : "",
  titleHtml: inline(s.title),
  // หัวข้อ ## ของแต่ละส่วนแสดงแยก (ใช้เป็นจุดยึดของสารบัญ) จึงตัดบรรทัดแรกออก
  html: renderMarkdown(i ? s.md.split("\n").slice(1).join("\n") : s.md.replace(/^# .+$/m, "")),
}));

const title = (md.match(/^# (.+)$/m) || [, "Spec"])[1];
const updated = fs.statSync(SRC).mtime.toISOString().slice(0, 10);

fs.writeFileSync(OUT, `// สร้างอัตโนมัติจาก docs/OVERVIEW.md โดย tools/build-spec.js — อย่าแก้ไฟล์นี้ตรงๆ
window.SPEC_CONTENT = ${JSON.stringify({ title, updated, sections }, null, 1)};
`);
console.log(`built ${path.relative(ROOT, OUT)} (${sections.length} sections, source updated ${updated})`);
