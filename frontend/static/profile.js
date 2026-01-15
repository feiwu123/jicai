(function () {
  var $ = window.picai;
  if (!$ || !$.apiPost || !$.withAuth) return;

  function ensureProfileStyle() {
    var id = "picaiProfileStyle";
    if (document.getElementById(id)) return;
    var style = document.createElement("style");
    style.id = id;
    style.textContent =
      "" +
      /* name/balance lines must be visible */
      "img.label_2 + div span.text_5{display:block !important;}" +
      "img.label_2 + div span.text_4{display:block !important;}" +
      /* do not clip username/balance container */
      "img.label_2 + div{overflow:visible !important;}" +
      "img.label_2{overflow:visible !important;}" +
      "img.label_2 + div span.text_4, img.label_2 + div span.text_5{overflow:visible !important;text-overflow:clip !important;}" +
      "img.label_2 + div span.text_3{overflow:visible !important;text-overflow:clip !important;}" +
      "";
    document.head.appendChild(style);
  }

  function safeText(v) {
    if (v === undefined || v === null) return "";
    return String(v);
  }

  function middleEllipsis(text, headChars, tailChars, minChars) {
    text = safeText(text);
    if (!text) return "";
    headChars = headChars || 4;
    tailChars = tailChars || 4;
    minChars = minChars || 12;
    if (text.length <= minChars) return text;
    if (headChars + tailChars + 1 >= text.length) return text;
    return text.slice(0, headChars) + "…" + text.slice(text.length - tailChars);
  }

  function applyProfile(data) {
    data = data || {};
    var userName = safeText(data.user_name);
    var userMoney = safeText(data.user_money);
    var userPicture = safeText(data.user_picture);
    var balanceText = "余额：" + (userMoney !== "" ? userMoney : "--");

    var avatars = document.querySelectorAll("img.label_2");
    if (userPicture) {
      avatars.forEach(function (img) {
        try {
          img.src = userPicture;
        } catch (e) {}
      });
    }

    avatars.forEach(function (img) {
      var parent = img && img.parentElement;
      if (!parent) return;

      // Layout A: name=text_4, balance=text_5 (goods_list/orders/cart/confirm_order)
      // Layout B: name=text_3, balance=text_4 (lanhu_dizhiguanli)
      // Layout C: name=text_52, balance=text_53 (lanhu_dingdanxiangqing)
      var nameEl = parent.querySelector("span.text_4");
      var balanceEl = parent.querySelector("span.text_5");
      if (!balanceEl) {
        var n2 = parent.querySelector("span.text_3");
        var b2 = parent.querySelector("span.text_4");
        if (n2 && b2) {
          nameEl = n2;
          balanceEl = b2;
        }
      }
      if (!balanceEl) {
        var n3 = parent.querySelector("span.text_52");
        var b3 = parent.querySelector("span.text_53");
        if (n3 && b3) {
          nameEl = n3;
          balanceEl = b3;
        }
      }

      if (nameEl && userName) {
        nameEl.textContent = middleEllipsis(userName, 4, 4, 12);
        nameEl.title = userName;
      }
      if (balanceEl) balanceEl.textContent = balanceText;
    });
  }

  async function load() {
    ensureProfileStyle();
    var auth = $.getAuth ? $.getAuth() : { user: "", token: "" };
    if (!auth || !auth.user || !auth.token) return;

    try {
      var resp = await $.apiPost("/api/wholesales/users.php?action=profile", $.withAuth({}));
      if (String(resp && resp.code) === "2") {
        if ($.clearAuth) $.clearAuth();
        var ret = "";
        try {
          ret = encodeURIComponent(location.pathname + location.search + location.hash);
        } catch (e) {}
        location.replace("/login.html?return=" + ret);
        return;
      }
      if (String(resp && resp.code) !== "0") return;
      applyProfile(resp && resp.data);
    } catch (e) {}
  }

  load();
})();
