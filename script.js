// proteksi dashboard
if (window.location.pathname.includes("dashboard.html")) {
  if (localStorage.getItem("isLoggedIn") !== "true") {
    window.location.href = "login.html";
  }
}

// akun demo
const DEMO_USER = {
  username: "admin",
  password: "123"
};

// cek sudah login
if (localStorage.getItem("isLoggedIn") === "true") {
  if (window.location.pathname.includes("login.html")) {
    window.location.href = "dashboard.html";
  }
}

// handle login
const form = document.getElementById("loginForm");
if (form) {
  form.addEventListener("submit", function(e) {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (username === DEMO_USER.username && password === DEMO_USER.password) {
      localStorage.setItem("isLoggedIn", "true");
      alert("Login berhasil!");
      window.location.href = "dashboard.html";
    } else {
      alert("Username atau password salah!");
    }
  });
}

// logout
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", function() {
    localStorage.removeItem("isLoggedIn");
    window.location.href = "login.html";
  });
}
