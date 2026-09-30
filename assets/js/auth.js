// ใช้ร่วมกันทุกหน้าใน pages/: เช็ค session, บทบาท (role), บริษัท (ลูกค้า), render แถบเมนูด้านบน, ออกจากระบบ
// หน้าต้องมี <header class="topbar"></header> และโหลด cases-data.js ก่อนไฟล์นี้ (ใช้ COMPANIES)

const ROLES = {
  customer: { label: "ลูกค้า", icon: "👤", color: "#0ea5e9" },
  support: { label: "Support", icon: "🎧", color: "#06b6d4" },
  product: { label: "Product", icon: "🧭", color: "#8b5cf6" },
  dev: { label: "Developer", icon: "💻", color: "#f97316" },
  tester: { label: "Tester", icon: "🧪", color: "#14b8a6" },
  admin: { label: "Admin", icon: "🛡️", color: "#4f46e5" },
};

// เมนูหลัก — เพิ่มหน้าใหม่ที่นี่ที่เดียว
const NAV = [
  { href: "dashboard.html", label: "📊 Dashboard" },
  { href: "cases.html", label: "Case Tracking", match: ["cases.html", "case.html"] },
  { href: "weekly.html", label: "📨 สรุปรายสัปดาห์" },
  { href: "workflow.html", label: "Workflow & สิทธิ์" },
  { href: "spec.html", label: "📖 Spec" },
  { href: "announcements.html", label: "📢 ประกาศ", adminOnly: true },
  { href: "admin.html", label: "Admin Spec", adminOnly: true },
];

const authStore = localStorage.getItem("demoUser") ? localStorage : sessionStorage;
const currentUser = authStore.getItem("demoUser");
if (!currentUser) location.href = "../index.html";

// Demo: ถือว่า user ชื่อ "admin" คือ admin
const isAdmin = (currentUser || "").toLowerCase() === "admin";

let currentRole = authStore.getItem("demoRole") || (isAdmin ? "admin" : "customer");
if (currentRole === "publisher") currentRole = "tester"; // role เดิมที่รวมเข้า Tester แล้ว
if (!ROLES[currentRole] || (currentRole === "admin" && !isAdmin)) currentRole = "customer";

const isStaff = currentRole !== "customer";

// ลูกค้าแต่ละคนอยู่ 1 บริษัท — เห็นเฉพาะข้อมูลของบริษัทตัวเอง
let currentCompany = authStore.getItem("demoCompany");
if (!COMPANIES[currentCompany]) currentCompany = Object.keys(COMPANIES)[0];

(function renderTopbar() {
  const bar = document.querySelector(".topbar");
  if (!bar) return;
  const page = location.pathname.split("/").pop() || "dashboard.html";
  const roleOptions = Object.entries(ROLES)
    .filter(([k]) => k !== "admin" || isAdmin)
    .map(([k, r]) => `<option value="${k}" ${k === currentRole ? "selected" : ""}>${r.icon} ${r.label}</option>`)
    .join("");

  bar.innerHTML = `
    <a class="brand" href="dashboard.html">🎉 Case-Tracking</a>
    <nav class="nav-links">
      ${NAV.filter((n) => !n.adminOnly || isAdmin)
        .map((n) => `<a href="${n.href}" class="${(n.match || [n.href]).includes(page) ? "active" : ""}">${n.label}</a>`)
        .join("")}
    </nav>
    <div class="user">
      <label class="role-switch" title="Demo: สลับบทบาทเพื่อทดลอง flow">
        <span>บทบาท</span>
        <select id="roleSwitch">${roleOptions}</select>
        ${currentRole === "customer" ? `<select id="companySwitch" title="บริษัทของลูกค้า">
          ${Object.entries(COMPANIES).map(([k, co]) => `<option value="${k}" ${k === currentCompany ? "selected" : ""}>🏢 ${co.short}</option>`).join("")}
        </select>` : ""}
      </label>
      <div class="avatar" id="avatar"></div>
      <span class="uname" id="displayName"></span>
      <button class="btn-outline" id="logoutBtn">ออกจากระบบ</button>
    </div>`;

  document.getElementById("displayName").textContent = currentUser;
  document.getElementById("avatar").textContent = (currentUser || "?").charAt(0).toUpperCase();

  document.getElementById("roleSwitch").addEventListener("change", (e) => {
    authStore.setItem("demoRole", e.target.value);
    location.reload();
  });

  const companySwitch = document.getElementById("companySwitch");
  if (companySwitch) {
    companySwitch.addEventListener("change", (e) => {
      authStore.setItem("demoCompany", e.target.value);
      location.reload();
    });
  }

  document.getElementById("logoutBtn").addEventListener("click", function () {
    ["demoUser", "demoRole", "demoCompany"].forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    location.href = "../index.html";
  });
})();
