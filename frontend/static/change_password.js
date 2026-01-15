(function () {
  var $ = window.picai;
  var emailEl = $.qs("#email");
  var codeEl = $.qs("#code");
  var passEl = $.qs("#pass");
  var pass2El = $.qs("#pass2");
  var btnSend = $.qs("#btnSend");
  var btnSubmit = $.qs("#btnSubmit");
  var btnBack = $.qs("#btnBack");
  var countdownTimer = null;
  var countdownLeft = 0;

  function setBtnText(btn, text) {
    if (!btn) return;
    var target = btn.querySelector && btn.querySelector("[data-btn-text]");
    if (target) {
      target.textContent = text;
    } else {
      btn.textContent = text;
    }
  }

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
    setBtnText(btnSend, "发送验证码");
  }

  function startCountdown(seconds) {
    stopCountdown();
    countdownLeft = seconds || 60;
    btnSend.disabled = true;
    setBtnText(btnSend, "重新发送(" + countdownLeft + "s)");
    countdownTimer = setInterval(function () {
      countdownLeft -= 1;
      if (countdownLeft <= 0) {
        stopCountdown();
        return;
      }
      setBtnText(btnSend, "重新发送(" + countdownLeft + "s)");
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
    setBtnText(btnSend, "发送中...");
    try {
      // API doc: users.php?action=edit_pass_email_send { email }
      var resp = await $.apiPost("/api/wholesales/users.php?action=edit_pass_email_send", { email: email });
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
        setBtnText(btnSend, "发送验证码");
      }
    }
  }

  async function submit() {
    var email = (emailEl.value || "").trim();
    var code = (codeEl.value || "").trim();
    var pass = passEl.value || "";
    var pass2 = pass2El.value || "";

    if (!validEmail(email)) return show("请输入正确的邮箱");
    if (!code) return show("请输入邮箱验证码");
    if (!pass) return show("请输入新密码");
    if (pass !== pass2) return show("两次输入的密码不一致");

    btnSubmit.disabled = true;
    setBtnText(btnSubmit, "提交中...");
    try {
      // API doc: users.php?action=act_edit_password { email, email_code, new_password, confirm_password }
      var resp = await $.apiPost("/api/wholesales/users.php?action=act_edit_password", {
        email: email,
        email_code: code,
        new_password: pass,
        confirm_password: pass2,
      });

      if (String(resp.code) === "0") {
        show("密码修改成功，请重新登录", { autoCloseMs: 1200 });
        setTimeout(function () {
          location.replace("/login.html");
        }, 900);
        return;
      }
      show((resp && resp.msg) || "修改失败");
    } catch (e) {
      show("网络错误：" + (e && e.message ? e.message : String(e)));
    } finally {
      btnSubmit.disabled = false;
      setBtnText(btnSubmit, "提交修改");
    }
  }

  btnSend.addEventListener("click", sendCode);
  btnSubmit.addEventListener("click", submit);
  btnBack.addEventListener("click", function () {
    stopCountdown();
    location.replace("/login.html");
  });
})();
