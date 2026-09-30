// Deploy dist-netlify/ ขึ้น Netlify site เดิมผ่าน API (ไม่ต้องลากวาง, ไม่ต้องใช้ netlify-cli — รองรับ Node 12)
//
// ใช้:
//   1) สร้าง Personal access token ที่ Netlify → User settings → Applications → Personal access tokens
//   2) ตั้งเป็น environment variable ในเครื่อง (อย่าใส่ token ลงในไฟล์ / แชท / git)
//        PowerShell:  $env:NETLIFY_AUTH_TOKEN = "<token>"
//        Git Bash:    export NETLIFY_AUTH_TOKEN="<token>"
//   3) node tools/deploy-netlify.js            (build dist-netlify ให้อัตโนมัติ แล้ว deploy เป็น production)
//
// ตัวเลือก: NETLIFY_SITE_ID = site id หรือ domain (ค่าเริ่มต้น: dynamic-manatee-7d2d4b.netlify.app)
//           --draft = deploy แบบ preview (ไม่ขึ้น production)
//
// วิธีทำงาน (Netlify file digest API): ส่งรายการ sha1 ของทุกไฟล์ → Netlify ตอบว่าไฟล์ไหนยังไม่มี → อัปโหลดเฉพาะไฟล์นั้น

const fs = require("fs");
const path = require("path");
const https = require("https");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "dist-netlify");
// รับ token จาก NETLIFY_AUTH_TOKEN หรือตัวแปรชื่อ demo-event-deploy (ตั้งเป็น Windows User variable ไว้แล้ว)
const TOKEN = process.env.NETLIFY_AUTH_TOKEN || process.env["demo-event-deploy"];
const SITE = process.env.NETLIFY_SITE_ID || "dynamic-manatee-7d2d4b.netlify.app";
const DRAFT = process.argv.includes("--draft");

if (!TOKEN) {
  console.error("ไม่พบ token (NETLIFY_AUTH_TOKEN หรือ demo-event-deploy) — ตั้งค่าตามวิธีด้านบนสุดของไฟล์นี้ก่อน");
  console.error("ถ้าเพิ่งตั้ง Windows variable ให้ปิดแล้วเปิด terminal / แอปใหม่");
  process.exit(1);
}

function api(method, urlPath, body, contentType = "application/json") {
  return new Promise((resolve, reject) => {
    const data = body == null ? null : Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
    const req = https.request({
      method, hostname: "api.netlify.com", path: "/api/v1" + urlPath,
      headers: {
        Authorization: "Bearer " + TOKEN,
        "User-Agent": "demo-event-deploy",
        ...(data ? { "Content-Type": contentType, "Content-Length": data.length } : {}),
      },
    }, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        if (res.statusCode >= 400) return reject(new Error(`${method} ${urlPath} → ${res.statusCode} ${raw.slice(0, 300)}`));
        try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { resolve(raw); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listFiles(p, base) : ["/" + path.relative(base, p).split(path.sep).join("/")];
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  require("./build-netlify"); // build ใหม่ทุกครั้ง (รวม build-spec)

  const files = {};
  const bySha = {};
  listFiles(DIR).forEach((p) => {
    const buf = fs.readFileSync(path.join(DIR, p));
    const sha = crypto.createHash("sha1").update(buf).digest("hex");
    files[p] = sha;
    (bySha[sha] = bySha[sha] || []).push(p);
  });

  console.log(`สร้าง deploy (${Object.keys(files).length} ไฟล์) → ${SITE}${DRAFT ? " [draft]" : ""}`);
  const deploy = await api("POST", `/sites/${encodeURIComponent(SITE)}/deploys`, { files, draft: DRAFT });
  const required = deploy.required || [];
  console.log(`ต้องอัปโหลด ${required.length} ไฟล์ (ที่เหลือ Netlify มีอยู่แล้ว)`);

  for (const sha of required) {
    for (const p of bySha[sha] || []) {
      await api("PUT", `/deploys/${deploy.id}/files${p.split("/").map(encodeURIComponent).join("/")}`, fs.readFileSync(path.join(DIR, p)), "application/octet-stream");
      console.log("  ↑ " + p);
    }
  }

  let d = deploy;
  for (let i = 0; i < 60 && !["ready", "error"].includes(d.state); i++) {
    await sleep(2000);
    d = await api("GET", `/deploys/${deploy.id}`);
  }
  if (d.state !== "ready") throw new Error(`deploy state: ${d.state} ${d.error_message || ""}`);

  console.log("\n✓ Deploy สำเร็จ");
  console.log("  URL หลัก     : " + (d.ssl_url || d.url));
  console.log("  deploy นี้    : " + d.deploy_ssl_url);
})().catch((e) => {
  console.error("\n✗ Deploy ไม่สำเร็จ: " + e.message);
  process.exit(1);
});
