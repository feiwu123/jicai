(function () {
  function encodeForm(body) {
    var params = new URLSearchParams();
    Object.keys(body || {}).forEach(function (k) {
      var v = body[k];
      if (v === undefined || v === null) return;
      if (Array.isArray(v)) {
        v.forEach(function (it) {
          if (it === undefined || it === null) return;
          params.append(k, String(it));
        });
        return;
      }
      params.append(k, String(v));
    });
    return params.toString();
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }
  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function getAuth() {
    return {
      user: localStorage.getItem("picai_user") || "",
      token: localStorage.getItem("picai_token") || "",
    };
  }
  function setAuth(user, token) {
    localStorage.setItem("picai_user", user || "");
    localStorage.setItem("picai_token", token || "");
  }
  function clearAuth() {
    localStorage.removeItem("picai_user");
    localStorage.removeItem("picai_token");
  }
  function buildReturnUrl() {
    try {
      return location.pathname + location.search + location.hash;
    } catch (e) {
      return "/";
    }
  }
  function requireAuth() {
    var a = getAuth();
    if (!a.user || !a.token) {
      var ret = encodeURIComponent(buildReturnUrl());
      location.replace("/login.html?return=" + ret);
      return null;
    }
    return a;
  }

  // Default to application/x-www-form-urlencoded to match the upstream PHP API.
  async function apiPost(path, body, opts) {
    opts = opts || {};
    var useJson = !!opts.json;
    var headers = Object.assign({}, opts.headers || {});
    var payload;

    if (useJson) {
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json; charset=UTF-8";
      payload = JSON.stringify(body || {});
    } else {
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
      payload = encodeForm(body || {});
    }

    var res = await fetch(path, {
      method: "POST",
      headers: headers,
      body: payload,
    });

    var ct = res.headers.get("content-type") || "";
    if (ct.indexOf("application/json") >= 0) return await res.json();
    var text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return { code: "1", msg: "non_json_response", raw: text };
    }
  }

  function withAuth(body) {
    var a = getAuth();
    return Object.assign({}, body || {}, { user: a.user, token: a.token });
  }
  function mountQuickNav(items) {
    var bar = document.createElement("div");
    bar.style.position = "fixed";
    bar.style.right = "10px";
    bar.style.bottom = "10px";
    bar.style.zIndex = "9999";
    bar.style.background = "rgba(255,255,255,0.92)";
    bar.style.border = "1px solid rgba(0,0,0,0.08)";
    bar.style.borderRadius = "12px";
    bar.style.padding = "10px";
    bar.style.boxShadow = "0 10px 30px rgba(0,0,0,0.12)";
    bar.style.fontFamily =
      "system-ui, -apple-system, Segoe UI, Roboto, Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif";

    (items || []).forEach(function (it) {
      var a = document.createElement("a");
      a.href = it.href;
      a.textContent = it.label;
      a.style.display = "block";
      a.style.fontSize = "12px";
      a.style.padding = "6px 8px";
      a.style.color = "#1f2a44";
      a.style.textDecoration = "none";
      a.style.borderRadius = "8px";
      a.onmouseenter = function () {
        a.style.background = "rgba(106,124,255,0.12)";
      };
      a.onmouseleave = function () {
        a.style.background = "transparent";
      };
      bar.appendChild(a);
    });

    document.body.appendChild(bar);
  }

  function mountLogoutMenu(triggerEl) {
    if (!triggerEl) return null;

    var menuId = "picaiLogoutMenu";
    var menu = document.getElementById(menuId);
    if (!menu) {
      menu = document.createElement("div");
      menu.id = menuId;
      menu.style.position = "fixed";
      menu.style.zIndex = "10000";
      menu.style.minWidth = "140px";
      menu.style.background = "rgba(255,255,255,0.98)";
      menu.style.border = "1px solid rgba(0,0,0,0.08)";
      menu.style.borderRadius = "12px";
      menu.style.boxShadow = "0 10px 30px rgba(0,0,0,0.18)";
      menu.style.padding = "8px";
      menu.style.display = "none";
      menu.style.transform = "translateX(-100%)";
      menu.style.fontFamily =
        "system-ui, -apple-system, Segoe UI, Roboto, Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif";

      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "退出登录";
      btn.style.width = "100%";
      btn.style.border = "0";
      btn.style.background = "rgba(232,69,122,0.10)";
      btn.style.color = "#e8457a";
      btn.style.borderRadius = "10px";
      btn.style.padding = "10px 12px";
      btn.style.fontSize = "14px";
      btn.style.cursor = "pointer";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        clearAuth();
        menu.style.display = "none";
        location.replace("/login.html");
      });
      menu.appendChild(btn);
      document.body.appendChild(menu);

      function hide() {
        menu.style.display = "none";
      }

      document.addEventListener("click", function (e) {
        if (menu.style.display === "none") return;
        if (menu.contains(e.target)) return;
        hide();
      });
      window.addEventListener(
        "scroll",
        function () {
          hide();
        },
        true
      );
      window.addEventListener("resize", function () {
        hide();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") hide();
      });
    }

    function position() {
      var r = triggerEl.getBoundingClientRect();
      menu.style.left = Math.max(8, r.right) + "px";
      menu.style.top = Math.max(8, r.bottom + 8) + "px";
    }

    triggerEl.style.cursor = "pointer";
    triggerEl.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (menu.style.display === "none") {
        position();
        menu.style.display = "block";
        return;
      }
      menu.style.display = "none";
    });

    return menu;
  }

  function showModalMessage(message, opts) {
    opts = opts || {};

    var modalId = "picaiMessageModal";
    var modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement("div");
      modal.id = modalId;
      modal.style.position = "fixed";
      modal.style.inset = "0";
      modal.style.zIndex = "10001";
      modal.style.background = "rgba(0,0,0,0.45)";
      modal.style.display = "none";
      modal.style.alignItems = "center";
      modal.style.justifyContent = "center";
      modal.style.padding = "24px";

      var panel = document.createElement("div");
      panel.style.width = "min(360px, 92vw)";
      panel.style.background = "rgba(255,255,255,0.98)";
      panel.style.border = "1px solid rgba(0,0,0,0.08)";
      panel.style.borderRadius = "14px";
      panel.style.boxShadow = "0 18px 60px rgba(0,0,0,0.22)";
      panel.style.padding = "16px";
      panel.style.fontFamily =
        "system-ui, -apple-system, Segoe UI, Roboto, Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif";

      var text = document.createElement("div");
      text.id = "picaiMessageModalText";
      text.style.fontSize = "14px";
      text.style.color = "#1f2a44";
      text.style.lineHeight = "1.5";
      text.style.wordBreak = "break-word";
      text.style.whiteSpace = "pre-line";

      var actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.justifyContent = "flex-end";
      actions.style.marginTop = "12px";

      var ok = document.createElement("button");
      ok.type = "button";
      ok.textContent = "确定";
      ok.style.border = "0";
      ok.style.background = "#6a7cff";
      ok.style.color = "#fff";
      ok.style.borderRadius = "10px";
      ok.style.padding = "10px 14px";
      ok.style.fontSize = "14px";
      ok.style.cursor = "pointer";
      ok.addEventListener("click", function (e) {
        e.preventDefault();
        hideModalMessage();
      });

      actions.appendChild(ok);
      panel.appendChild(text);
      panel.appendChild(actions);
      modal.appendChild(panel);
      document.body.appendChild(modal);

      modal.addEventListener("click", function () {
        if (modal.dataset.dismissible === "0") return;
        hideModalMessage();
      });
      panel.addEventListener("click", function (e) {
        e.stopPropagation();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && modal.style.display !== "none") hideModalMessage();
      });
    }

    var textEl = document.getElementById("picaiMessageModalText");
    if (textEl) textEl.textContent = String(message || "");

    modal.dataset.dismissible = opts.dismissible === false ? "0" : "1";
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    if (modal._timer) {
      clearTimeout(modal._timer);
      modal._timer = null;
    }
    if (opts.autoCloseMs && opts.autoCloseMs > 0) {
      modal._timer = setTimeout(function () {
        hideModalMessage();
      }, opts.autoCloseMs);
    }

    return modal;
  }

  function hideModalMessage() {
    var modal = document.getElementById("picaiMessageModal");
    if (!modal) return;
    if (modal._timer) {
      clearTimeout(modal._timer);
      modal._timer = null;
    }
    modal.style.display = "none";
    document.body.style.overflow = "";
  }

  function showModalConfirm(message, opts) {
    opts = opts || {};

    return new Promise(function (resolve) {
      var modalId = "picaiConfirmModal";
      var modal = document.getElementById(modalId);
      if (!modal) {
        modal = document.createElement("div");
        modal.id = modalId;
        modal.style.position = "fixed";
        modal.style.inset = "0";
        modal.style.zIndex = "10002";
        modal.style.background = "rgba(0,0,0,0.55)";
        modal.style.display = "none";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
        modal.style.padding = "24px";

        var panel = document.createElement("div");
        panel.id = "picaiConfirmModalPanel";
        panel.style.width = "min(420px, 92vw)";
        panel.style.background = "rgba(255,255,255,0.98)";
        panel.style.border = "1px solid rgba(0,0,0,0.08)";
        panel.style.borderRadius = "16px";
        panel.style.boxShadow = "0 20px 70px rgba(0,0,0,0.28)";
        panel.style.padding = "18px 16px 14px";
        panel.style.fontFamily =
          "system-ui, -apple-system, Segoe UI, Roboto, Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif";
        panel.style.transform = "translateY(6px) scale(0.98)";
        panel.style.opacity = "0";
        panel.style.transition = "transform 160ms ease, opacity 160ms ease";

        var title = document.createElement("div");
        title.id = "picaiConfirmModalTitle";
        title.style.fontSize = "16px";
        title.style.fontWeight = "700";
        title.style.color = "#111827";
        title.style.lineHeight = "1.2";
        title.style.marginBottom = "10px";

        var text = document.createElement("div");
        text.id = "picaiConfirmModalText";
        text.style.fontSize = "14px";
        text.style.color = "#334155";
        text.style.lineHeight = "1.6";
        text.style.wordBreak = "break-word";
        text.style.whiteSpace = "pre-line";

        var actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.justifyContent = "flex-end";
        actions.style.gap = "10px";
        actions.style.marginTop = "14px";

        var cancel = document.createElement("button");
        cancel.type = "button";
        cancel.id = "picaiConfirmModalCancel";
        cancel.textContent = "取消";
        cancel.style.border = "1px solid rgba(15,23,42,0.15)";
        cancel.style.background = "rgba(255,255,255,1)";
        cancel.style.color = "#0f172a";
        cancel.style.borderRadius = "10px";
        cancel.style.padding = "10px 14px";
        cancel.style.fontSize = "14px";
        cancel.style.cursor = "pointer";

        var ok = document.createElement("button");
        ok.type = "button";
        ok.id = "picaiConfirmModalOk";
        ok.textContent = "确定";
        ok.style.border = "0";
        ok.style.background = "#6a7cff";
        ok.style.color = "#fff";
        ok.style.borderRadius = "10px";
        ok.style.padding = "10px 14px";
        ok.style.fontSize = "14px";
        ok.style.cursor = "pointer";
        ok.style.boxShadow = "0 10px 24px rgba(106,124,255,0.28)";

        actions.appendChild(cancel);
        actions.appendChild(ok);
        panel.appendChild(title);
        panel.appendChild(text);
        panel.appendChild(actions);
        modal.appendChild(panel);
        document.body.appendChild(modal);

        function hide(result) {
          if (modal._resolver) {
            var r = modal._resolver;
            modal._resolver = null;
            r(result);
          }
          modal.style.display = "none";
          document.body.style.overflow = "";
          panel.style.transform = "translateY(6px) scale(0.98)";
          panel.style.opacity = "0";
        }

        modal.addEventListener("click", function () {
          if (modal.dataset.dismissible === "0") return;
          hide(false);
        });
        panel.addEventListener("click", function (e) {
          e.stopPropagation();
        });
        cancel.addEventListener("click", function (e) {
          e.preventDefault();
          hide(false);
        });
        ok.addEventListener("click", function (e) {
          e.preventDefault();
          hide(true);
        });
        document.addEventListener("keydown", function (e) {
          if (e.key !== "Escape") return;
          if (modal.style.display === "none") return;
          if (modal.dataset.dismissible === "0") return;
          hide(false);
        });

        modal._hide = hide;
      }

      var titleEl = document.getElementById("picaiConfirmModalTitle");
      var textEl = document.getElementById("picaiConfirmModalText");
      var okEl = document.getElementById("picaiConfirmModalOk");
      var cancelEl = document.getElementById("picaiConfirmModalCancel");
      var panel = document.getElementById("picaiConfirmModalPanel");

      if (titleEl) titleEl.textContent = String(opts.title || "请确认");
      if (textEl) textEl.textContent = String(message || "");

      if (okEl) okEl.textContent = String(opts.confirmText || "确定");
      if (cancelEl) cancelEl.textContent = String(opts.cancelText || "取消");
      if (okEl) {
        var danger = opts.danger !== false;
        okEl.style.background = danger ? "#E8457A" : "#6a7cff";
        okEl.style.boxShadow = danger ? "0 10px 24px rgba(232,69,122,0.26)" : "0 10px 24px rgba(106,124,255,0.28)";
      }

      modal.dataset.dismissible = opts.dismissible === false ? "0" : "1";
      modal._resolver = resolve;
      modal.style.display = "flex";
      document.body.style.overflow = "hidden";

      // Animate in
      if (panel) {
        requestAnimationFrame(function () {
          panel.style.transform = "translateY(0) scale(1)";
          panel.style.opacity = "1";
        });
      }
    });
  }

  function statusText(order) {
    if (!order) return "";
    var orderStatus = String(order.order_status || "");
    var payStatus = String(order.pay_status || "");
    var shipStatus = String(order.shipping_status || "");
    var parts = [];
    if (orderStatus === "3") parts.push("无效");
    else if (orderStatus === "2") parts.push("已取消");
    else if (orderStatus === "1") parts.push("已确认");
    else if (orderStatus === "0") parts.push("未确认");
    if (payStatus === "0") parts.push("未付款");
    else if (payStatus === "1") parts.push("付款中");
    else if (payStatus === "2") parts.push("已付款");
    if (shipStatus === "0") parts.push("未发货");
    else if (shipStatus === "1") parts.push("已发货");
    else if (shipStatus === "3") parts.push("备货中");
    return parts.join("  ");
  }

  function renderUserName() {
    var a = getAuth();
    var user = (a && a.user) || "";
    if (!user) return false;

    var avatars = document.querySelectorAll("img.label_2");
    if (!avatars || !avatars.length) return false;

    Array.prototype.forEach.call(avatars, function (img) {
      var parent = img && img.parentElement;
      if (!parent) return;
      var wrapper = parent.querySelector('div[class^="text-wrapper_"]') || parent.querySelector('div[class*="text-wrapper_"]');
      if (!wrapper) return;
      var spans = wrapper.querySelectorAll("span");
      var first = spans && spans[0] ? spans[0] : null;
      var second = spans && spans[1] ? spans[1] : null;

      wrapper.style.overflow = "hidden";

      if (first) {
        first.textContent = user;
        first.title = user;
        first.style.display = "block";
        first.style.maxWidth = "100%";
        first.style.overflow = "hidden";
        first.style.textOverflow = "ellipsis";
        first.style.whiteSpace = "nowrap";
        first.style.fontSize = "12px";
        first.style.lineHeight = "16px";
      }
      if (second) {
        second.style.display = "none";
      }
    });

    return true;
  }

  function alignHeaderRightIcons() {
    function setAuto(el) {
      if (!el) return;
      el.style.marginLeft = "auto";
    }

    // goods_list: header row is .box_2, cart icon is .section_3
    try {
      var box2 = document.querySelector(".box_2");
      if (box2) setAuto(box2.querySelector(".section_3"));
    } catch (e) {}

    // cart / orders_list / confirm_order: header row is .box_1, right icon may be .section_3 or .group_4
    try {
      var box1 = document.querySelector(".box_1");
      if (box1) {
        setAuto(box1.querySelector(".section_3"));
        setAuto(box1.querySelector(".group_4"));
      }
    } catch (e) {}
  }

  window.picai = {
    qs: qs,
    qsa: qsa,
    getAuth: getAuth,
    setAuth: setAuth,
    clearAuth: clearAuth,
    requireAuth: requireAuth,
    apiPost: apiPost,
    withAuth: withAuth,
    mountQuickNav: mountQuickNav,
    mountLogoutMenu: mountLogoutMenu,
    showModalMessage: showModalMessage,
    showModalConfirm: showModalConfirm,
    renderUserName: renderUserName,
    alignHeaderRightIcons: alignHeaderRightIcons,
    statusText: statusText,
  };

  try {
    // Global layout helper: avoid horizontal scrollbars and let pages fit the viewport width.
    (function ensureBaseStyle() {
      if (document.getElementById("picaiBaseStyle")) return;
      var style = document.createElement("style");
      style.id = "picaiBaseStyle";
      style.textContent =
        "html,body{max-width:100%;overflow-x:hidden} .page{max-width:100%;overflow-x:hidden;width:100%!important}";
      document.head.appendChild(style);
    })();
    renderUserName();
    alignHeaderRightIcons();
  } catch (e) {}
})();
