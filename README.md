# Case-Tracking

Web demo แบบ static (HTML/CSS/JS) ไม่ต้องติดตั้งอะไร — ดับเบิลคลิก `index.html` เพื่อเริ่มใช้งาน

ระบบติดตามเคสที่ลูกค้าแจ้งปัญหา ออกแบบจาก Design Thinking: *"ลูกค้าแจ้งปัญหาแล้วไม่รู้ว่าได้รับการแก้ไขหรือยัง ถึงไหนแล้ว"*

- 📖 **ภาพรวมระบบ (สถานะ / สิทธิ์ / role):** [docs/OVERVIEW.md](docs/OVERVIEW.md)
- 📘 **เอกสารสำหรับทีมพัฒนาต่อ:** [docs/HANDOFF.md](docs/HANDOFF.md) — สถาปัตยกรรม, data model, flow, สิ่งที่ต้องทำก่อนขึ้นระบบจริง
- 📝 **ประวัติการแก้ไข:** [docs/CHANGELOG.md](docs/CHANGELOG.md)
- 🌐 **Demo ออนไลน์:** https://dynamic-manatee-7d2d4b.netlify.app
- 🚀 **Deploy:** `node tools/deploy-netlify.js` (ต้องตั้ง `NETLIFY_AUTH_TOKEN`) หรือ Netlify Drop — `node tools/build-netlify.js` แล้วลากโฟลเดอร์ `dist-netlify/` ไปวางที่ https://app.netlify.com/drop (ดู [docs/HANDOFF.md](docs/HANDOFF.md#deploy))

## โครงสร้างไฟล์

```
demo_event/
├── index.html                # หน้า Login (entry point) — เลือกบทบาท (+ บริษัท ถ้าเป็นลูกค้า)
├── pages/                    # หน้าที่ต้อง login ก่อนเข้า
│   ├── dashboard.html        # 📊 หน้าแรกหลัง login — ภาพรวมรายบริษัท / domain / เวอร์ชัน
│   ├── cases.html            # Case Tracking: รายการเคส (Board / List / การ์ดของลูกค้า)
│   ├── case.html             # รายละเอียดเคส (?id=CS-xxxx)
│   ├── weekly.html           # 📨 สรุปเคสรายสัปดาห์ถึงผู้บริหาร (Auto Message)
│   ├── spec.html             # 📖 Spec ของระบบ (จาก docs/OVERVIEW.md) — เปิดได้ไม่ต้อง login
│   ├── workflow.html         # Workflow & สิทธิ์: flow สถานะ + permission matrix + กฎยกระดับเคสนิ่ง
│   ├── announcements.html    # 📢 ประกาศเหตุขัดข้อง (เฉพาะ admin)
│   └── admin.html            # Admin Spec: บันทึก spec + flow ของแต่ละหน้า (เฉพาะ admin)
├── assets/
│   ├── css/
│   │   ├── common.css        # ตัวแปรสี, topbar, แถบประกาศ, กระดิ่ง — ใช้ทุกหน้า
│   │   ├── login.css
│   │   ├── cases.css         # หน้าเคส / workflow / ประกาศ
│   │   ├── dashboard.css
│   │   ├── weekly.css
│   │   └── admin.css
│   └── js/
│       ├── platform.js       # shim: storage fallback, goTo() / pageParams() — โหลดแรกสุดใน <head>
│       ├── cases-data.js     # ★ model กลาง: บริษัท/domain/เวอร์ชัน, สถานะ, การเปลี่ยนสถานะ + role, action, SLA, กฎยกระดับ, ข้อมูลตัวอย่าง
│       ├── auth.js           # เช็ค login, role, บริษัท, render แถบเมนู (NAV), ออกจากระบบ
│       ├── require-admin.js  # ใส่ใน <head> ของหน้าที่เข้าได้เฉพาะ admin
│       ├── announce.js       # แถบประกาศเหตุขัดข้อง (ทุกหน้า รวม Login)
│       ├── notify.js         # 🔔 กระดิ่งแจ้งเตือนในเว็บ
│       ├── cases-ui.js       # UI ร่วม: status pill, stepper, badge, modal, toast, ฟอร์มแจ้งปัญหา
│       ├── login.js · dashboard.js · cases.js · case.js · weekly.js · workflow.js · announcements.js · admin.js
├── tools/
│   ├── deploy-netlify.js     # deploy ขึ้น Netlify ผ่าน API (ต้องตั้ง NETLIFY_AUTH_TOKEN)
│   ├── build-netlify.js      # สร้าง dist-netlify/ สำหรับ Netlify (รัน build-spec ให้)
│   ├── build-spec.js         # docs/OVERVIEW.md → assets/js/spec-content.js (หน้า 📖 Spec)
│   ├── md-to-teams.js        # .md → .teams.html สำหรับคัดลอกไปวางใน Teams
│   ├── md-lib.js             # ตัวแปลง Markdown ที่ใช้ร่วมกัน
│   └── build-artifact.js     # สร้างชุดไฟล์สำหรับเผยแพร่เป็น claude.ai Artifact
├── docs/
│   ├── OVERVIEW.md           # ภาพรวม: ที่มา, สถานะเคส, สิทธิ์แต่ละ role
│   ├── HANDOFF.md            # เอกสารส่งต่อทีมพัฒนา
│   └── CHANGELOG.md          # ประวัติการแก้ไข
└── README.md
```

ลำดับโหลด script ในทุกหน้าใน `pages/`: `cases-data.js → auth.js → announce.js → notify.js → cases-ui.js → <หน้า>.js`

## บทบาท (Demo)

| บทบาท | ทำอะไรได้ |
|---|---|
| 👤 ลูกค้า | แจ้งปัญหา, ดูเคสของบริษัทตัวเอง, สอบถามความคืบหน้า (ไม่จำกัด), ตอบกลับเมื่อถูกขอข้อมูล, ยืนยันผล + ให้คะแนน / แจ้งว่ายังไม่หาย, ยกเลิกเคส, ดู Dashboard / สรุปรายสัปดาห์ของบริษัทตัวเอง |
| 🎧 Support (CX) | รับเรื่อง, แก้ไขให้ลูกค้าเอง, ขอข้อมูลเพิ่ม, ส่งต่อ Product, ทวงถามทีมอื่น, ตั้งผู้รับสรุปรายสัปดาห์, ปิดเคสเมื่อลูกค้าไม่ตอบ 7 วัน |
| 🧭 Product | ตัดสินว่าเป็น Bug หรือเป็นไปตาม Spec, ส่งกลับ Support, ยืนยัน Bug + ETA |
| 💻 Developer | เริ่มแก้ไข, ส่ง Tester, ขอข้อมูลเพิ่ม, ปรับ ETA |
| 🧪 Tester | รับงานต่อจาก Dev, ไม่ผ่าน → ส่งกลับ Dev, ผ่าน → กำหนด version + วัน Publish, Publish ให้ domain ของลูกค้า (แยกรายบริษัท), ปรับวัน Publish, แจ้งลูกค้า |
| 🛡️ Admin | ทำได้ทุกอย่าง + สร้างประกาศ + เข้าหน้า Admin Spec (login ด้วยชื่อ `admin`) |

- เลือกบทบาทตอน login หรือสลับได้ที่ dropdown **บทบาท** มุมขวาบน (สำหรับ demo flow)
- แก้ flow ให้แก้ที่ `STATUSES` / `TRANSITIONS` / `CASE_ACTIONS` ใน `assets/js/cases-data.js` ที่เดียว ทุกหน้าเปลี่ยนตาม

## การเพิ่มหน้าใหม่

1. สร้างไฟล์ใน `pages/` (คัดลอก `pages/workflow.html` เป็นต้นแบบ — มี `<header class="topbar"></header>` และลำดับ script ตามด้านบน)
2. style / logic เฉพาะหน้า → `assets/css/<ชื่อหน้า>.css`, `assets/js/<ชื่อหน้า>.js`
3. เพิ่มเมนูใน `NAV` ที่ `assets/js/auth.js` (ใส่ `adminOnly: true` ถ้าเฉพาะ admin)
4. ถ้าเฉพาะ admin: ใส่ `<script src="../assets/js/require-admin.js"></script>` ใน `<head>`
5. เพิ่ม spec ของหน้าใหม่ใน `seedData()` ของ `assets/js/admin.js` และเพิ่ม `SEED_VERSION` (migration จะเติมให้ข้อมูลเดิมเอง)
6. บันทึกการแก้ไขลง `docs/CHANGELOG.md` และอัปเดต `docs/HANDOFF.md`

## ข้อมูล

ข้อมูลทั้งหมดเก็บใน `localStorage` ของ browser (demo — แต่ละเครื่องเห็นข้อมูลของตัวเอง) รายชื่อ key อยู่ใน [docs/HANDOFF.md](docs/HANDOFF.md#storage) — ลบ key เพื่อเริ่มข้อมูลตัวอย่างใหม่
