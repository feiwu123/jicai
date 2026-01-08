(function () {
  var $ = window.picai;
  var auth = $.requireAuth();
  if (!auth) return;

  var cachedTemplates = null;
  var currentItems = [];
  var currentShops = {};
  var state = { selected: {}, qtyEdits: {} };

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

  makeNavClick(document.querySelector(".block_15"), "/yuanxing/orders_list/index.html");
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

  function setSummary(summary) {
    var goodsAmountEl = document.querySelector("span.text_12");
    if (goodsAmountEl) goodsAmountEl.textContent = summary && summary.goods_amount != null ? String(summary.goods_amount) : "0";
    var goodsNumEl = document.querySelector("span.text_14");
    if (goodsNumEl) goodsNumEl.textContent = summary && summary.goods_num != null ? String(summary.goods_num) : "0";
    var skuEl = document.querySelector("span.text_16");
    if (skuEl) skuEl.textContent = summary && summary.sku_num != null ? String(summary.sku_num) : "0";
    var totalEl = document.querySelector("span.text_18");
    if (totalEl) totalEl.textContent = summary && summary.goods_amount != null ? String(summary.goods_amount) : "0";
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
    if (price) price.textContent = item.goods_price || "";
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
    removeStaticSectionsOutsideGroup12();

    var area = findCartArea();
    var tpl = parseTemplates(area);
    if (!tpl) return;

    clearArea(area);
    state.qtyEdits = {};
    var loading = document.createElement("div");
    loading.textContent = "加载中...";
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

      var shopHeader = tpl.shopHeader.cloneNode(true);
      if (idx > 0) shopHeader.style.marginTop = "16px";
      var shopNameEl = shopHeader.querySelector("span.text_36");
      if (shopNameEl) shopNameEl.textContent = shop.shop_name || "店铺";

      var shopBox = shopHeader.querySelector(".group_13");
      currentShops[shopId] = { checkboxEl: shopBox || null, items: [] };

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

      area.appendChild(shopHeader);

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
        area.appendChild(row);
      });
    });

    // Drop stale selections.
    Object.keys(state.selected).forEach(function (recId) {
      if (!present[recId]) delete state.selected[recId];
    });

    wireSelectAll();
    wireSubmit();
    syncSelectionUI();
  }

  load();
})();
