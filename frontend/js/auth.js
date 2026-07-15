// ==========================================================
// Basit şifreli panel girişi.
// NOT: Bu, tek-kullanıcılı basit bir koruma katmanıdır (gerçek
// çoklu kullanıcı/yetkilendirme sistemi değildir). Kullanıcı adı
// ve şifre bu dosyada sabit kodludur.
// ==========================================================

const AUTH_USERNAME = "admin";
const AUTH_PASSWORD = "fahozadmin123";
const AUTH_STORAGE_KEY = "fahoz_air_ops_auth";

function attemptLogin(username, password) {
  if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
    localStorage.setItem(AUTH_STORAGE_KEY, "true");
    return true;
  }
  return false;
}

function isAuthenticated() {
  return localStorage.getItem(AUTH_STORAGE_KEY) === "true";
}

function logout() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  const inPagesFolder = window.location.pathname.includes("/pages/");
  window.location.href = inPagesFolder ? "../login.html" : "login.html";
}

/** Her korumalı sayfanın en başında çağrılır. Giriş yoksa login sayfasına yönlendirir. */
function requireAuth() {
  if (!isAuthenticated()) {
    const inPagesFolder = window.location.pathname.includes("/pages/");
    window.location.href = inPagesFolder ? "../login.html" : "login.html";
  }
}
