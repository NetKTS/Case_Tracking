// สร้างโฟลเดอร์สำหรับลากไปวางที่ Netlify Drop (https://app.netlify.com/drop)
// ใช้: node tools/build-netlify.js   → ได้โฟลเดอร์ dist-netlify/
//
// คัดลอกเฉพาะไฟล์ที่เว็บใช้ (index.html, pages/, assets/) — ไม่เอา docs/ และ tools/ ขึ้นไป
// รัน build-spec.js ให้ก่อน (หน้า Spec ในเว็บตรงกับ docs/OVERVIEW.md เสมอ)
// ไม่ต้องแก้โค้ด: Netlify เป็น static hosting ปกติ ทุก path เป็น relative

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, "dist-netlify");

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  fs.readdirSync(src, { withFileTypes: true }).forEach((e) => {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  });
}

// หน้า 📖 Spec สร้างจาก docs/OVERVIEW.md — build ใหม่ทุกครั้งให้ตรงกับเอกสาร
require("./build-spec");

fs.rmSync ? fs.rmSync(OUT, { recursive: true, force: true }) : fs.rmdirSync(OUT, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });
fs.copyFileSync(path.join(ROOT, "index.html"), path.join(OUT, "index.html"));
copyDir(path.join(ROOT, "pages"), path.join(OUT, "pages"));
copyDir(path.join(ROOT, "assets"), path.join(OUT, "assets"));

// กันไม่ให้ search engine เก็บ demo
fs.writeFileSync(path.join(OUT, "robots.txt"), "User-agent: *\nDisallow: /\n");

console.log(`built ${OUT}\nลากโฟลเดอร์นี้ไปวางที่ https://app.netlify.com/drop`);
