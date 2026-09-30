// ================= Admin Spec =================
// เก็บ spec ของแต่ละหน้า + navigation (หน้านี้ไปหน้าไหนได้) ไว้ใน localStorage

const STORAGE_KEY = "demoEventSpecs";

const STATUS = {
  draft: { label: "Draft", color: "#94a3b8" },
  progress: { label: "In Progress", color: "#f59e0b" },
  done: { label: "Done", color: "#10b981" },
};

const FIELD_TYPES = ["Text", "Password", "Number", "Date", "Dropdown", "Checkbox", "Radio", "Textarea", "Button", "Link", "Table", "Image", "Other"];

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const uid = () => "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function seedData() {
  const now = Date.now();
  return {
    pages: [
      {
        id: "login", name: "Login", route: "/index.html", module: "Authentication", status: "done", isStart: true,
        access: "ทุกคน (ยังไม่ได้ login)",
        description: "หน้าเข้าสู่ระบบ ผู้ใช้กรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าใช้งาน (Demo: ยังไม่ตรวจสอบรหัสผ่านจริง)",
        fields: [
          { name: "ชื่อผู้ใช้", type: "Text", required: true, note: "ห้ามว่าง" },
          { name: "รหัสผ่าน", type: "Password", required: false, note: "Demo: ยังไม่ตรวจสอบ" },
          { name: "บทบาท", type: "Dropdown", required: true, note: "ลูกค้า / Support / Product / Developer / Tester (user admin = Admin อัตโนมัติ)" },
          { name: "บริษัท", type: "Dropdown", required: true, note: "แสดงเมื่อเลือกบทบาทลูกค้า — เห็นเฉพาะข้อมูลของบริษัทตัวเอง" },
          { name: "จดจำฉัน", type: "Checkbox", required: false, note: "จำ login ไว้แม้ปิด browser" },
          { name: "ลืมรหัสผ่าน?", type: "Link", required: false, note: "ยังไม่เปิดใช้งาน" },
          { name: "เข้าสู่ระบบ", type: "Button", required: false, note: "Submit form" },
        ],
        rules: "ถ้าไม่กรอกชื่อผู้ใช้ แสดงข้อความ \"กรุณากรอกชื่อผู้ใช้\"\nถ้า login ค้างอยู่แล้ว ให้ redirect ไปหน้า Dashboard ทันที\nติ๊ก \"จดจำฉัน\" = เก็บ login ข้ามการปิด browser, ไม่ติ๊ก = เก็บเฉพาะ tab นั้น",
        navs: [{ to: "spec", trigger: "กดลิงก์ อ่าน Spec ของระบบ", condition: "" }, { to: "dashboard", trigger: "กดเข้าสู่ระบบ", condition: "กรอกชื่อผู้ใช้แล้ว / มี session ค้างอยู่" }],
        updatedAt: now,
      },
      {
        id: "dashboard", name: "Dashboard", route: "/pages/dashboard.html", module: "Main", status: "progress", isStart: false,
        access: "ทุก role — ทีมงานเห็นทุกบริษัท, ลูกค้าเห็นเฉพาะบริษัทตัวเอง",
        description: "หน้าแรกหลัง login (แทนหน้า Home เดิม) — ภาพรวมเคสแยกตามบริษัท / domain / เวอร์ชัน: เจ้าไหนแจ้งเยอะ, ค้างที่ไหน, เวอร์ชันไหนมีปัญหา, ความพึงพอใจ",
        fields: [
          { name: "งานที่ค้างอยู่ที่คุณ (Board)", type: "Other", required: false, note: "ทีมงาน: ยังไม่มีคนรับ / มอบให้คุณ / คนอื่นในทีม · ลูกค้า: รอข้อมูลจากคุณ / รอคุณยืนยันผล / ทีมกำลังดำเนินการ · Admin: ยกระดับ 2 / 1 / ยังไม่มีคนรับ — สถานะปัจจุบัน ไม่ขึ้นกับช่วงเวลา · สลับ การ์ด / List · ป้ายแดง 💬 จำนวนข้อความที่ยังไม่ได้อ่าน" },
          { name: "ช่วงเวลา", type: "Button", required: false, note: "30 วัน / 90 วัน / ทั้งหมด (นับจากวันที่แจ้ง)" },
          { name: "บริษัท", type: "Dropdown", required: false, note: "เฉพาะทีมงาน — ทุกบริษัท หรือเลือก domain" },
          { name: "KPI", type: "Other", required: false, note: "เคสที่แจ้ง, เปิดอยู่, Bug, เวลาเฉลี่ยจนปิด, ความพึงพอใจ, domain ที่ยังไม่ใช่เวอร์ชันล่าสุด" },
          { name: "เจ้าไหนแจ้งเข้ามาเยอะ", type: "Image", required: false, note: "แท่งแนวนอน สีประจำบริษัท" },
          { name: "เคสใหม่รายสัปดาห์", type: "Image", required: false, note: "เส้นแยกตามบริษัท + tooltip" },
          { name: "เปรียบเทียบรายบริษัท", type: "Table", required: false, note: "domain, เวอร์ชัน, แจ้ง/เปิด/ยกระดับ/Bug/Spec/Support แก้, เวลาตอบรับ/ปิดเฉลี่ย, พึงพอใจ, เมนูที่แจ้งบ่อย" },
          { name: "เวอร์ชันที่พบปัญหา / เมนูที่แจ้งบ่อย / ผลสรุป", type: "Image", required: false, note: "แท่งแนวนอนชุดเดียว" },
          { name: "เคสทั้งหมดของบริษัท", type: "Table", required: false, note: "เฉพาะลูกค้า — เปิดอยู่แสดงก่อน, วันแจ้ง/วันปิด/ผลสรุป" },
        ],
        rules: "ถ้ายังไม่ login ให้ redirect กลับหน้า Login\nถ้าถูก redirect มาจากหน้าเฉพาะ admin (ไม่มีสิทธิ์) แสดงข้อความแจ้งเตือน\nสีประจำบริษัทผูกกับบริษัท ไม่เปลี่ยนตามลำดับหรือ filter\nคลิกแถวบริษัท → ไปหน้า Case Tracking ที่กรองบริษัทนั้น",
        navs: [
          { to: "cases", trigger: "กดเมนู Case Tracking", condition: "" },
          { to: "cases", trigger: "คลิกแถวบริษัทในตาราง", condition: "เฉพาะทีมงาน" },
          { to: "case", trigger: "คลิกเคสในตาราง", condition: "เฉพาะลูกค้า" },
          { to: "weekly", trigger: "กดเมนู 📨 สรุปรายสัปดาห์", condition: "" },
          { to: "spec", trigger: "กดเมนู 📖 Spec", condition: "" },
          { to: "workflow", trigger: "กดเมนู Workflow & สิทธิ์", condition: "" },
          { to: "announcements", trigger: "กดเมนู 📢 ประกาศ", condition: "เฉพาะ user admin" },
          { to: "admin", trigger: "กดเมนู Admin Spec", condition: "เฉพาะ user admin" },
          { to: "login", trigger: "กดออกจากระบบ", condition: "" },
        ],
        updatedAt: now,
      },
      {
        id: "weekly", name: "สรุปรายสัปดาห์", route: "/pages/weekly.html", module: "Case Tracking", status: "progress", isStart: false,
        access: "ทีมงานเห็นทุกบริษัท, ลูกค้าเห็นเฉพาะบริษัทตัวเอง · แก้ผู้รับได้: Support / Admin / ลูกค้า",
        description: "Auto Message สรุปเคสระดับบริษัทส่งผู้บริหารของลูกค้าทุกวันจันทร์ 09:00 — ตัวอย่างอีเมล, ตั้งผู้รับ, เปิด/ปิดการส่ง, ประวัติการส่ง",
        fields: [
          { name: "รายการบริษัท", type: "Other", required: false, note: "domain, เวอร์ชัน, สถานะส่งอัตโนมัติ, ส่งล่าสุด" },
          { name: "ส่งอัตโนมัติ", type: "Checkbox", required: false, note: "ทุกวันจันทร์ 09:00" },
          { name: "ผู้รับ (ผู้บริหาร)", type: "Text", required: false, note: "อีเมล หลายคนได้" },
          { name: "ส่งสรุปตอนนี้", type: "Button", required: false, note: "Demo: จำลองการส่ง + บันทึกประวัติ" },
          { name: "ตัวอย่างอีเมล", type: "Other", required: false, note: "แจ้งใหม่ (เทียบสัปดาห์ก่อน), ปิดแล้ว, ยังเปิดอยู่ + อยู่ที่ทีมไหน + กำหนดการ, รอบริษัทของคุณ, ความพึงพอใจ" },
        ],
        rules: "ใช้เฉพาะข้อความที่ลูกค้าเห็น ไม่มีข้อความภายใน\nเคสเลยกำหนด ETA / วัน Publish ขึ้นสีแดง\nปุ่มส่งถูกปิดถ้ายังไม่มีผู้รับ\nใช้งานจริงต้องมี server ส่งอีเมลตามเวลา",
        navs: [
          { to: "dashboard", trigger: "กดเมนู 📊 Dashboard", condition: "" },
          { to: "cases", trigger: "กดเมนู Case Tracking", condition: "" },
        ],
        updatedAt: now,
      },
      {
        id: "admin", name: "Admin Spec", route: "/pages/admin.html", module: "Admin", status: "progress", isStart: false,
        access: "เฉพาะ user admin",
        description: "หน้าสำหรับ admin บันทึก spec ของแต่ละหน้า และ flow ว่าแต่ละหน้าไปหน้าไหนได้บ้าง",
        fields: [
          { name: "รายการหน้า", type: "Other", required: false, note: "Sidebar ค้นหา/เพิ่มหน้า" },
          { name: "Spec หน้า", type: "Other", required: false, note: "แก้ไขได้ บันทึกอัตโนมัติ" },
          { name: "Flow Diagram", type: "Other", required: false, note: "แผนภาพการเชื่อมต่อทุกหน้า" },
          { name: "Export / Import JSON", type: "Button", required: false, note: "สำรอง/แชร์ข้อมูล" },
        ],
        rules: "เข้าได้เฉพาะ user admin, user อื่นถูก redirect ไปหน้า Home พร้อมข้อความแจ้งเตือน\nข้อมูลบันทึกอัตโนมัติใน browser นี้\nExport เป็นไฟล์ JSON เพื่อสำรองหรือส่งต่อ, Import เพื่อโหลดกลับ",
        navs: [
          { to: "dashboard", trigger: "กดเมนู 📊 Dashboard", condition: "" },
          { to: "login", trigger: "กดออกจากระบบ", condition: "" },
        ],
        updatedAt: now,
      },
      {
        id: "cases", name: "Case Tracking", route: "/pages/cases.html", module: "Case Tracking", status: "progress", isStart: false,
        access: "ทุก role (ลูกค้าเห็นเฉพาะเคสของบริษัทตัวเอง)",
        description: "รายการเคสที่ลูกค้าแจ้ง — ทีมงานเห็นแบบ Board/List ตามสถานะ, ลูกค้าเห็นการ์ดความคืบหน้าของเคสตัวเอง",
        fields: [
          { name: "KPI", type: "Other", required: false, note: "เปิดอยู่ / รอฉันดำเนินการ / เกิน SLA / ปิดแล้ว" },
          { name: "ค้นหา", type: "Text", required: false, note: "เลขเคส / หัวข้อ / ผู้แจ้ง" },
          { name: "ความรุนแรง", type: "Dropdown", required: false, note: "filter" },
          { name: "รอฉันดำเนินการ", type: "Button", required: false, note: "เฉพาะเคสที่ owner = role ของฉัน" },
          { name: "Board / List", type: "Button", required: false, note: "เฉพาะทีมงาน" },
          { name: "แถบนำทางสถานะ (Board)", type: "Button", required: false, note: "ชิปทุกสถานะ + จำนวนเคส คลิกเลื่อนไปคอลัมน์, ปุ่ม ◀ ▶, scrollbar ด้านบน, เงาขอบเมื่อยังเลื่อนได้, ข้อความ เห็นอยู่ x จาก 10 สถานะ" },
          { name: "แจ้งปัญหาใหม่", type: "Button", required: false, note: "เปิด modal สร้างเคส — แนบ domain + เวอร์ชันอัตโนมัติ, เตือนถ้ามีประกาศเหตุขัดข้อง" },
          { name: "บริษัท", type: "Dropdown", required: false, note: "filter เฉพาะทีมงาน (รับ ?company= จาก Dashboard)" },
        ],
        rules: "ลูกค้าเห็นเฉพาะเคสของบริษัทตัวเอง\nเคสที่รอลูกค้าดำเนินการแสดงป้าย \"รอคุณดำเนินการ\" และเรียงไว้บนสุด\nSLA: เขียว < 75%, เหลือง ≥ 75%, แดง = เกินกำหนด",
        navs: [
          { to: "case", trigger: "คลิกการ์ด / แถวเคส", condition: "" },
          { to: "case", trigger: "สร้างเคสใหม่สำเร็จ", condition: "" },
          { to: "workflow", trigger: "กดเมนู Workflow & สิทธิ์", condition: "" },
          { to: "dashboard", trigger: "กดเมนู 📊 Dashboard", condition: "" },
        ],
        updatedAt: now,
      },
      {
        id: "case", name: "Case Detail", route: "/pages/case.html?id=", module: "Case Tracking", status: "progress", isStart: false,
        access: "ทุก role (ลูกค้าเห็นเฉพาะเคสของบริษัทตัวเอง)",
        description: "รายละเอียดเคส: ความคืบหน้า 5 ขั้น, ตอนนี้อยู่ที่ใคร, ขั้นถัดไป, SLA, ปุ่มเปลี่ยนสถานะตามสิทธิ์, timeline, ผู้ติดต่อ",
        fields: [
          { name: "Stepper 5 ขั้น", type: "Other", required: false, note: "รับเรื่อง → ตรวจสอบ → แก้ไข → แก้ไขแล้ว → ปิด" },
          { name: "ปุ่มเปลี่ยนสถานะ", type: "Button", required: false, note: "แสดงเฉพาะ action ที่ role ทำได้" },
          { name: "หมายเหตุ", type: "Textarea", required: false, note: "บังคับบาง action เช่น ขอข้อมูล, ส่งต่อ" },
          { name: "ETA", type: "Date", required: true, note: "ตอนยืนยัน Bug" },
          { name: "Fix version", type: "Text", required: true, note: "ตอนทดสอบผ่าน" },
          { name: "ความคิดเห็น", type: "Textarea", required: false, note: "ทีมงานเลือก Internal ได้ · ข้อความที่ยังไม่ได้อ่านติดป้าย ใหม่ · เปิดหน้า = อ่านแล้ว" },
          { name: "แก้ไขความคิดเห็น", type: "Button", required: false, note: "✏️ เฉพาะความคิดเห็น / บันทึกภายในที่ตัวเองส่ง · แก้ในที่ แล้วขึ้น (แก้ไขแล้ว)" },
          { name: "ผู้รับผิดชอบ", type: "Other", required: false, note: "ทีมงานเห็นชื่อคนที่รับเคส · ลูกค้าเห็นเป็นทีม / บทบาทที่ดูแลการ์ด" },
          { name: "Domain / เวอร์ชันตอนแจ้ง", type: "Other", required: false, note: "บันทึกอัตโนมัติตอนสร้างเคส เทียบกับเวอร์ชันปัจจุบันของ domain" },
          { name: "ประเมินความพึงพอใจ", type: "Radio", required: true, note: "1–5 ดาว ตอนลูกค้ากดยืนยันปิดเคส" },
          { name: "รับเคส / ทวงถาม / สอบถามความคืบหน้า", type: "Button", required: false, note: "กันเคสนิ่ง — ลูกค้าสอบถามความคืบหน้าได้ไม่จำกัด" },
          { name: "ปรับ ETA / วัน Publish", type: "Date", required: true, note: "ต้องใส่เหตุผลที่ลูกค้าเห็น" },
        ],
        rules: "ข้อความ Internal ลูกค้าไม่เห็น\nแก้ไขได้เฉพาะความคิดเห็นของตัวเอง — ข้อมูลตอบกลับ / สอบถาม / ทวงถาม แก้ไม่ได้\nลูกค้าตอบกลับตอน \"รอข้อมูล\" → เคสกลับไปสถานะเดิมอัตโนมัติ\nลูกค้าเห็นผู้ติดต่อเป็น Support เสมอ (single point of contact)\nTester ทดสอบ + Publish + ปรับวัน Publish เอง (ไม่มี role Publisher แยก)\nAdmin เปลี่ยนสถานะได้ทุกอย่าง",
        navs: [{ to: "cases", trigger: "กด ← กลับรายการเคส", condition: "" }],
        updatedAt: now,
      },
      {
        id: "workflow", name: "Workflow & สิทธิ์", route: "/pages/workflow.html", module: "Case Tracking", status: "done", isStart: false,
        access: "ทุก role",
        description: "อธิบายหลักการออกแบบ, flow สถานะแบบ swimlane ตาม role, ตารางสถานะ/ผู้รับผิดชอบ และ permission matrix",
        fields: [
          { name: "Swimlane diagram", type: "Image", required: false, note: "สร้างจาก TRANSITIONS อัตโนมัติ" },
          { name: "ตารางสถานะ", type: "Table", required: false, note: "ความหมาย, owner, SLA, ข้อความที่ลูกค้าเห็น" },
          { name: "Permission matrix", type: "Table", required: false, note: "Role × Action" },
        ],
        rules: "ข้อมูลทั้งหมดมาจาก assets/js/cases-data.js — แก้ที่เดียว ทุกหน้าเปลี่ยนตาม",
        navs: [
          { to: "cases", trigger: "กดปุ่ม ไปที่ Case Tracking", condition: "" },
          { to: "dashboard", trigger: "กดเมนู 📊 Dashboard", condition: "" },
        ],
        updatedAt: now,
      },
      {
        id: "announcements", name: "ประกาศเหตุขัดข้อง", route: "/pages/announcements.html", module: "Admin", status: "progress", isStart: false,
        access: "เฉพาะ user admin",
        description: "Admin ประกาศเหตุขัดข้องที่กระทบลูกค้าหลายราย — แสดงแถบประกาศบนทุกหน้า (รวม Login) ลูกค้าไม่ต้องแจ้งเคสซ้ำ",
        fields: [
          { name: "หัวข้อ", type: "Text", required: true, note: "" },
          { name: "รายละเอียดถึงลูกค้า", type: "Textarea", required: true, note: "" },
          { name: "ผลกระทบ", type: "Dropdown", required: true, note: "ใช้งานไม่ได้ / บางส่วน-ช้า / ปิดปรับปรุง" },
          { name: "สถานะ", type: "Dropdown", required: true, note: "กำลังตรวจสอบ / กำลังแก้ไข / เฝ้าติดตาม / ปกติ" },
          { name: "เมนูที่เกี่ยวข้อง", type: "Checkbox", required: false, note: "" },
          { name: "ขอบเขตลูกค้า", type: "Radio", required: true, note: "ทุกบริษัท หรือเลือกบริษัท" },
        ],
        rules: "ลูกค้าเห็นเฉพาะประกาศที่กระทบบริษัทตัวเอง, หน้า Login แสดงเฉพาะประกาศที่กระทบทุกบริษัท\nตอนลูกค้ากดแจ้งปัญหาใหม่ จะเห็นประกาศที่กำลังเกิดขึ้นก่อน\nทุกการอัปเดตต้องมีข้อความถึงลูกค้า และเก็บเป็นไทม์ไลน์",
        navs: [
          { to: "cases", trigger: "กดเมนู Case Tracking", condition: "" },
          { to: "dashboard", trigger: "กดเมนู 📊 Dashboard", condition: "" },
        ],
        updatedAt: now,
      },
      {
        id: "spec", name: "Spec", route: "/pages/spec.html", module: "Main", status: "done", isStart: false,
        access: "ทุกคน — ไม่ต้อง login",
        description: "เอกสาร Spec ของระบบในเว็บ (ที่มา, ระบบช่วยอะไร, สถานะเคสและใคร action ได้, สิทธิ์แต่ละ role) — สร้างจาก docs/OVERVIEW.md",
        fields: [
          { name: "สารบัญ", type: "Link", required: false, note: "เลื่อนไปหัวข้อ + ไฮไลต์หัวข้อที่กำลังอ่าน" },
          { name: "เนื้อหา Spec", type: "Other", required: false, note: "สร้างอัตโนมัติจาก docs/OVERVIEW.md (tools/build-spec.js)" },
          { name: "เข้าสู่ระบบเพื่อลองใช้งาน", type: "Button", required: false, note: "แสดงเมื่อยังไม่ได้ login" },
        ],
        rules: "เปิดได้โดยไม่ต้อง login\nถ้า login อยู่ แสดงแถบเมนูปกติ ถ้าไม่ได้ login แสดงหัวแบบย่อ\nแก้เนื้อหาที่ docs/OVERVIEW.md แล้วรัน node tools/build-spec.js (build-netlify.js รันให้อัตโนมัติ)",
        navs: [
          { to: "login", trigger: "กดเข้าสู่ระบบเพื่อลองใช้งาน", condition: "ยังไม่ได้ login" },
          { to: "dashboard", trigger: "กดเมนู 📊 Dashboard", condition: "login อยู่" },
        ],
        updatedAt: now,
      },
    ],
  };
}

// ข้อมูลเดิมที่บันทึกไว้ก่อนมีหน้าใหม่: เติมหน้า/เส้นทางที่ยังไม่มี โดยไม่ทับของที่ผู้ใช้แก้ไว้
const SEED_VERSION = 11;
function migrate(data) {
  if ((data.seedVersion || 1) >= SEED_VERSION) return data;
  const seed = seedData();
  // v4: หน้า Home ถูกเอาออก → Dashboard เป็นหน้าแรก
  data.pages = data.pages.filter((p) => p.id !== "home");
  data.pages.forEach((p) => {
    p.navs = p.navs.filter((n) => n.to !== "home");
    if (p.id === "login") p.rules = (p.rules || "").replace("ไปหน้า Home", "ไปหน้า Dashboard");
  });
  // v11: รวม Publisher เข้ากับ Tester → ลบกฎ / หมายเหตุเดิมที่อ้าง Publisher
  data.pages.forEach((p) => {
    p.rules = (p.rules || "").split("\n").filter((l) => !l.includes("ปรับได้ทั้ง Publisher")).join("\n");
    p.fields.forEach((fd) => {
      fd.note = (fd.note || "").replace(" / Tester / Publisher (", " / Tester (").replace(" · วัน Publish ปรับได้ทั้ง Publisher และ Tester", "");
    });
  });
  seed.pages.forEach((sp) => {
    const p = data.pages.find((x) => x.id === sp.id);
    if (!p) return data.pages.push(sp);
    sp.navs.forEach((n) => { if (!p.navs.some((x) => x.to === n.to && x.trigger === n.trigger)) p.navs.push(n); });
    sp.fields.forEach((fd) => { if (!p.fields.some((x) => x.name === fd.name)) p.fields.push(fd); });
    const lines = (p.rules || "").split("\n");
    sp.rules.split("\n").forEach((l) => { if (l && !lines.includes(l)) lines.push(l); });
    p.rules = lines.filter(Boolean).join("\n");
  });
  data.seedVersion = SEED_VERSION;
  return data;
}

// ---------- State ----------
let db;
try { db = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { db = null; }
db = !db || !Array.isArray(db.pages) ? { ...seedData(), seedVersion: SEED_VERSION } : migrate(db);

let currentId = db.pages[0] ? db.pages[0].id : null;
let view = "spec";

const $ = (id) => document.getElementById(id);
const byId = (id) => db.pages.find((p) => p.id === id);
const cur = () => byId(currentId);

let savedTimer;
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch (e) { notice("บันทึกไม่สำเร็จ: " + e.message); return; }
  const el = $("saved");
  el.classList.add("show");
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => el.classList.remove("show"), 1500);
}

function touch() {
  const p = cur();
  if (p) p.updatedAt = Date.now();
  save();
}

const statusDot = (s) => `<span class="dot" style="background:${(STATUS[s] || STATUS.draft).color}"></span>`;

// ---------- Sidebar ----------
function renderSidebar() {
  const q = $("search").value.trim().toLowerCase();
  const list = db.pages.filter((p) => (p.name + " " + p.route + " " + p.module).toLowerCase().includes(q));

  $("pageList").innerHTML = list.length
    ? list.map((p) => `
      <button class="page-item ${p.id === currentId && view === "spec" ? "active" : ""}" data-act="goto" data-id="${p.id}">
        ${statusDot(p.status)}
        <span class="pi-text">
          <span class="pi-name">${esc(p.name) || "(ไม่มีชื่อ)"}${p.isStart ? " 🚩" : ""}</span>
          <span class="pi-route">${esc(p.route) || "-"}</span>
        </span>
        <span class="pi-count" title="ไปได้ ${p.navs.length} หน้า">→ ${p.navs.length}</span>
      </button>`).join("")
    : `<div class="empty-row">ไม่พบหน้าที่ค้นหา</div>`;

  const count = (s) => db.pages.filter((p) => p.status === s).length;
  const links = db.pages.reduce((n, p) => n + p.navs.length, 0);
  $("summary").innerHTML = `
    <span><b>${db.pages.length}</b> หน้า</span>
    <span><b>${links}</b> เส้นทาง</span>
    ${Object.entries(STATUS).map(([k, v]) => `<span>${statusDot(k)}${v.label} ${count(k)}</span>`).join("")}`;
}

// ---------- Spec view ----------
function renderSpec() {
  const p = cur();
  const el = $("specView");
  if (!p) {
    el.innerHTML = `<div class="card empty-state"><div class="big">📄</div>ยังไม่มีหน้า กด "＋ เพิ่มหน้า" เพื่อเริ่มบันทึก spec</div>`;
    return;
  }

  el.innerHTML = `
    <div class="card spec-head" style="--status-color:${STATUS[p.status].color}">
      <div class="title-row">
        <input class="title-input" data-f="name" value="${esc(p.name)}" placeholder="ชื่อหน้า" />
        <button class="btn-sm danger" data-act="delete-page">🗑 ลบหน้า</button>
      </div>
      <div class="meta-grid">
        <label class="fld">Route / URL<input class="mono" data-f="route" value="${esc(p.route)}" placeholder="/page.html" /></label>
        <label class="fld">Module<input data-f="module" value="${esc(p.module)}" placeholder="เช่น Authentication" /></label>
        <label class="fld">สถานะ
          <select data-f="status">
            ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${p.status === k ? "selected" : ""}>${v.label}</option>`).join("")}
          </select>
        </label>
        <label class="fld check"><input type="checkbox" data-f="isStart" ${p.isStart ? "checked" : ""} /> 🚩 หน้าเริ่มต้นของ flow</label>
      </div>
      <div class="updated" id="updatedAt"></div>
    </div>

    <div class="card">
      <div class="card-title"><h3>🔀 Navigation <span class="sub">หน้านี้ไปหน้าไหนได้บ้าง</span></h3></div>
      <div id="miniFlow"></div>
      <div id="navList"></div>
    </div>

    <div class="card">
      <div class="card-title"><h3>📝 รายละเอียด</h3></div>
      <div class="grid-2">
        <label class="fld full">คำอธิบายหน้า<textarea data-f="description" rows="3" placeholder="หน้านี้ใช้ทำอะไร">${esc(p.description)}</textarea></label>
        <label class="fld full">สิทธิ์การเข้าถึง<input data-f="access" value="${esc(p.access)}" placeholder="เช่น Admin, ผู้ใช้ที่ login แล้ว" /></label>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><h3>🧩 Fields / Components <span class="sub">องค์ประกอบบนหน้า</span></h3></div>
      <div id="fieldList"></div>
    </div>

    <div class="card">
      <div class="card-title"><h3>📏 Business Rules <span class="sub">1 บรรทัด = 1 rule</span></h3></div>
      <label class="fld"><textarea data-f="rules" rows="5" placeholder="เงื่อนไข / validation / การทำงานของหน้า">${esc(p.rules)}</textarea></label>
    </div>`;

  renderUpdated();
  renderMiniFlow();
  renderNavs();
  renderFields();
}

function renderUpdated() {
  const p = cur();
  const u = $("updatedAt");
  if (u && p) u.textContent = "แก้ไขล่าสุด: " + new Date(p.updatedAt || Date.now()).toLocaleString("th-TH");
}

function renderMiniFlow() {
  const p = cur();
  const incoming = db.pages.flatMap((o) => o.navs.filter((n) => n.to === p.id).map((n) => ({ page: o, nav: n })));
  const outgoing = p.navs.map((n) => ({ page: byId(n.to), nav: n })).filter((x) => x.page);

  const chip = ({ page, nav }) => `
    <button class="mf-chip" data-act="goto" data-id="${page.id}">
      <b>${statusDot(page.status)}${esc(page.name) || "(ไม่มีชื่อ)"}</b>
      <small>${esc(nav.trigger) || "—"}</small>
    </button>`;

  $("miniFlow").innerHTML = `
    <div class="mini-flow">
      <div class="mf-col left"><span class="mf-label">มาจากหน้า</span>${incoming.map(chip).join("") || `<span class="mf-none">ไม่มีหน้าที่ลิงก์มา</span>`}</div>
      <div class="mf-arrow">→</div>
      <div class="mf-center"><b>${esc(p.name) || "(ไม่มีชื่อ)"}</b><small>${esc(p.route)}</small></div>
      <div class="mf-arrow">→</div>
      <div class="mf-col right"><span class="mf-label">ไปหน้า</span>${outgoing.map(chip).join("") || `<span class="mf-none">ยังไม่ได้กำหนด</span>`}</div>
    </div>`;
}

function renderNavs() {
  const p = cur();
  const others = db.pages.filter((o) => o.id !== p.id);

  const rows = p.navs.map((n, i) => `
    <tr>
      <td style="min-width:160px">
        <select data-ni="${i}" data-k="to">
          <option value="">— เลือกหน้า —</option>
          ${others.map((o) => `<option value="${o.id}" ${n.to === o.id ? "selected" : ""}>${esc(o.name)} (${esc(o.route)})</option>`).join("")}
        </select>
      </td>
      <td><input data-ni="${i}" data-k="trigger" value="${esc(n.trigger)}" placeholder="เช่น กดปุ่มบันทึก" /></td>
      <td><input data-ni="${i}" data-k="condition" value="${esc(n.condition)}" placeholder="เช่น บันทึกสำเร็จ" /></td>
      <td class="center"><button class="icon-btn" data-act="del-nav" data-i="${i}" title="ลบ">✕</button></td>
    </tr>`).join("");

  $("navList").innerHTML = `
    ${p.navs.length ? `
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>ไปหน้า</th><th>Action / Trigger</th><th>เงื่อนไข</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>` : `<div class="empty-row">ยังไม่มีเส้นทาง</div>`}
    ${others.length ? `<button class="btn-sm dashed" data-act="add-nav" style="margin-top:10px">＋ เพิ่มเส้นทาง</button>`
      : `<div class="muted" style="font-size:13px">เพิ่มหน้าอื่นก่อน จึงจะกำหนดเส้นทางได้</div>`}`;
}

function renderFields() {
  const p = cur();
  const rows = p.fields.map((f, i) => `
    <tr>
      <td><input data-fi="${i}" data-k="name" value="${esc(f.name)}" placeholder="ชื่อ field" /></td>
      <td style="width:140px">
        <select data-fi="${i}" data-k="type">
          ${FIELD_TYPES.map((t) => `<option ${f.type === t ? "selected" : ""}>${t}</option>`).join("")}
        </select>
      </td>
      <td class="center" style="width:70px"><input type="checkbox" data-fi="${i}" data-k="required" ${f.required ? "checked" : ""} /></td>
      <td><input data-fi="${i}" data-k="note" value="${esc(f.note)}" placeholder="validation / หมายเหตุ" /></td>
      <td class="center" style="width:44px"><button class="icon-btn" data-act="del-field" data-i="${i}" title="ลบ">✕</button></td>
    </tr>`).join("");

  $("fieldList").innerHTML = `
    ${p.fields.length ? `
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>ชื่อ</th><th>ประเภท</th><th style="text-align:center">บังคับ</th><th>หมายเหตุ</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>` : `<div class="empty-row">ยังไม่มี field</div>`}
    <button class="btn-sm dashed" data-act="add-field" style="margin-top:10px">＋ เพิ่ม field</button>`;
}

// ---------- Flow view ----------
function renderFlow() {
  const el = $("flowView");
  const pages = db.pages;
  if (!pages.length) {
    el.innerHTML = `<div class="card empty-state"><div class="big">🔀</div>ยังไม่มีหน้าให้แสดง flow</div>`;
    return;
  }

  // จัดคอลัมน์ตามลำดับการเดินทางจากหน้าเริ่มต้น (BFS)
  const level = {};
  const bfs = (root) => {
    level[root.id] = level[root.id] ?? 0;
    const q = [root.id];
    while (q.length) {
      const id = q.shift();
      for (const n of byId(id).navs) {
        if (byId(n.to) && level[n.to] === undefined) { level[n.to] = level[id] + 1; q.push(n.to); }
      }
    }
  };
  bfs(pages.find((p) => p.isStart) || pages[0]);
  pages.forEach((p) => { if (level[p.id] === undefined) bfs(p); });

  const cols = [];
  pages.forEach((p) => (cols[level[p.id]] = cols[level[p.id]] || []).push(p));
  for (let i = 0; i < cols.length; i++) cols[i] = cols[i] || [];

  const NW = 200, NH = 72, GX = 130, GY = 50, PAD = 48, TOP = 120;
  const maxRows = Math.max(...cols.map((c) => c.length));
  const pos = {};
  cols.forEach((col, l) => {
    const offset = ((maxRows - col.length) * (NH + GY)) / 2;
    col.forEach((p, i) => (pos[p.id] = { x: PAD + l * (NW + GX), y: TOP + offset + i * (NH + GY) }));
  });
  const W = PAD * 2 + cols.length * NW + (cols.length - 1) * GX;
  const H = TOP + maxRows * NH + (maxRows - 1) * GY + PAD + 40;

  const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  const mid = (a, b, c, d) => (a + 3 * b + 3 * c + d) / 8; // จุดกึ่งกลาง bezier

  let edges = "";
  const backIn = {}, backOut = {}; // นับเส้นย้อนกลับ เพื่อกระจายจุดเชื่อมไม่ให้ทับกัน
  pages.forEach((p) => {
    p.navs.forEach((n) => {
      const t = byId(n.to);
      if (!t || t.id === p.id) return;
      const a = pos[p.id], b = pos[t.id];
      const la = level[p.id], lb = level[t.id];
      let pts;
      if (lb > la) {
        // ไปข้างหน้า: ขวาของต้นทาง -> ซ้ายของปลายทาง
        const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x - 3, y2 = b.y + NH / 2;
        const dx = Math.max(40, (x2 - x1) / 2);
        pts = [x1, y1, x1 + dx, y1, x2 - dx, y2, x2, y2];
      } else if (lb < la) {
        // ย้อนกลับ: โค้งด้านบน
        const ko = (backOut[p.id] = (backOut[p.id] || 0) + 1) - 1;
        const ki = (backIn[t.id] = (backIn[t.id] || 0) + 1) - 1;
        const x1 = a.x + NW * 0.3 - 16 * ko, y1 = a.y, x2 = b.x + NW * 0.7 + 16 * ki, y2 = b.y - 3;
        const cy = Math.min(a.y, b.y) - 40 - 34 * (la - lb - 1) - 14 * ki;
        pts = [x1, y1, x1, cy, x2, cy, x2, y2];
      } else {
        // คอลัมน์เดียวกัน: โค้งด้านขวา
        const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x + NW + 3, y2 = b.y + NH / 2;
        const cx = a.x + NW + 70;
        pts = [x1, y1, cx, y1, cx, y2, x2, y2];
      }
      const [x0, y0, c1x, c1y, c2x, c2y, x3, y3] = pts;
      const mx = mid(x0, c1x, c2x, x3), my = mid(y0, c1y, c2y, y3);
      const label = trunc(n.trigger || "", 20);
      const lw = label.length * 6.6 + 16;
      edges += `
        <g class="edge" data-from="${p.id}" data-to="${t.id}">
          <path d="M${x0},${y0} C${c1x},${c1y} ${c2x},${c2y} ${x3},${y3}" marker-end="url(#arrow)" />
          ${label ? `<g class="edge-label" transform="translate(${mx},${my})">
            <rect x="${-lw / 2}" y="-11" width="${lw}" height="22" rx="11" />
            <text text-anchor="middle" y="4">${esc(label)}</text>
          </g>` : ""}
          <title>${esc(p.name)} → ${esc(t.name)}${n.trigger ? "\n" + esc(n.trigger) : ""}${n.condition ? "\nเงื่อนไข: " + esc(n.condition) : ""}</title>
        </g>`;
    });
  });

  const nodes = pages.map((p) => {
    const { x, y } = pos[p.id];
    const st = STATUS[p.status] || STATUS.draft;
    return `
      <g class="node" data-id="${p.id}" transform="translate(${x},${y})">
        <rect class="node-bg" width="${NW}" height="${NH}" rx="14" />
        <rect x="10" y="14" width="4" height="${NH - 28}" rx="2" fill="${st.color}" />
        <text class="node-name" x="26" y="30">${esc(trunc(p.name || "(ไม่มีชื่อ)", 18))}</text>
        <text class="node-route" x="26" y="49">${esc(trunc(p.route || "-", 24))}</text>
        <text class="node-status" x="${NW - 12}" y="30" text-anchor="end" fill="${st.color}">● ${st.label}</text>
        ${p.isStart ? `<g transform="translate(14,-11)"><rect width="60" height="22" rx="11" fill="#4f46e5" /><text x="30" y="15" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">🚩 START</text></g>` : ""}
      </g>`;
  }).join("");

  const allLinks = pages.flatMap((p) => p.navs.filter((n) => byId(n.to)).map((n) => ({ from: p, to: byId(n.to), nav: n })));

  el.innerHTML = `
    <div class="card flow-card">
      <div class="flow-head">
        <h3 style="font-size:15px">🔀 Flow การเชื่อมต่อระหว่างหน้า</h3>
        <div class="legend">
          ${Object.values(STATUS).map((v) => `<span><span class="dot" style="background:${v.color}"></span>${v.label}</span>`).join("")}
          <span>🚩 หน้าเริ่มต้น</span>
        </div>
      </div>
      <div class="flow-canvas">
        <svg id="flowSvg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#818cf8" />
            </marker>
          </defs>
          ${edges}
          ${nodes}
        </svg>
      </div>
      <div class="hint-sm">💡 ชี้ที่หน้าเพื่อไฮไลต์เส้นทางที่เกี่ยวข้อง · คลิกที่หน้าเพื่อเปิด spec</div>
    </div>

    <div class="card">
      <div class="card-title"><h3>📋 ตารางเส้นทางทั้งหมด <span class="sub">${allLinks.length} เส้นทาง</span></h3></div>
      ${allLinks.length ? `
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>จากหน้า</th><th></th><th>ไปหน้า</th><th>Action / Trigger</th><th>เงื่อนไข</th></tr></thead>
          <tbody>
            ${allLinks.map((l) => `
              <tr>
                <td><span class="route-cell">${statusDot(l.from.status)}<button class="link-btn" data-act="goto" data-id="${l.from.id}">${esc(l.from.name)}</button></span></td>
                <td class="arrow-cell">→</td>
                <td><span class="route-cell">${statusDot(l.to.status)}<button class="link-btn" data-act="goto" data-id="${l.to.id}">${esc(l.to.name)}</button></span></td>
                <td>${esc(l.nav.trigger) || `<span class="muted">—</span>`}</td>
                <td>${esc(l.nav.condition) || `<span class="muted">—</span>`}</td>
              </tr>`).join("")}
          </tbody>
        </table></div>` : `<div class="empty-row">ยังไม่มีเส้นทาง</div>`}
    </div>`;

  // hover highlight
  const svg = $("flowSvg");
  svg.querySelectorAll(".node").forEach((node) => {
    const id = node.dataset.id;
    node.addEventListener("mouseenter", () => {
      svg.classList.add("dim");
      node.classList.add("hl");
      svg.querySelectorAll(".edge").forEach((e) => {
        if (e.dataset.from === id || e.dataset.to === id) {
          e.classList.add("hl");
          svg.querySelector(`.node[data-id="${e.dataset.from === id ? e.dataset.to : e.dataset.from}"]`).classList.add("hl");
        }
      });
    });
    node.addEventListener("mouseleave", () => {
      svg.classList.remove("dim");
      svg.querySelectorAll(".hl").forEach((e) => e.classList.remove("hl"));
    });
    node.addEventListener("click", () => openPage(id));
  });
}

// ---------- View switching ----------
function setView(v) {
  view = v;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === v));
  $("specView").hidden = v !== "spec";
  $("flowView").hidden = v !== "flow";
  if (v === "spec") renderSpec(); else renderFlow();
  renderSidebar();
}

function openPage(id) {
  currentId = id;
  setView("spec");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- Events ----------
document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => setView(t.dataset.view)));
$("search").addEventListener("input", renderSidebar);

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const act = btn.dataset.act;
  const p = cur();

  if (act === "goto") return openPage(btn.dataset.id);

  if (act === "add-page") {
    const np = { id: uid(), name: "หน้าใหม่", route: "", module: "", status: "draft", isStart: db.pages.length === 0,
      access: "", description: "", fields: [], rules: "", navs: [], updatedAt: Date.now() };
    db.pages.push(np);
    save();
    openPage(np.id);
    const t = document.querySelector(".title-input");
    t.focus();
    t.select();
    return;
  }

  if (act === "export") return openExport();

  if (!p) return;

  if (act === "delete-page") {
    askConfirm(`ลบหน้า "${p.name}" ? เส้นทางที่ลิงก์มาหน้านี้จะถูกลบด้วย`, "ลบหน้า", () => {
      db.pages = db.pages.filter((o) => o.id !== p.id);
      db.pages.forEach((o) => (o.navs = o.navs.filter((n) => n.to !== p.id)));
      if (p.isStart && db.pages[0]) db.pages[0].isStart = true;
      currentId = db.pages[0] ? db.pages[0].id : null;
      save();
      setView("spec");
    });
  } else if (act === "add-nav") {
    p.navs.push({ to: "", trigger: "", condition: "" });
    touch(); renderNavs(); renderSidebar();
  } else if (act === "del-nav") {
    p.navs.splice(+btn.dataset.i, 1);
    touch(); renderNavs(); renderMiniFlow(); renderSidebar();
  } else if (act === "add-field") {
    p.fields.push({ name: "", type: "Text", required: false, note: "" });
    touch(); renderFields();
    const inputs = document.querySelectorAll('#fieldList input[data-k="name"]');
    inputs[inputs.length - 1].focus();
  } else if (act === "del-field") {
    p.fields.splice(+btn.dataset.i, 1);
    touch(); renderFields();
  }
});

$("specView").addEventListener("input", (e) => {
  const t = e.target;
  const p = cur();
  if (!p) return;
  const val = t.type === "checkbox" ? t.checked : t.value;

  if (t.dataset.f) {
    const f = t.dataset.f;
    p[f] = val;
    if (f === "isStart" && val) db.pages.forEach((o) => { if (o !== p) o.isStart = false; });
    touch();
    if (["name", "route", "status", "isStart", "module"].includes(f)) { renderSidebar(); renderMiniFlow(); }
    if (f === "status") document.querySelector(".spec-head").style.setProperty("--status-color", STATUS[val].color);
  } else if (t.dataset.fi !== undefined) {
    p.fields[+t.dataset.fi][t.dataset.k] = val;
    touch();
  } else if (t.dataset.ni !== undefined) {
    p.navs[+t.dataset.ni][t.dataset.k] = val;
    touch();
    renderMiniFlow();
    if (t.dataset.k === "to") renderSidebar();
  }
  renderUpdated();
});

$("importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.pages)) throw new Error("ไม่พบข้อมูล pages ในไฟล์");
      askConfirm(`นำเข้า ${data.pages.length} หน้า? ข้อมูลปัจจุบันจะถูกแทนที่`, "นำเข้า", () => {
        data.pages.forEach((p) => { p.fields = p.fields || []; p.navs = p.navs || []; p.status = STATUS[p.status] ? p.status : "draft"; });
        db = data;
        currentId = db.pages[0] ? db.pages[0].id : null;
        save();
        setView(view);
      });
    } catch (err) {
      notice("ไฟล์ไม่ถูกต้อง: " + err.message);
    } finally {
      e.target.value = "";
    }
  };
  reader.readAsText(file);
});

setView("spec");

// ---------- Dialog ในหน้า (แทน alert / confirm ที่บาง hosting ไม่แสดง) ----------
function openDialog(inner) {
  const wrap = document.createElement("div");
  wrap.className = "dlg";
  wrap.innerHTML = `<div class="dlg-card" role="dialog" aria-modal="true">${inner}</div>`;
  document.body.appendChild(wrap);
  const close = () => wrap.remove();
  wrap.addEventListener("click", (e) => { if (e.target === wrap || e.target.closest("[data-close]")) close(); });
  return { wrap, close };
}

function askConfirm(message, okLabel, onOk) {
  const { wrap, close } = openDialog(`
    <p class="dlg-msg">${esc(message)}</p>
    <div class="dlg-actions"><button class="btn-sm" data-close>ยกเลิก</button><button class="btn-sm danger" id="dlgOk">${esc(okLabel)}</button></div>`);
  wrap.querySelector("#dlgOk").addEventListener("click", () => { close(); onOk(); });
}

function notice(message) {
  openDialog(`<p class="dlg-msg">${esc(message)}</p><div class="dlg-actions"><button class="btn-sm primary" data-close>ตกลง</button></div>`);
}

// Export: แสดง JSON ให้คัดลอก + ปุ่มดาวน์โหลด (บาง hosting บล็อกการดาวน์โหลด จึงมีคัดลอกเป็นทางหลัก)
function openExport() {
  const json = JSON.stringify(db, null, 2);
  const { wrap } = openDialog(`
    <h3 class="dlg-title">⬇ Export JSON</h3>
    <p class="dlg-sub">คัดลอกข้อความนี้ไปเก็บเป็นไฟล์ .json แล้วใช้ปุ่ม Import JSON บนเครื่องอื่นได้</p>
    <textarea class="dlg-code" id="exportText" readonly>${esc(json)}</textarea>
    <div class="dlg-actions">
      <button class="btn-sm" data-close>ปิด</button>
      <button class="btn-sm" id="dlgDownload">ดาวน์โหลดไฟล์</button>
      <button class="btn-sm primary" id="dlgCopy">คัดลอก</button>
    </div>`);
  const ta = wrap.querySelector("#exportText");
  wrap.querySelector("#dlgCopy").addEventListener("click", (e) => {
    const b = e.currentTarget;
    const done = () => (b.textContent = "✓ คัดลอกแล้ว");
    const fallback = () => { ta.focus(); ta.select(); b.textContent = "เลือกข้อความแล้ว กด Ctrl+C"; };
    try { navigator.clipboard.writeText(json).then(done, fallback); } catch (err) { fallback(); }
  });
  wrap.querySelector("#dlgDownload").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    a.download = "case-tracking-spec-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  });
}
