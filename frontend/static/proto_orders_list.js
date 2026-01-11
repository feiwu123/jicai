(function () {
  var $ = window.picai;
  var auth = $.requireAuth();
  if (!auth) return;

  function showMsg(msg, opts) {
    if ($ && $.showModalMessage) return $.showModalMessage(msg, opts || {});
    alert(msg);
  }

  function makeNavClick(el, href) {
    if (!el) return;
    el.style.cursor = "pointer";
    el.addEventListener("click", function () {
      location.href = href;
    });
  }

  makeNavClick(document.querySelector(".block_7"), "/yuanxing/goods_list/index.html");
  makeNavClick(document.querySelector("[data-nav='address_manage']"), "/yuanxing/lanhu_dizhiguanli/index.html");
  makeNavClick(document.querySelector(".section_3"), "/yuanxing/cart/index.html");

  // Search box only exists in goods list.
  try {
    var topSearch = document.querySelector(".box_1 .section_2");
    if (topSearch && topSearch.querySelector("span.text_3")) topSearch.style.display = "none";
  } catch (e) {}

  // Avatar-side settings icon -> logout dropdown
  try {
    var avatar = document.querySelector("img.label_2");
    var settings = avatar && avatar.parentNode ? avatar.parentNode.querySelector("img.thumbnail_2") : null;
    $.mountLogoutMenu(settings);
  } catch (e) {}

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
        ".picai-logistics-modal .group_13{background-color:rgba(255,255,255,1);border-radius:16px;width:595px;height:1032px;position:absolute;top:24px;right:24px;overflow:hidden}" +
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
        ".picai-logistics-modal .picai-logistics-body{height:980px;overflow:auto;padding-bottom:24px}" +
        ".picai-logistics-modal .picai-logistics-body::-webkit-scrollbar{width:10px}" +
        ".picai-logistics-modal .picai-logistics-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.12);border-radius:10px}" +
        "";
      document.head.appendChild(style);
    }

    var modal = document.createElement("div");
    modal.id = "picaiLogisticsModal";
    modal.className = "picai-logistics-modal";
    modal.innerHTML =
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
      '<div class="group_16 flex-col justify-between">' +
      '<div class="box_14 flex-row">' +
      '<div class="box_4 flex-col"></div>' +
      '<span class="text_62">运输中</span>' +
      '<span class="text_63"></span>' +
      "</div>" +
      '<div class="text-wrapper_47 flex-row"><span class="text_64"></span></div>' +
      "</div>" +
      '<div class="box_15 flex-row justify-between"><div class="group_18 flex-col"></div><span class="text_65"></span></div>' +
      '<span class="text_66"></span>' +
      '<div class="box_16 flex-row justify-between"><div class="section_5 flex-col"></div><span class="text_67">仓库处理中</span><span class="text_68"></span></div>' +
      '<span class="text_69">打包完成</span>' +
      '<div class="box_17 flex-row justify-between"><div class="section_6 flex-col"></div><span class="text_70">已下单</span><span class="text_71"></span></div>' +
      '<span class="text_72">商品已下单</span>' +
      "</div>" +
      "</div>";

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

    var t1 = modal.querySelector(".text_63");
    if (t1) t1.textContent = timeText;
    var msg1 = modal.querySelector(".text_64");
    if (msg1) msg1.textContent = "订单正在运输中，请耐心等待。";

    var t2 = modal.querySelector(".text_65");
    if (t2) t2.textContent = timeText;
    var msg2 = modal.querySelector(".text_66");
    if (msg2) msg2.textContent = "包裹已发出，运输途中。";
    var t3 = modal.querySelector(".text_68");
    if (t3) t3.textContent = timeText;
    var t4 = modal.querySelector(".text_71");
    if (t4) t4.textContent = timeText;

    modal.style.display = "block";
    document.body.style.overflow = "hidden";
  }

  function findOrdersArea() {
    return document.querySelector(".section_6");
  }

  function parseTemplates(area) {
    if (!area) return null;
    var header = area.querySelector(".group_3");
    var item = area.querySelector(".group_4");
    if (!header || !item) return null;
    return { title: area.querySelector(".text_15"), header: header.cloneNode(true), item: item.cloneNode(true) };
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
      existing.style.margin = "24px 0 0 0";
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
    existing.textContent = String(text || "\u6ca1\u6709\u8ba2\u5355");
    if (titleEl && titleEl.parentNode !== area) area.insertBefore(titleEl, existing);
  }

  function removeEmpty(area) {
    if (!area) return;
    var existing = area.querySelector("#picaiOrdersEmpty");
    if (existing) existing.parentNode.removeChild(existing);
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
    if (statusEl) statusEl.innerHTML = $.statusText(order).replace(/  /g, "&nbsp;&nbsp;");
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
      statusEl.style.overflow = "hidden";
      statusEl.style.textOverflow = "ellipsis";
      statusEl.style.whiteSpace = "nowrap";
    }
  }

  function setItem(node, order, g) {
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
    if (price) price.textContent = g.goods_price || "";
    var qty = node.querySelector("span.text_26");
    if (qty) qty.textContent = "×" + (g.goods_number || "1");

    var total = node.querySelector("span.text_27");
    if (total) {
      var p = parseFloat(g.goods_price || "0");
      var n = parseInt(g.goods_number || "1", 10) || 1;
      total.textContent = isFinite(p) ? String((p * n).toFixed(2)) : "";
    }

    var cancel = node.querySelector("span.text_28");
    if (cancel) {
      var reviewStatus = String(order && order.review_status);
      cancel.textContent = reviewStatus === "1" ? "已审核" : "未审核";
      cancel.style.opacity = "1";
      cancel.style.cursor = "default";
      cancel.title = "";
    }

    var track = node.querySelector("span.text_29");
    if (track) {
      track.style.cursor = "pointer";
      track.addEventListener("click", function () {
        showLogisticsModal(order || {}, g || {});
      });
    }

    async function payOrder() {
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
          location.replace("/login.html");
          return;
        }
        if (String(resp.code) === "0") {
          showMsg((resp && resp.msg) || "支付成功", { autoCloseMs: 3000 });
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
    }

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
        e.stopPropagation();
        payOrder();
      });
    }

    // Place action buttons into a 2x2 grid container at the right side.
    var actionsWrap = document.createElement("div");
    actionsWrap.className = "order-actions";
    if (cancel) {
      node.removeChild(cancel);
      actionsWrap.appendChild(cancel);
    }
    if (track) {
      node.removeChild(track);
      actionsWrap.appendChild(track);
    }
    if (payBtn) actionsWrap.appendChild(payBtn);
    // If only one action exists, keep grid structure; no placeholder needed.
    node.appendChild(actionsWrap);
  }

  function wireSearch(reload) {
    var searchArea = document.querySelector(".section_2");
    if (!searchArea) return;
    searchArea.style.cursor = "pointer";
    searchArea.addEventListener("click", function () {
      var kw = prompt("请输入关键词（商品名称/SKU/订单编号）", "");
      if (kw === null) return;
      reload(String(kw || "").trim());
    });
  }

  async function load(keywords) {
    var area = findOrdersArea();
    var tpl = parseTemplates(area);
    if (!tpl) return;

    // Clear static placeholder immediately to avoid flashing prototype data.
    var titleEl = tpl.title;
    clearArea(area, titleEl);
    if (titleEl && titleEl.parentNode !== area) area.appendChild(titleEl);
    ensureEmpty(area, titleEl, "\u52a0\u8f7d\u4e2d\u2026");

    var resp = await $.apiPost(
      "/api/wholesales/orders.php?action=lists",
      $.withAuth({ page: "1", size: "10", keywords: keywords || "" })
    );
    if (String(resp.code) === "2") {
      $.clearAuth();
      alert("登录已失效，请重新登录");
      location.replace("/login.html");
      return;
    }
    if (String(resp.code) !== "0") {
      ensureEmpty(area, titleEl, "\u52a0\u8f7d\u5931\u8d25");
      alert((resp && resp.msg) || "加载失败");
      return;
    }

    var orders = (resp.data && resp.data.lists) || [];
    if (orders && !Array.isArray(orders)) orders = [orders];

    // Keep only title
    clearArea(area, titleEl);
    if (titleEl && titleEl.parentNode !== area) area.appendChild(titleEl);

    if (!orders.length) {
      ensureEmpty(area, titleEl, "\u6ca1\u6709\u8ba2\u5355");
      return;
    }
    removeEmpty(area);

    orders.forEach(function (o) {
      var header = tpl.header.cloneNode(true);
      setHeader(header, o || {});
      area.appendChild(header);

      var goods = (o && o.order_goods) || [];
      if (goods && !Array.isArray(goods)) goods = [goods];
      goods.forEach(function (g) {
        var item = tpl.item.cloneNode(true);
        setItem(item, o || {}, g || {});
        area.appendChild(item);
      });
    });
  }

  wireSearch(function (kw) {
    load(kw);
  });
  load("");
})();
