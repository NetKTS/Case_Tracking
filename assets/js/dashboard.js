// ================= Dashboard =================
// ทีมงาน: เปรียบเทียบทุกบริษัท (domain / เวอร์ชัน) — เจ้าไหนแจ้งเยอะ, ค้างที่ไหน, เวอร์ชันไหนมีปัญหา
// ลูกค้า: สรุปเคสของบริษัทตัวเอง — แจ้งอะไรมาแล้ว, อะไรค้าง, อะไรจบแล้ว

// สีประจำบริษัท (ผูกกับบริษัท ไม่ใช่ลำดับ) — ผ่าน validator: CVD ΔE ≥ 9.2, normal ΔE ≥ 24 (all-pairs)
const CO_COLORS = { abc: "#2a78d6", sky: "#eb6834", nova: "#1baf7a" };
const SINGLE_COLOR = "#4a3aa7"; // กราฟชุดเดียว (เวอร์ชัน / เมนู / ผลสรุป) ใช้สีที่ไม่ซ้ำกับบริษัท
const DAY = 24 * H;

const page = document.getElementById("page");
const tip = document.getElementById("vizTip");
const params = pageParams();
let period = params.get("period") || "90";
let companyFilter = isStaff ? params.get("company") || "" : currentCompany;

// ---------- metric helpers ----------
const closedAt = (c) => { const h = [...c.history].reverse().find((x) => x.type === "status" && x.to === "closed"); return h ? h.at : null; };
const firstResponse = (c) => { const h = c.history.find((x) => x.action === "accept"); return h ? h.at - c.createdAt : null; };
const isBug = (c) => c.history.some((x) => x.action === "confirm_bug");
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const fmtAvg = (ms) => (ms == null ? "—" : ms >= DAY ? (ms / DAY).toFixed(1) + " วัน" : fmtDuration(ms));
const countBy = (list, fn) => list.reduce((m, c) => { const k = fn(c); m[k] = (m[k] || 0) + 1; return m; }, {});
const topEntry = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0];
const cmpVersion = (a, b) => b.replace("v", "").split(".").map(Number).reduce((r, n, i) => r || n - (a.replace("v", "").split(".").map(Number)[i] || 0), 0);

function scoped() {
  const since = period === "all" ? 0 : Date.now() - Number(period) * DAY;
  return loadCases()
    .filter((c) => canSeeCase(c, currentRole))
    .filter((c) => !companyFilter || c.companyId === companyFilter)
    .filter((c) => c.createdAt >= since);
}

function companyStats(list, id) {
  const cs = list.filter((c) => c.companyId === id);
  const closed = cs.filter((c) => !isOpen(c));
  return {
    id, co: COMPANIES[id], version: companyVersion(id), cases: cs,
    total: cs.length,
    open: cs.filter(isOpen).length,
    escalated: cs.filter((c) => escalation(c)).length,
    bugs: cs.filter(isBug).length,
    spec: cs.filter((c) => c.resolution === "เป็นไปตาม Spec").length,
    support: cs.filter((c) => c.resolution === "Support แก้ไข / แนะนำวิธีใช้").length,
    avgResponse: avg(cs.map(firstResponse).filter((x) => x != null)),
    avgClose: avg(closed.map((c) => closedAt(c) - c.createdAt)),
    csat: avgRating(cs),
    topModule: topEntry(countBy(cs, (c) => c.module)),
    last: cs.reduce((m, c) => Math.max(m, c.createdAt), 0),
  };
}

// ---------- tooltip ----------
function showTip(html, x, y) {
  tip.innerHTML = html;
  tip.hidden = false;
  const r = tip.getBoundingClientRect();
  tip.style.left = Math.min(x + 14, innerWidth - r.width - 8) + "px";
  tip.style.top = Math.max(8, y - r.height - 12) + "px";
}
const hideTip = () => (tip.hidden = true);

// ---------- charts ----------
// แท่งแนวนอน (HTML): ปลายแท่งมน 4px ฝั่งค่าข้อมูล, ติด baseline, label ค่าอยู่ปลายแท่ง
function hbars(items, { unit = "เคส" } = {}) {
  if (!items.length) return `<div class="viz-empty">ไม่มีข้อมูลในช่วงนี้</div>`;
  const max = Math.max(...items.map((i) => i.value), 1);
  return `
    <div class="hbars" role="table">
      ${items.map((i) => `
        <div class="hb-row" role="row" data-tip="${esc(i.tip || `<b>${esc(i.label)}</b><br>${i.value} ${unit}`)}">
          <div class="hb-label" role="cell"><span>${esc(i.label)}</span>${i.sub ? `<small>${i.sub}</small>` : ""}</div>
          <div class="hb-track" role="cell">
            <span class="hb-bar" style="width:${Math.max(2, (i.value / max) * 100)}%;background:${i.color}"></span>
            <b class="hb-value">${i.value}</b>
          </div>
        </div>`).join("")}
    </div>`;
}

// เส้นแนวโน้มรายสัปดาห์ (SVG): เส้น 2px, crosshair + tooltip ตอน hover, label ปลายเส้น
function lineChart(series, weeks) {
  const W = 680, Hh = 230, L = 34, R = 64, T = 14, B = 30;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const yMax = Math.ceil(max / 2) * 2 || 2;
  const x = (i) => L + (i * (W - L - R)) / Math.max(1, weeks.length - 1);
  const y = (v) => T + (Hh - T - B) * (1 - v / yMax);
  const ticks = [0, yMax / 2, yMax];

  const grid = ticks.map((t) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" /><text class="axis" x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join("");
  const xLabels = weeks.map((w, i) => (i % 2 === 0 || i === weeks.length - 1)
    ? `<text class="axis" x="${x(i)}" y="${Hh - 8}" text-anchor="middle">${w.label}</text>` : "").join("");
  const lines = series.map((s) => `
    <path class="ln" d="${s.values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")}" stroke="${s.color}" />
    <text class="end-label" x="${x(weeks.length - 1) + 8}" y="${y(s.values[s.values.length - 1]) + 4}">${esc(s.name)}</text>`).join("");

  return `
    <div class="line-wrap">
      <svg class="line-chart" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="xMidYMid meet" data-weeks="${weeks.length}" data-l="${L}" data-r="${R}" data-w="${W}">
        ${grid}${xLabels}${lines}
        <line class="crosshair" x1="0" x2="0" y1="${T}" y2="${Hh - B}" visibility="hidden" />
        <g class="hover-dots">${series.map((s) => `<circle r="4.5" fill="${s.color}" stroke="#fff" stroke-width="2" visibility="hidden" />`).join("")}</g>
        <rect class="hit" x="${L}" y="${T}" width="${W - L - R}" height="${Hh - T - B}" fill="transparent" />
      </svg>
    </div>`;
}

function bindLineHover(root, series, weeks) {
  const svg = root.querySelector(".line-chart");
  if (!svg) return;
  const L = +svg.dataset.l, R = +svg.dataset.r, W = +svg.dataset.w;
  const cross = svg.querySelector(".crosshair");
  const dots = svg.querySelectorAll(".hover-dots circle");
  const Hh = 230, T = 14, B = 30;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const yMax = Math.ceil(max / 2) * 2 || 2;
  const y = (v) => T + (Hh - T - B) * (1 - v / yMax);

  svg.querySelector(".hit").addEventListener("mousemove", (e) => {
    const box = svg.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = Math.max(0, Math.min(weeks.length - 1, Math.round(((px - L) / (W - L - R)) * (weeks.length - 1))));
    const cx = L + (i * (W - L - R)) / Math.max(1, weeks.length - 1);
    cross.setAttribute("x1", cx); cross.setAttribute("x2", cx); cross.setAttribute("visibility", "visible");
    series.forEach((s, k) => { dots[k].setAttribute("cx", cx); dots[k].setAttribute("cy", y(s.values[i])); dots[k].setAttribute("visibility", "visible"); });
    showTip(`<b>สัปดาห์ ${weeks[i].label}</b>${series.map((s) => `<div class="tip-row"><i style="background:${s.color}"></i>${esc(s.name)}<b>${s.values[i]}</b></div>`).join("")}`, e.clientX, e.clientY);
  });
  svg.querySelector(".hit").addEventListener("mouseleave", () => {
    cross.setAttribute("visibility", "hidden");
    dots.forEach((d) => d.setAttribute("visibility", "hidden"));
    hideTip();
  });
}

function weekBuckets(list, ids) {
  const n = period === "30" ? 5 : 13;
  const now = Date.now();
  const weeks = Array.from({ length: n }, (_, i) => {
    const start = now - (n - i) * 7 * DAY;
    return { start, end: start + 7 * DAY, label: new Date(start).toLocaleDateString("th-TH", { day: "numeric", month: "short" }) };
  });
  const series = ids.map((id) => ({
    name: COMPANIES[id].short, color: CO_COLORS[id],
    values: weeks.map((w) => list.filter((c) => c.companyId === id && c.createdAt >= w.start && c.createdAt < w.end).length),
  }));
  return { weeks, series };
}

// ---------- sections ----------
function kpis(list, stats) {
  const closed = list.filter((c) => !isOpen(c));
  const tiles = [
    { label: "เคสที่แจ้งเข้ามา", value: list.length, icon: "📥", tone: "indigo" },
    { label: "ยังเปิดอยู่", value: list.filter(isOpen).length, icon: "📂", tone: "amber" },
    { label: "ยืนยันเป็น Bug", value: `${list.filter(isBug).length}<small> / ${list.length}</small>`, icon: "🐞", tone: "red" },
    { label: "เวลาเฉลี่ยจนปิดเคส", value: fmtAvg(avg(closed.map((c) => closedAt(c) - c.createdAt))), icon: "⏱️", tone: "green" },
    { label: `ความพึงพอใจเฉลี่ย (${list.filter((c) => c.rating).length} การประเมิน)`, value: avgRating(list) ? `${avgRating(list).toFixed(1)}<small> / 5</small>` : "—", icon: "⭐", tone: "amber" },
  ];
  if (isStaff) {
    const behind = stats.filter((s) => s.version !== LATEST_VERSION).length;
    tiles.push({ label: `domain ที่ยังไม่ใช่ ${LATEST_VERSION}`, value: `${behind}<small> / ${stats.length}</small>`, icon: "🌐", tone: "indigo" });
  }
  return `<section class="kpis">${tiles.map((t) => `
    <div class="kpi kpi-${t.tone}"><span class="kpi-icon">${t.icon}</span>
      <div><div class="kpi-value">${t.value}</div><div class="kpi-label">${t.label}</div></div></div>`).join("")}</section>`;
}

function companyTable(stats) {
  return `
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr>
        <th>บริษัท / Domain</th><th>เวอร์ชัน</th><th class="num">แจ้งทั้งหมด</th><th class="num">เปิดอยู่</th>
        <th class="num">ยกระดับอยู่</th><th class="num">Bug</th><th class="num">ตาม Spec</th><th class="num">Support แก้</th>
        <th>ตอบรับเฉลี่ย</th><th>ปิดเคสเฉลี่ย</th><th class="num">พึงพอใจ</th><th>เมนูที่แจ้งบ่อย</th><th>แจ้งล่าสุด</th>
      </tr></thead>
      <tbody>
        ${stats.map((s) => `
          <tr class="row-link" data-go="${s.id}">
            <td><div class="co-cell"><i class="swatch" style="background:${CO_COLORS[s.id]}"></i><div><b>${esc(s.co.short)}</b><div class="muted small">🌐 ${esc(s.co.domain)}</div></div></div></td>
            <td><span class="ver ${s.version === LATEST_VERSION ? "now" : ""}">${esc(s.version)}</span>${s.version === LATEST_VERSION ? "" : `<div class="muted small">ล่าสุด ${LATEST_VERSION}</div>`}</td>
            <td class="num"><b>${s.total}</b></td>
            <td class="num">${s.open}</td>
            <td class="num">${s.escalated ? `<span class="flag flag-l2">🚨 ${s.escalated}</span>` : "0"}</td>
            <td class="num">${s.bugs}</td>
            <td class="num">${s.spec}</td>
            <td class="num">${s.support}</td>
            <td class="small">${fmtAvg(s.avgResponse)}</td>
            <td class="small">${fmtAvg(s.avgClose)}</td>
            <td class="num">${s.csat ? `<b class="${s.csat < 3.5 ? "csat-low" : ""}">⭐ ${s.csat.toFixed(1)}</b>` : "—"}</td>
            <td class="small">${s.topModule ? `${esc(s.topModule[0])} (${s.topModule[1]})` : "—"}</td>
            <td class="small muted">${s.last ? timeAgo(s.last) : "—"}</td>
          </tr>`).join("")}
      </tbody>
    </table></div>`;
}

function versionBars(list) {
  const by = countBy(list, (c) => c.reportedVersion);
  return hbars(Object.entries(by).sort((a, b) => cmpVersion(a[0], b[0])).map(([v, n]) => {
    const domains = [...new Set(list.filter((c) => c.reportedVersion === v).map((c) => COMPANIES[c.companyId].short))];
    return {
      label: v, sub: v === LATEST_VERSION ? "ล่าสุด" : domains.join(", "), value: n, color: SINGLE_COLOR,
      tip: `<b>${esc(v)}</b><br>${n} เคส · แจ้งจาก ${esc(domains.join(", "))}`,
    };
  }));
}

function moduleBars(list) {
  return hbars(Object.entries(countBy(list, (c) => c.module)).sort((a, b) => b[1] - a[1]).map(([m, n]) => ({
    label: m, value: n, color: SINGLE_COLOR,
    tip: `<b>${esc(m)}</b><br>${n} เคส · เปิดอยู่ ${list.filter((c) => c.module === m && isOpen(c)).length}`,
  })));
}

function resolutionBars(list) {
  const closed = list.filter((c) => !isOpen(c));
  return hbars(Object.entries(countBy(closed, (c) => c.resolution || "ปิดโดยไม่มีผลสรุป")).sort((a, b) => b[1] - a[1]).map(([r, n]) => ({
    label: r, value: n, color: SINGLE_COLOR, tip: `<b>${esc(r)}</b><br>${n} จาก ${closed.length} เคสที่ปิดแล้ว`,
  })));
}

function companyBars(stats) {
  return hbars([...stats].sort((a, b) => b.total - a.total).map((s) => ({
    label: s.co.short, sub: `🌐 ${esc(s.co.domain)} · ${esc(s.version)}`, value: s.total, color: CO_COLORS[s.id],
    tip: `<b>${esc(s.co.name)}</b><br>🌐 ${esc(s.co.domain)} · ${esc(s.version)}<br>แจ้ง ${s.total} · เปิดอยู่ ${s.open} · Bug ${s.bugs}`,
  })));
}

function customerCaseTable(list) {
  const sorted = [...list].sort((a, b) => (isOpen(b) - isOpen(a)) || b.createdAt - a.createdAt);
  return `
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>เคส</th><th>สถานะ</th><th>เวอร์ชันตอนแจ้ง</th><th>แจ้งเมื่อ</th><th>ปิดเมื่อ</th><th>ผลสรุป</th></tr></thead>
      <tbody>${sorted.map((c) => `
        <tr class="row-link" data-case="${c.id}">
          <td><div class="case-id">${c.id}</div><div class="t-title">${esc(c.title)}</div></td>
          <td>${statusPill(c.status)}</td>
          <td><span class="ver">${esc(c.reportedVersion)}</span></td>
          <td class="small">${fmtDay(c.createdAt)}</td>
          <td class="small">${closedAt(c) ? fmtDay(closedAt(c)) : `<span class="muted">ยังไม่ปิด</span>`}</td>
          <td class="small">${esc(c.resolution || "—")}</td>
        </tr>`).join("") || `<tr><td colspan="6" class="muted">ไม่มีเคสในช่วงนี้</td></tr>`}</tbody>
    </table></div>`;
}

// ---------- 🗂️ งานที่ค้างอยู่ที่คุณ (Board ตามบทบาทของคนที่ login) ----------
// แสดงสถานะปัจจุบันเสมอ (ไม่ขึ้นกับช่วงเวลา) แต่ใช้ filter บริษัทร่วมด้วย
const MY_TEAM_KEY = "demoMyBoardTeam";
let showTeam = (() => { try { return localStorage.getItem(MY_TEAM_KEY) === "1"; } catch (e) { return false; } })();

// เร่งด่วนก่อน: ยกระดับ 2 → 1 → เกิน SLA มากสุด
const urgency = (c) => {
  const e = escalation(c);
  const s = slaInfo(c);
  return (e ? e.level * 10 : 0) + (s.ratio || 0);
};

function myColumns() {
  const open = loadCases()
    .filter((c) => isOpen(c) && canSeeCase(c, currentRole))
    .filter((c) => !companyFilter || c.companyId === companyFilter);

  if (currentRole === "customer") {
    return {
      title: "งานที่รอคุณดำเนินการ",
      sub: "เคสของบริษัทคุณที่ทีมรอให้คุณตอบกลับหรือยืนยันผล",
      toggleLabel: "แสดงเคสที่ทีมกำลังดำเนินการ",
      cols: [
        { key: "waiting", icon: "⏳", label: "รอข้อมูลจากคุณ", color: STATUSES.waiting.color, items: open.filter((c) => c.status === "waiting") },
        { key: "resolved", icon: "✅", label: "รอคุณยืนยันผล", color: STATUSES.resolved.color, items: open.filter((c) => c.status === "resolved") },
        { key: "team", icon: "📂", label: "ทีมกำลังดำเนินการ", color: "#94a3b8", optional: true, items: open.filter((c) => ownerRole(c) !== "customer") },
      ],
    };
  }

  if (currentRole === "admin") {
    const esc1 = open.filter((c) => escalation(c));
    return {
      title: "เคสที่ต้องจับตา",
      sub: "เคสที่ถูกยกระดับ และเคสที่ยังไม่มีคนรับ ของทุกทีม",
      cols: [
        { key: "l2", icon: "🚨", label: "ยกระดับ 2", color: "#dc2626", items: esc1.filter((c) => escalation(c).level === 2) },
        { key: "l1", icon: "⚠️", label: "ยกระดับ 1", color: "#d97706", items: esc1.filter((c) => escalation(c).level === 1) },
        { key: "take", icon: "✋", label: "ยังไม่มีคนรับ", color: "#64748b", items: open.filter((c) => { const o = ownerRole(c); return o && o !== "customer" && !c.assignees[o] && !escalation(c); }) },
      ],
    };
  }

  // ทีมงาน: เคสที่อยู่ในสถานะที่ทีมของฉันเป็นเจ้าของ แยกตามคนรับ
  const mineRole = open.filter((c) => ownerRole(c) === currentRole);
  const team = TEAM[currentRole].team;
  return {
    title: "งานที่ค้างอยู่ที่คุณ",
    sub: `เคสที่อยู่ในความรับผิดชอบของ${team}`,
    toggleLabel: "แสดงงานของคนอื่นในทีม",
    cols: [
      { key: "take", icon: "✋", label: `ยังไม่มีคนรับ (${team})`, color: "#d97706", items: mineRole.filter((c) => !c.assignees[currentRole]) },
      { key: "mine", icon: "👤", label: "มอบให้คุณ", color: ROLES[currentRole].color, items: mineRole.filter((c) => c.assignees[currentRole] === currentUser) },
      { key: "others", icon: "👥", label: "คนอื่นในทีม", color: "#94a3b8", optional: true, items: mineRole.filter((c) => c.assignees[currentRole] && c.assignees[currentRole] !== currentUser) },
    ],
  };
}

const MY_VIEW_KEY = "demoMyBoardView";
let myView = (() => { try { return localStorage.getItem(MY_VIEW_KEY) || "card"; } catch (e) { return "card"; } })();

const dueText = (c) => ["queued", "dev", "verify"].includes(c.status) && c.eta ? `📅 ETA ${fmtDay(c.eta)}`
  : c.status === "publish" && c.publishDate ? `🚀 Publish ${fmtDay(c.publishDate)}` : "";

function whoText(c) {
  const o = ownerInfo(c);
  if (!o.role) return "";
  if (o.role === "customer") return isStaff ? `${ROLES.customer.icon} ${esc(o.name)}` : "";
  // ลูกค้าเห็นเป็นทีม / บทบาทที่ดูแลการ์ดอยู่ · ทีมงานเห็นชื่อคนที่รับเคส
  if (!isStaff) return `${ROLES[o.role].icon} ${esc(o.team)}`;
  return o.assigned ? `${ROLES[o.role].icon} ${esc(o.name)}` : `${ROLES[o.role].icon} <span class="muted">ยังไม่มีคนรับ</span>`;
}

// ป้ายแดงจำนวนข้อความที่ยังไม่ได้อ่าน
const unreadBadge = (n) => (n ? `<span class="unread-badge" title="มี ${n} ข้อความใหม่ที่ยังไม่ได้อ่าน">💬 ${n}</span>` : "");

function myFlags(c, nudged) {
  return `${nudged ? `<div class="flags"><span class="flag flag-l1">🔔 ถูกทวงถาม</span></div>` : ""}
    ${isStaff ? alertBadges(c) : c.reporter === currentUser ? `<div class="flags"><span class="flag flag-take">คุณเป็นคนแจ้ง</span></div>` : ""}`;
}

function myCaseCard(c, nudged, unread) {
  const due = dueText(c);
  return `
    <article class="case-card ${unread ? "has-unread" : ""}" data-case="${c.id}" tabindex="0">
      <div class="cc-top"><span class="case-id">${c.id} ${unreadBadge(unread)}</span>${statusPill(c.status)}</div>
      <h4>${esc(c.title)}</h4>
      <div class="cc-meta">🏢 ${esc(COMPANIES[c.companyId].short)} · ${esc(c.module)} · ${severityChip(c.severity)}</div>
      ${myFlags(c, nudged)}
      ${due ? `<div class="cc-meta my-due ${etaOverdue(c) ? "late" : ""}">${due}${etaOverdue(c) ? " · เลยกำหนด" : ""}</div>` : ""}
      <div class="cc-foot"><span class="owner">${whoText(c)}</span>${slaBadge(c)}</div>
    </article>`;
}

// List: ตารางเดียว มีคอลัมน์ "กลุ่ม" บอกว่าอยู่ช่องไหน เรียงตามกลุ่ม แล้วเร่งด่วนก่อน
function myList(shown, sortItems, nudgedIds, unreadOf) {
  const rows = shown.flatMap((col) => sortItems(col.items).map((c) => ({ col, c })));
  if (!rows.length) return `<div class="my-empty"><div class="big">🎉</div><b>ไม่มีงานค้าง</b></div>`;
  return `
    <div class="tbl-wrap my-list"><table class="tbl">
      <thead><tr><th>กลุ่ม</th><th>เคส</th><th>สถานะ</th><th class="center">ข้อความใหม่</th><th>ป้าย</th><th>กำหนดการ</th><th>ผู้รับผิดชอบ</th><th>อยู่ขั้นนี้</th></tr></thead>
      <tbody>
        ${rows.map(({ col, c }) => {
          const unread = unreadOf(c);
          const due = dueText(c);
          return `
            <tr class="row-link ${unread ? "has-unread" : ""}" data-case="${c.id}" tabindex="0">
              <td><span class="my-chip" style="--c:${col.color}">${col.icon} ${esc(col.label)}</span></td>
              <td><div class="case-id">${c.id}</div><div class="t-title">${esc(c.title)}</div><div class="muted small">🏢 ${esc(COMPANIES[c.companyId].short)} · ${esc(c.module)} · ${severityChip(c.severity)}</div></td>
              <td>${statusPill(c.status)}</td>
              <td class="center">${unreadBadge(unread) || `<span class="muted">—</span>`}</td>
              <td>${myFlags(c, nudgedIds.has(c.id)) || `<span class="muted">—</span>`}</td>
              <td class="small ${etaOverdue(c) ? "late-text" : ""}">${due || `<span class="muted">—</span>`}${etaOverdue(c) ? "<br>เลยกำหนด" : ""}</td>
              <td class="small">${whoText(c) || `<span class="muted">—</span>`}</td>
              <td>${slaBadge(c)}</td>
            </tr>`;
        }).join("")}
      </tbody>
    </table></div>`;
}

function myBoard() {
  const { title, sub, toggleLabel, cols } = myColumns();
  const nudgedIds = new Set(alertsFor(currentRole, currentUser).filter((a) => a.icon === "🔔").map((a) => a.c.id));
  const unreadCache = {};
  const unreadOf = (c) => (c.id in unreadCache ? unreadCache[c.id] : (unreadCache[c.id] = unreadMessages(c, currentRole, currentUser).length));
  // เร่งด่วนก่อน ถ้าเท่ากัน เคสที่มีข้อความใหม่ขึ้นก่อน
  const sortItems = (items) => [...items].sort((a, b) => urgency(b) - urgency(a) || unreadOf(b) - unreadOf(a));

  const shown = cols.filter((c) => !c.optional || showTeam);
  const main = cols.filter((c) => !c.optional);
  const total = main.reduce((n, c) => n + c.items.length, 0);
  const escalated = main.reduce((n, c) => n + c.items.filter((x) => escalation(x)).length, 0);
  const unreadTotal = [...new Set(shown.flatMap((c) => c.items))].reduce((n, c) => n + unreadOf(c), 0);

  const body = !(total || showTeam)
    ? `<div class="my-empty"><div class="big">🎉</div><b>ไม่มีงานค้างอยู่ที่คุณ</b><div class="muted small">เคสใหม่ที่เข้ามาในความรับผิดชอบของคุณจะแสดงที่นี่</div></div>`
    : myView === "list"
      ? myList(shown, sortItems, nudgedIds, unreadOf)
      : `<div class="my-board" style="--n:${shown.length}">
          ${shown.map((col) => `
            <section class="col my-col" style="--c:${col.color}">
              <header class="col-head"><div class="col-title">${col.icon} ${esc(col.label)}<span class="count">${col.items.length}</span></div></header>
              <div class="col-body">
                ${sortItems(col.items).map((c) => myCaseCard(c, nudgedIds.has(c.id), unreadOf(c))).join("")
                  || `<div class="col-empty">${col.key === "mine" || col.key === "waiting" || col.key === "resolved" ? "ไม่มีงานค้าง 🎉" : "ไม่มีเคส"}</div>`}
              </div>
            </section>`).join("")}
        </div>`;

  return `
    <section class="card my-board-card">
      <div class="my-head">
        <div>
          <h3>🗂️ ${title} <span class="my-total">${total}</span></h3>
          <div class="muted small">${sub}${companyFilter ? ` · เฉพาะ ${esc(COMPANIES[companyFilter].short)}` : ""} · สถานะปัจจุบัน (ไม่ขึ้นกับช่วงเวลา)</div>
        </div>
        <div class="seg my-view" role="group" aria-label="รูปแบบการแสดง">
          <button data-myview="card" class="${myView === "card" ? "active" : ""}" aria-pressed="${myView === "card"}">▦ การ์ด</button>
          <button data-myview="list" class="${myView === "list" ? "active" : ""}" aria-pressed="${myView === "list"}">☰ List</button>
        </div>
      </div>
      <div class="my-summary">
        ${main.map((c) => `<span class="my-chip" style="--c:${c.color}">${c.icon} ${esc(c.label)} <b>${c.items.length}</b></span>`).join("")}
        ${escalated && currentRole !== "admin" ? `<span class="my-chip" style="--c:#dc2626">🚨 ยกระดับ <b>${escalated}</b></span>` : ""}
        ${unreadTotal ? `<span class="my-chip unread-chip" style="--c:#dc2626">💬 ข้อความที่ยังไม่ได้อ่าน <b>${unreadTotal}</b></span>` : ""}
        ${toggleLabel ? `<label class="check-inline"><input type="checkbox" id="myTeamToggle" ${showTeam ? "checked" : ""} /> ${toggleLabel}</label>` : ""}
      </div>
      ${body}
    </section>`;
}


function card(title, sub, body, extra = "") {
  return `<div class="card viz-card ${extra}"><div class="viz-head"><h3>${title}</h3>${sub ? `<span class="muted small">${sub}</span>` : ""}</div>${body}</div>`;
}

function render() {
  const list = scoped();
  const ids = Object.keys(COMPANIES).filter((id) => !companyFilter || id === companyFilter);
  const stats = ids.map((id) => companyStats(list, id));
  const { weeks, series } = weekBuckets(list, ids);
  const periodText = { 30: "30 วันล่าสุด", 90: "90 วันล่าสุด", all: "ทั้งหมด" }[period];

  const legend = series.length < 2 ? "" : `<div class="viz-legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join("")}</div>`;

  page.innerHTML = `
    <div class="page-head">
      <div>
        <h1>📊 Dashboard</h1>
        <p class="lead">${isStaff
          ? "ภาพรวมเคสของลูกค้าทุกบริษัท — แต่ละบริษัทมี domain และเวอร์ชันโปรแกรมของตัวเอง ดูได้ว่าเจ้าไหนแจ้งเยอะ ค้างที่ไหน และเวอร์ชันไหนมีปัญหา"
          : `สรุปเคสของ ${esc(companyName(currentCompany))} — 🌐 ${esc(companyDomain(currentCompany))} · เวอร์ชัน ${esc(companyVersion(currentCompany))}`}</p>
      </div>
    </div>

    <div class="filters">
      <div class="seg" id="periodSeg" style="margin-left:0">
        ${["30", "90", "all"].map((p) => `<button data-p="${p}" class="${p === period ? "active" : ""}">${{ 30: "30 วัน", 90: "90 วัน", all: "ทั้งหมด" }[p]}</button>`).join("")}
      </div>
      ${isStaff ? `<select id="coFilter" class="input">
        <option value="">ทุกบริษัท (${Object.keys(COMPANIES).length} domain)</option>
        ${Object.entries(COMPANIES).map(([k, co]) => `<option value="${k}" ${k === companyFilter ? "selected" : ""}>🏢 ${esc(co.short)} — ${esc(co.domain)}</option>`).join("")}
      </select>` : ""}
      <span class="muted small">ช่วงเวลา: ${periodText} (นับจากวันที่แจ้ง)</span>
    </div>

    ${myBoard()}

    ${kpis(list, stats)}

    ${isStaff ? `
      <div class="viz-grid">
        ${card("🏢 เจ้าไหนแจ้งเข้ามาเยอะ", "จำนวนเคสแยกตามบริษัท / domain", companyBars(stats))}
        ${card("📈 เคสใหม่รายสัปดาห์", "แยกตามบริษัท", legend + lineChart(series, weeks), "line-card")}
      </div>
      ${card("📋 เปรียบเทียบรายบริษัท", "คลิกแถวเพื่อดูเคสของบริษัทนั้น", companyTable(stats), "no-pad-body")}` : `
      <div class="viz-grid">
        ${card("📈 เคสที่แจ้งรายสัปดาห์", "", legend + lineChart(series, weeks), "line-card")}
        ${card("✅ เคสที่จบแล้ว จบอย่างไร", "", resolutionBars(list))}
      </div>
      ${card("🗂️ เคสทั้งหมดที่บริษัทของคุณแจ้งมา", "เคสที่ยังเปิดอยู่แสดงก่อน", customerCaseTable(list), "no-pad-body")}`}

    <div class="viz-grid three">
      ${card("🌐 เวอร์ชันที่พบปัญหา", "เวอร์ชันของ domain ณ วันที่แจ้ง", versionBars(list))}
      ${card("🧩 เมนูที่แจ้งบ่อย", "", moduleBars(list))}
      ${isStaff ? card("✅ ผลสรุปเคสที่ปิดแล้ว", "", resolutionBars(list)) : ""}
    </div>`;

  bindLineHover(page, series, weeks);

  // ถูก redirect มาจากหน้าที่ไม่มีสิทธิ์ (เช่น Admin Spec)
  if (params.has("denied")) {
    page.insertAdjacentHTML("afterbegin", `<div class="alert">⛔ หน้านั้นเข้าได้เฉพาะ user admin เท่านั้น</div>`);
  }
}

// ---------- events ----------
page.addEventListener("click", (e) => {
  const mv = e.target.closest("[data-myview]");
  if (mv) {
    myView = mv.dataset.myview;
    try { localStorage.setItem(MY_VIEW_KEY, myView); } catch (err) {}
    return render();
  }
  const p = e.target.closest("[data-p]");
  if (p) { period = p.dataset.p; return render(); }
  const go = e.target.closest("[data-go]");
  if (go) return goTo("cases.html?company=" + encodeURIComponent(go.dataset.go));
  const cs = e.target.closest("[data-case]");
  if (cs) return goTo("case.html?id=" + encodeURIComponent(cs.dataset.case));
});
page.addEventListener("change", (e) => {
  if (e.target.id === "coFilter") { companyFilter = e.target.value; render(); }
  if (e.target.id === "myTeamToggle") {
    showTeam = e.target.checked;
    try { localStorage.setItem(MY_TEAM_KEY, showTeam ? "1" : "0"); } catch (err) {}
    render();
  }
});
page.addEventListener("keydown", (e) => {
  const cs = e.target.closest("[data-case]");
  if (cs && e.key === "Enter") goTo("case.html?id=" + encodeURIComponent(cs.dataset.case));
});
page.addEventListener("mousemove", (e) => {
  const row = e.target.closest("[data-tip]");
  if (row) showTip(row.dataset.tip, e.clientX, e.clientY);
  else if (!e.target.closest(".line-chart")) hideTip();
});
page.addEventListener("mouseleave", hideTip);

render();
