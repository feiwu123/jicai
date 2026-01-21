(function () {
  var $ = window.picai;
  var auth = $.requireAuth();
  if (!auth) return;

  var cachedTemplates = null;
  var currentItems = [];
  var currentShops = {};
  var state = { selected: {}, qtyEdits: {}, collapsedShops: {} };

  function showMsg(msg, opts) {
    if ($ && $.showModalMessage) return $.showModalMessage(msg, opts || {});
    alert(msg);
  }

  function ensureCartExtraStyle() {
    var id = "picaiCartExtraStyle";
    if (document.getElementById(id)) return;
    var style = document.createElement("style");
    style.id = id;
    style.textContent =
      "" +
      "#picaiCartTitlebar{display:flex;align-items:center;justify-content:space-between;width:100%;padding:24px 24px 0 24px;box-sizing:border-box}" +
      "#picaiCartBulkDeleteBtn{height:32px;padding:0 12px;border:1px solid rgba(226,232,240,1);background:#fff;border-radius:8px;cursor:pointer;color:rgba(232,69,122,1);font-size:12px;font-weight:600}" +
      "#picaiCartBulkDeleteBtn:disabled{opacity:0.6;cursor:default}" +
      ".picai-shop-collapse{width:20px;height:20px;display:flex;align-items:center;justify-content:center;border:0;background:transparent;border-radius:6px;color:rgba(84,98,116,1);cursor:pointer;user-select:none;transition:transform .15s ease;transform-origin:center;font-size:20px;line-height:20px}" +
      ".picai-cart-shop.picai-collapsed .picai-cart-item-row{display:none !important}";
    document.head.appendChild(style);
  }

  function mountBulkDeleteUI() {
    try {
      ensureCartExtraStyle();
      var container = document.querySelector(".group_8");
      if (!container) return;
      if (document.getElementById("picaiCartTitlebar")) return;

      var title = container.querySelector("span.text_30");
      if (!title) return;

      var bar = document.createElement("div");
      bar.id = "picaiCartTitlebar";

      // Move title span into a flex titlebar (keep original font styles; remove prototype margin).
      title.style.margin = "0";
      title.parentNode.insertBefore(bar, title);
      bar.appendChild(title);

      var btn = document.createElement("button");
      btn.id = "picaiCartBulkDeleteBtn";
      btn.type = "button";
      btn.textContent = "批量删除";
      btn.addEventListener("click", function () {
        bulkDeleteSelected(btn);
      });
      bar.appendChild(btn);
    } catch (e) {}
  }

  function ensureCartSkuBadge() {
    var badge = document.getElementById("picaiCartSkuCount");
    if (badge) return badge;
    badge = document.createElement("div");
    badge.id = "picaiCartSkuCount";
    badge.className = "cart-sku-count";
    badge.textContent = "--";
    var icon = document.querySelector(".group_4");
    var header = document.querySelector(".box_1") || document.querySelector(".page");
    var parent = icon || header;
    if (parent) parent.appendChild(badge);
    return badge;
  }

  function setCartSkuBadge(val) {
    var badge = ensureCartSkuBadge();
    var text = val == null || val === "" ? "--" : String(val);
    badge.textContent = text;
  }

  async function loadCartSkuCount() {
    setCartSkuBadge("...");
    var resp = await $.apiPost("/api/wholesales/goods.php?action=get_cart_num", $.withAuth({}));
    if (String(resp.code) === "2") {
      $.clearAuth();
      showMsg("登录已失效，请重新登录", { autoCloseMs: 900 });
      location.replace("/login.html");
      return;
    }
    var codeNum = Number(resp.code);
    if (!isNaN(codeNum) && codeNum > 1) {
      showMsg((resp && resp.msg) || "获取购物车数量失败", { autoCloseMs: 3000 });
      setCartSkuBadge("--");
      return;
    }
    if (String(resp.code) === "0") {
      var num = resp.data && (resp.data.num || resp.data.total || resp.data.count);
      setCartSkuBadge(num);
    } else {
      setCartSkuBadge("--");
    }
  }

  function makeNavClick(el, href) {
    if (!el) return;
    el.style.cursor = "pointer";
    el.addEventListener("click", function () {
      location.href = href;
    });
  }

  makeNavClick(document.querySelector(".block_15"), "/yuanxing/orders_list/index.html");
  makeNavClick(document.querySelector("[data-nav='address_manage']"), "/yuanxing/lanhu_dizhiguanli/index.html");
  makeNavClick(document.querySelector(".box_5"), "/yuanxing/goods_list/index.html");
  makeNavClick(document.querySelector(".group_4"), "/yuanxing/cart/index.html");

  // Remove search box on cart page (search only exists in goods list).
  try {
    var topSearch = document.querySelector(".box_1 .group_3");
    if (topSearch && topSearch.querySelector("span.text_3")) topSearch.style.display = "none";
  } catch (e) {}

  // Avatar-side settings icon -> logout dropdown
  try {
    var avatar = document.querySelector("img.label_2");
    var settings = avatar && avatar.parentNode ? avatar.parentNode.querySelector("img.thumbnail_2") : null;
    $.mountLogoutMenu(settings);
  } catch (e) {}

  function findCartArea() {
    return document.querySelector(".group_12");
  }

  function removeStaticSectionsOutsideGroup12() {
    try {
      var listRoot = document.querySelector(".group_8");
      var area = findCartArea();
      if (!listRoot || !area) return;
      var node = area.nextElementSibling;
      while (node) {
        var next = node.nextElementSibling;
        listRoot.removeChild(node);
        node = next;
      }
    } catch (e) {}
  }

  function parseTemplates(area) {
    if (cachedTemplates) return cachedTemplates;
    if (!area) return null;
    var shopHeader = area.querySelector(".group_64");
    var itemRow = area.querySelector(".group_65");
    if (!shopHeader || !itemRow) return null;
    cachedTemplates = { shopHeader: shopHeader.cloneNode(true), itemRow: itemRow.cloneNode(true) };
    return cachedTemplates;
  }

  function clearArea(area) {
    while (area.firstChild) area.removeChild(area.firstChild);
  }

  function showBusyMask(text) {
    try {
      var old = document.getElementById("picaiCartBusyMask");
      if (old && old.parentNode) old.parentNode.removeChild(old);

      var mask = document.createElement("div");
      mask.id = "picaiCartBusyMask";
      mask.style.position = "fixed";
      mask.style.left = "0";
      mask.style.top = "0";
      mask.style.right = "0";
      mask.style.bottom = "0";
      mask.style.background = "rgba(15,23,42,0.35)";
      mask.style.zIndex = "9999";
      mask.style.display = "flex";
      mask.style.alignItems = "center";
      mask.style.justifyContent = "center";

      var box = document.createElement("div");
      box.style.background = "#fff";
      box.style.borderRadius = "12px";
      box.style.padding = "14px 16px";
      box.style.border = "1px solid rgba(241,245,249,1)";
      box.style.boxShadow = "0 12px 30px rgba(2,6,23,0.18)";
      box.style.fontSize = "13px";
      box.style.color = "rgba(36,37,41,1)";
      box.textContent = text || "处理中...";
      mask.appendChild(box);

      document.body.appendChild(mask);
    } catch (e) {}
  }

  function hideBusyMask() {
    try {
      var el = document.getElementById("picaiCartBusyMask");
      if (el && el.parentNode) el.parentNode.removeChild(el);
    } catch (e) {}
  }

  function parseMoney(val) {
    if (val == null) return 0;
    var s = String(val);
    var n = parseFloat(s.replace(/[^\d.]/g, ""));
    return isFinite(n) ? n : 0;
  }

  function isItemSelected(item) {
    var recId = item && item.rec_id != null ? String(item.rec_id) : "";
    if (!recId) return false;
    if (Object.prototype.hasOwnProperty.call(state.selected, recId)) return !!state.selected[recId];
    var c = String(item.is_checked || "");
    if (c === "") return true;
    return c === "1";
  }

  function setItemSelected(recId, selected) {
    if (!recId) return;
    state.selected[String(recId)] = !!selected;
  }

  function setCheckbox(el, checked) {
    if (!el) return;
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.cursor = "pointer";
    el.style.userSelect = "none";
    el.style.fontSize = "12px";
    el.style.fontWeight = "700";
    el.style.lineHeight = "12px";

    // Use a checkmark glyph; hide via transparent color when unchecked.
    el.textContent = "✓";
    if (checked) {
      el.style.background = "rgba(59,131,246,1)";
      el.style.borderColor = "rgba(59,131,246,1)";
      el.style.color = "#fff";
    } else {
      el.style.background = "rgba(255,255,255,1)";
      el.style.borderColor = "rgba(226, 232, 240, 1)";
      el.style.color = "transparent";
    }
  }

  function computeSelectedSummary(items) {
    var goodsNum = 0;
    var skuNum = 0;
    var amount = 0;
    var seen = {};

    (items || []).forEach(function (it) {
      if (!it) return;
      if (!isItemSelected(it)) return;

      var n = parseInt(it.goods_number, 10) || 0;
      goodsNum += n;

      var gid = String(it.goods_id || it.goods_sn || it.rec_id || "");
      if (gid && !seen[gid]) {
        seen[gid] = true;
        skuNum += 1;
      }

      var unitPrice = parseMoney(it.goods_price || 0);
      if (unitPrice) amount += unitPrice * n;
      else amount += parseMoney(it.goods_amount || 0);
    });

    return {
      goods_num: String(goodsNum),
      sku_num: String(skuNum),
      goods_amount: isFinite(amount) ? String(amount.toFixed(2)) : "0",
    };
  }

  function setSummary(summary, opts) {
    opts = opts || {};
    var placeholder = opts.placeholder || "暂无";
    var loading = opts.loading === true;

    function hasValue(v) {
      return v !== undefined && v !== null && String(v) !== "";
    }

    function formatAmountText(v) {
      var text = !loading && summary && hasValue(v) ? String(v) : String(placeholder);
      return $.formatMoneyMXN ? $.formatMoneyMXN(text, { fallback: text }) : text;
    }

    var goodsAmountEl = document.querySelector("span.text_12");
    if (goodsAmountEl) {
      goodsAmountEl.textContent = formatAmountText(summary && summary.goods_amount);
    }
    var goodsNumEl = document.querySelector("span.text_14");
    if (goodsNumEl) {
      goodsNumEl.textContent = !loading && summary && hasValue(summary.goods_num) ? String(summary.goods_num) : String(placeholder);
    }
    var skuEl = document.querySelector("span.text_16");
    if (skuEl) {
      skuEl.textContent = !loading && summary && hasValue(summary.sku_num) ? String(summary.sku_num) : String(placeholder);
    }
    var totalEl = document.querySelector("span.text_18");
    if (totalEl) {
      totalEl.textContent = formatAmountText(summary && summary.goods_amount);
    }
  }

  function buildQtyInput(initial, onChange) {
    var input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.value = String(initial || 1);
    // Match .block_2 size; let container draw border.
    input.style.width = "100%";
    input.style.height = "100%";
    input.style.border = "0";
    input.style.borderRadius = "4px";
    input.style.textAlign = "center";
    input.style.fontSize = "12px";
    input.style.background = "transparent";
    input.style.padding = "0";
    input.style.margin = "0";
    input.style.outline = "none";
    input.style.boxSizing = "border-box";
    input.addEventListener("change", function () {
      onChange(parseInt(input.value, 10) || 1);
    });
    return input;
  }

  function wireSelectAll() {
    var allBox = document.querySelector(".group_11");
    if (!allBox) return;
    if (allBox.dataset.picaiWired === "1") return;
    allBox.dataset.picaiWired = "1";
    allBox.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var all = true;
      currentItems.forEach(function (it) {
        all = all && isItemSelected(it);
      });
      var next = !all;
      currentItems.forEach(function (it) {
        if (!it || it.rec_id == null) return;
        setItemSelected(String(it.rec_id), next);
      });
      syncSelectionUI();
    });
  }

  function syncSelectionUI() {
    // Item boxes
    currentItems.forEach(function (it) {
      if (!it || !it._checkboxEl) return;
      setCheckbox(it._checkboxEl, isItemSelected(it));
    });

    // Shop boxes
    Object.keys(currentShops || {}).forEach(function (shopId) {
      var s = currentShops[shopId];
      if (!s || !s.checkboxEl) return;
      var all = true;
      var any = false;
      (s.items || []).forEach(function (it) {
        var sel = isItemSelected(it);
        any = any || sel;
        all = all && sel;
      });
      setCheckbox(s.checkboxEl, all && any);
    });

    // Select-all box
    var allBox = document.querySelector(".group_11");
    if (allBox) {
      var allSel = true;
      var anySel = false;
      currentItems.forEach(function (it) {
        var sel = isItemSelected(it);
        anySel = anySel || sel;
        allSel = allSel && sel;
      });
      setCheckbox(allBox, allSel && anySel);
    }

    setSummary(computeSelectedSummary(currentItems));
  }

  function getSelectedRecIds() {
    var ids = [];
    currentItems.forEach(function (it) {
      if (!it) return;
      if (!isItemSelected(it)) return;
      if (it.rec_id != null && it.rec_id !== "") ids.push(String(it.rec_id));
    });
    return ids;
  }

  function getSelectedItems() {
    var list = [];
    currentItems.forEach(function (it) {
      if (!it) return;
      if (!isItemSelected(it)) return;
      list.push(it);
    });
    return list;
  }

  async function bulkDeleteSelected(btn) {
    var items = getSelectedItems();
    if (!items.length) {
      showMsg("请先勾选要删除的商品");
      return;
    }

    var ok = true;
    try {
      ok = window.confirm("确定删除选中的 " + items.length + " 个商品吗？");
    } catch (e) {}
    if (!ok) return;

    if (btn) {
      btn.disabled = true;
      btn.style.pointerEvents = "none";
    }
    showBusyMask("正在删除...");

    var failed = 0;
    try {
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var gid = it && it.goods_id != null ? String(it.goods_id) : "";
        if (!gid) continue;
        var resp = await $.apiPost("/api/wholesales/goods.php?action=del_cart", $.withAuth({ goods_id: gid }));
        if (String(resp.code) === "0") continue;
        if (String(resp.code) === "2") {
          $.clearAuth();
          showMsg("登录已失效，请重新登录", { autoCloseMs: 900 });
          location.replace("/login.html");
          return;
        }
        failed += 1;
      }

      if (failed) showMsg("删除完成，但有 " + failed + " 项删除失败");
      else showMsg("已删除", { autoCloseMs: 900 });
    } finally {
      hideBusyMask();
      if (btn) {
        btn.disabled = false;
        btn.style.pointerEvents = "";
      }
    }

    load();
  }

  function wireSubmit() {
    var btnHost = document.querySelector(".text-wrapper_6");
    if (!btnHost) return;
    if (btnHost.dataset.picaiWired === "1") return;
    btnHost.dataset.picaiWired = "1";
    btnHost.style.cursor = "pointer";
    btnHost.setAttribute("role", "button");
    btnHost.setAttribute("tabindex", "0");

    async function syncQtyEdits() {
      var keys = Object.keys(state.qtyEdits || {});
      if (!keys.length) return true;

      var edits = [];
      keys.forEach(function (k) {
        var it = state.qtyEdits[k];
        if (!it) return;
        var gid = String(it.goods_id || "");
        var num = String(it.number || "");
        if (!gid || !num) return;
        edits.push({ goods_id: gid, number: num });
      });
      if (!edits.length) return true;

      btnHost.style.pointerEvents = "none";
      btnHost.style.opacity = "0.75";
      showBusyMask("正在同步数量...");

      try {
        for (var i = 0; i < edits.length; i++) {
          var e = edits[i];
          var resp = await $.apiPost("/api/wholesales/goods.php?action=update_cart", $.withAuth({ goods_id: e.goods_id, number: e.number }));
          if (String(resp.code) === "0") continue;
          if (String(resp.code) === "2") {
            $.clearAuth();
            showMsg("登录已失效，请重新登录", { autoCloseMs: 900 });
            location.replace("/login.html");
            return false;
          }
          showMsg((resp && resp.msg) || "同步数量失败");
          return false;
        }

        state.qtyEdits = {};
        return true;
      } finally {
        hideBusyMask();
        btnHost.style.pointerEvents = "";
        btnHost.style.opacity = "";
      }
    }

    async function go() {
      var ids = getSelectedRecIds();
      if (!ids.length) {
        showMsg("请选择要提交的商品");
        return;
      }
      var ok = await syncQtyEdits();
      if (!ok) return;
      location.href = "/yuanxing/confirm_order/index.html?cart_value=" + encodeURIComponent(ids.join(","));
    }

    btnHost.addEventListener("click", function () {
      go();
    });
    btnHost.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    });
  }

  function setItemRow(row, item, refresh) {
    try {
      row.classList.add("picai-cart-item-row");
    } catch (e) {}

    var img = row.querySelector("img.label_3") || row.querySelector("img");
    if (img && item.goods_thumb) img.src = item.goods_thumb;

    var recId = item && item.rec_id != null ? String(item.rec_id) : "";
    var checkbox = row.querySelector(".block_1");
    if (checkbox) {
      item._checkboxEl = checkbox;
      setCheckbox(checkbox, isItemSelected(item));
      checkbox.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        setItemSelected(recId, !isItemSelected(item));
        syncSelectionUI();
      });
    }

    var name = row.querySelector(".text-wrapper_36 span:nth-child(1)");
    var sku = row.querySelector(".text-wrapper_36 span:nth-child(2)");
    if (name) {
      var fullName = item.goods_name || "";
      name.textContent = fullName;
      name.title = fullName;
    }
    if (sku) sku.textContent = "SKU:" + (item.goods_sn || "");
    var price = row.querySelector("span.text_39");
    if (price) {
      var rawPrice = (item && item.goods_price) || "";
      price.textContent = $.formatMoneyMXN ? $.formatMoneyMXN(rawPrice) : rawPrice;
    }
    var stock = row.querySelector("span.text_40");
    if (stock) stock.textContent = item.stock || item.goods_number || "";

    var qtyHost = row.querySelector(".block_2");
    var minusBtn = row.querySelector(".image-wrapper_1 img");
    var plusBtn = row.querySelector(".image-wrapper_2 img");

    var currentQty = parseInt(item.goods_number, 10) || 1;
    var qtyInput = buildQtyInput(currentQty, function (v) {
      updateLocal(v);
    });
    if (qtyHost) {
      qtyHost.innerHTML = "";
      qtyHost.appendChild(qtyInput);
    }

    function setQty(v) {
      var n = parseInt(v, 10);
      if (!isFinite(n) || n < 1) n = 1;
      qtyInput.value = String(n);
      return n;
    }

    function updateLocal(v) {
      var n = setQty(v);
      item.goods_number = String(n);
      if (recId) state.qtyEdits[recId] = { goods_id: String(item.goods_id || ""), number: String(n) };
      setSummary(computeSelectedSummary(currentItems));
    }

    async function update(v) {
      var n = setQty(v);
      var resp = await $.apiPost("/api/wholesales/goods.php?action=update_cart", $.withAuth({ goods_id: String(item.goods_id), number: String(n) }));
      if (String(resp.code) === "0") {
        refresh();
      } else if (String(resp.code) === "2") {
        $.clearAuth();
        showMsg("登录已失效，请重新登录", { autoCloseMs: 900 });
        location.replace("/login.html");
      } else {
        showMsg((resp && resp.msg) || "更新失败");
      }
    }

    if (minusBtn) {
      minusBtn.style.cursor = "pointer";
      minusBtn.addEventListener("click", function (e) {
        e.preventDefault();
        updateLocal((parseInt(qtyInput.value, 10) || 1) - 1);
      });
    }
    if (plusBtn) {
      plusBtn.style.cursor = "pointer";
      plusBtn.addEventListener("click", function (e) {
        e.preventDefault();
        updateLocal((parseInt(qtyInput.value, 10) || 1) + 1);
      });
    }

    var del = row.querySelector("span.text_41");
    if (del) {
      del.style.cursor = "pointer";
      del.addEventListener("click", async function (e) {
        e.preventDefault();
        if (!confirm("确认删除？")) return;
        var resp = await $.apiPost("/api/wholesales/goods.php?action=del_cart", $.withAuth({ goods_id: String(item.goods_id) }));
        if (String(resp.code) === "0") {
          if (recId) delete state.selected[recId];
          refresh();
        } else if (String(resp.code) === "2") {
          $.clearAuth();
          showMsg("登录已失效，请重新登录", { autoCloseMs: 900 });
          location.replace("/login.html");
        } else {
          showMsg((resp && resp.msg) || "删除失败");
        }
      });
    }
  }

  async function load() {
    mountBulkDeleteUI();
    removeStaticSectionsOutsideGroup12();
    // Summary (right panel) shows "暂无" until cart data arrives.
    setSummary(null, { loading: true, placeholder: "暂无" });

    var area = findCartArea();
    var tpl = parseTemplates(area);
    if (!tpl) return;

    clearArea(area);
    state.qtyEdits = {};
    var loading = document.createElement("div");
    loading.textContent = "暂时没有数据";
    loading.style.padding = "16px";
    loading.style.width = "100%";
    loading.style.height = "240px";
    loading.style.display = "flex";
    loading.style.alignItems = "center";
    loading.style.justifyContent = "center";
    loading.style.color = "rgba(84,98,116,1)";
    loading.style.fontSize = "12px";
    area.appendChild(loading);

    var resp = await $.apiPost("/api/wholesales/goods.php?action=get_cart", $.withAuth({}));
    if (String(resp.code) === "2") {
      $.clearAuth();
      showMsg("登录已失效，请重新登录", { autoCloseMs: 900 });
      location.replace("/login.html");
      return;
    }
    if (String(resp.code) !== "0") {
      showMsg((resp && resp.msg) || "加载失败");
      setSummary(null, { loading: true, placeholder: "暂无" });
      return;
    }

    var groups = (resp.data && resp.data.goods) || [];
    if (groups && !Array.isArray(groups)) groups = [groups];

    clearArea(area);
    currentItems = [];
    currentShops = {};

    function refresh() {
      load();
    }

    var present = {};

    groups.forEach(function (g, idx) {
      var shop = (g && g.shop) || {};
      var shopId = String(shop.user_id || "");

      var shopWrap = document.createElement("div");
      shopWrap.className = "picai-cart-shop";
      shopWrap.dataset.shopId = shopId;
      if (state.collapsedShops && state.collapsedShops[shopId]) shopWrap.classList.add("picai-collapsed");

      var shopHeader = tpl.shopHeader.cloneNode(true);
      if (idx > 0) shopHeader.style.marginTop = "16px";
      var shopNameEl = shopHeader.querySelector("span.text_36");
      if (shopNameEl) {
        var shopName = shop.shop_name || "店铺";
        var logoUrl = shop && shop.shop_logo ? String(shop.shop_logo).trim() : "";
        if (logoUrl) {
          var resolvedLogo = $.toUrl ? $.toUrl(logoUrl) : logoUrl;
          shopNameEl.textContent = "";
          shopNameEl.style.display = "flex";
          shopNameEl.style.alignItems = "center";
          shopNameEl.style.gap = "8px";

          var logo = document.createElement("img");
          logo.className = "picai-shop-logo";
          logo.src = resolvedLogo;
          logo.alt = shopName;
          logo.referrerPolicy = "no-referrer";
          logo.style.width = "36px";
          logo.style.height = "36px";
          logo.style.borderRadius = "6px";
          logo.style.objectFit = "cover";
          logo.style.background = "#f2f3f7";
          logo.addEventListener("error", function () {
            if (logo && logo.parentNode) logo.parentNode.removeChild(logo);
          });

          shopNameEl.appendChild(logo);
          shopNameEl.appendChild(document.createTextNode(shopName));
        } else {
          shopNameEl.textContent = shopName;
        }
      }

      var shopBox = shopHeader.querySelector(".group_13");

      var collapseBtn = document.createElement("div");
      collapseBtn.className = "picai-shop-collapse";
      collapseBtn.title = "折叠/展开";
      collapseBtn.textContent = "▾";
      collapseBtn.style.marginLeft = "auto";
      if (shopWrap.classList.contains("picai-collapsed")) collapseBtn.style.transform = "rotate(180deg)";
      collapseBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var next = !shopWrap.classList.contains("picai-collapsed");
        if (next) {
          shopWrap.classList.add("picai-collapsed");
          collapseBtn.style.transform = "rotate(180deg)";
        } else {
          shopWrap.classList.remove("picai-collapsed");
          collapseBtn.style.transform = "";
        }
        if (!state.collapsedShops) state.collapsedShops = {};
        state.collapsedShops[shopId] = next;
      });
      shopHeader.appendChild(collapseBtn);

      currentShops[shopId] = { checkboxEl: shopBox || null, items: [], wrapEl: shopWrap, collapseEl: collapseBtn };

      if (shopBox) {
        shopBox.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          var s = currentShops[shopId];
          if (!s) return;
          var all = true;
          (s.items || []).forEach(function (it) {
            all = all && isItemSelected(it);
          });
          var next = !all;
          (s.items || []).forEach(function (it) {
            if (!it || it.rec_id == null) return;
            setItemSelected(String(it.rec_id), next);
          });
          syncSelectionUI();
        });
      }

      shopWrap.appendChild(shopHeader);
      area.appendChild(shopWrap);

      var items = (g && g.lists) || [];
      if (items && !Array.isArray(items)) items = [items];

      items.forEach(function (it) {
        if (!it) return;
        var recId = it.rec_id != null ? String(it.rec_id) : "";
        if (recId) present[recId] = true;

        currentShops[shopId].items.push(it);
        currentItems.push(it);

        var row = tpl.itemRow.cloneNode(true);
        setItemRow(row, it, refresh);
        shopWrap.appendChild(row);
      });
    });

    // Drop stale selections.
    Object.keys(state.selected).forEach(function (recId) {
      if (!present[recId]) delete state.selected[recId];
    });

    wireSelectAll();
    wireSubmit();
    syncSelectionUI();
    loadCartSkuCount();
  }

  load();
})();
