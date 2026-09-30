// สร้างชุดไฟล์สำหรับเผยแพร่เป็น claude.ai Artifact (หรือ hosting ที่หน้าแรกต้องเป็น "เนื้อหาหน้า" ไม่มี <html>/<head>/<body>)
// ใช้: node tools/build-artifact.js <โฟลเดอร์ปลายทาง>
//
// สิ่งที่ทำ:
//  - คัดลอก pages/ และ assets/ ไปทั้งหมด
//  - index.html (หน้าแรกของ Artifact) → ตัด <!DOCTYPE>/<html>/<head>/<body> ออก, ห่อเนื้อหาด้วย <div class="login-page">
//  - login.html → สำเนาหน้า Login แบบเต็ม ให้หน้าอื่น redirect กลับมาได้ (ไม่พึ่งว่า hosting เปิด index.html ตรงๆ ได้)
//  - แก้ปลายทาง "../index.html" ใน JS เป็น "../login.html"
// ไฟล์ต้นฉบับไม่ถูกแก้

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, "dist-artifact");
const TITLE = "Case-Tracking";

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  fs.readdirSync(src, { withFileTypes: true }).forEach((e) => {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  });
}

function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listFiles(p, base) : [path.relative(base, p).split(path.sep).join("/")];
  });
}

fs.rmSync ? fs.rmSync(OUT, { recursive: true, force: true }) : fs.rmdirSync(OUT, { recursive: true });
copyDir(path.join(ROOT, "pages"), path.join(OUT, "pages"));
copyDir(path.join(ROOT, "assets"), path.join(OUT, "assets"));

// หน้า Login แบบเต็ม (ปลายทางของ logout / ยังไม่ login)
const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
fs.writeFileSync(path.join(OUT, "login.html"), indexHtml);

// หน้าแรกของ Artifact: เฉพาะเนื้อหา
const head = (indexHtml.match(/<head>([\s\S]*?)<\/head>/) || [])[1] || "";
const body = (indexHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/) || [])[1] || "";
const headKeep = head
  .replace(/<meta[^>]*>\s*/g, "")
  .replace(/<title>[\s\S]*?<\/title>/, `<title>${TITLE}</title>`)
  .trim();
fs.writeFileSync(path.join(OUT, "index.html"), `${headKeep}
<style>.login-page { min-height: 100vh; }</style>
<div class="login-page">
${body.trim()}
</div>
`);

// ปลายทาง login ใน JS
["assets/js/auth.js", "assets/js/require-admin.js"].forEach((f) => {
  const p = path.join(OUT, f);
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").split('"../index.html"').join('"../login.html"'));
});

const files = listFiles(OUT).filter((f) => f !== "index.html");
fs.writeFileSync(path.join(OUT, "files.json"), JSON.stringify(files, null, 2));
console.log(`built ${OUT}\n  page: index.html\n  files: ${files.length} (listed in files.json)`);
