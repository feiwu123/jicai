(function () {
  var $ = window.picai;
  var auth = $ && $.requireAuth ? $.requireAuth() : null;
  if (!auth) return;

  function makeNavClick(el, href) {
    if (!el) return;
    el.style.cursor = "pointer";
    el.addEventListener("click", function () {
      var target = $.toUrl ? $.toUrl(href) : href;
      location.href = target;
    });
  }

  function safeText(v) {
    if (v === undefined || v === null) return "";
    return String(v);
  }

  function truncateText(text, maxChars) {
    text = safeText(text);
    maxChars = maxChars == null ? 20 : Number(maxChars);
    if (!isFinite(maxChars) || maxChars <= 0) return "";
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars) + "...";
  }

  function parseNumber(v) {
    var s = safeText(v);
    if (!s) return NaN;
    s = s.replace(/[^\d.-]/g, "");
    var n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }

  function fmtMoney(v) {
    if ($ && $.formatMoneyMXN) return $.formatMoneyMXN(v, { fallback: "--" });
    var s = safeText(v);
    if (!s) return "--";
    var n = parseNumber(s);
    if (!isNaN(n)) return "$" + n.toFixed(2) + "MXN";
    return s;
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  var detailRoot = document.getElementById("picaiOrderDetail") || document;

  function copyText(text) {
    return new Promise(function (resolve, reject) {
      try {
        if (!text) return reject(new Error("empty"));
        if (navigator.clipboard && window.isSecureContext && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(String(text)).then(resolve).catch(function () {
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

  function getOrderId() {
    try {
      var u = new URL(location.href);
      return (u.searchParams.get("order_id") || "").trim();
    } catch (e) {
      return "";
    }
  }

  function mountNav() {
    // Left menu + top cart icon (same layout as orders_list)
    makeNavClick(qs(".block_7"), "/yuanxing/goods_list/index.html");
    makeNavClick(qs(".block_4"), "/yuanxing/orders_list/index.html");
    makeNavClick(qs("[data-nav='address_manage']"), "/yuanxing/lanhu_dizhiguanli/index.html");
    makeNavClick(qs(".section_3"), "/yuanxing/cart/index.html");

    // Top bar logo
    makeNavClick(qs(".label_1"), "/yuanxing/goods_list/index.html");
    makeNavClick(qs(".image_7"), "/yuanxing/goods_list/index.html");

    // Hide top search (not used on this page)
    try {
      var topSearch = qs(".box_1 .section_2");
      if (topSearch) topSearch.style.display = "none";
    } catch (e) {}

    // Avatar settings -> logout
    try {
      var avatar = qs("img.label_2");
      var settings = avatar && avatar.parentNode ? avatar.parentNode.querySelector("img.thumbnail_2") : null;
      if ($ && $.mountLogoutMenu) $.mountLogoutMenu(settings);
    } catch (e) {}
  }

  function setText(sel, text) {
    var el = qs(sel, detailRoot);
    if (el) el.textContent = safeText(text);
  }

  function ensureStatusStyles() {
    var id = "picaiOrdersStatusStyle";
    if (document.getElementById(id)) return;
    var style = document.createElement("style");
    style.id = id;
    style.textContent =
      "" +
      ".picai-status-badges{display:flex;align-items:center;justify-content:flex-start;gap:8px;flex-wrap:wrap}" +
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
      "0": "未确认",
      "1": "已确认",
      "2": "已取消",
      "3": "无效",
      "4": "退货",
      "8": "仅退款",
    };
    var payMap = {
      "0": "未付款",
      "1": "已付款中",
      "2": "已付款",
      "6": "退款申请中",
      "4": "已退款",
    };
    var shipMap = {
      "0": "未发货",
      "1": "已发货",
      "2": "已取消",
      "3": "备货中",
      "444": "获取物流单号失败",
    };

    host.textContent = "";
    host.classList.add("picai-status-badges");

    if (Object.prototype.hasOwnProperty.call(orderMap, os)) host.appendChild(makeBadge(orderMap[os], "picai-status-badge--os" + os, "订单状态"));
    if (Object.prototype.hasOwnProperty.call(payMap, ps)) host.appendChild(makeBadge(payMap[ps], "picai-status-badge--ps" + ps, "支付状态"));
    if (Object.prototype.hasOwnProperty.call(shipMap, ss)) host.appendChild(makeBadge(shipMap[ss], "picai-status-badge--ss" + ss, "物流状态"));

    if (!host.childNodes || host.childNodes.length === 0) {
      host.classList.remove("picai-status-badges");
      try {
        if ($ && $.statusText) host.textContent = $.statusText(order || {});
      } catch (e) {
        host.textContent = "--";
      }
    }
  }

  function setOrderInfo(d) {
    d = d || {};

    // Page title
    var title = qs(".text_2");
    if (title) title.textContent = "订单详情";

    function applyStep(stepIdx, timeText, labelSel, circleSel, timeSel) {
      var hasTime = !!safeText(timeText);
      var labelEl = qs(labelSel, detailRoot);
      var circleEl = qs(circleSel, detailRoot);
      var timeEl = qs(timeSel, detailRoot);

      if (timeEl) timeEl.textContent = hasTime ? safeText(timeText) : "--";

      if (circleEl) {
        circleEl.classList.remove("picai-step--active", "picai-step--inactive");
        circleEl.classList.add(hasTime ? "picai-step--active" : "picai-step--inactive");
      }

      if (labelEl) {
        labelEl.classList.remove("picai-step-label--active", "picai-step-label--inactive");
        labelEl.classList.add(hasTime ? "picai-step-label--active" : "picai-step-label--inactive");
      }

      if (timeEl) {
        timeEl.classList.remove("picai-step-label--active", "picai-step-label--inactive");
        timeEl.classList.add(hasTime ? "picai-step-label--active" : "picai-step-label--inactive");
      }
    }

    // Timeline
    applyStep(
      1,
      d.format_add_time || d.format_order_time || "",
      ".text_5",
      ".text-wrapper_3",
      ".picai-step-time-1"
    );
    applyStep(2, d.format_pay_time || "", ".text_6", ".text-wrapper_4", ".picai-step-time-2");
    applyStep(
      3,
      d.format_shipping_time || "",
      ".text_7",
      ".text-wrapper_5",
      ".picai-step-time-3"
    );

    // Basic order info
    setText(".text_19-0", d.order_sn || "");
    setText(".text_23-0", d.format_add_time || "");
    setText(".text_25-0", d.pay_name || d.pay_method || "--");

    try {
      var statusEl = qs(".text_27-0");
      if (statusEl) renderStatusBadges(statusEl, d || {});
    } catch (e) {
      setText(".text_27-0", "--");
    }

    // Copy order SN
    var copyEl = qs(".text_20-0");
    if (copyEl) {
      copyEl.style.cursor = "pointer";
      copyEl.title = "复制订单号";
      copyEl.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var sn = safeText(d.order_sn);
        if (!sn) return;
        copyText(sn).catch(function () {});
      });
    }

    // Consignee info
    function setConsignee(role, value) {
      var el = qs("[data-role='" + role + "']", detailRoot);
      if (!el) return;
      var v = safeText(value);
      el.textContent = v ? v : "--";
    }

    setConsignee("consignee-name", d.consignee || d.name || "");
    setConsignee("consignee-company", d.company || d.company_name || d.consignee_company || "");
    setConsignee("consignee-mobile", d.mobile || "");
    setConsignee("consignee-phone", d.tel || d.phone || "");
    setConsignee("consignee-email", d.mailBox || d.mail_box || d.mailbox || d.email || "");
    setConsignee("consignee-country", d.countryCode || d.country_code || d.country || "");
    setConsignee(
      "consignee-post",
      d.postCode || d.post_code || d.zip || d.zipcode || d.destinationZipCode || ""
    );
    setConsignee("consignee-prov", d.province || d.prov || d.state || "");
    setConsignee("consignee-city", d.city || "");
    setConsignee("consignee-area", d.district || d.area || "");
    setConsignee("consignee-address", d.address || "");
  }

  async function renderLogistics(orderId) {
    var host = qs(".group_5", detailRoot);
    if (!host) return;

    var box1 = qs(".group_6", host);
    var box2 = qs(".group_7", host);
    if (box2) box2.style.display = "none";
    if (!box1) return;

    // Rebuild group_6 as a trace box (data from get_logistics_trace)
    try {
      box1.classList.remove("flex-row");
      box1.classList.add("flex-col", "picai-logistics-box");
    } catch (e) {}

    box1.innerHTML =
      "" +
      '<div class="picai-logistics-meta" id="picaiDetailTraceMeta"></div>' +
      '<div class="picai-trace-list" id="picaiDetailTraceList">' +
      '<div class="picai-trace-empty">加载中…</div>' +
      "</div>";

    var metaEl = qs("#picaiDetailTraceMeta", box1);
    var listEl = qs("#picaiDetailTraceList", box1);

    try {
      var resp = await $.apiPost(
        "/api/wholesales/orders.php?action=get_logistics_trace",
        $.withAuth({ order_id: String(orderId || "") })
      );
      if (String(resp && resp.code) === "2") {
        if ($ && $.clearAuth) $.clearAuth();
        location.replace($.toUrl ? $.toUrl("/login.html") : "/login.html");
        return;
      }
      if (String(resp && resp.code) !== "0") {
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
        t.textContent = String(time || "");

        var d = document.createElement("div");
        d.className = "picai-trace-desc";
        d.textContent = String(desc || "");

        // If the API provides a signature picture URL, append a "查看" link after the time.
        try {
          var u = String(sigPicUrl || "").trim();
          if (u && !/^javascript:/i.test(u)) {
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
        if (listEl) listEl.appendChild(row);
      });
    } catch (e) {
      if (listEl) listEl.innerHTML = '<div class="picai-trace-empty">网络错误</div>';
    }
  }

  function renderGoods(d) {
    d = d || {};
    var area = qs(".group_8", detailRoot);
    if (!area) return;

    var goods = d.goods || d.order_goods || [];
    if (goods && !Array.isArray(goods)) goods = [goods];

    var tbody = qs("#picaiGoodsTbody", area);
    if (!tbody) return;
    tbody.innerHTML = "";
    var totalQty = 0;
    var totalAmount = 0;

    if (!goods.length) {
      var trEmpty = document.createElement("tr");
      var tdEmpty = document.createElement("td");
      tdEmpty.colSpan = 4;
      tdEmpty.className = "picai-goods-empty";
      tdEmpty.textContent = "暂无商品";
      trEmpty.appendChild(tdEmpty);
      tbody.appendChild(trEmpty);
    } else {
      goods.forEach(function (g) {
        var qty = parseInt(safeText(g.goods_number || "0"), 10) || 0;
        var price = parseNumber(g.goods_price || "0");
        var lineTotal = isNaN(price) ? 0 : price * (qty || 0);

        totalQty += qty;
        totalAmount += lineTotal;

        var fullName = safeText(g.goods_name || "--");

        var tr = document.createElement("tr");

        var tdName = document.createElement("td");
        tdName.className = "col-name";
        var nameSpan = document.createElement("span");
        nameSpan.className = "picai-goods-name";
        nameSpan.textContent = fullName;
        nameSpan.title = fullName;
        tdName.appendChild(nameSpan);
        if (qty) {
          var qtySpan = document.createElement("span");
          qtySpan.className = "picai-goods-qty";
          qtySpan.textContent = " ×" + String(qty);
          tdName.appendChild(qtySpan);
        }

        var tdSku = document.createElement("td");
        tdSku.className = "col-sku";
        tdSku.textContent = safeText(g.goods_sn || "--");

        var tdUnit = document.createElement("td");
        tdUnit.className = "col-unit col-num";
        tdUnit.textContent = isNaN(price) ? "--" : fmtMoney(price);

        var tdTotal = document.createElement("td");
        tdTotal.className = "col-total col-num";
        tdTotal.textContent = fmtMoney(lineTotal);

        tr.appendChild(tdName);
        tr.appendChild(tdSku);
        tr.appendChild(tdUnit);
        tr.appendChild(tdTotal);
        tbody.appendChild(tr);
      });
    }

    // Summary lines
    setText(".text_41", "商品件数：" + safeText(totalQty) + " 件");
    setText(".text_42", "商品总金额：" + fmtMoney(totalAmount));

    var shippingFee = parseNumber(d.shipping_fee);
    setText(".text_44", "运费：" + (isNaN(shippingFee) ? "--" : fmtMoney(shippingFee)));

    var surplus = parseNumber(d.surplus);
    setText(".text_45", "实付金额：" + (isNaN(surplus) ? "--" : fmtMoney(surplus)));
  }

  async function load() {
    var orderId = getOrderId();
    if (!orderId) {
      location.replace($.toUrl ? $.toUrl("/yuanxing/orders_list/index.html") : "/yuanxing/orders_list/index.html");
      return;
    }

    var resp;
    try {
      resp = await $.apiPost("/api/wholesales/orders.php?action=info", $.withAuth({ order_id: orderId }));
    } catch (e) {
      return;
    }
    if (String(resp && resp.code) === "2") {
      if ($ && $.clearAuth) $.clearAuth();
      location.replace($.toUrl ? $.toUrl("/login.html") : "/login.html");
      return;
    }
    if (String(resp && resp.code) !== "0") return;

    var d = (resp && resp.data) || {};
    setOrderInfo(d);
    var logisticsHost = qs(".group_5", detailRoot);
    var shipped = String(d && d.shipping_status) === "1";
    if (logisticsHost) logisticsHost.style.display = shipped ? "" : "none";
    if (shipped) {
      renderLogistics(orderId);
    }
    renderGoods(d);
  }

  mountNav();
  load();
})();
