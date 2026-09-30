// ================= หน้า Workflow & สิทธิ์ =================
// สร้างจาก STATUSES / TRANSITIONS ใน cases-data.js ทั้งหมด (แก้ที่นั่นแล้วหน้านี้เปลี่ยนตาม)

const PRINCIPLES = [
  { icon: "🏐", title: "ทุกสถานะมีเจ้าของเสมอ", text: "รู้ทันทีว่า \"ลูกบอลอยู่ที่ใคร\" ไม่มีเคสที่ไม่มีคนรับผิดชอบ" },
  { icon: "👀", title: "ลูกค้าเห็นความคืบหน้าจริง", text: "เห็นขั้นตอนปัจจุบัน, ขั้นถัดไป, ETA และข้อความจากทีม ไม่ต้องโทรถาม" },
  { icon: "⏰", title: "SLA ทุกขั้นตอน", text: "แต่ละสถานะมีเวลาเป้าหมาย เคสที่ค้างนานจะถูกไฮไลต์ ไม่มีเคสเงียบหาย" },
  { icon: "🎧", title: "Support คือจุดติดต่อเดียว", text: "ลูกค้าคุยกับ Support คนเดิมตลอด แม้เคสถูกส่งต่อ Product / Dev" },
  { icon: "🔒", title: "แยกข้อความภายใน", text: "ทีมคุยรายละเอียดเทคนิคได้ ลูกค้าเห็นเฉพาะข้อความที่ตั้งใจสื่อสาร" },
  { icon: "🚨", title: "เคสนิ่ง = ยกระดับอัตโนมัติ", text: "ไม่มีคนรับ / ไม่ขยับเกิน 1 วัน แจ้งทีมที่ถือเคส + CX, เกิน 2 วันแจ้งหัวหน้าทีม" },
  { icon: "📢", title: "ประกาศเหตุขัดข้อง", text: "Admin แจ้งปัญหาที่กระทบทุกคนไว้ก่อน ลูกค้าไม่ต้องแจ้งเคสซ้ำ" },
  { icon: "🌐", title: "รู้ว่าเกิดกับ domain / เวอร์ชันไหน", text: "แต่ละบริษัทมี domain + เวอร์ชันของตัวเอง ทุกเคสบันทึกเวอร์ชันตอนแจ้ง ดูภาพรวมใน Dashboard" },
  { icon: "📨", title: "สรุปรายสัปดาห์ถึงผู้บริหาร", text: "ทุกวันจันทร์ ผู้บริหารลูกค้าเห็นภาพรวมจริง ลดการไปบ่นต่อเพราะไม่รู้ข้อมูล" },
  { icon: "🚀", title: "จบที่ลูกค้า หลัง Publish", text: "Tester ทดสอบผ่าน → Publish ให้แต่ละบริษัทเอง → ลูกค้ากดยืนยันปิดเคส + ให้คะแนน" },
];

// ตำแหน่งใน swimlane: lane = role เจ้าของสถานะ, col = ลำดับในกระบวนการ
const LANES = ["customer", "support", "product", "dev", "tester"];
const LAYOUT = {
  new: { lane: "support", col: 0 }, support: { lane: "support", col: 1 },
  waiting: { lane: "customer", col: 2 }, product: { lane: "product", col: 2 },
  queued: { lane: "dev", col: 3 }, dev: { lane: "dev", col: 4 },
  verify: { lane: "tester", col: 5 }, publish: { lane: "tester", col: 6 },
  resolved: { lane: "customer", col: 7 }, closed: { lane: "customer", col: 8 },
};

function diagram() {
  const LABEL_W = 132, COL_W = 168, NW = 150, NH = 52, LANE_H = 96, TOP = 40;
  const W = LABEL_W + 16 + 9 * COL_W, Hh = TOP + LANES.length * LANE_H + 10;
  const pos = (k) => {
    const L = LAYOUT[k];
    return { x: LABEL_W + 16 + L.col * COL_W, y: TOP + LANES.indexOf(L.lane) * LANE_H + (LANE_H - NH) / 2 };
  };
  const center = (p) => ({ x: p.x + NW / 2, y: p.y + NH / 2 });

  // รวมเส้นที่ from-to ซ้ำกัน, เส้น "ask" วาดเป็นลูกศรสองทาง (ขอข้อมูล ⇄ ตอบกลับ)
  const edges = new Map();
  TRANSITIONS.filter((t) => !t.minor && t.to !== "__prev").forEach((t) => {
    t.from.forEach((f) => {
      const key = f + ">" + t.to;
      const e = edges.get(key) || { from: f, to: t.to, roles: new Set(), labels: [], ask: t.id === "ask" };
      t.roles.forEach((r) => e.roles.add(r));
      e.labels.push(t.label);
      edges.set(key, e);
    });
  });

  let svgEdges = "";
  edges.forEach((e) => {
    const a = pos(e.from), b = pos(e.to);
    const ca = center(a), cb = center(b);
    const reverse = edges.has(e.to + ">" + e.from);
    const off = reverse ? (e.from < e.to ? -9 : 9) : 0;
    const colDiff = LAYOUT[e.to].col - LAYOUT[e.from].col;
    let d, mx, my;

    if (colDiff < 0 && !reverse) {
      // ย้อนกลับไกล: โค้งอ้อมด้านบนสุด
      const y = TOP - 18;
      d = `M${ca.x},${a.y} C${ca.x},${y} ${cb.x},${y} ${cb.x},${b.y - 2}`;
      mx = (ca.x + cb.x) / 2; my = TOP - 4;
    } else if (Math.abs(cb.x - ca.x) > Math.abs(cb.y - ca.y) * 1.1) {
      const dir = Math.sign(cb.x - ca.x);
      const x1 = dir > 0 ? a.x + NW : a.x, x2 = dir > 0 ? b.x - 2 : b.x + NW + 2;
      const y1 = ca.y + off, y2 = cb.y + off;
      const k = Math.max(30, Math.abs(x2 - x1) / 2) * dir;
      d = `M${x1},${y1} C${x1 + k},${y1} ${x2 - k},${y2} ${x2},${y2}`;
      mx = (x1 + x2) / 2; my = (y1 + y2) / 2;
    } else {
      const dir = Math.sign(cb.y - ca.y);
      const y1 = dir > 0 ? a.y + NH : a.y, y2 = dir > 0 ? b.y - 2 : b.y + NH + 2;
      const x1 = ca.x + off, x2 = cb.x + off;
      const k = Math.max(24, Math.abs(y2 - y1) / 2) * dir;
      d = `M${x1},${y1} C${x1},${y1 + k} ${x2},${y2 - k} ${x2},${y2}`;
      mx = (x1 + x2) / 2; my = (y1 + y2) / 2;
    }
    const icons = [...e.roles].map((r) => ROLES[r].icon).join("");
    const iw = icons.length > 2 ? 58 : 26;
    svgEdges += `
      <g class="wf-edge ${e.ask ? "ask" : ""}" data-from="${e.from}" data-to="${e.to}">
        <path d="${d}" marker-end="url(#wfArrow)" ${e.ask ? 'marker-start="url(#wfArrowStart)"' : ""} />
        <g transform="translate(${mx},${my})"><rect x="${-iw / 2}" y="-11" width="${iw}" height="22" rx="11" /><text text-anchor="middle" y="5">${icons}</text></g>
        <title>${e.labels.map(esc).join(" / ")}${e.ask ? " ⇄ ลูกค้าตอบกลับ → กลับขั้นเดิม" : ""}\nทำได้โดย: ${[...e.roles].map((r) => ROLES[r].label).join(", ")}</title>
      </g>`;
  });

  const lanes = LANES.map((r, i) => `
    <g class="lane">
      <rect x="0" y="${TOP + i * LANE_H}" width="${W}" height="${LANE_H}" class="${i % 2 ? "odd" : ""}" />
      <text x="16" y="${TOP + i * LANE_H + LANE_H / 2 - 4}" class="lane-title">${ROLES[r].icon} ${ROLES[r].label}</text>
      <text x="16" y="${TOP + i * LANE_H + LANE_H / 2 + 14}" class="lane-sub">เจ้าของสถานะ</text>
    </g>`).join("");

  const nodes = Object.entries(STATUSES).map(([k, s]) => {
    const p = pos(k);
    return `
      <g class="wf-node" data-id="${k}" transform="translate(${p.x},${p.y})">
        <rect width="${NW}" height="${NH}" rx="12" style="stroke:${s.color}" />
        <rect width="6" height="${NH - 20}" x="8" y="10" rx="3" fill="${s.color}" />
        <text x="22" y="22" class="n-title">${s.icon} ${esc(s.label.length > 17 ? s.label.slice(0, 16) + "…" : s.label)}</text>
        <text x="22" y="39" class="n-sub">${s.slaHours ? "SLA " + fmtDuration(s.slaHours * H) : "สิ้นสุด"}</text>
        <title>${esc(s.label)}\n${esc(s.desc)}</title>
      </g>`;
  }).join("");

  // จุดเริ่ม: ลูกค้าแจ้งปัญหา
  const n0 = pos("new");
  const sx = n0.x + NW / 2, sy = TOP + LANE_H / 2;
  const start = `
    <g class="wf-edge"><path d="M${sx},${sy + 16} L${sx},${n0.y - 2}" marker-end="url(#wfArrow)" /></g>
    <g class="wf-start"><circle cx="${sx}" cy="${sy}" r="16" /><text x="${sx}" y="${sy + 5}" text-anchor="middle">▶</text>
      <text x="${sx + 24}" y="${sy + 4}" class="n-sub">ลูกค้าแจ้งปัญหา</text></g>`;

  return `
    <svg id="wfSvg" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}">
      <defs>
        <marker id="wfArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#94a3b8" /></marker>
        <marker id="wfArrowStart" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#f59e0b" /></marker>
      </defs>
      ${lanes}${svgEdges}${start}${nodes}
    </svg>`;
}

function statusTable() {
  return `
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>สถานะ</th><th>ความหมาย</th><th>ผู้รับผิดชอบ / ติดต่อ</th><th>SLA</th><th>ลูกค้าเห็นข้อความ</th><th>ไปต่อได้</th></tr></thead>
      <tbody>
        ${Object.entries(STATUSES).map(([k, s]) => {
          const next = [...new Set(TRANSITIONS.filter((t) => t.from.includes(k)).map((t) => (t.to === "__prev" ? "__prev" : t.to)))];
          const owner = s.owner ? `${ROLES[s.owner].icon} ${s.owner === "customer" ? "ลูกค้า" : TEAM[s.owner].team}` : "—";
          const contact = s.owner && s.owner !== "customer" ? `<div class="muted small">${TEAM[s.owner].email}</div>` : "";
          return `
            <tr>
              <td>${statusPill(k, "staff")}</td>
              <td class="small">${esc(s.desc)}</td>
              <td><b class="small">${owner}</b>${contact}</td>
              <td class="small nowrap">${s.slaHours ? fmtDuration(s.slaHours * H) : "—"}</td>
              <td class="small cust-quote">“${esc(s.customerText)}”</td>
              <td>${next.map((n) => (n === "__prev" ? `<span class="pill" style="--c:#94a3b8">↩ ขั้นเดิม</span>` : statusPill(n, "staff"))).join(" ") || "—"}</td>
            </tr>`;
        }).join("")}
      </tbody>
    </table></div>`;
}

function permissionMatrix() {
  const roles = Object.keys(ROLES);
  return `
    <div class="tbl-wrap"><table class="tbl matrix">
      <thead><tr><th>การเปลี่ยนสถานะ</th><th>จาก → ไป</th>${roles.map((r) => `<th class="center">${ROLES[r].icon}<br />${ROLES[r].label}</th>`).join("")}<th>ต้องกรอก</th></tr></thead>
      <tbody>
        ${TRANSITIONS.map((t) => `
          <tr>
            <td><b class="small">${esc(t.label)}</b></td>
            <td class="small">${t.from.map((f) => statusPill(f, "staff")).join(" ")} → ${t.to === "__prev" ? `<span class="pill" style="--c:#94a3b8">↩ ขั้นเดิม</span>` : statusPill(t.to, "staff")}</td>
            ${roles.map((r) => `<td class="center">${canDo(t, r) ? `<span class="yes">✓</span>` : `<span class="no">·</span>`}</td>`).join("")}
            <td class="small">${[
              t.note === "required" ? "หมายเหตุ" : "",
              ...(t.fields || []).map((f) => (f === "eta" ? "ETA" : "Version")),
              t.public ? "👁 ลูกค้าเห็น" : "🔒 ภายใน",
            ].filter(Boolean).join(" · ")}</td>
          </tr>`).join("")}
      </tbody>
    </table></div>`;
}

function actionMatrix() {
  const roles = Object.keys(ROLES);
  const cell = (ok) => (ok ? `<span class="yes">✓</span>` : `<span class="no">·</span>`);
  return `
    <div class="tbl-wrap"><table class="tbl matrix">
      <thead><tr><th>Action</th><th>ใช้เมื่อ</th>${roles.map((r) => `<th class="center">${ROLES[r].icon}<br />${ROLES[r].label}</th>`).join("")}<th>ลูกค้าเห็น</th></tr></thead>
      <tbody>
        ${CASE_ACTIONS.map((a) => `
          <tr>
            <td><b class="small">${esc(a.label)}</b></td>
            <td class="small">${esc(a.desc)}</td>
            ${roles.map((r) => `<td class="center">${cell(r === "admin" || a.roles.includes(r))}</td>`).join("")}
            <td class="small">${a.public ? "👁 เห็น" : "🔒 ภายใน"}</td>
          </tr>`).join("")}
      </tbody>
    </table></div>`;
}

function escalationSection() {
  return `
    <div class="esc-rules">
      ${ESCALATION_RULES.map((r) => `
        <div class="esc-rule lv${r.level}">
          <div class="esc-level">${r.level === 2 ? "🚨" : "⚠️"} ระดับ ${r.level}</div>
          <div><div class="muted small">เมื่อ</div><b>${r.when}</b></div>
          <div><div class="muted small">แจ้งเตือนถึง</div><b>${r.notify}</b></div>
        </div>`).join("")}
    </div>
    <ul class="esc-notes">
      <li>นับ "ความเคลื่อนไหว" จากผู้ถือเคสเท่านั้น (เปลี่ยนสถานะ, รับเคส, ตอบข้อความ) — การทวงถามจากคนอื่นไม่นับ</li>
      <li>ทุกทีมเห็นแจ้งเตือนที่ 🔔 มุมขวาบน · CX (Support) เห็นเคสยกระดับของทุกทีม เพราะเป็นผู้ประสานงานกับลูกค้า</li>
      <li>ปลดการยกระดับ: กด ✋ รับเคส หรือดำเนินการต่อ · CX กด 🔔 ทวงถามทีมที่ถือเคสได้ · ลูกค้ากด 🙋 สอบถามความคืบหน้าได้ตลอด (ไม่จำกัด)</li>
    </ul>`;
}

document.getElementById("page").innerHTML = `
  <div class="page-head">
    <div>
      <h1>Workflow & สิทธิ์</h1>
      <p class="lead">ออกแบบจากปัญหา: <b>"ลูกค้าแจ้งปัญหาแล้วไม่รู้ว่าได้รับการแก้ไขหรือยัง ถึงไหนแล้ว"</b></p>
    </div>
    <a class="btn primary" href="cases.html">ไปที่ Case Tracking →</a>
  </div>

  <section class="principles">
    ${PRINCIPLES.map((p) => `<div class="principle"><span class="p-icon">${p.icon}</span><b>${p.title}</b><p>${p.text}</p></div>`).join("")}
  </section>

  <div class="card no-pad">
    <div class="card-bar">
      <h3>🔀 Flow ของเคส (แบ่งตามผู้รับผิดชอบ)</h3>
      <div class="legend">
        ${Object.entries(ROLES).filter(([k]) => k !== "admin").map(([, r]) => `<span>${r.icon} ${r.label}</span>`).join("")}
        <span><i class="lg-dash"></i> ขอข้อมูล ⇄ ลูกค้าตอบกลับ</span>
      </div>
    </div>
    <div class="wf-canvas">${diagram()}</div>
    <div class="card-foot">💡 ไอคอนบนเส้น = role ที่เปลี่ยนสถานะนั้นได้ · ชี้ที่สถานะเพื่อไฮไลต์เส้นทาง · ลูกค้ายกเลิกเคสได้ตอน แจ้งใหม่ / Support ตรวจสอบ / รอข้อมูล · 🛡️ Admin ทำได้ทุกอย่าง</div>
  </div>

  <div class="card">
    <h3 class="sec-title">📌 สถานะ · ผู้รับผิดชอบ · สิ่งที่ลูกค้าเห็น</h3>
    ${statusTable()}
  </div>

  <div class="card">
    <h3 class="sec-title">🔐 สิทธิ์การเปลี่ยนสถานะ (Role × Action)</h3>
    ${permissionMatrix()}
  </div>

  <div class="card">
    <h3 class="sec-title">🧰 Action ที่ไม่เปลี่ยนสถานะ <span class="muted small">(กันเคสนิ่ง / ปรับกำหนดการ)</span></h3>
    ${actionMatrix()}
  </div>

  <div class="card">
    <h3 class="sec-title">🚨 กฎยกระดับเคสนิ่ง (กันการ์ดไม่มีคน take action)</h3>
    ${escalationSection()}
  </div>`;

// hover highlight
const svg = document.getElementById("wfSvg");
svg.querySelectorAll(".wf-node").forEach((n) => {
  n.addEventListener("mouseenter", () => {
    svg.classList.add("dim");
    n.classList.add("hl");
    svg.querySelectorAll(".wf-edge[data-from]").forEach((e) => {
      if (e.dataset.from === n.dataset.id || e.dataset.to === n.dataset.id) {
        e.classList.add("hl");
        svg.querySelectorAll(`.wf-node[data-id="${e.dataset.from}"], .wf-node[data-id="${e.dataset.to}"]`).forEach((x) => x.classList.add("hl"));
      }
    });
  });
  n.addEventListener("mouseleave", () => {
    svg.classList.remove("dim");
    svg.querySelectorAll(".hl").forEach((x) => x.classList.remove("hl"));
  });
});
