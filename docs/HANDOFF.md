# Handoff — Case-Tracking

เอกสารสำหรับทีมที่จะพัฒนาต่อ อัปเดตล่าสุด: 2026-09-30 · ประวัติการแก้ไขดูที่ [CHANGELOG.md](CHANGELOG.md)

**Demo ออนไลน์:** https://dynamic-manatee-7d2d4b.netlify.app (Netlify — ดู [Deploy](#deploy))

---

## 1. ที่มาและปัญหา

- **A** = บริษัทผู้พัฒนาโปรแกรม · **C** = ลูกค้าผู้ใช้โปรแกรม มีหลายบริษัท (C_1, C_2, C_3 …)
- ลูกค้าแต่ละบริษัทมี web ของตัวเอง **1 domain** และแต่ละ domain รันโปรแกรมของ A **คนละเวอร์ชัน**
- **ปัญหา (Design Thinking):** ลูกค้าแจ้งบัคแล้วไม่รู้ว่าได้รับการแก้ไขหรือยัง ถึงไหนแล้ว บางเคสเงียบหายเป็นเดือน
- **Flow การทำงานจริงของ A:** ลูกค้าแจ้ง Support (CX) → Support แก้เองได้ก็แก้เลย → ถ้าไม่แน่ใจหรือน่าจะเป็นบัค ส่งให้ Product ตัดสินว่าเป็น Bug หรือเป็นไปตาม Spec → ถ้าเป็น Bug ส่ง Dev → Tester ทดสอบ (ไม่ผ่านกลับไป Dev) แล้ว Tester Publish เวอร์ชันใหม่ให้ domain ของลูกค้า → ลูกค้ายืนยันปิดงานเอง

### Idea board → feature

| Idea | Feature ในระบบ | สถานะ |
|---|---|---|
| #1 ติดตามเหมือนพัสดุ | เลขเคส, stepper 6 ขั้น, "ตอนนี้อยู่ที่ใคร", ขั้นถัดไป, timeline | ✅ |
| #2 Dashboard การ์ดที่แจ้ง / ค้าง | `dashboard.html` (ลูกค้าเห็นบริษัทตัวเอง, ทีมงานเห็นทุก domain) | ✅ |
| #3 แจ้ง ETA | ETA บังคับตอนยืนยัน Bug, วัน Publish, ปรับวันต้องมีเหตุผล, ป้ายเลยกำหนด | ✅ (ขั้นตรวจสอบของ Support/Product ยังไม่มีวันคาดการณ์) |
| #4 รู้ว่าคุยกับใคร | ผู้ประสานงาน Support คนเดิม, ชื่อคนตอบทุกข้อความ, ปุ่ม "รับเคส" | ✅ |
| #5 เคสนิ่งต้องเตือนทีม | กฎยกระดับ 2 ระดับ, 🔔 กระดิ่ง, ทวงถาม, สอบถามความคืบหน้า | 🟡 เตือนในเว็บเท่านั้น (ต้องมี backend เพื่อส่ง Email / LINE / Teams) |
| #6 ประกาศเมื่อระบบล่ม | `announcements.html` + แถบประกาศทุกหน้า + เตือนตอนแจ้งเคสใหม่ | ✅ |
| #7 สรุปรายสัปดาห์ส่งผู้บริหาร | `weekly.html` ตัวอย่างอีเมล / ผู้รับ / ประวัติ | 🟡 ส่งจำลอง (ต้องมี backend + cron + mail server) |
| #8 จบที่ลูกค้า + ประเมิน + แจ้งต้อง Publish | สถานะ "รอ Publish" + วัน Publish, ลูกค้ากดยืนยัน + ให้ดาว 1–5 | ✅ (ปิดอัตโนมัติ 7 วันยังต้องกดเอง) |

---

## 2. เทคโนโลยีและการรัน

- Static HTML / CSS / vanilla JS — **ไม่มี build, ไม่มี dependency, ไม่มี backend**
- ข้อมูลเก็บใน `localStorage` ของ browser
- รัน: ดับเบิลคลิก `index.html` หรือเปิดผ่าน static server ใดก็ได้ (เช่น `npx serve .`)
- Login demo: ชื่ออะไรก็ได้ + เลือกบทบาท (+ บริษัทถ้าเป็นลูกค้า) · ชื่อ `admin` = Admin

### <a id="deploy"></a>Deploy

| วิธี | ขั้นตอน |
|---|---|
| **Netlify API (แนะนำ)** | ตั้ง Personal access token เป็น environment variable `NETLIFY_AUTH_TOKEN` หรือ `demo-event-deploy` (เครื่องนี้ตั้งเป็น Windows User variable `demo-event-deploy` แล้ว) แล้วรัน `node tools/deploy-netlify.js` — build + อัปโหลดเฉพาะไฟล์ที่เปลี่ยน + ขึ้น production ที่ URL เดิม (`--draft` = preview) · ห้ามใส่ token ในไฟล์ / git |
| **Netlify Drop** | `node tools/build-netlify.js` → ลากโฟลเดอร์ `dist-netlify/` ไปวางที่ https://app.netlify.com/drop · ต้อง login Netlify เพื่อเก็บเว็บไว้ถาวร (ไม่ login เว็บหายใน 1 ชม.) · อัปเดต: เปิด site ใน Netlify → Deploys → ลากโฟลเดอร์ใหม่ไปวาง (URL เดิม) · **URL สาธารณะ** ใครมีลิงก์ก็เปิดได้ |
| claude.ai Artifact | `node tools/build-artifact.js <out>` แล้วเผยแพร่ `<out>/index.html` เป็นหน้าหลัก + ไฟล์ใน `<out>/files.json` เป็นไฟล์ประกอบ (อัปเดตที่ URL เดิม) |
| Static hosting อื่น (Cloudflare Pages / Azure Static Web Apps) | อัปโหลดทั้งโฟลเดอร์ (ไม่ต้อง build) — แนะนำเปิด access control เพราะ login เป็น demo |

`platform.js` ทำให้ทุกวิธีข้างบนใช้โค้ดชุดเดียวกัน: storage fallback + ส่ง parameter ข้ามหน้าด้วย `goTo()` / `pageParams()` (อย่าใช้ `location.search` ตรงๆ) และห้ามใช้ `alert` / `confirm` / `prompt`

## 3. สถาปัตยกรรม

### หน้า

| หน้า | ไฟล์ | ใครเข้าได้ |
|---|---|---|
| Login | `index.html` + `login.js` | ทุกคน |
| 📊 Dashboard (หน้าแรก) | `pages/dashboard.html` + `dashboard.js` | ทุก role |
| Case Tracking | `pages/cases.html` + `cases.js` | ทุก role |
| Case Detail | `pages/case.html?id=` + `case.js` | ทุก role (ลูกค้าเฉพาะบริษัทตัวเอง) |
| 📨 สรุปรายสัปดาห์ | `pages/weekly.html` + `weekly.js` | ทุก role (ลูกค้าเฉพาะบริษัทตัวเอง) |
| Workflow & สิทธิ์ | `pages/workflow.html` + `workflow.js` | ทุก role |
| 📢 ประกาศ | `pages/announcements.html` + `announcements.js` | admin |
| Admin Spec | `pages/admin.html` + `admin.js` | admin |
| 📖 Spec | `pages/spec.html` + `spec.js` + `spec-content.js` (สร้างจาก `docs/OVERVIEW.md` ด้วย `tools/build-spec.js`) | ทุกคน ไม่ต้อง login |

### Module ร่วม (ลำดับโหลดสำคัญ)

```
platform.js     shim: storage fallback, goTo(), pageParams() — โหลดใน <head> ก่อนทุกอย่าง
cases-data.js   model กลาง (ไม่แตะ DOM) — COMPANIES, STATUSES, TRANSITIONS, CASE_ACTIONS, กฎ SLA/ยกระดับ, storage, seed
auth.js         session → currentUser, currentRole, currentCompany, isStaff, isAdmin; render topbar จาก NAV
announce.js     แถบประกาศ (หน้า Login ก็โหลด)
notify.js       กระดิ่งแจ้งเตือน (ใช้ alertsFor())
cases-ui.js     esc(), statusPill, stepper, alertBadges, openModal, toast, openNewCaseModal
<page>.js       logic ของหน้า
```

- ทุกไฟล์เป็น classic script ใช้ global scope ร่วมกัน → **ห้ามประกาศชื่อ const ซ้ำข้ามไฟล์** ที่โหลดในหน้าเดียวกัน
- `require-admin.js` ใส่ใน `<head>` ของหน้าเฉพาะ admin (redirect ก่อน render)
- เมนูทั้งหมดอยู่ที่ `NAV` ใน `auth.js`

## 4. Data model

### Company (`COMPANIES` ใน cases-data.js)
```js
abc: { name, short: "ABC", domain: "abc-construction.com", version: "v5.2.0" }  // version = ค่าเริ่มต้น
```
เวอร์ชันปัจจุบันจริงอ่านจาก `companyVersion(id)` (override ใน storage เมื่อ Publish) · `LATEST_VERSION = "v5.3.0"`

### Case
```js
{
  id: "CS-1005", companyId: "abc", domain: "abc-construction.com",
  reportedVersion: "v5.2.0",           // เวอร์ชันของ domain ตอนแจ้ง (บันทึกอัตโนมัติ)
  title, description, module, severity: "low|medium|high|critical", channel,
  reporter, reporterName,
  status, prevStatus,                  // prevStatus ใช้ตอน "รอข้อมูลจากลูกค้า" แล้วตอบกลับ
  statusSince, createdAt, updatedAt,
  assignees: { support, product, dev, tester },   // ชื่อคนที่รับเคสของแต่ละทีม
  eta, fixVersion, publishDate, publishedAt, resolution,
  rating: { score: 1-5, comment, at },
  history: [ Event ]
}
```

### History event (`type`)
| type | ความหมาย | ฟิลด์เพิ่ม |
|---|---|---|
| `create` | แจ้งปัญหา | |
| `status` | เปลี่ยนสถานะ | `action, label, from, to` |
| `assign` | รับเคส | `toRole` |
| `nudge` | ทวงถาม (CX) / สอบถามความคืบหน้า (ลูกค้า, `action: follow_up`) | `toRole` |
| `date` | ปรับ ETA / วัน Publish | `field, fromDate, toDate` |
| `comment` | ความคิดเห็น (ผู้ส่งแก้ข้อความได้ → `editComment()` เก็บ `editedAt`) | |

ทุก event มี `at, by, role, text, public` — **`public: false` = ข้อความภายใน ลูกค้าไม่เห็น** (ลูกค้ายังเห็นว่าสถานะเปลี่ยน แต่ไม่เห็นข้อความ)

### Announcement
```js
{ id: "AN-102", title, message, impact: "outage|degraded|maintenance",
  status: "investigating|fixing|monitoring|resolved", modules: [], companies: "all" | ["abc"],
  createdAt, updatedAt, by, updates: [{ at, status, text, by }] }
```

### Weekly config
```js
{ recipients: { abc: ["ceo@..."] }, enabled: { abc: true }, sent: [{ companyId, at, to, auto }] }
```

## 5. Workflow

### สถานะ (`STATUSES`)

| key | ชื่อ | เจ้าของ (owner) | SLA | ขั้นที่ลูกค้าเห็น |
|---|---|---|---|---|
| new | แจ้งเข้ามาใหม่ | support | 4 ชม. | 1 รับเรื่อง |
| support | Support ตรวจสอบ | support | 2 วัน | 2 ตรวจสอบปัญหา |
| waiting | รอข้อมูลจากลูกค้า | customer | 3 วัน | (ขั้นเดิม + ป้าย) |
| product | Product ตรวจสอบ | product | 3 วัน | 2 ตรวจสอบปัญหา |
| queued | ยืนยัน Bug · รอคิวแก้ | dev | 5 วัน | 3 กำลังแก้ไข |
| dev | Dev กำลังแก้ไข | dev | 5 วัน | 3 กำลังแก้ไข |
| verify | Tester ทดสอบ | tester | 2 วัน | 3 กำลังแก้ไข |
| publish | รอ Publish | tester | 3 วัน | 4 Publish เวอร์ชันใหม่ |
| resolved | แก้ไขแล้ว · รอยืนยัน | customer | 7 วัน | 5 แก้ไขแล้ว |
| closed | ปิดเคส | — | — | 6 ปิดเคส |

เคสที่จบโดยไม่ต้องแก้โปรแกรม stepper จะแสดงขั้น 3–4 เป็น "ข้าม"

### การเปลี่ยนสถานะ (`TRANSITIONS`) — admin ทำได้ทุกอย่าง

| id | จาก → ไป | role | ต้องกรอก |
|---|---|---|---|
| accept | new → support | support | |
| solve_support | support → resolved | support | หมายเหตุ (ลูกค้าเห็น) |
| escalate | support → product | support | หมายเหตุ (ภายใน) |
| ask | support/product/dev/verify → waiting | support, product, dev, tester | หมายเหตุ |
| reply | waiting → (สถานะเดิม) | customer | หมายเหตุ |
| back_support | product → support | product | หมายเหตุ |
| as_spec | product → resolved | product | หมายเหตุ |
| confirm_bug | product → queued | product | ETA |
| start_dev | queued → dev | dev | |
| to_verify | dev → verify | dev | |
| fail | verify → dev | tester | หมายเหตุ |
| pass | verify → publish | tester | version + วัน Publish |
| published | publish → resolved | tester | หมายเหตุ · อัปเดตเวอร์ชันของ domain |
| confirm | resolved → closed | customer | คะแนน 1–5 |
| reopen | resolved → support | customer | หมายเหตุ |
| auto_close | resolved → closed | support | |
| cancel | new/support/waiting → closed | customer | หมายเหตุ |

### Action ที่ไม่เปลี่ยนสถานะ (`CASE_ACTIONS`)
`take` รับเคส · `nudge` CX ทวงถามทีมที่ถือเคส · `follow_up` ลูกค้าสอบถามความคืบหน้า (ไม่จำกัดจำนวนครั้ง) · `eta` ปรับ ETA · `publish_date` ปรับวัน Publish (Tester)

### กฎยกระดับเคสนิ่ง (`escalation()`)
- **ระดับ 1:** ยังไม่มีคนรับเกิน 2 ชม. / ผู้ถือเคสไม่ขยับเกิน 24 ชม. (`STALE_HOURS`) / เกิน SLA → แจ้งทีมที่ถือเคส + CX
- **ระดับ 2:** ไม่ขยับเกิน 48 ชม. / เกิน SLA 2 เท่า → + หัวหน้าทีม + Admin
- นับ "ความเคลื่อนไหว" เฉพาะจากผู้ถือเคส (`lastOwnerActivity`) — การทวงถามจากคนอื่นไม่นับ
- เวลานับเป็นชั่วโมงปฏิทิน (ยังไม่หักวันหยุด)

## 6. <a id="storage"></a>Storage keys (localStorage)

| key | เนื้อหา |
|---|---|
| `demoUser`, `demoRole`, `demoCompany` | session (อยู่ใน sessionStorage หรือ localStorage ถ้าติ๊ก "จดจำฉัน") |
| `demoEventCases_v4` | เคสทั้งหมด (เปลี่ยน suffix เมื่อโครงสร้างเปลี่ยน → seed ใหม่) |
| `demoEventVersions` | เวอร์ชันปัจจุบันของแต่ละ domain หลัง Publish |
| `demoEventAnnouncements` | ประกาศ |
| `demoEventWeekly` | ผู้รับ / การตั้งค่า / ประวัติสรุปรายสัปดาห์ |
| `demoEventSpecs` | ข้อมูล Admin Spec (มี `seedVersion` + `migrate()` เติมหน้าใหม่แบบไม่ทับของเดิม) |
| `demoCasesView` | Board / List ที่เลือกล่าสุด |

## 7. สิ่งที่ต้องทำก่อนใช้งานจริง

1. **Backend + ฐานข้อมูลกลาง** — ตาราง `companies (domain, current_version)`, `cases`, `case_events`, `assignments`, `announcements`, `weekly_subscriptions`, `users/roles`
2. **Auth จริง + สิทธิ์ฝั่ง server** — ตอนนี้ตรวจสิทธิ์ที่ browser อย่างเดียว (แก้ localStorage ได้) ต้องแยกข้อมูลลูกค้ารายบริษัท (multi-tenant) ที่ API
3. **Job ตามเวลา (cron)**
   - ตรวจกฎยกระดับทุก 15–30 นาที → ส่งแจ้งเตือน
   - ส่งสรุปรายสัปดาห์ทุกวันจันทร์ 09:00
   - ปิดเคสอัตโนมัติเมื่อลูกค้าไม่ตอบ 7 วัน (เตือนก่อนปิด)
4. **ช่องทางแจ้งเตือน** — Email / LINE OA / MS Teams สำหรับทั้งลูกค้าและทีม (IDEA#1, #5, #7)
5. **เวอร์ชันของแต่ละ domain** — ดึงอัตโนมัติจาก deploy pipeline แทนการตั้งเอง, ตอนสร้างเคสแนบ domain/เวอร์ชันจาก host ที่ลูกค้าใช้
6. **เชื่อม Jira** — ยืนยัน Bug แล้วสร้าง ticket อัตโนมัติ, sync สถานะ Dev/Tester กลับมา
7. **แนบไฟล์ / ภาพหน้าจอ** ในเคส
8. **วันหยุด / เวลาทำการ** ในการคำนวณ SLA

## 8. ข้อจำกัดที่รู้แล้ว

- ข้อมูลแยกตาม browser — แต่ละเครื่องเห็นข้อมูลของตัวเอง
- สลับบทบาทได้จาก dropdown (เพื่อ demo) — ต้องเอาออกในระบบจริง
- Admin = ชื่อผู้ใช้ `admin`
- กราฟใน Dashboard รองรับสีประจำบริษัท 3 สี (ผ่าน validator สีตาบอดสีแบบ all-pairs) ถ้าเพิ่มบริษัทเกิน 3 ต้องรวมเป็น "อื่นๆ" หรือแยกกราฟ (small multiples) — แก้ที่ `CO_COLORS` ใน `dashboard.js`
