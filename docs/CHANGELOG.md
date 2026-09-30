# Changelog

รูปแบบ: รายการล่าสุดอยู่บนสุด · ทุกครั้งที่แก้ code ให้เพิ่มรายการที่นี่ และอัปเดต [HANDOFF.md](HANDOFF.md)

---

## [0.14.1] 2026-09-30 — เปลี่ยนชื่อระบบเป็น Case-Tracking
- "Demo Event" → **Case-Tracking**: title ทุกหน้า, โลโก้แถบเมนู / Login / Spec, อีเมลสรุปรายสัปดาห์, หัวเอกสาร README / OVERVIEW / HANDOFF
- อีเมลทีมตัวอย่าง @demo-event.com → @case-tracking.com · ไฟล์ export Admin Spec → case-tracking-spec-*.json
- คงไว้: ชื่อโฟลเดอร์ `demo_event`, ตัวแปร token `demo-event-deploy`, URL Netlify, storage keys (ไม่ให้ข้อมูลเดิมหาย)
- Deploy ขึ้น Netlify แล้ว

## [0.14] 2026-09-30 — รวม role Publisher เข้ากับ Tester
- ตาม flow จริง Tester เป็นคน Publish เอง → **ลบ role Publisher**: สถานะ "รอ Publish" มีเจ้าของเป็น Tester, action `published` / `publish_date` เป็นของ Tester, ผู้ที่รับเคสตอนทดสอบถือเคสต่อจนถึง Publish
- TEAM: ทีม Tester (QA / Publish) · swimlane ใน Workflow เหลือ 5 lane · หน้า Login ตัดตัวเลือก Publisher · session เดิมที่เป็น `publisher` ถูกเปลี่ยนเป็น `tester` อัตโนมัติ
- ข้อความ: "ทดสอบผ่าน · กำหนดวัน Publish"
- storage key เคส `demoEventCases_v4` (seed ใหม่ ไม่มี publisher ในข้อมูลเดิม)
- Spec: OVERVIEW, HANDOFF, README, Admin Spec `SEED_VERSION = 11` (migrate ลบกฎ / หมายเหตุเดิมที่อ้าง Publisher)

## [0.13.1] 2026-09-30 — Tester ปรับวัน Publish ได้
- สถานะ "รอ Publish": Tester (ผู้กำหนดวัน Publish ตอนทดสอบผ่าน) กด 📅 ปรับวัน Publish ได้เหมือน Publisher — ต้องใส่เหตุผลที่ลูกค้าเห็น (`actionsFor()` / `CASE_ACTIONS` ใน cases-data.js)
- Spec: OVERVIEW, HANDOFF, Admin Spec `SEED_VERSION = 10`

## [0.13] 2026-09-30 — แก้ไขความคิดเห็นของตัวเองได้
- หน้าเคส: ความคิดเห็น / บันทึกภายในที่ **ส่งโดยตัวเอง** มีปุ่ม ✏️ แก้ไข → แก้ในที่ (บันทึก / ยกเลิก) · แสดง "(แก้ไขแล้ว)" พร้อมเวลาแก้ใน tooltip
- `editComment()` ใน cases-data.js (หาโดย `at` + `by`, เก็บ `editedAt`) · แก้ได้เฉพาะ type `comment` — ข้อมูลตอบกลับ / สอบถาม / ทวงถามแก้ไม่ได้
- การแก้ไขไม่ทำให้เป็นข้อความ "ใหม่" ซ้ำ (ไม่เปลี่ยน `at`)
- Spec: OVERVIEW, HANDOFF, Admin Spec `SEED_VERSION = 9`
- Deploy ขึ้น Netlify แล้ว (https://dynamic-manatee-7d2d4b.netlify.app)

## [0.12] 2026-09-30 — การ์ด / List, ข้อความที่ยังไม่ได้อ่าน, ชื่อผู้รับผิดชอบตามผู้ดู
- Dashboard › งานที่ค้างอยู่ที่คุณ: สลับ **▦ การ์ด / ☰ List** (จำค่าใน `demoMyBoardView`) · List เป็นตารางเดียวมีคอลัมน์ "กลุ่ม"
- **ข้อความที่ยังไม่ได้อ่าน**: `isMessage`, `lastRead`, `markRead`, `unreadMessages` ใน cases-data.js (storage `demoEventRead` ต่อ user) · ป้ายแดง 💬 จำนวน บนการ์ด / แถว + สรุปที่หัว Board · หน้าเคส: เปิด = อ่านแล้ว, ข้อความใหม่ติดป้าย "ใหม่"
- **ชื่อผู้รับผิดชอบ**: ทีมงานเห็นชื่อคน, ลูกค้าเห็นเป็นทีม / บทบาท (Case Tracking, หน้าเคส, Dashboard) · การ์ดข้างหน้าเคสของลูกค้าเป็น "ทีมที่ดูแลเคสนี้" (กำลังดูแล / ดูแลแล้ว / —)
- Spec: OVERVIEW (การ์ด/List, ข้อความใหม่, ตารางการแสดงชื่อ), Admin Spec `SEED_VERSION = 8`

## [0.11] 2026-09-30 — Dashboard: Board งานที่ค้างอยู่ที่คุณ
- Dashboard (บนสุด): **🗂️ งานที่ค้างอยู่ที่คุณ** — Board ตามบทบาทของคนที่ login (`myColumns()`, `myBoard()` ใน dashboard.js)
  - ทีมงาน: ยังไม่มีคนรับ (ในทีม) / มอบให้คุณ / คนอื่นในทีม (ติ๊กแสดง, จำค่าไว้ใน `demoMyBoardTeam`)
  - ลูกค้า: รอข้อมูลจากคุณ / รอคุณยืนยันผล / ทีมกำลังดำเนินการ (ติ๊กแสดง)
  - Admin: ยกระดับ 2 / ยกระดับ 1 / ยังไม่มีคนรับ
  - เรียงเร่งด่วนก่อน, ป้ายถูกทวงถาม / ยกระดับ / ETA / SLA, คลิกหรือ Enter เปิดเคส, ใช้ filter บริษัทร่วม ไม่ขึ้นกับช่วงเวลา
- KPI บน Dashboard 6 ช่องพอดี 1 แถว
- Spec: OVERVIEW (หัวข้อใหม่ในข้อ 3 + ตารางหน้า), Admin Spec `SEED_VERSION = 7`

## [0.10.2] 2026-09-30 — Board บอกให้รู้ว่าเลื่อนดูสถานะอื่นได้
- Case Tracking (Board, 10 คอลัมน์กว้างกว่าจอ): เพิ่มแถบนำทางด้านบน — ชิปทุกสถานะพร้อมจำนวนเคส (คลิกเลื่อนไปคอลัมน์ + กระพริบไฮไลต์, ชิปของคอลัมน์ที่เห็นอยู่ถูกไฮไลต์), ปุ่ม ◀ ▶, ข้อความ "เห็นอยู่ x จาก 10 สถานะ", scrollbar ด้านบน (sync กับ board), เงาจางที่ขอบเมื่อยังเลื่อนได้, scrollbar มีสีชัดขึ้น, ล้อเมาส์บนหัวคอลัมน์เลื่อนแนวนอน
- คงตำแหน่งเลื่อนเมื่อเปลี่ยน filter · smooth scroll มี fallback กระโดดไปตำแหน่งถ้า browser ไม่เลื่อนให้
- Admin Spec `SEED_VERSION = 6`: เพิ่ม field แถบนำทางสถานะ ในหน้า Case Tracking

## [0.10.1] 2026-09-30 — Deploy ขึ้น Netlify แล้ว
- Deploy ผ่าน `tools/deploy-netlify.js` สำเร็จ: https://dynamic-manatee-7d2d4b.netlify.app (ปิด Team protection แล้ว เปิดได้โดยไม่ต้อง login Netlify)
- `deploy-netlify.js` อ่าน token จาก `NETLIFY_AUTH_TOKEN` หรือ `demo-event-deploy`

## [0.10] 2026-09-30 — หน้า Spec ในเว็บ + deploy ผ่าน Netlify API
**เพิ่ม**
- หน้า `pages/spec.html` (📖 Spec) — แสดง `docs/OVERVIEW.md` ในเว็บ พร้อมสารบัญ, เปิดได้โดยไม่ต้อง login (login อยู่ = แถบเมนูปกติ), ลิงก์จากหน้า Login + เมนู NAV
- `tools/build-spec.js` → `assets/js/spec-content.js` · `tools/md-lib.js` ตัวแปลง Markdown ร่วม (md-to-teams ใช้ด้วย)
- `tools/deploy-netlify.js` — deploy ผ่าน Netlify file-digest API (Node 12, อัปโหลดเฉพาะไฟล์ที่เปลี่ยน, `--draft`) ใช้ `NETLIFY_AUTH_TOKEN` จาก environment
- `build-netlify.js` รัน `build-spec.js` ก่อนทุกครั้ง

**เปลี่ยน**
- Admin Spec `SEED_VERSION = 5`: เพิ่มหน้า Spec, เส้นทาง Login/Dashboard → Spec, หมายเหตุสอบถามความคืบหน้าไม่จำกัด
- OVERVIEW: เพิ่มหน้า Spec ในตารางหน้า + ลิงก์ Netlify

## [0.9.4] 2026-09-30 — สอบถามความคืบหน้าได้ไม่จำกัด
- ลูกค้ากด 🙋 สอบถามความคืบหน้าได้ไม่จำกัดจำนวนครั้ง (เดิมวันละ 1 ครั้ง): `actionsFor()` ไม่เช็คเวลาแล้ว, `recentFollowUp()` → `lastFollowUp()` ใช้แสดง "สอบถามล่าสุดเมื่อ …" เท่านั้น
- อัปเดตข้อความใน workflow.js, README, HANDOFF, OVERVIEW (+ สร้าง OVERVIEW.teams.html ใหม่)

## [0.9.3] 2026-09-30 — วางเอกสารใน Microsoft Teams
- เพิ่ม `tools/md-to-teams.js` — แปลง .md เป็น `<ชื่อ>.teams.html` เปิดใน browser แล้วกด "คัดลอก" ทีละหัวข้อไปวางในแชท Teams (เก็บตาราง / ตัวหนา; Teams ไม่ render ไฟล์ .md) พร้อมบอกขนาดต่อส่วนเทียบลิมิต ~28KB
- สร้าง `docs/OVERVIEW.teams.html`
- ใส่ URL Netlify (https://dynamic-manatee-7d2d4b.netlify.app) ใน OVERVIEW / HANDOFF / README

## [0.9.2] 2026-09-30 — เปลี่ยนที่ deploy เป็น Netlify Drop
- เพิ่ม `tools/build-netlify.js` → สร้าง `dist-netlify/` (index.html, pages/, assets/, robots.txt กัน search engine) สำหรับลากไปวางที่ Netlify Drop
- HANDOFF / README: วิธี deploy หลักเป็น Netlify Drop (Artifact เป็นทางเลือก)
- ลบ Artifact บน claude.ai ที่เผยแพร่ใน 0.9 แล้ว

## [0.9.1] 2026-09-30 — เอกสารภาพรวม
- เพิ่ม `docs/OVERVIEW.md` — ทำไมถึงสร้าง, ช่วยเรื่องอะไร (map กับ 8 ideas), สถานะเคสและใครทำ action ได้, สิ่งที่แต่ละ role ทำได้, หน้าในระบบ

## [0.9] 2026-09-30 — Deploy เป็น claude.ai Artifact

**เพิ่ม**
- `assets/js/platform.js` (script แรกใน `<head>` ทุกหน้า) — shim ให้ทำงานได้ทั้งเปิดไฟล์ตรง / static hosting / sandbox:
  - `localStorage` / `sessionStorage` ใช้ไม่ได้ → ใช้หน่วยความจำแทน หน้าไม่พัง
  - `goTo(url)` / `pageParams()` — เก็บสำเนา query string (เช่น `?id=`) ไว้ใน sessionStorage เผื่อ hosting ไม่ส่งต่อ, ลิงก์ `<a href>` จำให้อัตโนมัติ
- `tools/build-artifact.js` — สร้างชุดไฟล์สำหรับ Artifact: หน้าแรกไม่มี `<html>/<head>/<body>`, เพิ่ม `login.html`, redirect ไป `../login.html`
- เผยแพร่เป็น claude.ai Artifact (ลบแล้วใน 0.9.2)

**เปลี่ยน**
- เลิกใช้ `alert()` / `confirm()` / ดาวน์โหลดตรง (sandbox ไม่แสดง): Admin Spec ใช้ dialog ในหน้า (`askConfirm`, `notice`), Export JSON เป็น dialog คัดลอก + ปุ่มดาวน์โหลด, "ลืมรหัสผ่าน?" แสดงข้อความในหน้า
- `location.search` / `location.href = "...?x="` → `pageParams()` / `goTo()` ใน case.js, cases.js, dashboard.js, weekly.js, require-admin.js

## [0.8] 2026-09-30 — Dashboard เป็นหน้าแรก, domain / เวอร์ชัน, สรุปรายสัปดาห์, ประเมินความพอใจ

**เพิ่ม**
- `pages/dashboard.html`, `assets/js/dashboard.js`, `assets/css/dashboard.css` — Dashboard (หน้าแรกหลัง login)
  - ทีมงาน: KPI, เจ้าไหนแจ้งเยอะ (แท่งสีประจำบริษัท), เคสใหม่รายสัปดาห์แยกบริษัท (เส้น + tooltip), ตารางเปรียบเทียบรายบริษัท (domain, เวอร์ชัน, แจ้ง/เปิด/ยกระดับ/Bug/Spec/Support แก้, เวลาตอบรับ/ปิดเฉลี่ย, ความพอใจ, เมนูที่แจ้งบ่อย), เวอร์ชันที่พบปัญหา, เมนูที่แจ้งบ่อย, ผลสรุปเคส
  - ลูกค้า: สรุปเฉพาะบริษัทตัวเอง + ตารางเคสทั้งหมด (เปิดอยู่ก่อน) — IDEA#2
  - filter ช่วงเวลา 30 / 90 วัน / ทั้งหมด, filter บริษัท, คลิกแถวบริษัท → `cases.html?company=`
- `pages/weekly.html`, `assets/js/weekly.js`, `assets/css/weekly.css` — สรุปเคสรายสัปดาห์ถึงผู้บริหาร (IDEA#7): ตัวอย่างอีเมล, ผู้รับ, เปิด/ปิดส่งอัตโนมัติ, ส่งจำลอง, ประวัติการส่ง
- ประเมินความพึงพอใจ 1–5 ดาว ตอนลูกค้ากด "ยืนยัน ปัญหาได้รับการแก้ไข" (`confirm` มี `fields: ["rating"]`, `c.rating`, `avgRating()`) — IDEA#8
- `COMPANIES` มี `domain` · เคสบันทึก `domain` + `reportedVersion` อัตโนมัติตอนสร้าง · แสดงบนการ์ด / รายการ / รายละเอียดเคส / ฟอร์มแจ้งปัญหา
- ข้อมูลตัวอย่างย้อนหลัง ~3 เดือน (`historyCases()` สุ่มแบบกำหนด seed) ให้ Dashboard มีข้อมูลเปรียบเทียบ
- `docs/HANDOFF.md`, `docs/CHANGELOG.md`

**เปลี่ยน**
- ลบหน้า Home (`pages/home.html`, `assets/css/home.css`) — Login / require-admin redirect ไป `dashboard.html`, ข้อความ "ไม่มีสิทธิ์" ย้ายไป Dashboard, `.alert` ย้ายไป `common.css`
- เมนู: 📊 Dashboard · Case Tracking · 📨 สรุปรายสัปดาห์ · Workflow & สิทธิ์ · (admin) 📢 ประกาศ · Admin Spec
- เวอร์ชันเริ่มต้น: ABC v5.2.0, SKY v5.1.4, NOVA v4.9.2 · storage key เคสเปลี่ยนเป็น `demoEventCases_v3` (seed ใหม่)
- `applyTransition(..., { seed: true })` ไม่เขียนเวอร์ชันบริษัทลง storage ระหว่างสร้างข้อมูลตัวอย่าง
- Workflow: เพิ่มหลักการ domain / เวอร์ชัน และสรุปรายสัปดาห์
- Admin Spec (`SEED_VERSION = 4`): หน้า Home → Dashboard, เพิ่มหน้าสรุปรายสัปดาห์, เพิ่ม field domain/เวอร์ชัน/ประเมิน/รับเคส/ปรับ ETA · `migrate()` เติม field / rule / เส้นทางใหม่แบบไม่ทับของที่ผู้ใช้แก้

## [0.7] 2026-09-30 — Tester, Publisher, หลายบริษัท, กันเคสนิ่ง, ประกาศ

**เพิ่ม**
- บทบาท 🧪 Tester (รับต่อจาก Dev, ไม่ผ่านกลับ Dev, ผ่านส่ง Publish) และ 📦 Publisher (Publish ให้แต่ละบริษัท)
- สถานะ `publish` (รอ Publish) + `publishDate`, `fixVersion`, `setCompanyVersion()` · stepper 6 ขั้น
- ลูกค้าหลายบริษัท (`COMPANIES`), เลือกบริษัทตอน login / สลับที่ topbar, ลูกค้าเห็นเฉพาะบริษัทตัวเอง
- `CASE_ACTIONS`: รับเคส, ทวงถาม (CX), สอบถามความคืบหน้า (ลูกค้า), ปรับ ETA, ปรับวัน Publish
- กฎยกระดับ 2 ระดับ (`escalation()`, `ESCALATION_RULES`), 🔔 กระดิ่ง (`notify.js`, `alertsFor()`), KPI เคสนิ่ง / ยังไม่มีคนรับ
- 📢 ประกาศเหตุขัดข้อง (`announce.js`, `announcements.html/js`): แถบบนทุกหน้า + หน้า Login, เลือกขอบเขตบริษัท, ไทม์ไลน์อัปเดต, เตือนตอนแจ้งเคสใหม่
- ป้ายเลยกำหนด ETA / วัน Publish

**เปลี่ยน**
- ขั้นทดสอบย้ายจาก Product มาเป็น Tester · ลำดับโหลด script: `cases-data → auth → announce → notify → cases-ui → page`

## [0.6] 2026-09-30 — Case Tracking

**เพิ่ม**
- `cases-data.js` (สถานะ, owner, SLA, TRANSITIONS), `cases-ui.js`, `cases.html/js` (Board / List / การ์ดลูกค้า), `case.html/js` (stepper, ตอนนี้อยู่ที่ใคร, ปุ่มตามสิทธิ์, timeline, ข้อความภายใน), `workflow.html/js` (swimlane + permission matrix)
- เลือกบทบาทตอน login + สลับบทบาทที่ topbar · topbar render จาก `NAV` ใน `auth.js`

## [0.5] 2026-09-30 — จำกัดหน้า Admin
- `require-admin.js` — Admin Spec เข้าได้เฉพาะ user `admin`, คนอื่นถูก redirect พร้อมข้อความแจ้งเตือน

## [0.4] 2026-09-30 — จัดโครงสร้างไฟล์
- แยก `pages/`, `assets/css/`, `assets/js/`, เพิ่ม `README.md`

## [0.3] 2026-09-30 — Admin Spec
- หน้า Admin Spec: บันทึก spec ของแต่ละหน้า, fields, business rules, navigation + flow diagram, Export / Import JSON

## [0.2] 2026-09-30 — Home ว่าง
## [0.1] 2026-09-30 — Login demo + Home
