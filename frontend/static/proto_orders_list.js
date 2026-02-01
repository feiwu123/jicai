(function () {
  var $ = window.picai;
  var auth = $.requireAuth();
  if (!auth) return;

  function getEmbedMode() {
    try {
      var u = new URL(location.href);
      return String(u.searchParams.get("embed") || "").toLowerCase();
    } catch (e) {
      return "";
    }
  }

  function getEmbedTitle() {
    try {
      var u = new URL(location.href);
      return String(u.searchParams.get("title") || "");
    } catch (e) {
      return "";
    }
  }

  function showMsg(msg, opts) {
    if ($ && $.showModalMessage) return $.showModalMessage(msg, opts || {});
    alert(msg);
  }

  async function refreshBalance() {
    try {
      var resp = await $.apiPost("/api/wholesales/users.php?action=profile", $.withAuth({}));
      if (String(resp && resp.code) === "2") {
        if ($.clearAuth) $.clearAuth();
        location.replace($.toUrl ? $.toUrl("/login.html") : "/login.html");
        return;
      }
      if (String(resp && resp.code) !== "0") return;
      var data = (resp && resp.data) || {};
      var userMoney = data.user_money != null ? String(data.user_money) : "";
      var balanceText = "余额：" + (userMoney !== "" ? userMoney : "--");
      var avatars = document.querySelectorAll("img.label_2");
      avatars.forEach(function (img) {
        var parent = img && img.parentElement;
        if (!parent) return;
        var balanceEl = parent.querySelector("span.text_5");
        if (!balanceEl) {
          var n2 = parent.querySelector("span.text_3");
          var b2 = parent.querySelector("span.text_4");
          if (n2 && b2) balanceEl = b2;
        }
        if (!balanceEl) {
          var n3 = parent.querySelector("span.text_52");
          var b3 = parent.querySelector("span.text_53");
          if (n3 && b3) balanceEl = b3;
        }
        if (balanceEl) balanceEl.textContent = balanceText;
      });
    } catch (e) {}
  }

  function makeNavClick(el, href) {
    if (!el) return;
    el.style.cursor = "pointer";
    el.addEventListener("click", function () {
      var target = $.toUrl ? $.toUrl(href) : href;
      try {
        if (window.top && window.top !== window) {
          window.top.location.href = target;
          return;
        }
      } catch (e) {}
      location.href = target;
    });
  }

  makeNavClick(document.querySelector(".block_7"), "/yuanxing/goods_list/index.html");
  makeNavClick(document.querySelector(".block_4"), "/yuanxing/orders_list/index.html");
  makeNavClick(document.querySelector("[data-nav='address_manage']"), "/yuanxing/lanhu_dizhiguanli/index.html");
  makeNavClick(document.querySelector(".section_3"), "/yuanxing/cart/index.html");

  // Search box only exists in goods list.
  try {
    var topSearch = document.querySelector(".box_1 .section_2");
    if (topSearch && topSearch.querySelector("span.text_3")) topSearch.style.display = "none";
  } catch (e) {}

  var embedMode = getEmbedMode();
  var skipDataLoad = embedMode === "menu" || embedMode === "header";

  if (embedMode === "menu") {
    try {
      // Hide everything but the left menu column.
      var header = document.querySelector(".box_1");
      if (header) header.style.display = "none";
      var main = document.querySelector(".block_8");
      if (main) main.style.display = "none";
      var box = document.querySelector(".box_7");
      if (box) {
        box.style.width = "255px";
        box.style.height = "100vh";
        box.style.margin = "0";
        box.style.justifyContent = "flex-start";
      }
      var menu = document.querySelector(".group_1");
      if (menu) {
        menu.style.height = "100vh";
      }
      var page = document.querySelector(".page");
      if (page) {
        page.style.width = "255px";
        page.style.height = "100vh";
        page.style.background = "transparent";
      }
      document.documentElement.style.background = "transparent";
      document.body.style.background = "transparent";
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } catch (e) {}
  } else if (embedMode === "header") {
    try {
      var title = getEmbedTitle();
      var titleEl = document.querySelector("span.text_2");
      if (titleEl && title) titleEl.textContent = title;

      var bodyBox = document.querySelector(".box_7");
      if (bodyBox) bodyBox.style.display = "none";
      var page2 = document.querySelector(".page");
      if (page2) {
        page2.style.height = "63px";
        page2.style.overflow = "hidden";
        page2.style.background = "transparent";
      }
      document.documentElement.style.background = "transparent";
      document.body.style.background = "transparent";
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } catch (e) {}
  }

  // Avatar-side settings icon -> logout dropdown
  try {
    var avatar = document.querySelector("img.label_2");
    var settings = avatar && avatar.parentNode ? avatar.parentNode.querySelector("img.thumbnail_2") : null;
    $.mountLogoutMenu(settings);
  } catch (e) {}

  var state = {
    keywords: "",
    page: 1,
    reqSize: 10,
    pageSize: 10,
    total: 0,
    totalPages: 1,
    orderStatus: "0",
  };
  var templateCache = null;
  var refundReasonCache = null;
  var refundReasonPromise = null;

  function ensureStatusStyles() {
    var id = "picaiOrdersStatusStyle";
    if (document.getElementById(id)) return;
    var style = document.createElement("style");
    style.id = id;
    style.textContent =
      "" +
      ".picai-status-badges{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}" +
      ".picai-status-badge{display:inline-flex;align-items:center;justify-content:center;padding:4px 8px;border-radius:999px;font-size:12px;line-height:12px;font-weight:600;border:1px solid transparent;white-space:nowrap}" +
      ".picai-status-badge--os0{color:#92400e;background:rgba(245,158,11,0.16);border-color:rgba(245,158,11,0.35)}" +
      ".picai-status-badge--os1{color:#166534;background:rgba(34,197,94,0.16);border-color:rgba(34,197,94,0.35)}" +
      ".picai-status-badge--os2{color:#991b1b;background:rgba(239,68,68,0.14);border-color:rgba(239,68,68,0.32)}" +
      ".picai-status-badge--os3{color:#334155;background:rgba(148,163,184,0.22);border-color:rgba(148,163,184,0.35)}" +
      ".picai-status-badge--os4{color:#6b21a8;background:rgba(168,85,247,0.16);border-color:rgba(168,85,247,0.32)}" +
      ".picai-status-badge--os8{color:#6b21a8;background:rgba(168,85,247,0.16);border-color:rgba(168,85,247,0.32)}" +
      ".picai-status-badge--ps0{color:#991b1b;background:rgba(239,68,68,0.14);border-color:rgba(239,68,68,0.32)}" +
      ".picai-status-badge--ps1{color:#1e3a8a;background:rgba(59,130,246,0.16);border-color:rgba(59,130,246,0.32)}" +
      ".picai-status-badge--ps2{color:#166534;background:rgba(34,197,94,0.16);border-color:rgba(34,197,94,0.35)}" +
      ".picai-status-badge--ps6{color:#92400e;background:rgba(245,158,11,0.16);border-color:rgba(245,158,11,0.35)}" +
      ".picai-status-badge--ps4{color:#6b21a8;background:rgba(168,85,247,0.16);border-color:rgba(168,85,247,0.32)}" +
      ".picai-status-badge--ss0{color:#334155;background:rgba(148,163,184,0.22);border-color:rgba(148,163,184,0.35)}" +
      ".picai-status-badge--ss1{color:#1e3a8a;background:rgba(59,130,246,0.16);border-color:rgba(59,130,246,0.32)}" +
      ".picai-status-badge--ss2{color:#991b1b;background:rgba(239,68,68,0.14);border-color:rgba(239,68,68,0.32)}" +
      ".picai-status-badge--ss3{color:#92400e;background:rgba(245,158,11,0.16);border-color:rgba(245,158,11,0.35)}" +
      ".picai-status-badge--ss444{color:#991b1b;background:rgba(239,68,68,0.14);border-color:rgba(239,68,68,0.32)}";
    document.head.appendChild(style);
  }

  function makeBadge(text, cls, title) {
    var s = document.createElement("span");
    s.className = "picai-status-badge " + (cls || "");
    s.textContent = text || "";
    if (title) s.title = String(title);
    return s;
  }

  function renderStatusBadges(host, order) {
    if (!host) return;
    ensureStatusStyles();

    var os = String((order && order.order_status) != null ? order.order_status : "");
    var ps = String((order && order.pay_status) != null ? order.pay_status : "");
    var ss = String((order && order.shipping_status) != null ? order.shipping_status : "");

    var orderMap = {
      "0": "\u672a\u786e\u8ba4",
      "1": "\u5df2\u786e\u8ba4",
      "2": "\u5df2\u53d6\u6d88",
      "3": "\u65e0\u6548",
      "4": "\u9000\u8d27",
      "8": "\u4ec5\u9000\u6b3e",
    };
    var payMap = {
      "0": "\u672a\u4ed8\u6b3e",
      "1": "\u5df2\u4ed8\u6b3e\u4e2d",
      "2": "\u5df2\u4ed8\u6b3e",
      "6": "\u9000\u6b3e\u7533\u8bf7\u4e2d",
      "4": "\u5df2\u9000\u6b3e",
    };
    var shipMap = {
      "0": "\u672a\u53d1\u8d27",
      "1": "\u5df2\u53d1\u8d27",
      "2": "\u5df2\u53d6\u6d88",
      "3": "\u5907\u8d27\u4e2d",
      "444": "\u83b7\u53d6\u7269\u6d41\u5355\u53f7\u5931\u8d25",
    };

    host.textContent = "";
    host.classList.add("picai-status-badges");

    if (Object.prototype.hasOwnProperty.call(orderMap, os))
      host.appendChild(makeBadge(orderMap[os], "picai-status-badge--os" + os, "\u8ba2\u5355\u72b6\u6001"));
    if (Object.prototype.hasOwnProperty.call(payMap, ps))
      host.appendChild(makeBadge(payMap[ps], "picai-status-badge--ps" + ps, "\u652f\u4ed8\u72b6\u6001"));
    if (Object.prototype.hasOwnProperty.call(shipMap, ss))
      host.appendChild(makeBadge(shipMap[ss], "picai-status-badge--ss" + ss, "\u7269\u6d41\u72b6\u6001"));

    // Fallback: if any code is missing, keep existing combined status text.
    if (!host.childNodes || host.childNodes.length === 0) {
      host.innerHTML = $.statusText(order).replace(/  /g, "&nbsp;&nbsp;");
      host.classList.remove("picai-status-badges");
    }
  }

  function ensureLogisticsModal() {
    var existing = document.getElementById("picaiLogisticsModal");
    if (existing) return existing;

    var styleId = "picaiLogisticsModalStyle";
    if (!document.getElementById(styleId)) {
      var style = document.createElement("style");
      style.id = styleId;
      style.textContent =
        "" +
        ".picai-logistics-modal{background-color:rgba(0,0,0,0.6);position:fixed;left:0;top:0;right:0;bottom:0;z-index:9999;display:none}" +
        ".picai-logistics-modal .group_13{background-color:rgba(255,255,255,1);border-radius:16px;width:min(595px,calc(100vw - 48px));height:min(1032px,calc(100vh - 48px));position:fixed;top:24px;right:24px;overflow:hidden;box-sizing:border-box}" +
        ".picai-logistics-modal .box_13{width:547px;height:24px;margin:25px 0 0 24px}" +
        ".picai-logistics-modal .text_59{width:72px;height:15px;overflow-wrap:break-word;color:rgba(24,31,39,1);font-size:18px;font-family:PingFang HK-Semibold;font-weight:600;text-align:left;white-space:nowrap;line-height:18px;margin-top:7px}" +
        ".picai-logistics-modal .label_6{width:24px;height:24px;cursor:pointer}" +
        ".picai-logistics-modal .group_15{background-color:rgba(249,250,252,1);border-radius:10px;width:547px;height:132px;border:1px solid rgba(241,245,249,1);margin:22px 0 0 24px}" +
        ".picai-logistics-modal .image_7{width:100px;height:100px;margin:16px 0 0 16px;object-fit:cover;border-radius:10px;background:#f2f3f7}" +
        ".picai-logistics-modal .text-wrapper_46{width:386px;height:60px;margin:28px 29px 0 16px}" +
        ".picai-logistics-modal .text_60{width:42px;height:12px;overflow-wrap:break-word;color:rgba(0,0,0,1);font-size:14px;font-family:PingFang HK-Semibold;font-weight:600;text-align:left;white-space:nowrap;line-height:14px}" +
        ".picai-logistics-modal .text_61{width:386px;height:32px;overflow-wrap:break-word;color:rgba(84,98,116,1);font-size:14px;font-family:PingFang HK-Regular;font-weight:400;text-align:left;margin-top:16px}" +
        ".picai-logistics-modal .group_16{height:40px;width:390px;margin:34px 0 0 24px}" +
        ".picai-logistics-modal .box_14{width:206px;height:14px}" +
        ".picai-logistics-modal .box_4{background-color:rgba(228,229,235,1);border-radius:50%;width:14px;height:14px}" +
        ".picai-logistics-modal .text_62{width:42px;height:10px;overflow-wrap:break-word;color:rgba(232,69,122,1);font-size:14px;font-family:Camphor Pro-Bold;font-weight:700;text-align:left;white-space:nowrap;line-height:14px;margin:2px 0 0 12px}" +
        ".picai-logistics-modal .text_63{width:130px;height:10px;overflow-wrap:break-word;color:rgba(232,69,122,1);font-size:14px;font-family:Camphor Pro-Regular;font-weight:400;text-align:left;white-space:nowrap;line-height:14px;margin:2px 0 0 8px}" +
        ".picai-logistics-modal .text-wrapper_47{width:364px;height:12px;margin:14px 0 0 26px}" +
        ".picai-logistics-modal .text_64{width:364px;height:12px;overflow-wrap:break-word;color:rgba(84,98,116,1);font-size:14px;font-family:PingFang HK-Regular;font-weight:400;text-align:left;white-space:nowrap;line-height:14px}" +
        ".picai-logistics-modal .box_15{width:156px;height:14px;margin:40px 0 0 24px}" +
        ".picai-logistics-modal .group_18{background-color:rgba(228,229,235,1);border-radius:50%;width:14px;height:14px}" +
        ".picai-logistics-modal .text_65{width:130px;height:10px;overflow-wrap:break-word;color:rgba(84,98,116,1);font-size:14px;font-family:Camphor Pro-Regular;font-weight:400;text-align:left;white-space:nowrap;line-height:14px;margin-top:2px}" +
        ".picai-logistics-modal .text_66{width:406px;height:12px;overflow-wrap:break-word;color:rgba(84,98,116,1);font-size:14px;font-family:PingFang HK-Regular;font-weight:400;text-align:left;white-space:nowrap;line-height:14px;margin:14px 0 0 50px}" +
        ".picai-logistics-modal .box_16{width:238px;height:14px;margin:40px 0 0 24px}" +
        ".picai-logistics-modal .section_5{background-color:rgba(228,229,235,1);border-radius:50%;width:14px;height:14px}" +
        ".picai-logistics-modal .text_67{width:70px;height:10px;overflow-wrap:break-word;color:rgba(24,31,39,1);font-size:14px;font-family:Camphor Pro-Bold;font-weight:700;text-align:left;white-space:nowrap;line-height:14px;margin:2px 0 0 12px}" +
        ".picai-logistics-modal .text_68{width:130px;height:10px;overflow-wrap:break-word;color:rgba(84,98,116,1);font-size:14px;font-family:Camphor Pro-Regular;font-weight:400;text-align:left;white-space:nowrap;line-height:14px;margin:2px 0 0 12px}" +
        ".picai-logistics-modal .text_69{width:56px;height:12px;overflow-wrap:break-word;color:rgba(84,98,116,1);font-size:14px;font-family:PingFang HK-Regular;font-weight:400;text-align:left;white-space:nowrap;line-height:14px;margin:14px 0 0 50px}" +
        ".picai-logistics-modal .box_17{width:210px;height:14px;margin:40px 0 0 24px}" +
        ".picai-logistics-modal .section_6{background-color:rgba(228,229,235,1);border-radius:50%;width:14px;height:14px}" +
        ".picai-logistics-modal .text_70{width:42px;height:10px;overflow-wrap:break-word;color:rgba(24,31,39,1);font-size:14px;font-family:Camphor Pro-Bold;font-weight:700;text-align:left;white-space:nowrap;line-height:14px;margin:2px 0 0 12px}" +
        ".picai-logistics-modal .text_71{width:130px;height:10px;overflow-wrap:break-word;color:rgba(84,98,116,1);font-size:14px;font-family:Camphor Pro-Regular;font-weight:400;text-align:left;white-space:nowrap;line-height:14px;margin:2px 0 0 12px}" +
        ".picai-logistics-modal .text_72{width:70px;height:12px;overflow-wrap:break-word;color:rgba(84,98,116,1);font-size:14px;font-family:PingFang HK-Regular;font-weight:400;text-align:left;white-space:nowrap;line-height:14px;margin:14px 0 0 50px}" +
        ".picai-logistics-modal .picai-logistics-body{flex:1;min-height:0;overflow:auto;padding-bottom:24px}" +
        ".picai-logistics-modal .picai-logistics-body::-webkit-scrollbar{width:10px}" +
        ".picai-logistics-modal .picai-logistics-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.12);border-radius:10px}" +
        ".picai-logistics-modal .picai-trace-meta{margin:16px 24px 0 24px;color:rgba(84,98,116,1);font-size:12px;line-height:16px}" +
        ".picai-logistics-modal .picai-trace-list{margin:6px 0 0 0}" +
        ".picai-logistics-modal .picai-trace-item{position:relative;margin:16px 24px 0 24px;padding-left:26px}" +
        ".picai-logistics-modal .picai-trace-item:before{content:'';position:absolute;left:4px;top:4px;width:12px;height:12px;border-radius:50%;background:rgba(228,229,235,1)}" +
        ".picai-logistics-modal .picai-trace-item:after{content:'';position:absolute;left:9px;top:18px;bottom:-18px;width:2px;background:rgba(228,229,235,1)}" +
        ".picai-logistics-modal .picai-trace-item:last-child:after{display:none}" +
        ".picai-logistics-modal .picai-trace-item--first:before{background:rgba(232,69,122,1)}" +
        ".picai-logistics-modal .picai-trace-time{font-size:12px;color:rgba(84,98,116,1);line-height:16px}" +
        ".picai-logistics-modal .picai-trace-desc{margin-top:6px;font-size:14px;color:rgba(24,31,39,1);line-height:18px;white-space:pre-wrap;word-break:break-word}" +
        ".picai-logistics-modal .picai-sig-link{margin-left:8px;color:rgba(22,93,255,1);text-decoration:none;border:1px solid rgba(22,93,255,0.35);padding:1px 8px;border-radius:999px;font-size:12px;line-height:16px;display:inline-flex;align-items:center}" +
        ".picai-logistics-modal .picai-sig-link:hover{background:rgba(22,93,255,0.08)}" +
        ".picai-logistics-modal .picai-trace-empty{margin:18px 24px 0 24px;color:rgba(84,98,116,1);font-size:14px}" +
        "";
      document.head.appendChild(style);
    }

    var modal = document.createElement("div");
    modal.id = "picaiLogisticsModal";
    modal.className = "picai-logistics-modal";
    var html =
      "" +
      '<div class="group_13 flex-col" role="dialog" aria-modal="true" aria-label="物流轨迹">' +
      '<div class="picai-logistics-body flex-col">' +
      '<div class="box_13 flex-row justify-between">' +
      '<span class="text_59">物流轨迹</span>' +
      '<img class="label_6" referrerpolicy="no-referrer" alt="关闭" src="/yuanxing/logistics/img/FigmaDDSSlicePNG83845c56d9a5320910ccec8464588812.png" />' +
      "</div>" +
      '<div class="group_15 flex-row">' +
      '<img class="image_7" referrerpolicy="no-referrer" src="/yuanxing/logistics/img/FigmaDDSSlicePNGe33031e4a75f9f9945ab51617c57703c.png" />' +
      '<div class="text-wrapper_46 flex-col justify-between">' +
      '<span class="text_60">运输中</span>' +
      '<span class="text_61"></span>' +
      "</div>" +
      "</div>" +
      '<div class="picai-trace-meta" id="picaiTraceMeta"></div>' +
      '<div class="picai-trace-list" id="picaiTraceList"></div>' +
      "</div>" +
      "</div>";
    modal.innerHTML = $.fixHtmlPaths ? $.fixHtmlPaths(html) : html;

    modal.addEventListener("click", function () {
      hideLogisticsModal();
    });
    var panel = modal.querySelector(".group_13");
    if (panel) {
      panel.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }
    var closeBtn = modal.querySelector(".label_6");
    if (closeBtn) {
      closeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        hideLogisticsModal();
      });
    }
    document.body.appendChild(modal);
    return modal;
  }

  function hideLogisticsModal() {
    var modal = document.getElementById("picaiLogisticsModal");
    if (!modal) return;
    modal.style.display = "none";
    document.body.style.overflow = "";
  }

  function showLogisticsModal(order, goods) {
    var modal = ensureLogisticsModal();

    var name = "";
    if (goods && goods.goods_name) name = goods.goods_name;
    else if (order && order.order_goods && order.order_goods[0] && order.order_goods[0].goods_name) name = order.order_goods[0].goods_name;

    var imgUrl =
      (goods && (goods.goods_image || goods.goods_thumb)) ||
      (order && order.order_goods && order.order_goods[0] && (order.order_goods[0].goods_image || order.order_goods[0].goods_thumb)) ||
      "";

    var timeText = (order && (order.format_order_time || order.format_add_time)) || "";

    var nameEl = modal.querySelector(".text_61");
    if (nameEl) nameEl.textContent = name ? String(name) : "—";
    var imgEl = modal.querySelector("img.image_7");
    if (imgEl && imgUrl) imgEl.src = imgUrl;

    var metaEl = modal.querySelector("#picaiTraceMeta");
    var listEl = modal.querySelector("#picaiTraceList");
    if (metaEl) metaEl.textContent = "";
    if (listEl) listEl.innerHTML = '<div class="picai-trace-empty">加载中…</div>';

    modal.style.display = "block";
    document.body.style.overflow = "hidden";

    (async function () {
      try {
        if (!order || !order.order_id) {
          if (listEl) listEl.innerHTML = '<div class="picai-trace-empty">缺少订单ID</div>';
          return;
        }
        var resp = await $.apiPost(
          "/api/wholesales/orders.php?action=get_logistics_trace",
          $.withAuth({ order_id: String(order.order_id) })
        );
        if (String(resp.code) === "2") {
          $.clearAuth();
          showMsg("登录已失效，请重新登录", { autoCloseMs: 1200 });
          location.replace($.toUrl ? $.toUrl("/login.html") : "/login.html");
          return;
        }
        if (String(resp.code) !== "0") {
          if (listEl) listEl.innerHTML = '<div class="picai-trace-empty">' + String((resp && resp.msg) || "获取物流失败") + "</div>";
          return;
        }

        var data = (resp && resp.data) || {};
        var billCode = data.billCode || data.bill_code || "";
        if (metaEl) metaEl.textContent = billCode ? "物流单号：" + String(billCode) : "";

        var details = data.details || [];
        if (!Array.isArray(details) || details.length === 0) {
          if (listEl) listEl.innerHTML = '<div class="picai-trace-empty">暂无物流信息</div>';
          return;
        }

        if (listEl) listEl.innerHTML = "";
        details.forEach(function (it, idx) {
          var time = (it && (it.scanTime || it.scan_time || it.time)) || "";
          var desc = (it && (it.desc || it.description || it.context)) || "";
          var sigPicUrl =
            (it &&
              (it.electronicSignaturePicUrl ||
                it.electronic_signature_pic_url ||
                it.sigPicUrl ||
                it.sig_pic_url)) ||
            "";

          var row = document.createElement("div");
          row.className = "picai-trace-item" + (idx === 0 ? " picai-trace-item--first" : "");

          var t = document.createElement("div");
          t.className = "picai-trace-time";
          t.textContent = String(time || timeText || "");

          var d = document.createElement("div");
          d.className = "picai-trace-desc";
          d.textContent = String(desc || "");

          // If the API provides a signature picture URL, append a "查看" link after the time.
          // (details is an array; each element may contain sigPicUrl)
          try {
            var u = String(sigPicUrl || "").trim();
            if (u && !/^javascript:/i.test(u)) {
              // Allow relative URLs by resolving against current page.
              try {
                u = String(new URL(u, location.href));
              } catch (e) {}
              var a = document.createElement("a");
              a.className = "picai-sig-link";
              a.textContent = "查看";
              a.href = u;
              a.target = "_blank";
              a.rel = "noopener noreferrer";
              t.appendChild(document.createTextNode(" "));
              t.appendChild(a);
            }
          } catch (e) {}

          row.appendChild(t);
          row.appendChild(d);
          listEl.appendChild(row);
        });
      } catch (e) {
        if (listEl) listEl.innerHTML = '<div class="picai-trace-empty">网络错误</div>';
      }
    })();
  }

  function extractMoneyValue(value) {
    if (value == null) return "";
    var str = String(value).trim();
    if (!str) return "";
    var match = str.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    return match ? match[0] : "";
  }

  function getOrderRefundAmount(order) {
    var raw = "";
    if (order && order.total_fee != null && order.total_fee !== "") raw = String(order.total_fee);
    else if (order && order.operate_amount != null && order.operate_amount !== "") raw = String(order.operate_amount);

    var formatted = "";
    if (order && order.format_total_fee) formatted = String(order.format_total_fee);
    else if (order && order.format_operate_amount) formatted = String(order.format_operate_amount);

    var display = formatted || (raw ? ($.formatMoneyMXN ? $.formatMoneyMXN(raw, { fallback: raw }) : raw) : "--");
    var value = raw || extractMoneyValue(formatted);
    return { display: display || "--", value: value || "" };
  }

  function normalizeReasonItem(item, idx) {
    if (item == null) return null;
    if (typeof item === "string" || typeof item === "number") {
      var s = String(item);
      return { value: s, label: s };
    }
    if (typeof item === "object") {
      var value =
        item.value != null
          ? item.value
          : item.id != null
          ? item.id
          : item.reason_id != null
          ? item.reason_id
          : item.refund_reason != null
          ? item.refund_reason
          : item.reason != null
          ? item.reason
          : item.key;
      var label =
        item.label != null
          ? item.label
          : item.title != null
          ? item.title
          : item.name != null
          ? item.name
          : item.reason_desc != null
          ? item.reason_desc
          : item.desc != null
          ? item.desc
          : item.refund_desc != null
          ? item.refund_desc
          : item.reason;
      if (value == null && label != null) value = label;
      if (label == null && value != null) label = value;
      if (value == null && label == null) {
        var keys = Object.keys(item);
        if (keys.length) {
          value = item[keys[0]];
          label = item[keys[0]];
        }
      }
      if (value == null && label == null) return null;
      return { value: String(value), label: String(label) };
    }
    return null;
  }

  function normalizeReasonList(data) {
    if (!data) return [];
    var list = data;
    if (!Array.isArray(list) && typeof list === "object") {
      if (Array.isArray(list.list)) list = list.list;
      else if (Array.isArray(list.lists)) list = list.lists;
      else if (Array.isArray(list.data)) list = list.data;
      else if (Array.isArray(list.reason)) list = list.reason;
      else if (Array.isArray(list.reasons)) list = list.reasons;
      else if (Array.isArray(list.items)) list = list.items;
      else list = Object.keys(list).map(function (k) {
        return { value: k, label: list[k] };
      });
    }
    if (!Array.isArray(list)) return [];
    var out = [];
    list.forEach(function (item, idx) {
      var n = normalizeReasonItem(item, idx);
      if (n) out.push(n);
    });
    return out;
  }

  function isOtherReason(value, label) {
    var text = (label || value || "").toString().toLowerCase();
    if (!text) return false;
    return text.indexOf("\u5176\u4ed6") >= 0 || text.indexOf("other") >= 0;
  }

  async function fetchRefundReasons() {
    if (refundReasonCache && refundReasonCache.length) return refundReasonCache;
    if (refundReasonPromise) return refundReasonPromise;
    refundReasonPromise = (async function () {
      var resp = await $.apiPost("/api/wholesales/refund.php?action=reason", $.withAuth({}));
      if (String(resp && resp.code) === "2") {
        $.clearAuth();
        showMsg("\u767b\u5f55\u5df2\u5931\u6548\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55", { autoCloseMs: 1200 });
        location.replace($.toUrl ? $.toUrl("/login.html") : "/login.html");
        return [];
      }
      if (String(resp && resp.code) !== "0") {
        throw new Error((resp && resp.msg) || "\u83b7\u53d6\u9000\u6b3e\u7406\u7531\u5931\u8d25");
      }
      var list = normalizeReasonList(resp && resp.data);
      refundReasonCache = list;
      return list;
    })();
    try {
      return await refundReasonPromise;
    } finally {
      refundReasonPromise = null;
    }
  }

  function ensureRefundModal() {
    var existing = document.getElementById("picaiRefundModal");
    if (existing) return existing;

    var styleId = "picaiRefundModalStyle";
    if (!document.getElementById(styleId)) {
      var style = document.createElement("style");
      style.id = styleId;
      style.textContent =
        "" +
        ".picai-refund-modal{position:fixed;inset:0;background:rgba(15,23,42,0.55);z-index:10003;display:none;align-items:center;justify-content:center;padding:24px}" +
        ".picai-refund-panel{width:min(520px,92vw);background:#fff;border-radius:16px;border:1px solid rgba(15,23,42,0.08);box-shadow:0 24px 80px rgba(15,23,42,0.28);display:flex;flex-direction:column;max-height:90vh}" +
        ".picai-refund-header{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 8px 18px}" +
        ".picai-refund-title{font-size:16px;font-weight:700;color:#0f172a}" +
        ".picai-refund-close{border:0;background:transparent;font-size:20px;line-height:20px;cursor:pointer;color:#64748b}" +
        ".picai-refund-body{padding:0 18px 16px 18px;overflow:auto}" +
        ".picai-refund-tip{font-size:13px;color:#475569;margin-bottom:12px}" +
        ".picai-refund-info{background:rgba(248,250,252,1);border:1px solid rgba(226,232,240,1);border-radius:12px;padding:10px 12px;display:grid;grid-template-columns:auto 1fr;row-gap:6px;column-gap:8px;margin-bottom:14px;font-size:13px;color:#0f172a}" +
        ".picai-refund-info .label{color:#64748b}" +
        ".picai-refund-label{display:block;font-size:13px;color:#0f172a;margin:10px 0 6px 0;font-weight:600}" +
        ".picai-refund-select,.picai-refund-textarea{width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(148,163,184,0.6);padding:10px 12px;font-size:13px;font-family:inherit;outline:none}" +
        ".picai-refund-select:focus,.picai-refund-textarea:focus{border-color:#3b83f6;box-shadow:0 0 0 3px rgba(59,131,246,0.15)}" +
        ".picai-refund-textarea{min-height:80px;resize:vertical}" +
        ".picai-refund-hint{font-size:12px;color:#64748b;margin-top:6px}" +
        ".picai-refund-error{font-size:12px;color:#e11d48;margin-top:6px;min-height:16px}" +
        ".picai-refund-actions{display:flex;justify-content:flex-end;gap:10px;padding:0 18px 16px 18px}" +
        ".picai-refund-actions button{border-radius:10px;padding:10px 14px;font-size:13px;cursor:pointer}" +
        ".picai-refund-cancel{border:1px solid rgba(148,163,184,0.6);background:#fff;color:#0f172a}" +
        ".picai-refund-submit{border:0;background:#e8457a;color:#fff;box-shadow:0 10px 24px rgba(232,69,122,0.24)}" +
        ".picai-refund-submit[disabled]{opacity:0.6;cursor:default;box-shadow:none}" +
        "";
      document.head.appendChild(style);
    }

    var modal = document.createElement("div");
    modal.id = "picaiRefundModal";
    modal.className = "picai-refund-modal";
    modal.innerHTML =
      "" +
      '<div class="picai-refund-panel" role="dialog" aria-modal="true" aria-label="申请退款">' +
      '<div class="picai-refund-header">' +
      '<div class="picai-refund-title">申请退款</div>' +
      '<button type="button" class="picai-refund-close" aria-label="关闭">×</button>' +
      "</div>" +
      '<div class="picai-refund-body">' +
      '<div class="picai-refund-tip">请确认是否对该订单申请退款。</div>' +
      '<div class="picai-refund-info">' +
      '<span class="label">订单号</span><span id="picaiRefundOrderSn">--</span>' +
      '<span class="label">订单金额</span><span id="picaiRefundAmount">--</span>' +
      "</div>" +
      '<label class="picai-refund-label" for="picaiRefundReason">退款理由</label>' +
      '<select class="picai-refund-select" id="picaiRefundReason"></select>' +
      '<label class="picai-refund-label" for="picaiRefundDesc">退款说明 / 备注</label>' +
      '<textarea class="picai-refund-textarea" id="picaiRefundDesc" placeholder="请输入退款说明"></textarea>' +
      '<div class="picai-refund-hint" id="picaiRefundDescHint"></div>' +
      '<div class="picai-refund-error" id="picaiRefundError"></div>' +
      "</div>" +
      '<div class="picai-refund-actions">' +
      '<button type="button" class="picai-refund-cancel">取消</button>' +
      '<button type="button" class="picai-refund-submit">确认退款</button>' +
      "</div>" +
      "</div>";

    modal.addEventListener("click", function () {
      hideRefundModal();
    });
    var panel = modal.querySelector(".picai-refund-panel");
    if (panel) {
      panel.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }

    var closeBtn = modal.querySelector(".picai-refund-close");
    var cancelBtn = modal.querySelector(".picai-refund-cancel");
    if (closeBtn) closeBtn.addEventListener("click", hideRefundModal);
    if (cancelBtn) cancelBtn.addEventListener("click", hideRefundModal);

    document.body.appendChild(modal);
    return modal;
  }

  function hideRefundModal() {
    var modal = document.getElementById("picaiRefundModal");
    if (!modal) return;
    modal.style.display = "none";
    document.body.style.overflow = "";
  }

  function setRefundError(msg) {
    var el = document.getElementById("picaiRefundError");
    if (el) el.textContent = msg || "";
  }

  function updateRefundDescHint() {
    var select = document.getElementById("picaiRefundReason");
    var hint = document.getElementById("picaiRefundDescHint");
    if (!select || !hint) return;
    var option = select.options[select.selectedIndex];
    var label = option ? option.textContent : "";
    var other = isOtherReason(select.value, label);
    hint.textContent = other ? "选择“其他”时需填写退款说明。" : "选择“其他”时为必填，其他为选填。";
  }

  function populateRefundReasons(select, list) {
    if (!select) return;
    select.innerHTML = "";
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = list && list.length ? "请选择退款理由" : "暂无退款理由";
    select.appendChild(placeholder);
    (list || []).forEach(function (item) {
      var opt = document.createElement("option");
      opt.value = item.value;
      opt.textContent = item.label;
      select.appendChild(opt);
    });
  }

  function showRefundModal(order) {
    var modal = ensureRefundModal();
    modal._order = order || {};
    var snEl = modal.querySelector("#picaiRefundOrderSn");
    var amountEl = modal.querySelector("#picaiRefundAmount");
    var reasonEl = modal.querySelector("#picaiRefundReason");
    var descEl = modal.querySelector("#picaiRefundDesc");
    var submitBtn = modal.querySelector(".picai-refund-submit");

    var sn = order && order.order_sn ? String(order.order_sn) : "";
    if (snEl) snEl.textContent = sn || "--";

    var amountInfo = getOrderRefundAmount(order || {});
    modal._refundAmountValue = amountInfo.value || "";
    if (amountEl) amountEl.textContent = amountInfo.display || "--";

    if (descEl) descEl.value = "";
    setRefundError("");

    if (reasonEl) {
      reasonEl.disabled = true;
      reasonEl.innerHTML = '<option value="">加载中...</option>';
    }

    updateRefundDescHint();

    if (reasonEl && !reasonEl._picaiBound) {
      reasonEl.addEventListener("change", function () {
        updateRefundDescHint();
        setRefundError("");
      });
      reasonEl._picaiBound = true;
    }

    if (descEl && !descEl._picaiBound) {
      descEl.addEventListener("input", function () {
        setRefundError("");
      });
      descEl._picaiBound = true;
    }

    if (submitBtn && !submitBtn._picaiBound) {
      submitBtn.addEventListener("click", function () {
        (async function () {
          var orderData = modal._order || {};
          var reasonSelect = modal.querySelector("#picaiRefundReason");
          var descInput = modal.querySelector("#picaiRefundDesc");
          var reasonValue = reasonSelect ? String(reasonSelect.value || "") : "";
          var reasonLabel = "";
          if (reasonSelect && reasonSelect.selectedIndex >= 0) {
            var opt = reasonSelect.options[reasonSelect.selectedIndex];
            reasonLabel = opt ? opt.textContent : "";
          }
          var desc = descInput ? String(descInput.value || "").trim() : "";

          if (!orderData || !orderData.order_id) {
            setRefundError("缺少订单ID");
            return;
          }
          if (!reasonValue) {
            setRefundError("请选择退款理由");
            return;
          }
          if (isOtherReason(reasonValue, reasonLabel) && !desc) {
            setRefundError("选择“其他”时请填写退款说明");
            return;
          }
          var refundAmount = modal._refundAmountValue || "";
          if (!refundAmount) {
            setRefundError("无法获取退款金额");
            return;
          }

          submitBtn.disabled = true;
          var originalText = submitBtn.textContent;
          submitBtn.textContent = "提交中...";
          try {
            var resp = await $.apiPost(
              "/api/wholesales/refund.php?action=apply",
              $.withAuth({
                order_id: String(orderData.order_id),
                refund_reason: reasonValue,
                refund_amount: refundAmount,
                refund_desc: desc,
              })
            );
            if (String(resp && resp.code) === "2") {
              $.clearAuth();
              showMsg("登录已失效，请重新登录", { autoCloseMs: 1200 });
              location.replace($.toUrl ? $.toUrl("/login.html") : "/login.html");
              return;
            }
            if (String(resp && resp.code) === "0") {
              hideRefundModal();
              showMsg((resp && resp.msg) || "退款申请已提交", { autoCloseMs: 2000 });
              try {
                load();
              } catch (e) {}
              refreshBalance();
            } else {
              setRefundError((resp && resp.msg) || "退款申请失败");
            }
          } catch (e) {
            setRefundError("网络错误，请稍后重试");
          } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText || "确认退款";
          }
        })();
      });
      submitBtn._picaiBound = true;
    }

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    (async function () {
      try {
        var list = await fetchRefundReasons();
        populateRefundReasons(reasonEl, list);
        if (reasonEl) reasonEl.disabled = false;
        updateRefundDescHint();
      } catch (e) {
        populateRefundReasons(reasonEl, []);
        if (reasonEl) reasonEl.disabled = true;
        setRefundError((e && e.message) || "退款理由加载失败");
      }
    })();
  }

  function findOrdersArea() {
    return document.querySelector(".section_6");
  }

  function parseTemplates(area) {
    if (!area) return null;
    if (templateCache && templateCache.header && templateCache.item) {
      return {
        title: area.querySelector(".text_15"),
        header: templateCache.header.cloneNode(true),
        item: templateCache.item.cloneNode(true),
      };
    }
    var header = area.querySelector(".group_3");
    var item = area.querySelector(".group_4");
    if (!header || !item) return null;
    templateCache = {
      header: header.cloneNode(true),
      item: item.cloneNode(true),
    };
    return { title: area.querySelector(".text_15"), header: templateCache.header.cloneNode(true), item: templateCache.item.cloneNode(true) };
  }

  function clearArea(area, keepTitle) {
    if (!area) return;
    var kids = Array.prototype.slice.call(area.children);
    kids.forEach(function (k) {
      if (keepTitle && k === keepTitle) return;
      if (keepTitle && k.tagName === "SPAN" && k.className.indexOf("text_15") >= 0) return;
      area.removeChild(k);
    });
  }

  function ensureEmpty(area, titleEl, text) {
    if (!area) return;
    var existing = area.querySelector("#picaiOrdersEmpty");
    if (!existing) {
      existing = document.createElement("div");
      existing.id = "picaiOrdersEmpty";
      existing.style.width = "1601px";
      existing.style.height = "260px";
      existing.style.margin = "16px 0 0 0";
      existing.style.display = "flex";
      existing.style.alignItems = "center";
      existing.style.justifyContent = "center";
      existing.style.border = "1px dashed rgba(15,23,42,0.18)";
      existing.style.borderRadius = "16px";
      existing.style.background = "rgba(249,250,252,1)";
      existing.style.color = "rgba(84,98,116,1)";
      existing.style.fontSize = "14px";
      existing.style.letterSpacing = "0.2px";
      area.appendChild(existing);
    }
    existing.textContent = String(text || "暂时没有数据");
    if (titleEl && titleEl.parentNode !== area) area.insertBefore(titleEl, existing);
  }

  function removeEmpty(area) {
    if (!area) return;
    var existing = area.querySelector("#picaiOrdersEmpty");
    if (existing) existing.parentNode.removeChild(existing);
  }

  function ensurePaginationStyle() {
    var id = "picaiOrdersPaginationStyle";
    if (document.getElementById(id)) return;
    var style = document.createElement("style");
    style.id = id;
    style.textContent =
      "" +
      "#picaiOrdersPagination{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 16px 20px 16px}" +
      "#picaiOrdersPagination button{height:30px;min-width:30px;padding:0 10px;border:1px solid rgba(226,232,240,1);background:rgba(255,255,255,1);border-radius:8px;cursor:pointer;color:rgba(24,31,39,1)}" +
      "#picaiOrdersPagination button[disabled]{opacity:0.55;cursor:default}" +
      "#picaiOrdersPagination .picai-page-active{background:rgba(59,131,246,1);border-color:rgba(59,131,246,1);color:#fff}" +
      "#picaiOrdersPagination .picai-page-ellipsis{padding:0 6px;color:rgba(100,116,139,1)}";
    document.head.appendChild(style);
  }

  function ensurePagination(area) {
    if (!area) return null;
    var el = area.querySelector("#picaiOrdersPagination");
    if (el) return el;
    el = document.createElement("div");
    el.id = "picaiOrdersPagination";
    area.appendChild(el);
    return el;
  }

  function buildPageList(current, total) {
    current = parseInt(current, 10) || 1;
    total = parseInt(total, 10) || 1;
    if (total <= 1) return [1];

    var pages = [];
    function push(n) {
      if (pages.length && pages[pages.length - 1] === n) return;
      pages.push(n);
    }
    function pushEllipsis() {
      if (pages.length && pages[pages.length - 1] === "…") return;
      pages.push("…");
    }

    push(1);
    var start = Math.max(2, current - 2);
    var end = Math.min(total - 1, current + 2);
    if (start > 2) pushEllipsis();
    for (var i = start; i <= end; i++) push(i);
    if (end < total - 1) pushEllipsis();
    push(total);
    return pages;
  }

  function renderPagination(area) {
    ensurePaginationStyle();
    var bar = ensurePagination(area);
    if (!bar) return;

    var totalPages = parseInt(state.totalPages, 10) || 1;
    var page = parseInt(state.page, 10) || 1;
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    bar.style.display = "flex";
    bar.innerHTML = "";

    function makeBtn(label, targetPage, disabled, active) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      if (active) btn.className = "picai-page-active";
      btn.disabled = !!disabled;
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        state.page = targetPage;
        load();
      });
      return btn;
    }

    bar.appendChild(makeBtn("上一页", page - 1, page <= 1));

    buildPageList(page, totalPages).forEach(function (p) {
      if (p === "…") {
        var s = document.createElement("span");
        s.className = "picai-page-ellipsis";
        s.textContent = "…";
        bar.appendChild(s);
        return;
      }
      bar.appendChild(makeBtn(String(p), p, false, p === page));
    });

    bar.appendChild(makeBtn("下一页", page + 1, page >= totalPages));
  }

  function insertBeforePager(area, node) {
    if (!area || !node) return;
    var pager = area.querySelector("#picaiOrdersPagination");
    if (pager) area.insertBefore(node, pager);
    else area.appendChild(node);
  }

  function copyText(text) {
    return new Promise(function (resolve, reject) {
      try {
        if (!text) return reject(new Error("empty"));
        if (navigator.clipboard && window.isSecureContext && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(String(text))
            .then(resolve)
            .catch(function () {
              fallback();
            });
          return;
        }
        fallback();

        function fallback() {
          try {
            var ta = document.createElement("textarea");
            ta.value = String(text);
            ta.setAttribute("readonly", "readonly");
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            ta.style.top = "0";
            document.body.appendChild(ta);
            ta.select();
            ta.setSelectionRange(0, ta.value.length);
            var ok = document.execCommand("copy");
            document.body.removeChild(ta);
            if (!ok) return reject(new Error("copy_failed"));
            resolve();
          } catch (e) {
            reject(e);
          }
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  function setHeader(node, order) {
    var dateEl = node.querySelector("span.text_16") || node.querySelector("span");
    if (dateEl) {
      dateEl.textContent = order.format_order_time || order.format_add_time || "";
      dateEl.style.width = "170px";
      dateEl.style.overflow = "hidden";
      dateEl.style.textOverflow = "ellipsis";
      dateEl.style.whiteSpace = "nowrap";
      dateEl.style.flexShrink = "0";
    }
    var snEl = node.querySelector("span.text_17");
    var sn = (order && order.order_sn) ? String(order.order_sn) : "";
    if (snEl) snEl.textContent = "订单号：" + (order.order_sn || "");
    // Improve spacing and enable copy-by-icon.
    if (snEl) {
      snEl.textContent = "\u8ba2\u5355\u53f7\uFF1A" + sn;
      snEl.style.marginLeft = "16px";
      snEl.style.whiteSpace = "nowrap";
      snEl.style.overflow = "visible";
      snEl.style.textOverflow = "";
    }
    var copyEl = node.querySelector("img.thumbnail_5") || node.querySelector("img[class^='thumbnail_']");
    if (copyEl) {
      copyEl.style.cursor = "pointer";
      copyEl.title = "\u590d\u5236\u8ba2\u5355\u53f7";
      copyEl.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!sn) {
          if ($ && $.showModalMessage) $.showModalMessage("\u8ba2\u5355\u53f7\u4e3a\u7a7a\uFF0C\u65e0\u6cd5\u590d\u5236", { autoCloseMs: 1200 });
          return;
        }
        copyText(sn)
          .then(function () {
            if ($ && $.showModalMessage) $.showModalMessage("\u5df2\u590d\u5236\u8ba2\u5355\u53f7", { autoCloseMs: 900 });
          })
          .catch(function () {
            if ($ && $.showModalMessage) $.showModalMessage("\u590d\u5236\u5931\u8d25\uFF0C\u8bf7\u624b\u52a8\u590d\u5236", { autoCloseMs: 1200 });
          });
      });
    }
    var shopEl = node.querySelector("span.text_18");
    if (shopEl) shopEl.textContent = "批采订单";
    var statusEl = node.querySelector("span.text_19");
    if (statusEl) renderStatusBadges(statusEl, order || {});
    var extraEl = node.querySelector("span.text_20");
    if (extraEl) extraEl.textContent = "";

    var statusWrap = node.querySelector(".text-wrapper_7");
    if (statusWrap) {
      statusWrap.style.marginLeft = "auto";
      statusWrap.style.marginRight = "24px";
      statusWrap.style.width = "auto";
      statusWrap.style.minWidth = "0";
      statusWrap.style.flex = "1";
    }
    if (statusEl) {
      statusEl.style.overflow = "visible";
      statusEl.style.textOverflow = "";
      statusEl.style.whiteSpace = "normal";
    }
  }

  function setItem(node, order, g, showActions) {
    var img = node.querySelector("img.image_1") || node.querySelector("img");
    if (img && g.goods_image) img.src = g.goods_image;

    var name = node.querySelector("span.text_21") || node.querySelector("span");
    if (name) {
      var fullName = g.goods_name || "";
      name.textContent = fullName;
      name.title = fullName ? String(fullName) : "";
      name.style.overflow = "hidden";
      name.style.textOverflow = "ellipsis";
      name.style.whiteSpace = "nowrap";
    }
    var line2 = node.querySelector("span.text_22");
    if (line2) line2.textContent = "SKU:" + (g.goods_sn || "");
    var line3 = node.querySelector("span.text_23");
    if (line3) line3.textContent = "";

    var price = node.querySelector("span.text_25");
    if (price) {
      var rawPrice = g.goods_price || "";
      price.textContent = $.formatMoneyMXN ? $.formatMoneyMXN(rawPrice) : rawPrice;
    }
    var qty = node.querySelector("span.text_26");
    if (qty) qty.textContent = "×" + (g.goods_number || "1");

    var total = node.querySelector("span.text_27");
    if (total) {
      var formattedTotal = (order && (order.format_total_fee || order.format_operate_amount)) || "";
      var rawTotal =
        order && order.total_fee != null
          ? order.total_fee
          : order && order.operate_amount != null
          ? order.operate_amount
          : "";
      var orderTotal = formattedTotal
        ? String(formattedTotal)
        : rawTotal !== ""
        ? $.formatMoneyMXN
          ? $.formatMoneyMXN(rawTotal, { fallback: rawTotal })
          : String(rawTotal)
        : "";
      total.textContent = showActions ? orderTotal : "";
    }

    var existingActions = node.querySelector(".order-actions");
    if (existingActions && existingActions.parentNode) existingActions.parentNode.removeChild(existingActions);

    var cancel = node.querySelector("span.text_28");
    var track = node.querySelector("span.text_29");

    if (!showActions) {
      if (cancel && cancel.parentNode) cancel.parentNode.removeChild(cancel);
      if (track && track.parentNode) track.parentNode.removeChild(track);
      var viewOrderBtn = node.querySelector(".view-order-btn");
      if (viewOrderBtn && viewOrderBtn.parentNode) viewOrderBtn.parentNode.removeChild(viewOrderBtn);
      var payBtn = node.querySelector(".pay-now-btn");
      if (payBtn && payBtn.parentNode) payBtn.parentNode.removeChild(payBtn);
      var refundBtnEl = node.querySelector(".refund-btn");
      if (refundBtnEl && refundBtnEl.parentNode) refundBtnEl.parentNode.removeChild(refundBtnEl);
      return;
    }

    // Review status
    if (cancel) {
      var reviewStatus = String(order && order.review_status);
      cancel.textContent = reviewStatus === "1" ? "已审核" : "未审核";
      cancel.style.opacity = "1";
      cancel.style.cursor = "default";
      cancel.title = "";
    }

    // View logistics
    if (track) {
      var canTrack = String(order && order.shipping_status) === "1";
      if (!canTrack) {
        if (track.parentNode) track.parentNode.removeChild(track);
        track = null;
      } else {
        track.textContent = "查看物流";
        track.style.cursor = "pointer";
        track.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          showLogisticsModal(order || {}, g || {});
        });
      }
    }

    // View order
    var viewBtn = document.createElement("span");
    viewBtn.className = "view-order-btn";
    viewBtn.textContent = "查看订单";
    viewBtn.style.display = "block";
    viewBtn.style.cursor = "pointer";
    viewBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (!order || !order.order_id) {
        showMsg("缺少订单ID");
        return;
      }
      var baseUrl = $.toUrl ? $.toUrl("/yuanxing/lanhu_dingdanxiangqing/index.html") : "/yuanxing/lanhu_dingdanxiangqing/index.html";
      location.href = baseUrl + "?order_id=" + encodeURIComponent(String(order.order_id));
    });

    // Add "立即支付" when order_status==1 && pay_status==0 && review_status==1
    var shouldPay =
      String(order && order.order_status) === "1" &&
      String(order && order.pay_status) === "0" &&
      String(order && order.review_status) === "1";
    var payBtn = null;
    if (shouldPay) {
      payBtn = document.createElement("span");
      payBtn.className = "pay-now-btn";
      payBtn.textContent = "立即支付";
      payBtn.style.display = "block";
      payBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        (async function payOrder() {
          if (!order || !order.order_id) {
            showMsg("缺少订单ID");
            return;
          }
          var original = payBtn ? payBtn.textContent : "";
          if (payBtn) {
            payBtn.textContent = "支付中…";
            payBtn.style.pointerEvents = "none";
            payBtn.style.opacity = "0.75";
          }
          try {
            var resp = await $.apiPost(
              "/api/wholesales/orders.php?action=balance_payment",
              $.withAuth({ order_id: String(order.order_id) })
            );
            if (String(resp.code) === "2") {
              $.clearAuth();
              showMsg("登录已失效，请重新登录", { autoCloseMs: 1200 });
              location.replace($.toUrl ? $.toUrl("/login.html") : "/login.html");
              return;
            }
            if (String(resp.code) === "0") {
              showMsg((resp && resp.msg) || "支付成功", { autoCloseMs: 3000 });
              try {
                load();
              } catch (e) {}
              refreshBalance();
            } else {
              showMsg((resp && resp.msg) || "支付失败", { autoCloseMs: 3000 });
            }
          } finally {
            if (payBtn) {
              payBtn.textContent = original || "立即支付";
              payBtn.style.pointerEvents = "";
              payBtn.style.opacity = "";
            }
          }
        })();
      });
    }

    // Refund (api5.docx): 已确认(order_status=1) + 已付款(pay_status=2) + 未发货(shipping_status=0)
    var shouldRefund =
      String(order && order.order_status) === "1" &&
      String(order && order.pay_status) === "2" &&
      String(order && order.shipping_status) === "0";
    var refundBtn = null;
    if (shouldRefund) {
      refundBtn = document.createElement("span");
      refundBtn.className = "refund-btn";
      refundBtn.textContent = "\u9000\u6b3e";
      refundBtn.style.display = "block";
      refundBtn.style.cursor = "pointer";
      refundBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        showRefundModal(order || {});
      });
    }

    // Place actions into a grid container at the right side of the goods row.
    var actionsWrap = document.createElement("div");
    actionsWrap.className = "order-actions";
    if (cancel) {
      if (cancel.parentNode) cancel.parentNode.removeChild(cancel);
      actionsWrap.appendChild(cancel);
    }
    if (track) {
      if (track.parentNode) track.parentNode.removeChild(track);
      actionsWrap.appendChild(track);
    }
    actionsWrap.appendChild(viewBtn);
    if (payBtn) actionsWrap.appendChild(payBtn);
    if (refundBtn) actionsWrap.appendChild(refundBtn);
    node.appendChild(actionsWrap);
  }

  function setTabActive(tab, active) {
    if (!tab) return;
    tab.style.cursor = "pointer";
    tab.style.backgroundColor = active ? "rgba(59,131,246,1)" : "rgba(249,250,252,1)";
    tab.style.borderColor = active ? "rgba(59,131,246,1)" : "rgba(241,245,249,1)";
    tab.style.borderStyle = "solid";
    tab.style.borderWidth = "1px";
    var span = tab.querySelector("span");
    if (span) span.style.color = active ? "rgba(255,255,255,1)" : "rgba(100,116,139,1)";
  }

  function wireStatusTabs() {
    var area = document.querySelector(".section_5");
    if (!area) return;
    function getTabs() {
      return Array.prototype.slice.call(area.querySelectorAll("[data-order-status]"));
    }

    function ensureCurrent(tabs) {
      if (!tabs.length) return;
      var current = String(state.orderStatus || "");
      var hasCurrent = tabs.some(function (tab) {
        return String(tab.getAttribute("data-order-status") || "") === current;
      });
      if (!hasCurrent) {
        state.orderStatus = String(tabs[0].getAttribute("data-order-status") || "0");
      }
    }

    function setActive(status) {
      var activeStatus = String(status || "0");
      getTabs().forEach(function (tab) {
        var s = String(tab.getAttribute("data-order-status") || "");
        setTabActive(tab, s === activeStatus);
      });
    }

    function handleSelect(tab) {
      if (!tab) return;
      var nextStatus = String(tab.getAttribute("data-order-status") || "0");
      state.orderStatus = nextStatus;
      state.page = 1;
      setActive(nextStatus);
      load();
    }

    var tabs = getTabs();
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.style.cursor = "pointer";
      tab.setAttribute("role", "button");
      tab.setAttribute("tabindex", "0");
    });

    ensureCurrent(tabs);
    setActive(state.orderStatus || "0");

    area.addEventListener("click", function (e) {
      var tab = e.target && e.target.closest ? e.target.closest("[data-order-status]") : null;
      if (!tab || !area.contains(tab)) return;
      handleSelect(tab);
    });

    area.addEventListener("keydown", function (e) {
      if (!e) return;
      var key = e.key || e.code || "";
      if (key !== "Enter" && key !== " " && key !== "Spacebar") return;
      var tab = e.target && e.target.closest ? e.target.closest("[data-order-status]") : null;
      if (!tab || !area.contains(tab)) return;
      e.preventDefault();
      handleSelect(tab);
    });
  }

  function wireSearch() {
    var searchArea = document.querySelector(".section_2");
    if (!searchArea) return;
    searchArea.style.cursor = "pointer";
    searchArea.addEventListener("click", function () {
      var kw = prompt("请输入关键词（商品名称/SKU/订单编号）", "");
      if (kw === null) return;
      state.keywords = String(kw || "").trim();
      state.page = 1;
      load();
    });
  }

  async function load(nextKeywords) {
    if (typeof nextKeywords === "string") {
      state.keywords = String(nextKeywords || "").trim();
      state.page = 1;
    }

    var area = findOrdersArea();
    var tpl = parseTemplates(area);
    if (!tpl) return;

    // Clear static placeholder immediately to avoid flashing prototype data.
    var titleEl = tpl.title;
    clearArea(area, titleEl);
    if (titleEl && titleEl.parentNode !== area) area.appendChild(titleEl);
    ensureEmpty(area, titleEl, "暂时没有数据");
    renderPagination(area);

    var payload = {
      page: String(state.page || 1),
      size: String(state.reqSize || 10),
      keywords: state.keywords || "",
      order_status: String(state.orderStatus || "0"),
    };
    var resp = await $.apiPost("/api/wholesales/orders.php?action=lists", $.withAuth(payload));
    if (String(resp.code) === "2") {
      $.clearAuth();
      alert("登录已失效，请重新登录");
      location.replace($.toUrl ? $.toUrl("/login.html") : "/login.html");
      return;
    }
    if (String(resp.code) !== "0") {
      ensureEmpty(area, titleEl, "\u52a0\u8f7d\u5931\u8d25");
      alert((resp && resp.msg) || "加载失败");
      return;
    }

    var data = (resp && resp.data) || {};
    var rawPage = data.page != null ? data.page : resp && resp.page;
    var rawTotal =
      data.num != null
        ? data.num
        : data.total != null
        ? data.total
        : data.count != null
        ? data.count
        : resp && (resp.num != null ? resp.num : resp.total != null ? resp.total : resp.count);
    var rawSize = data.size != null ? data.size : resp && resp.size;

    state.page = parseInt(rawPage != null ? rawPage : state.page, 10) || state.page;
    state.total = parseInt(rawTotal != null ? rawTotal : 0, 10) || 0;
    state.pageSize = parseInt(rawSize != null ? rawSize : state.reqSize, 10) || state.reqSize;
    state.totalPages = Math.max(1, Math.ceil(state.total / Math.max(1, state.pageSize || 1)));
    if (state.page < 1) state.page = 1;
    if (state.page > state.totalPages) state.page = state.totalPages;

    var orders = (data && (data.lists || data.list || data.data)) || [];
    if (orders && !Array.isArray(orders)) orders = [orders];

    // Keep only title
    clearArea(area, titleEl);
    if (titleEl && titleEl.parentNode !== area) area.appendChild(titleEl);

    if (!orders.length) {
      ensureEmpty(area, titleEl, "暂时没有数据");
      renderPagination(area);
      return;
    }
    removeEmpty(area);

    orders.forEach(function (o) {
      var header = tpl.header.cloneNode(true);
      setHeader(header, o || {});
      insertBeforePager(area, header);

      var goods = (o && o.order_goods) || [];
      if (goods && !Array.isArray(goods)) goods = [goods];
      goods.forEach(function (g, idx) {
        var item = tpl.item.cloneNode(true);
        setItem(item, o || {}, g || {}, idx === 0);
        insertBeforePager(area, item);
      });
    });

    renderPagination(area);
  }

  if (!skipDataLoad) {
    wireSearch();
    wireStatusTabs();
    load("");
  }
})();
