// ================= Platform shims =================
// ให้เว็บทำงานได้ทั้ง เปิดไฟล์ตรง / static hosting / sandbox (เช่น claude.ai Artifact)
// โหลดเป็น script แรกใน <head> ของทุกหน้า

// 1) localStorage / sessionStorage อาจ throw (private mode, sandbox) → ใช้หน่วยความจำแทน หน้าไม่พัง
(function () {
  ["localStorage", "sessionStorage"].forEach((name) => {
    try {
      const s = window[name];
      s.setItem("__probe", "1");
      s.removeItem("__probe");
    } catch (e) {
      const mem = {};
      const fake = {
        getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
        setItem: (k, v) => { mem[k] = String(v); },
        removeItem: (k) => { delete mem[k]; },
        clear: () => Object.keys(mem).forEach((k) => delete mem[k]),
        key: (i) => Object.keys(mem)[i] || null,
        get length() { return Object.keys(mem).length; },
      };
      try { Object.defineProperty(window, name, { value: fake, configurable: true }); } catch (_) {}
    }
  });
})();

// 2) บาง hosting ไม่ส่ง query string (?id=…) ต่อให้หน้าปลายทาง → เก็บสำเนาไว้ก่อนเปลี่ยนหน้า
const NAV_KEY = "demoNavParams";
const pageName = (path) => (path.split("/").pop() || "").split("?")[0];

function rememberParams(url) {
  try {
    const u = new URL(url, location.href);
    sessionStorage.setItem(NAV_KEY, JSON.stringify({ page: pageName(u.pathname), search: u.search }));
  } catch (e) {}
}

// เปลี่ยนหน้าพร้อม parameter — ใช้แทน location.href = "page.html?x=1"
function goTo(url) {
  rememberParams(url);
  location.href = url;
}

// อ่าน parameter ของหน้านี้ — ใช้แทน new URLSearchParams(location.search)
function pageParams() {
  if (location.search) return new URLSearchParams(location.search);
  try {
    const s = JSON.parse(sessionStorage.getItem(NAV_KEY));
    if (s && s.page === pageName(location.pathname)) return new URLSearchParams(s.search);
  } catch (e) {}
  return new URLSearchParams();
}

// ลิงก์ <a href> ทุกอันในหน้า: จำ parameter ของปลายทาง (หรือล้าง ถ้าไม่มี)
document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest("a[href]");
  if (a && !/^(https?:|#|mailto:|tel:)/.test(a.getAttribute("href"))) rememberParams(a.getAttribute("href"));
}, true);
