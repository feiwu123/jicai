(function () {
  var $ = window.picai;
  var userEl = $.qs("#user");
  var passEl = $.qs("#pass");
  var rememberEl = $.qs("#remember");
  var errEl = $.qs("#err");
  var btnLogin = $.qs("#btnLogin");
  var btnClear = $.qs("#btnClear");

  var REMEMBER_USER_COOKIE = "picai_remember_user";
  var REMEMBER_PASS_COOKIE = "picai_remember_pass";
  var REMEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

  function setBtnText(btn, text) {
    if (!btn) return;
    var target = btn.querySelector && btn.querySelector("[data-btn-text]");
    if (target) {
      target.textContent = text;
    } else {
      btn.textContent = text;
    }
  }

  function getReturn() {
    var fallback = $.toUrl ? $.toUrl("/yuanxing/goods_list/index.html") : "/yuanxing/goods_list/index.html";
    try {
      var u = new URL(location.href);
      return u.searchParams.get("return") || fallback;
    } catch (e) {
      return fallback;
    }
  }

  function setErr(msg) {
    errEl.textContent = msg || "";
  }

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function getCookie(name) {
    try {
      var re = new RegExp("(?:^|;\\s*)" + escapeRegExp(name) + "=([^;]*)");
      var m = String(document.cookie || "").match(re);
      return m ? decodeURIComponent(m[1]) : "";
    } catch (e) {
      return "";
    }
  }

  function setCookie(name, value, maxAgeSeconds) {
    try {
      var v = encodeURIComponent(String(value || ""));
      var maxAge = String(maxAgeSeconds || 0);
      document.cookie = name + "=" + v + "; Max-Age=" + maxAge + "; Path=/; SameSite=Lax";
    } catch (e) {}
  }

  function deleteCookie(name) {
    try {
      document.cookie = name + "=; Max-Age=0; Path=/; SameSite=Lax";
    } catch (e) {}
  }

  btnClear.addEventListener("click", function () {
    userEl.value = "";
    passEl.value = "";
    $.clearAuth();
    if (rememberEl) rememberEl.checked = false;
    deleteCookie(REMEMBER_USER_COOKIE);
    deleteCookie(REMEMBER_PASS_COOKIE);
    setErr("");
  });

  btnLogin.addEventListener("click", async function () {
    setErr("");
    var user = (userEl.value || "").trim();
    var pass = passEl.value || "";
    if (!user || !pass) {
      setErr("请输入账号和密码");
      return;
    }

    btnLogin.disabled = true;
    setBtnText(btnLogin, "登录中...");
    try {
      // Upstream login expects application/x-www-form-urlencoded.
      var resp = await $.apiPost("/api/wholesales/users.php?action=login", { user: user, pass: pass });
      if (String(resp.code) === "0" && resp.data && resp.data.token) {
        $.setAuth(resp.data.user || user, resp.data.token);
        if (rememberEl && rememberEl.checked) {
          setCookie(REMEMBER_USER_COOKIE, user, REMEMBER_MAX_AGE_SECONDS);
          setCookie(REMEMBER_PASS_COOKIE, pass, REMEMBER_MAX_AGE_SECONDS);
        } else {
          deleteCookie(REMEMBER_USER_COOKIE);
          deleteCookie(REMEMBER_PASS_COOKIE);
        }
        location.replace(getReturn());
        return;
      }
      setErr((resp && resp.msg) || "登录失败");
    } catch (e) {
      setErr("网络错误：" + (e && e.message ? e.message : String(e)));
    } finally {
      btnLogin.disabled = false;
      setBtnText(btnLogin, "登录");
    }
  });

  // convenience
  try {
    var cu = getCookie(REMEMBER_USER_COOKIE);
    var cp = getCookie(REMEMBER_PASS_COOKIE);
    if (cu) {
      userEl.value = cu;
      passEl.value = cp || "";
      if (rememberEl) rememberEl.checked = true;
    } else {
      var a = $.getAuth();
      if (a.user) userEl.value = a.user;
    }
  } catch (e) {}
})();
