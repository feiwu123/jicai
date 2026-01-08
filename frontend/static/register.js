(function () {
  var $ = window.picai;
  var emailEl = $.qs("#email");
  var codeEl = $.qs("#code");
  var passEl = $.qs("#pass");
  var pass2El = $.qs("#pass2");
  var uuidEl = $.qs("#uuid");
  var btnSend = $.qs("#btnSend");
  var btnRegister = $.qs("#btnRegister");
  var btnBack = $.qs("#btnBack");
  var countdownTimer = null;
  var countdownLeft = 0;

  function show(msg, opts) {
    if ($ && $.showModalMessage) return $.showModalMessage(msg, opts || {});
    alert(msg);
  }

  function validEmail(v) {
    v = String(v || "").trim();
    return v && v.indexOf("@") > 0 && v.indexOf(".") > 0;
  }

  function stopCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    countdownLeft = 0;
    btnSend.disabled = false;
    btnSend.textContent = "发送验证码";
  }

  function startCountdown(seconds) {
    stopCountdown();
    countdownLeft = seconds || 60;
    btnSend.disabled = true;
    btnSend.textContent = "重新发送(" + countdownLeft + "s)";
    countdownTimer = setInterval(function () {
      countdownLeft -= 1;
      if (countdownLeft <= 0) {
        stopCountdown();
        return;
      }
      btnSend.textContent = "重新发送(" + countdownLeft + "s)";
    }, 1000);
  }

  async function sendCode() {
    if (countdownLeft > 0) return;
    var email = (emailEl.value || "").trim();
    if (!validEmail(email)) {
      show("请输入正确的邮箱");
      return;
    }
    btnSend.disabled = true;
    btnSend.textContent = "发送中...";
    try {
      // API doc: users.php?action=user_email_send { email }
      var resp = await $.apiPost("/api/wholesales/users.php?action=user_email_send", { email: email });
      if (String(resp.code) === "0") {
        show("验证码已发送，请查收邮箱", { autoCloseMs: 1200 });
        startCountdown(60);
        return;
      }
      show((resp && resp.msg) || "发送失败");
    } catch (e) {
      show("网络错误：" + (e && e.message ? e.message : String(e)));
    } finally {
      if (countdownLeft <= 0) {
        btnSend.disabled = false;
        btnSend.textContent = "发送验证码";
      }
    }
  }

  async function register() {
    var email = (emailEl.value || "").trim();
    var code = (codeEl.value || "").trim();
    var pass = passEl.value || "";
    var pass2 = pass2El.value || "";
    var uuid = (uuidEl.value || "").trim();

    if (!validEmail(email)) return show("请输入正确的邮箱");
    if (!code) return show("请输入邮箱验证码");
    if (!pass) return show("请输入密码");
    if (pass !== pass2) return show("两次输入的密码不一致");

    btnRegister.disabled = true;
    btnRegister.textContent = "注册中...";
    try {
      // API doc: users.php?action=act_register { email, send_code, password, uuid }
      // uuid 在文档中标记必填，这里即使为空也会传空字符串。
      var resp = await $.apiPost("/api/wholesales/users.php?action=act_register", {
        email: email,
        send_code: code,
        password: pass,
        uuid: uuid,
      });

      if (String(resp.code) === "0") {
        show("注册成功，请登录", { autoCloseMs: 1200 });
        setTimeout(function () {
          location.replace("/login.html");
        }, 900);
        return;
      }
      show((resp && resp.msg) || "注册失败");
    } catch (e) {
      show("网络错误：" + (e && e.message ? e.message : String(e)));
    } finally {
      btnRegister.disabled = false;
      btnRegister.textContent = "注册";
    }
  }

  btnSend.addEventListener("click", sendCode);
  btnRegister.addEventListener("click", register);
  btnBack.addEventListener("click", function () {
    stopCountdown();
    location.replace("/login.html");
  });
})();
