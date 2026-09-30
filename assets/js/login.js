// หน้า Login (Demo): ไม่ตรวจสอบรหัสผ่านจริง แค่ต้องมีชื่อผู้ใช้ + เลือกบทบาท (+ บริษัท ถ้าเป็นลูกค้า)
const HOME_URL = "pages/dashboard.html"; // หน้าแรกหลัง login

// ถ้า login ค้างอยู่แล้ว ให้ข้ามไป Dashboard เลย
if (localStorage.getItem("demoUser") || sessionStorage.getItem("demoUser")) {
  location.href = HOME_URL;
}

document.getElementById("forgotLink").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("error").textContent = "Demo: ยังไม่เปิดใช้งาน";
});

const roleEl = document.getElementById("role");
const companyEl = document.getElementById("company");
companyEl.innerHTML = Object.entries(COMPANIES).map(([k, c]) => `<option value="${k}">🏢 ${c.name}</option>`).join("");
const syncCompany = () => (document.getElementById("companyField").hidden = roleEl.value !== "customer");
roleEl.addEventListener("change", syncCompany);
syncCompany();

document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const remember = document.getElementById("remember").checked;

  if (!username) {
    document.getElementById("error").textContent = "กรุณากรอกชื่อผู้ใช้";
    return;
  }

  // Demo: user ชื่อ admin ได้บทบาท admin เสมอ
  const role = username.toLowerCase() === "admin" ? "admin" : roleEl.value;
  const store = remember ? localStorage : sessionStorage;
  store.setItem("demoUser", username);
  store.setItem("demoRole", role);
  store.setItem("demoCompany", companyEl.value);
  location.href = HOME_URL;
});
