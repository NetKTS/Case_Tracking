// โหลดใน <head> (หลัง platform.js) ของหน้าที่ให้เข้าได้เฉพาะ admin — เช็คก่อนหน้าจะ render
// Demo: ถือว่า user ชื่อ "admin" คือ admin
(function () {
  const user = localStorage.getItem("demoUser") || sessionStorage.getItem("demoUser");
  if (!user) {
    location.replace("../index.html");
  } else if (user.toLowerCase() !== "admin") {
    rememberParams("dashboard.html?denied=1");
    location.replace("dashboard.html?denied=1");
  }
})();
