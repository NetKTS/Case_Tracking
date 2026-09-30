// ================= Case Tracking: model กลาง =================
// นิยามบริษัท, สถานะ, เจ้าของแต่ละสถานะ, การเปลี่ยนสถานะ + role ที่ทำได้, SLA, กฎยกระดับเคสนิ่ง
// ทุกหน้าอ่านจากไฟล์นี้ที่เดียว — แก้ flow ที่นี่แล้วทุกหน้าเปลี่ยนตาม
// โหลดไฟล์นี้ก่อน auth.js (auth.js ใช้ COMPANIES)

const CASES_KEY = "demoEventCases_v4";
const VERSIONS_KEY = "demoEventVersions";
const H = 3600000;
const STALE_HOURS = 24; // ผู้รับผิดชอบไม่มีความเคลื่อนไหวเกินนี้ = เคสนิ่ง
const LATEST_VERSION = "v5.3.0";

// ลูกค้าหลายบริษัท ข้อมูลแยกกัน — แต่ละบริษัทมี web ของตัวเอง 1 domain
// และแต่ละ domain รันโปรแกรมคนละเวอร์ชันได้ (version = เวอร์ชันเริ่มต้นของ demo, Publish แล้วจะเปลี่ยน)
const COMPANIES = {
  abc: { name: "บริษัท เอบีซี คอนสตรัคชั่น จำกัด", short: "ABC", domain: "abc-construction.com", version: "v5.2.0" },
  sky: { name: "บริษัท สกาย บิลด์ จำกัด", short: "SKY", domain: "skybuild.co.th", version: "v5.1.4" },
  nova: { name: "บริษัท โนวา เอ็นจิเนียริ่ง จำกัด", short: "NOVA", domain: "nova-eng.com", version: "v4.9.2" },
};
const companyDomain = (id) => (COMPANIES[id] ? COMPANIES[id].domain : "—");

// ผู้ติดต่อของแต่ละทีม — lead = หัวหน้าทีม (รับเรื่องที่ถูกยกระดับ)
const TEAM = {
  support: { team: "ทีม Support (CX)", lead: "นภา", email: "support@case-tracking.com", phone: "02-123-4567 ต่อ 1", hours: "จ.–ศ. 09:00–18:00" },
  product: { team: "ทีม Product", lead: "กานต์", email: "product@case-tracking.com", phone: "ต่อ 2" },
  dev: { team: "ทีม Dev", lead: "บอส", email: "dev@case-tracking.com", phone: "ต่อ 3" },
  // Tester ทดสอบ + Publish เวอร์ชันใหม่ให้ลูกค้าเอง (ไม่มีทีม Publish แยก)
  tester: { team: "ทีม Tester (QA / Publish)", lead: "เมย์", email: "qa@case-tracking.com", phone: "ต่อ 4" },
};

const SEVERITY = {
  low: { label: "ต่ำ", color: "#64748b" },
  medium: { label: "ปานกลาง", color: "#3b82f6" },
  high: { label: "สูง", color: "#f97316" },
  critical: { label: "วิกฤต", color: "#dc2626" },
};

const MODULES = ["ใบเสนอราคา", "ใบสั่งซื้อ", "รายงาน", "เอกสารแนบ", "ผู้ใช้งาน / Login", "การอนุมัติ", "อื่นๆ"];

// ขั้นตอนที่ลูกค้าเห็น (ย่อจากสถานะภายใน ให้เข้าใจง่าย)
const STAGES = ["รับเรื่อง", "ตรวจสอบปัญหา", "กำลังแก้ไข", "Publish เวอร์ชันใหม่", "แก้ไขแล้ว", "ปิดเคส"];
const FIX_STAGES = [2, 3]; // ขั้นที่ถูกข้ามได้ ถ้าจบโดยไม่ต้องแก้โปรแกรม

// owner = role ที่ต้องลงมือในสถานะนี้ (ลูกบอลอยู่ที่ใคร)
// slaHours = เวลาเป้าหมายที่เคสควรอยู่ในสถานะนี้ไม่เกิน
const STATUSES = {
  new: {
    label: "แจ้งเข้ามาใหม่", custShort: "รับเรื่องแล้ว", icon: "📥", color: "#3b82f6", owner: "support", stage: 0, slaHours: 4,
    desc: "ลูกค้าแจ้งปัญหาเข้ามา รอ Support รับเรื่อง",
    customerText: "เราได้รับเรื่องของคุณแล้ว ทีม Support จะรับเรื่องภายใน 4 ชั่วโมงทำการ",
    nextStep: "Support รับเรื่องและเริ่มตรวจสอบ",
  },
  support: {
    label: "Support ตรวจสอบ", custShort: "กำลังตรวจสอบ", icon: "🎧", color: "#06b6d4", owner: "support", stage: 1, slaHours: 48,
    desc: "Support ตรวจสอบ/ทำซ้ำปัญหา หากแก้ได้จะแก้ให้ลูกค้าทันที",
    customerText: "ทีม Support กำลังตรวจสอบปัญหาของคุณ",
    nextStep: "แก้ไขให้ทันที หรือส่งต่อทีม Product หากอาจเป็น Bug",
  },
  waiting: {
    label: "รอข้อมูลจากลูกค้า", custShort: "รอข้อมูลจากคุณ", icon: "⏳", color: "#f59e0b", owner: "customer", stage: null, slaHours: 72,
    desc: "ต้องการข้อมูลเพิ่มจากลูกค้า (ภาพหน้าจอ, ขั้นตอนที่ทำ) — SLA ของทีมหยุดนับระหว่างรอ",
    customerText: "เราต้องการข้อมูลเพิ่มเติมจากคุณ กรุณาตอบกลับในเคสนี้",
    nextStep: "ลูกค้าตอบกลับ แล้วเคสจะกลับไปขั้นตอนเดิมอัตโนมัติ",
  },
  product: {
    label: "Product ตรวจสอบ", custShort: "ผู้เชี่ยวชาญตรวจสอบ", icon: "🧭", color: "#8b5cf6", owner: "product", stage: 1, slaHours: 72,
    desc: "Product ตรวจกับ spec ว่าเป็น Bug จริง หรือเป็นการทำงานตามที่ออกแบบไว้",
    customerText: "ผู้เชี่ยวชาญของโปรแกรมกำลังตรวจสอบว่าเป็นข้อผิดพลาดของระบบหรือไม่",
    nextStep: "ยืนยันเป็น Bug → ส่ง Dev  หรือ  ชี้แจงว่าเป็นไปตาม Spec",
  },
  queued: {
    label: "ยืนยัน Bug · รอคิวแก้", custShort: "ยืนยันปัญหา · รอคิวแก้", icon: "🐞", color: "#ec4899", owner: "dev", stage: 2, slaHours: 120,
    desc: "ยืนยันแล้วว่าเป็น Bug มีกำหนดแก้ไข (ETA) แจ้งลูกค้าให้ทราบ",
    customerText: "ยืนยันแล้วว่าเป็นข้อผิดพลาดของระบบ และอยู่ในคิวแก้ไข",
    nextStep: "Dev เริ่มแก้ไขตามลำดับความสำคัญ",
  },
  dev: {
    label: "Dev กำลังแก้ไข", custShort: "กำลังแก้ไข", icon: "🛠️", color: "#f97316", owner: "dev", stage: 2, slaHours: 120,
    desc: "Dev แก้ไข Bug",
    customerText: "ทีมพัฒนากำลังแก้ไขปัญหาของคุณ",
    nextStep: "แก้เสร็จ → ส่งทดสอบ",
  },
  verify: {
    label: "Tester ทดสอบ", custShort: "กำลังทดสอบ", icon: "🔍", color: "#14b8a6", owner: "tester", stage: 2, slaHours: 48,
    desc: "Tester รับงานต่อจาก Dev ทดสอบผลการแก้ไข — ไม่ผ่านส่งกลับ Dev, ผ่านส่ง Publish",
    customerText: "แก้ไขเสร็จแล้ว กำลังทดสอบให้แน่ใจก่อนส่งมอบ",
    nextStep: "ผ่าน → กำหนดวัน Publish  /  ไม่ผ่าน → กลับไปให้ Dev แก้",
  },
  publish: {
    label: "รอ Publish", custShort: "รอ Publish เวอร์ชันใหม่", icon: "🚀", color: "#6366f1", owner: "tester", stage: 3, slaHours: 72,
    desc: "ทดสอบผ่านแล้ว รอ Tester Publish เวอร์ชันใหม่ให้บริษัทของลูกค้า (แต่ละบริษัท Publish แยกกัน)",
    customerText: "แก้ไขเรียบร้อยแล้ว การแก้ไขจะมีผลหลัง Publish โปรแกรมเป็นเวอร์ชันใหม่ให้บริษัทของคุณ",
    nextStep: "Tester Publish เวอร์ชันใหม่ตามกำหนด → แจ้งลูกค้าตรวจสอบ",
  },
  resolved: {
    label: "แก้ไขแล้ว · รอยืนยัน", custShort: "แก้ไขแล้ว · รอคุณยืนยัน", icon: "✅", color: "#22c55e", owner: "customer", stage: 4, slaHours: 168,
    desc: "แจ้งผลให้ลูกค้า รอลูกค้ายืนยัน (ไม่ตอบใน 7 วัน Support ปิดเคสได้)",
    customerText: "ปัญหาได้รับการแก้ไขแล้ว กรุณาตรวจสอบและยืนยันผล",
    nextStep: "ลูกค้ายืนยัน → ปิดเคส  /  ยังไม่หาย → ส่งกลับ Support",
  },
  closed: {
    label: "ปิดเคส", custShort: "ปิดเคส", icon: "🔒", color: "#64748b", owner: null, stage: 5, slaHours: null,
    desc: "จบเคส",
    customerText: "เคสนี้ปิดเรียบร้อยแล้ว ขอบคุณที่แจ้งปัญหาให้เราทราบ",
    nextStep: "—",
  },
};

// การเปลี่ยนสถานะ: from → to, roles ที่ทำได้ (admin ทำได้ทุกอย่าง)
// note: required/optional, public: ข้อความแสดงให้ลูกค้าเห็นเป็นค่าเริ่มต้นหรือไม่
// fields: ข้อมูลเพิ่มที่ต้องกรอก (eta / version / publishDate), resolution: ผลสรุปของเคส
const TRANSITIONS = [
  { id: "accept", from: ["new"], to: "support", roles: ["support"], label: "รับเรื่อง", note: "optional", public: true, primary: true },
  { id: "solve_support", from: ["support"], to: "resolved", roles: ["support"], label: "แก้ไขให้ลูกค้าแล้ว", note: "required", public: true, noteLabel: "วิธีแก้ไข / คำแนะนำให้ลูกค้า", resolution: "Support แก้ไข / แนะนำวิธีใช้", primary: true },
  { id: "escalate", from: ["support"], to: "product", roles: ["support"], label: "ส่งต่อทีม Product", note: "required", public: false, noteLabel: "สรุปปัญหาและสิ่งที่ตรวจสอบแล้ว" },
  { id: "ask", from: ["support", "product", "dev", "verify"], to: "waiting", roles: ["support", "product", "dev", "tester"], label: "ขอข้อมูลเพิ่มจากลูกค้า", note: "required", public: true, noteLabel: "สิ่งที่ต้องการจากลูกค้า" },
  { id: "reply", from: ["waiting"], to: "__prev", roles: ["customer"], label: "ส่งข้อมูลเพิ่มเติม", note: "required", public: true, noteLabel: "ข้อมูลเพิ่มเติม", primary: true },
  { id: "back_support", from: ["product"], to: "support", roles: ["product"], label: "ส่งกลับ Support", note: "required", public: false, noteLabel: "เหตุผล / คำแนะนำให้ Support" },
  { id: "as_spec", from: ["product"], to: "resolved", roles: ["product"], label: "เป็นไปตาม Spec", note: "required", public: true, noteLabel: "คำอธิบายให้ลูกค้า", resolution: "เป็นไปตาม Spec" },
  { id: "confirm_bug", from: ["product"], to: "queued", roles: ["product"], label: "ยืนยันเป็น Bug", note: "optional", public: true, fields: ["eta"], primary: true },
  { id: "start_dev", from: ["queued"], to: "dev", roles: ["dev"], label: "เริ่มแก้ไข", note: "optional", public: true, primary: true },
  { id: "to_verify", from: ["dev"], to: "verify", roles: ["dev"], label: "แก้เสร็จ · ส่ง Tester", note: "optional", public: false, primary: true },
  { id: "fail", from: ["verify"], to: "dev", roles: ["tester"], label: "ทดสอบไม่ผ่าน · ส่งกลับ Dev", note: "required", public: false, noteLabel: "สิ่งที่ไม่ผ่าน / ขั้นตอนทำซ้ำ", tone: "danger" },
  { id: "pass", from: ["verify"], to: "publish", roles: ["tester"], label: "ทดสอบผ่าน · กำหนดวัน Publish", note: "optional", public: true, noteLabel: "ข้อความแจ้งลูกค้า", fields: ["version", "publishDate"], primary: true },
  { id: "published", from: ["publish"], to: "resolved", roles: ["tester"], label: "Publish แล้ว · แจ้งลูกค้า", note: "required", public: true, noteLabel: "สิ่งที่แก้ไข / วิธีตรวจสอบ", resolution: "แก้ไข Bug แล้ว (Publish เวอร์ชันใหม่)", primary: true },
  { id: "confirm", from: ["resolved"], to: "closed", roles: ["customer"], label: "ยืนยัน ปัญหาได้รับการแก้ไข", note: "optional", public: true, noteLabel: "ความคิดเห็นเพิ่มเติม", fields: ["rating"], primary: true },
  { id: "reopen", from: ["resolved"], to: "support", roles: ["customer"], label: "ยังไม่ได้รับการแก้ไข", note: "required", public: true, noteLabel: "อาการที่ยังพบ", tone: "danger" },
  { id: "auto_close", from: ["resolved"], to: "closed", roles: ["support"], label: "ปิดเคส (ลูกค้าไม่ตอบ 7 วัน)", note: "optional", public: true },
  { id: "cancel", from: ["new", "support", "waiting"], to: "closed", roles: ["customer"], label: "ยกเลิกเคส", note: "required", public: true, noteLabel: "เหตุผลที่ยกเลิก", resolution: "ลูกค้ายกเลิก", tone: "danger", minor: true },
];

// การกระทำที่ไม่เปลี่ยนสถานะ — ใช้กันเคสนิ่ง / ปรับกำหนดการ
const CASE_ACTIONS = [
  { id: "take", label: "✋ รับเคสนี้", roles: ["support", "product", "dev", "tester"], note: "optional", public: true,
    noteLabel: "ข้อความถึงลูกค้า (ไม่บังคับ)", desc: "ระบุตัวผู้รับผิดชอบในทีมที่ถือเคสอยู่ — ลูกค้าเห็นชื่อคนดูแล" },
  { id: "nudge", label: "🔔 ทวงถามทีมที่รับผิดชอบ", roles: ["support"], note: "required", public: false,
    noteLabel: "ข้อความถึงทีมที่ถือเคส", desc: "CX (Support) ตามงานทีม Product / Dev / Tester / Publish — ขึ้นแจ้งเตือนที่ทีมนั้น" },
  { id: "follow_up", label: "🙋 สอบถามความคืบหน้า", roles: ["customer"], note: "optional", public: true,
    noteLabel: "ข้อความถึงทีม Support (ไม่บังคับ)", desc: "ลูกค้าตามเคสได้ไม่จำกัดจำนวนครั้ง — ขึ้นแจ้งเตือนที่ Support" },
  { id: "eta", label: "📅 ปรับกำหนดแก้ไข (ETA)", roles: ["product", "dev", "tester"], note: "required", public: true, fields: ["eta"],
    noteLabel: "เหตุผลที่ปรับ (ลูกค้าเห็น)", desc: "เลื่อน/ปรับ ETA ต้องบอกเหตุผลให้ลูกค้าทราบ" },
  { id: "publish_date", label: "📅 ปรับวัน Publish", roles: ["tester"], note: "required", public: true, fields: ["publishDate"],
    noteLabel: "เหตุผลที่ปรับ (ลูกค้าเห็น)", desc: "เลื่อนวัน Publish ต้องบอกเหตุผลให้ลูกค้าทราบ" },
];

// ---------- กฎ / helper ----------
const ownerRole = (c) => STATUSES[c.status].owner;
const companyName = (id) => (COMPANIES[id] ? COMPANIES[id].name : id);

function canDo(t, role) { return role === "admin" || t.roles.includes(role); }
function transitionsFor(c, role) { return TRANSITIONS.filter((t) => t.from.includes(c.status) && canDo(t, role)); }
function resolveTo(t, c) { return t.to === "__prev" ? c.prevStatus || "support" : t.to; }
function isOpen(c) { return c.status !== "closed"; }
function canSeeCase(c, role, company) {
  return role !== "customer" || c.companyId === (company || (typeof currentCompany !== "undefined" ? currentCompany : null));
}
function stageOf(c) {
  const s = STATUSES[c.status];
  return s.stage ?? STATUSES[c.prevStatus || "support"].stage;
}

// action ที่ role/user นี้ทำได้กับเคสนี้ตอนนี้
function actionsFor(c, role, user) {
  if (!isOpen(c)) return [];
  const owner = ownerRole(c);
  const staffOwner = owner && owner !== "customer";
  const ok = {
    take: staffOwner && (role === owner || role === "admin") && c.assignees[owner] !== user,
    nudge: staffOwner && owner !== "support" && (role === "support" || role === "admin"),
    follow_up: role === "customer" && staffOwner,
    eta: ["queued", "dev", "verify"].includes(c.status) && (["product", "dev", "tester"].includes(role) || role === "admin"),
    publish_date: c.status === "publish" && (role === "tester" || role === "admin"),
  };
  return CASE_ACTIONS.filter((a) => ok[a.id]);
}

// เวลาที่ลูกค้าสอบถามความคืบหน้าครั้งล่าสุด (ไม่จำกัดจำนวนครั้ง ใช้แสดงผลเท่านั้น)
function lastFollowUp(c) {
  const h = [...c.history].reverse().find((x) => x.action === "follow_up");
  return h ? h.at : null;
}

// เคสนี้ "รอ" role นี้อยู่หรือไม่
function waitingFor(c, role) {
  const owner = ownerRole(c);
  return role === "admin" ? !!owner && owner !== "customer" : owner === role;
}

function ownerInfo(c) {
  const role = ownerRole(c);
  if (!role) return { role: null, name: "—", team: "—" };
  if (role === "customer") return { role, name: c.reporterName || c.reporter, team: companyName(c.companyId) };
  return { role, name: c.assignees[role], team: TEAM[role].team, assigned: !!c.assignees[role], ...TEAM[role] };
}

// SLA: level = ok / warn (เกิน 75%) / over / none
function slaInfo(c, now = Date.now()) {
  const s = STATUSES[c.status];
  const ms = now - c.statusSince;
  if (!s.slaHours) return { level: "none", ms, text: fmtDuration(ms) };
  const ratio = ms / (s.slaHours * H);
  return {
    level: ratio >= 1 ? "over" : ratio >= 0.75 ? "warn" : "ok",
    ratio, ms, target: s.slaHours * H,
    text: fmtDuration(ms),
    targetText: fmtDuration(s.slaHours * H),
  };
}

// ความเคลื่อนไหวล่าสุดของ "ผู้ถือเคส" (การทวงถามจากคนอื่นไม่นับ)
function lastOwnerActivity(c) {
  const owner = ownerRole(c);
  const acts = c.history.filter((h) => h.at >= c.statusSince && (h.role === owner || h.role === "admin") && h.action !== "nudge");
  return Math.max(c.statusSince, ...acts.map((h) => h.at));
}

// กฎยกระดับเคสนิ่ง
// ระดับ 1: ยังไม่มีคนรับเกิน 2 ชม. / ไม่มีความเคลื่อนไหวเกิน 1 วัน / เกิน SLA → แจ้งทีมที่ถือเคส + CX (Support)
// ระดับ 2: ไม่มีความเคลื่อนไหวเกิน 2 วัน / เกิน SLA 2 เท่า → แจ้งหัวหน้าทีม + Admin เพิ่ม
const ESCALATION_RULES = [
  { level: 1, when: "ยังไม่มีคนรับเคสเกิน 2 ชม. · ผู้ถือเคสไม่มีความเคลื่อนไหวเกิน 1 วัน · เกิน SLA", notify: "ทีมที่ถือเคส + CX (Support)" },
  { level: 2, when: "ไม่มีความเคลื่อนไหวเกิน 2 วัน · เกิน SLA 2 เท่า", notify: "หัวหน้าทีมที่ถือเคส + Admin" },
];

function escalation(c, now = Date.now()) {
  const owner = ownerRole(c);
  if (!isOpen(c) || !owner || owner === "customer") return null;
  const idle = now - lastOwnerActivity(c);
  const sla = slaInfo(c, now);
  const reasons = [];
  if (!c.assignees[owner] && now - c.statusSince > 2 * H) reasons.push("ยังไม่มีคนรับเคส");
  if (idle > STALE_HOURS * H) reasons.push(`นิ่ง ${fmtDuration(idle)}`);
  if (sla.level === "over") reasons.push("เกิน SLA");
  if (!reasons.length) return null;
  const level = idle > 2 * STALE_HOURS * H || sla.ratio >= 2 ? 2 : 1;
  const notify = level === 1 ? [owner, "support"] : [owner, "support", "admin"];
  return { level, reasons, idle, owner, notify: [...new Set(notify)] };
}

// รายการแจ้งเตือน (กระดิ่ง) ของ role นี้
function alertsFor(role, user, list = loadCases()) {
  const now = Date.now();
  const items = [];
  list.filter((c) => isOpen(c) && canSeeCase(c, role)).forEach((c) => {
    if (role === "customer") {
      if (waitingFor(c, "customer")) items.push({ c, level: 1, icon: "⚡", text: `รอคุณดำเนินการ: ${STATUSES[c.status].custShort}` });
      return;
    }
    const e = escalation(c, now);
    if (e && e.notify.includes(role)) {
      items.push({ c, level: e.level, icon: e.level === 2 ? "🚨" : "⚠️", text: `${e.level === 2 ? "ยกระดับ 2" : "ยกระดับ 1"} · ${e.reasons.join(" · ")}` });
    } else if (ownerRole(c) === role && !c.assignees[role]) {
      items.push({ c, level: 0, icon: "✋", text: "ยังไม่มีคนรับเคส" });
    }
    // ทวงถามที่ส่งถึง role นี้ และยังไม่มีใครใน role นั้นตอบหลังถูกทวง
    c.history.filter((h) => h.type === "nudge" && h.toRole === role && now - h.at < 72 * H).forEach((h) => {
      const answered = c.history.some((x) => x.at > h.at && x.role === role);
      if (!answered) items.push({ c, level: 1, icon: "🔔", text: `${h.by} ${h.action === "follow_up" ? "(ลูกค้า) สอบถามความคืบหน้า" : "ทวงถาม"}${h.text ? ": " + h.text : ""}` });
    });
  });
  return items.sort((a, b) => b.level - a.level);
}

// ---------- เปลี่ยนสถานะ / action ----------
function applyTransition(c, t, { by, role, note = "", isPublic, eta, version, publishDate, rating, at = Date.now(), seed = false }) {
  const from = c.status;
  const to = resolveTo(t, c);
  if (to === "waiting") c.prevStatus = from;
  c.status = to;
  c.statusSince = at;
  c.updatedAt = at;
  if (t.resolution) c.resolution = t.resolution;
  if (eta) c.eta = eta;
  if (version) c.fixVersion = version;
  if (publishDate) c.publishDate = publishDate;
  if (rating) c.rating = { score: Number(rating), comment: note, at };
  if (t.id === "published") {
    c.publishedAt = at;
    if (!seed) setCompanyVersion(c.companyId, c.fixVersion);
  }
  if (c.assignees[role] !== undefined) c.assignees[role] = by;
  c.history.push({ at, by, role, type: "status", action: t.id, label: t.label, from, to, text: note, public: isPublic ?? t.public });
}

function applyAction(c, a, { by, role, note = "", eta, publishDate, at = Date.now() }) {
  const owner = ownerRole(c);
  const base = { at, by, role, action: a.id, text: note, public: a.public };
  if (a.id === "take") {
    c.assignees[owner] = by;
    c.history.push({ ...base, type: "assign", toRole: owner, label: `รับดูแลเคส (${TEAM[owner].team})` });
  } else if (a.id === "nudge") {
    c.history.push({ ...base, type: "nudge", toRole: owner, label: `ทวงถาม${TEAM[owner].team}` });
  } else if (a.id === "follow_up") {
    c.history.push({ ...base, type: "nudge", toRole: "support", label: "สอบถามความคืบหน้า" });
  } else if (a.id === "eta") {
    c.history.push({ ...base, type: "date", field: "eta", fromDate: c.eta, toDate: eta, label: "ปรับกำหนดแก้ไข (ETA)" });
    c.eta = eta;
  } else if (a.id === "publish_date") {
    c.history.push({ ...base, type: "date", field: "publishDate", fromDate: c.publishDate, toDate: publishDate, label: "ปรับวัน Publish" });
    c.publishDate = publishDate;
  }
  c.updatedAt = at;
}

function addComment(c, { by, role, text, internal = false, at = Date.now() }) {
  c.updatedAt = at;
  c.history.push({ at, by, role, type: "comment", text, public: !internal });
}

// แก้ข้อความความคิดเห็นของตัวเอง (หาโดยเวลาที่ส่ง + ผู้ส่ง) — คืนค่า true ถ้าแก้สำเร็จ
function editComment(c, { at, by, text, editedAt = Date.now() }) {
  const h = c.history.find((x) => x.type === "comment" && x.at === at && x.by === by);
  if (!h || !text || h.text === text) return false;
  h.text = text;
  h.editedAt = editedAt;
  c.updatedAt = editedAt;
  return true;
}

// ---------- ข้อความที่ยังไม่ได้อ่าน ----------
// เก็บเวลาที่ user แต่ละคนเปิดดูเคสล่าสุด (ต่อ browser) — { [user]: { [caseId]: timestamp } }
const READ_KEY = "demoEventRead";

// event ที่นับเป็น "ข้อความ": ความคิดเห็น, ลูกค้าส่งข้อมูลเพิ่ม, สอบถามความคืบหน้า / ทวงถาม
function isMessage(h) {
  return h.type === "comment" || h.type === "nudge" || (h.action === "reply" && !!h.text);
}

function readState() {
  try { return JSON.parse(localStorage.getItem(READ_KEY)) || {}; } catch (e) { return {}; }
}

function lastRead(user, caseId) {
  return (readState()[user] || {})[caseId] || 0;
}

function markRead(user, caseId, at = Date.now()) {
  const all = readState();
  all[user] = all[user] || {};
  all[user][caseId] = at;
  try { localStorage.setItem(READ_KEY, JSON.stringify(all)); } catch (e) {}
}

// ข้อความจากคนอื่นที่ user นี้มองเห็น และมาหลังจากเปิดดูเคสครั้งล่าสุด
function unreadMessages(c, role, user) {
  const since = lastRead(user, c.id);
  return c.history.filter((h) => isMessage(h) && h.at > since && h.by !== user && (role !== "customer" || h.public));
}

// ความพึงพอใจ (1–5)
const RATING_LABELS = { 1: "ไม่พอใจมาก", 2: "ไม่พอใจ", 3: "เฉยๆ", 4: "พอใจ", 5: "พอใจมาก" };
function avgRating(list) {
  const r = list.filter((c) => c.rating).map((c) => c.rating.score);
  return r.length ? r.reduce((a, b) => a + b, 0) / r.length : null;
}

// ETA / วัน Publish เลยกำหนดแล้วหรือยัง
function dateOverdue(d) { return !!d && new Date(d + "T23:59:59").getTime() < Date.now(); }
function etaOverdue(c) {
  if (["queued", "dev", "verify"].includes(c.status)) return dateOverdue(c.eta);
  if (c.status === "publish") return dateOverdue(c.publishDate);
  return false;
}

function createCase(list, { title, description, module, severity, reporter, reporterName, role, channel, companyId }) {
  const at = Date.now();
  const c = {
    id: nextCaseId(list), title, description, module, severity, channel, companyId, reporter, reporterName,
    // บันทึก domain และเวอร์ชันที่ลูกค้าใช้อยู่ ณ วันที่แจ้ง (ไว้ track ว่าปัญหาเกิดกับเวอร์ชันไหน)
    domain: companyDomain(companyId), reportedVersion: companyVersion(companyId),
    status: "new", prevStatus: null, statusSince: at, createdAt: at, updatedAt: at,
    assignees: { support: role === "support" ? reporter : null, product: null, dev: null, tester: null },
    resolution: null, eta: null, fixVersion: null, publishDate: null, publishedAt: null, history: [],
  };
  c.history.push({ at, by: reporter, role, type: "create", text: description, public: true });
  list.unshift(c);
  return c;
}

function nextCaseId(list) {
  const max = list.reduce((m, c) => Math.max(m, parseInt(c.id.split("-")[1], 10) || 0), 1000);
  return "CS-" + (max + 1);
}

// ---------- รูปแบบเวลา ----------
function fmtDuration(ms) {
  const h = Math.max(0, Math.floor(ms / H));
  if (h < 1) return Math.max(1, Math.floor(ms / 60000)) + " นาที";
  if (h < 24) return h + " ชม.";
  const d = Math.floor(h / 24), rh = h % 24;
  return d + " วัน" + (rh ? " " + rh + " ชม." : "");
}
function timeAgo(ts) { return fmtDuration(Date.now() - ts) + "ที่แล้ว"; }
function fmtDate(ts) { return new Date(ts).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }); }
function fmtDay(d) { return d ? new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "—"; }

// ---------- Storage ----------
function loadCases() {
  let list;
  try { list = JSON.parse(localStorage.getItem(CASES_KEY)); } catch (e) { list = null; }
  if (!Array.isArray(list)) { list = seedCases(); saveCases(list); }
  return list;
}
function saveCases(list) { localStorage.setItem(CASES_KEY, JSON.stringify(list)); }

function companyVersion(id) {
  try { return (JSON.parse(localStorage.getItem(VERSIONS_KEY)) || {})[id] || COMPANIES[id].version; } catch (e) { return COMPANIES[id].version; }
}
function setCompanyVersion(id, v) {
  if (!v) return;
  let all = {};
  try { all = JSON.parse(localStorage.getItem(VERSIONS_KEY)) || {}; } catch (e) {}
  all[id] = v;
  localStorage.setItem(VERSIONS_KEY, JSON.stringify(all));
}

// ---------- ข้อมูลตัวอย่าง ----------
function seedCases() {
  const now = Date.now();
  const T = (id) => TRANSITIONS.find((t) => t.id === id);
  const A = (id) => CASE_ACTIONS.find((a) => a.id === id);
  const day = (n) => new Date(now + n * 24 * H).toISOString().slice(0, 10);

  // steps: [ชั่วโมงที่แล้ว, action, by, role, ข้อความ, extra]
  const mk = (base, steps) => {
    const c = {
      domain: companyDomain(base.companyId), reportedVersion: COMPANIES[base.companyId].version,
      ...base, channel: base.channel || "เว็บไซต์", status: "new", prevStatus: null,
      assignees: { support: null, product: null, dev: null, tester: null },
      resolution: null, eta: null, fixVersion: null, publishDate: null, publishedAt: null, history: [],
    };
    steps.forEach(([hAgo, act, by, role, text = "", extra = {}]) => {
      const at = now - hAgo * H;
      if (act === "create") {
        Object.assign(c, { createdAt: at, statusSince: at, updatedAt: at });
        c.history.push({ at, by, role, type: "create", text: c.description, public: true });
      } else if (act === "comment" || act === "internal") {
        addComment(c, { by, role, text, internal: act === "internal", at });
      } else if (A(act)) {
        applyAction(c, A(act), { by, role, note: text, at, ...extra });
      } else {
        applyTransition(c, T(act), { by, role, note: text, at, seed: true, ...extra });
      }
    });
    return c;
  };

  const recent = [
    mk({ id: "CS-1008", companyId: "sky", title: "Login ไม่ได้หลังเปลี่ยนรหัสผ่าน", module: "ผู้ใช้งาน / Login", severity: "critical", reporter: "wanida", reporterName: "วนิดา (บัญชี)",
      description: "เปลี่ยนรหัสผ่านเมื่อเช้า แล้วเข้าระบบด้วยรหัสใหม่ไม่ได้ ขึ้นว่ารหัสผ่านไม่ถูกต้อง" },
      [[6, "create", "wanida", "customer"]]),

    mk({ id: "CS-1007", companyId: "nova", title: "Export PDF ใบสั่งซื้อแล้วตัวเลขทับกัน", module: "ใบสั่งซื้อ", severity: "medium", reporter: "prasert", reporterName: "ประเสริฐ (จัดซื้อ)",
      description: "Export ใบสั่งซื้อเป็น PDF ช่องราคาต่อหน่วยกับจำนวนเงินทับกันเมื่อยอดเกิน 7 หลัก" },
      [[260, "create", "prasert", "customer"], [258, "accept", "ต้น", "support"],
       [250, "escalate", "ต้น", "support", "ทำซ้ำได้ทุกเอกสารที่ยอดเกิน 1,000,000"],
       [230, "confirm_bug", "กานต์", "product", "ยืนยันเป็นข้อผิดพลาดของระบบค่ะ", { eta: day(-2) }],
       [200, "start_dev", "บอส", "dev"], [140, "to_verify", "บอส", "dev", "ปรับความกว้างคอลัมน์แล้ว"],
       [130, "take", "เมย์", "tester"], [110, "fail", "เมย์", "tester", "ยอด 8 หลักยังทับกันอยู่ ทำซ้ำ: PO ยอด 12,500,000"],
       [60, "to_verify", "บอส", "dev", "รองรับยอดถึง 10 หลักแล้ว"],
       [30, "pass", "เมย์", "tester", "ทดสอบผ่านแล้ว จะอัปเดตเวอร์ชันใหม่ให้บริษัทของคุณตามวันที่ระบุค่ะ", { version: LATEST_VERSION, publishDate: day(1) }]]),

    mk({ id: "CS-1006", companyId: "abc", title: "เลขที่เอกสารกระโดดข้าม", module: "ใบสั่งซื้อ", severity: "medium", reporter: "somchai", reporterName: "สมชาย (จัดซื้อ)",
      description: "สร้างใบสั่งซื้อต่อกัน เลขที่เอกสารข้ามจาก PO-0120 ไป PO-0122" },
      [[200, "create", "somchai", "customer"], [198, "accept", "นภา", "support", "รับเรื่องแล้วค่ะ กำลังตรวจสอบ"],
       [190, "escalate", "นภา", "support", "ทำซ้ำได้เมื่อกดบันทึก 2 ครั้งติดกันเร็วๆ"],
       [150, "confirm_bug", "กานต์", "product", "ยืนยันว่าเป็นข้อผิดพลาดของระบบ จะแก้ไขในรอบถัดไป", { eta: day(2) }],
       [120, "start_dev", "บอส", "dev"], [40, "to_verify", "บอส", "dev", "แก้ไขให้กันการกดซ้ำแล้ว"]]),

    mk({ id: "CS-1005", companyId: "abc", title: "กดบันทึกใบเสนอราคาแล้วหน้าค้าง", module: "ใบเสนอราคา", severity: "high", reporter: "somchai", reporterName: "สมชาย (จัดซื้อ)",
      description: "ใบเสนอราคาที่มีรายการเกิน 50 บรรทัด กดบันทึกแล้วหน้าค้าง ต้องปิด browser" },
      [[216, "create", "somchai", "customer"], [214, "accept", "นภา", "support"],
       [200, "ask", "นภา", "support", "รบกวนขอภาพหน้าจอ และเลขที่เอกสารที่พบปัญหาค่ะ"],
       [190, "reply", "somchai", "customer", "เลขที่ QT-2026-0456 แนบภาพไว้ใน email แล้วครับ"],
       [186, "escalate", "นภา", "support", "ทำซ้ำได้กับเอกสารที่มีมากกว่า 50 บรรทัด"],
       [144, "confirm_bug", "กานต์", "product", "ยืนยันเป็นข้อผิดพลาดของระบบ กำหนดแก้ไขเสร็จภายในวันที่ระบุ", { eta: day(1) }],
       [48, "start_dev", "บอส", "dev", "เริ่มแก้ไขแล้ว"],
       [30, "eta", "บอส", "dev", "พบว่าต้องปรับส่วนคำนวณยอดรวมด้วย ขอเลื่อนออกไป 2 วันเพื่อทดสอบให้ครบครับ", { eta: day(3) }],
       [20, "internal", "บอส", "dev", "สาเหตุ: query คำนวณยอดรวมทีละบรรทัด ต้องทำเป็น batch"]]),

    mk({ id: "CS-1004", companyId: "sky", title: "ยอดรวมในรายงานไม่ตรงกับหน้าเอกสาร", module: "รายงาน", severity: "high", reporter: "wanida", reporterName: "วนิดา (บัญชี)",
      description: "รายงานสรุปยอดขายเดือน ส.ค. ยอดรวมต่างจากผลรวมของเอกสารประมาณ 1,200 บาท" },
      [[110, "create", "wanida", "customer"], [108, "accept", "ต้น", "support"],
       [100, "escalate", "ต้น", "support", "ตรวจแล้วไม่ใช่การตั้งค่า น่าจะเกี่ยวกับการปัดเศษ VAT"],
       [30, "follow_up", "wanida", "customer", "ต้องใช้รายงานปิดงบสิ้นเดือนค่ะ"],
       [20, "nudge", "ต้น", "support", "ลูกค้าต้องใช้ปิดงบสิ้นเดือน รบกวนช่วยดูก่อนค่ะ"]]),

    mk({ id: "CS-1003", companyId: "abc", title: "อัปโหลดไฟล์แนบไม่ได้", module: "เอกสารแนบ", severity: "medium", reporter: "somchai", reporterName: "สมชาย (จัดซื้อ)",
      description: "แนบไฟล์ PDF แล้วขึ้น error ไม่ทราบสาเหตุ" },
      [[50, "create", "somchai", "customer"], [49, "accept", "นภา", "support"],
       [30, "ask", "นภา", "support", "รบกวนแจ้งขนาดไฟล์ และข้อความ error ที่ขึ้นค่ะ"]]),

    mk({ id: "CS-1002", companyId: "sky", title: "แก้ไขเอกสารที่อนุมัติแล้วไม่ได้", module: "การอนุมัติ", severity: "low", reporter: "wanida", reporterName: "วนิดา (บัญชี)",
      description: "เอกสารที่อนุมัติแล้วปุ่มแก้ไขเป็นสีเทา กดไม่ได้" },
      [[96, "create", "wanida", "customer"], [95, "accept", "ต้น", "support"],
       [90, "escalate", "ต้น", "support", "ไม่แน่ใจว่าเป็น spec หรือไม่"],
       [26, "as_spec", "กานต์", "product", "เอกสารที่อนุมัติแล้วจะถูกล็อกเพื่อป้องกันการแก้ไขย้อนหลัง หากต้องการแก้ไข ให้กด \"ยกเลิกอนุมัติ\" ก่อน (ต้องใช้สิทธิ์ผู้อนุมัติ)"]]),

    mk({ id: "CS-1001", companyId: "abc", title: "ไม่ทราบวิธี export รายงานเป็น Excel", module: "รายงาน", severity: "low", reporter: "somchai", reporterName: "สมชาย (จัดซื้อ)", channel: "โทรศัพท์",
      description: "ต้องการ export รายงานยอดซื้อเป็นไฟล์ Excel" },
      [[300, "create", "somchai", "customer"], [299, "accept", "นภา", "support"],
       [297, "solve_support", "นภา", "support", "กดปุ่ม ⋯ มุมขวาบนของรายงาน แล้วเลือก Export → Excel ได้เลยค่ะ"],
       [280, "confirm", "somchai", "customer", "ทำได้แล้วครับ ขอบคุณครับ", { rating: 5 }]]),
  ];
  return [...recent, ...historyCases(mk, now)].sort((a, b) => b.updatedAt - a.updatedAt);
}

// เคสย้อนหลัง ~3 เดือน (ปิดแล้ว) ให้ Dashboard มีข้อมูลเปรียบเทียบ — สุ่มแบบกำหนด seed ได้ผลเหมือนเดิมทุกครั้ง
function historyCases(mk, now) {
  let seed = 20260930;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const day = (hAgo) => new Date(now - hAgo * H).toISOString().slice(0, 10);

  const TOPICS = [
    ["รายงาน", "รายงานยอดคงเหลือไม่อัปเดต"], ["รายงาน", "Export Excel แล้ววันที่กลายเป็นตัวเลข"],
    ["ใบเสนอราคา", "พิมพ์ใบเสนอราคาแล้วโลโก้ไม่ขึ้น"], ["ใบเสนอราคา", "คัดลอกใบเสนอราคาแล้วส่วนลดหาย"],
    ["ใบสั่งซื้อ", "ค้นหาใบสั่งซื้อด้วยชื่อผู้ขายไม่เจอ"], ["ใบสั่งซื้อ", "ยอด VAT ในใบสั่งซื้อปัดเศษผิด"],
    ["เอกสารแนบ", "ดาวน์โหลดไฟล์แนบแล้วชื่อไฟล์เพี้ยน"], ["ผู้ใช้งาน / Login", "ลืมรหัสผ่านแล้วไม่ได้รับอีเมล"],
    ["ผู้ใช้งาน / Login", "ต้องการเพิ่มสิทธิ์ผู้ใช้งานใหม่"], ["การอนุมัติ", "ไม่ได้รับแจ้งเตือนเมื่อมีเอกสารรออนุมัติ"],
    ["การอนุมัติ", "ลำดับผู้อนุมัติไม่ตรงกับที่ตั้งค่า"], ["อื่นๆ", "หน้าจอแสดงผลเพี้ยนบนแท็บเล็ต"],
  ];
  const PEOPLE = {
    abc: [["somchai", "สมชาย (จัดซื้อ)"], ["kanya", "กัญญา (บัญชี)"]],
    sky: [["wanida", "วนิดา (บัญชี)"], ["anan", "อนันต์ (ไซต์งาน)"], ["pim", "พิม (จัดซื้อ)"]],
    nova: [["prasert", "ประเสริฐ (จัดซื้อ)"]],
  };
  // จำนวนเคสย้อนหลังของแต่ละบริษัท (SKY ใช้เวอร์ชันเก่า แจ้งเข้ามาเยอะสุด)
  const COUNT = { abc: 8, sky: 14, nova: 6 };
  const SUP = ["นภา", "ต้น"];
  const out = [];
  let num = 900;

  Object.entries(COUNT).forEach(([companyId, n]) => {
    for (let i = 0; i < n; i++) {
      const [module, title] = pick(TOPICS);
      const [reporter, reporterName] = pick(PEOPLE[companyId]);
      const sup = pick(SUP);
      const path = rnd();
      let t = 80 + rnd() * 2100; // 3–90 วันก่อน
      if (path >= 0.62) t = Math.max(t, 400); // เคส Bug ใช้เวลานานกว่า
      const oldVersion = companyId === "abc" && t > 1200 ? "v5.1.4" : COMPANIES[companyId].version;
      const gap = (a, b) => (t -= a + rnd() * (b - a));
      const steps = [[t, "create", reporter, "customer"]];
      steps.push([gap(0.5, 6), "accept", sup, "support"]);
      if (path < 0.38) {
        steps.push([gap(1, 20), "solve_support", sup, "support", "แนะนำวิธีตั้งค่าที่ถูกต้องให้ลูกค้าแล้ว"]);
      } else if (path < 0.62) {
        steps.push([gap(2, 24), "escalate", sup, "support", "ตรวจสอบเบื้องต้นแล้ว ขอให้ Product ช่วยยืนยัน"]);
        steps.push([gap(10, 60), "as_spec", "กานต์", "product", "เป็นการทำงานตามที่ออกแบบไว้ พร้อมแนะนำวิธีใช้งาน"]);
      } else {
        steps.push([gap(2, 24), "escalate", sup, "support", "ทำซ้ำได้"]);
        steps.push([gap(10, 48), "confirm_bug", "กานต์", "product", "ยืนยันเป็น Bug", { eta: day(t - 150) }]);
        steps.push([gap(10, 72), "start_dev", "บอส", "dev"]);
        steps.push([gap(20, 90), "to_verify", "บอส", "dev"]);
        steps.push([gap(4, 30), "pass", "เมย์", "tester", "", { version: COMPANIES[companyId].version, publishDate: day(t - 40) }]);
        steps.push([gap(10, 60), "published", "เมย์", "tester", "Publish เวอร์ชันใหม่แล้ว"]);
      }
      steps.push(rnd() < 0.8
        ? [gap(2, 40), "confirm", reporter, "customer", "ใช้งานได้แล้ว ขอบคุณครับ/ค่ะ", { rating: pick(companyId === "sky" ? [2, 3, 3, 4, 5] : [4, 5, 5, 4, 3]) }]
        : [gap(168, 175), "auto_close", sup, "support", "ปิดเคสอัตโนมัติ ลูกค้าไม่ตอบกลับ 7 วัน"]);
      if (t < 1) continue; // ข้ามเคสที่เวลาเลยมาถึงปัจจุบัน
      num += 1;
      out.push(mk({ id: "CS-0" + num, companyId, title, module, severity: pick(["low", "medium", "medium", "high"]),
        reporter, reporterName, description: title, reportedVersion: oldVersion,
        channel: pick(["เว็บไซต์", "เว็บไซต์", "โทรศัพท์", "LINE"]) }, steps));
    }
  });
  return out;
}
