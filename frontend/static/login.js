(function () {
  var $ = window.picai;
  var userEl = $.qs("#user");
  var passEl = $.qs("#pass");
  var errEl = $.qs("#err");
  var btnLogin = $.qs("#btnLogin");
  var btnClear = $.qs("#btnClear");

  function getReturn() {
    try {
      var u = new URL(location.href);
      return u.searchParams.get("return") || "/yuanxing/goods_list/index.html";
    } catch (e) {
      return "/yuanxing/goods_list/index.html";
    }
  }

  function setErr(msg) {
    errEl.textContent = msg || "";
  }

  btnClear.addEventListener("click", function () {
    userEl.value = "";
    passEl.value = "";
    $.clearAuth();
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
    btnLogin.textContent = "登录中...";
    try {
      // Upstream login expects application/x-www-form-urlencoded.
      var resp = await $.apiPost("/api/wholesales/users.php?action=login", { user: user, pass: pass });
      if (String(resp.code) === "0" && resp.data && resp.data.token) {
        $.setAuth(resp.data.user || user, resp.data.token);
        location.replace(getReturn());
        return;
      }
      setErr((resp && resp.msg) || "登录失败");
    } catch (e) {
      setErr("网络错误：" + (e && e.message ? e.message : String(e)));
    } finally {
      btnLogin.disabled = false;
      btnLogin.textContent = "登录";
    }
  });

  // convenience
  try {
    var a = $.getAuth();
    if (a.user) userEl.value = a.user;
  } catch (e) {}
})();
