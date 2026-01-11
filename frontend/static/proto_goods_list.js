(function () {
  var $ = window.picai;
  var auth = $.requireAuth();
  if (!auth) return;

  function makeNavClick(el, href) {
    if (!el) return;
    el.style.cursor = "pointer";
    el.addEventListener("click", function () {
      location.href = href;
    });
  }

  // Move routes into the UI: 订单列表 in left menu; 购物车 on the top-right cart icon.
  makeNavClick(document.querySelector(".group_37"), "/yuanxing/orders_list/index.html");
  makeNavClick(document.querySelector("[data-nav='address_manage']"), "/yuanxing/lanhu_dizhiguanli/index.html");
  makeNavClick(document.querySelector(".section_3"), "/yuanxing/cart/index.html");

  // Avatar-side settings icon -> logout dropdown
  try {
    var avatar = document.querySelector("img.label_2");
    var settings = avatar && avatar.parentNode ? avatar.parentNode.querySelector("img.thumbnail_2") : null;
    $.mountLogoutMenu(settings);
  } catch (e) {}

  var state = { keywords: "", catId: "", catName: "全部分类" };
  var categories = null;
  var catMenu = null;

  function showMsg(msg, opts) {
    if ($ && $.showModalMessage) return $.showModalMessage(msg, opts || {});
    alert(msg);
  }

  function setCategoryLabel(name) {
    var label = document.querySelector(".box_6 .text_11") || document.querySelector(".box_6 span");
    if (label) label.textContent = name || "全部分类";
  }

  function hideCategoryMenu() {
    if (!catMenu) return;
    catMenu.style.display = "none";
  }

  function ensureCategoryMenu() {
    if (catMenu) return catMenu;

    catMenu = document.createElement("div");
    catMenu.id = "picaiCategoryMenu";
    catMenu.style.position = "fixed";
    catMenu.style.zIndex = "10000";
    catMenu.style.minWidth = "220px";
    catMenu.style.maxWidth = "320px";
    catMenu.style.maxHeight = "360px";
    catMenu.style.overflow = "auto";
    catMenu.style.background = "rgba(255,255,255,0.98)";
    catMenu.style.border = "1px solid rgba(0,0,0,0.08)";
    catMenu.style.borderRadius = "12px";
    catMenu.style.boxShadow = "0 10px 30px rgba(0,0,0,0.18)";
    catMenu.style.padding = "8px";
    catMenu.style.display = "none";
    catMenu.style.fontFamily =
      "system-ui, -apple-system, Segoe UI, Roboto, Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif";

    document.body.appendChild(catMenu);

    document.addEventListener("click", function (e) {
      if (catMenu.style.display === "none") return;
      if (catMenu.contains(e.target)) return;
      hideCategoryMenu();
    });
    window.addEventListener(
      "scroll",
      function (e) {
        // Allow scrolling inside the dropdown menu without closing it.
        if (catMenu && e && e.target && catMenu.contains(e.target)) return;
        hideCategoryMenu();
      },
      true
    );
    window.addEventListener("resize", function () {
      hideCategoryMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") hideCategoryMenu();
    });

    catMenu.addEventListener("wheel", function (e) {
      e.stopPropagation();
    });
    catMenu.addEventListener("scroll", function (e) {
      e.stopPropagation();
    });

    return catMenu;
  }

  function renderCategoryMenu() {
    var menu = ensureCategoryMenu();
    menu.innerHTML = "";

    function addItem(label, catId) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.style.width = "100%";
      btn.style.textAlign = "left";
      btn.style.border = "0";
      btn.style.background = String(state.catId || "") === String(catId || "") ? "rgba(106,124,255,0.12)" : "transparent";
      btn.style.color = "#1f2a44";
      btn.style.borderRadius = "10px";
      btn.style.padding = "10px 10px";
      btn.style.fontSize = "13px";
      btn.style.cursor = "pointer";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        state.catId = String(catId || "");
        state.catName = label;
        setCategoryLabel(label);
        hideCategoryMenu();
        load();
      });
      btn.onmouseenter = function () {
        if (String(state.catId || "") !== String(catId || "")) btn.style.background = "rgba(0,0,0,0.04)";
      };
      btn.onmouseleave = function () {
        btn.style.background = String(state.catId || "") === String(catId || "") ? "rgba(106,124,255,0.12)" : "transparent";
      };
      menu.appendChild(btn);
    }

    addItem("全部分类", "");

    (categories || []).forEach(function (c) {
      var id = c && (c.cat_id != null ? c.cat_id : c.id);
      var name = (c && (c.cat_name || c.name)) || "";
      if (!name) return;
      addItem(String(name), String(id == null ? "" : id));
    });
  }

  async function loadCategories() {
    if (categories) return categories;
    var resp = await $.apiPost("/api/wholesales/goods.php?action=category", { lang: "zh_cn" });
    if (String(resp.code) === "2") {
      $.clearAuth();
      showMsg("登录已失效，请重新登录", { autoCloseMs: 900 });
      location.replace("/login.html");
      return [];
    }
    if (String(resp.code) !== "0") {
      showMsg((resp && resp.msg) || "分类加载失败");
      return [];
    }

    var data = (resp && resp.data) || [];
    if (data && !Array.isArray(data)) data = data.list || data.lists || data.data || data;
    if (data && !Array.isArray(data)) data = [data];
    categories = data || [];
    return categories;
  }

  function wireCategoryFilter() {
    var trigger = document.querySelector(".box_6");
    if (!trigger) return;
    trigger.style.cursor = "pointer";
    trigger.addEventListener("click", async function (e) {
      e.preventDefault();
      e.stopPropagation();

      var menu = ensureCategoryMenu();
      if (menu.style.display !== "none") {
        hideCategoryMenu();
        return;
      }

      // position menu under trigger
      var r = trigger.getBoundingClientRect();
      menu.style.left = Math.max(8, Math.min(window.innerWidth - 8, r.left + r.width)) + "px";
      menu.style.top = Math.max(8, r.bottom + 8) + "px";
      menu.style.transform = "translateX(-100%)";

      menu.style.display = "block";
      menu.textContent = "加载中...";

      try {
        await loadCategories();
        renderCategoryMenu();
      } catch (err) {
        hideCategoryMenu();
        showMsg("分类加载失败");
      }
    });

    setCategoryLabel(state.catName);
  }

  function mountSearchNextToCategory() {
    // Hide top-bar search UI in goods list; search lives next to category filter instead.
    var topSearch = document.querySelector(".box_2 .section_2");
    if (topSearch) topSearch.style.display = "none";

    var section8 = document.querySelector(".section_8");
    var box6 = document.querySelector(".box_6");
    if (!section8 || !box6) return;

    var right = document.getElementById("picaiGoodsFilterBar");
    if (!right) {
      right = document.createElement("div");
      right.id = "picaiGoodsFilterBar";
      right.style.display = "flex";
      right.style.alignItems = "center";
      right.style.gap = "10px";
      right.style.justifyContent = "flex-end";
      right.style.flex = "0 0 auto";

      // Replace right side with wrapper
      // section_8 is justify-between: keep left title as-is, right wrapper as last child.
      section8.appendChild(right);
    }

    if (box6.parentNode !== right) right.appendChild(box6);

    var search = document.getElementById("picaiGoodsSearch");
    if (!search) {
      search = document.createElement("div");
      search.id = "picaiGoodsSearch";
      search.style.display = "flex";
      search.style.alignItems = "center";
      search.style.gap = "8px";
      search.style.height = "32px";
      search.style.padding = "0 10px";
      search.style.border = "1px solid rgba(226, 232, 240, 1)";
      search.style.borderRadius = "6px";
      search.style.background = "rgba(255,255,255,1)";

      var input = document.createElement("input");
      input.type = "search";
      input.placeholder = "搜索商品 / SKU";
      input.value = state.keywords || "";
      input.style.border = "0";
      input.style.outline = "none";
      input.style.background = "transparent";
      input.style.fontSize = "14px";
      input.style.width = "220px";
      input.style.maxWidth = "35vw";
      input.style.padding = "0";
      input.style.margin = "0";

      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "搜索";
      btn.style.border = "0";
      btn.style.background = "rgba(106,124,255,0.12)";
      btn.style.color = "#2f3bff";
      btn.style.borderRadius = "8px";
      btn.style.padding = "6px 10px";
      btn.style.cursor = "pointer";
      btn.style.fontSize = "12px";

      function doSearch() {
        state.keywords = String(input.value || "").trim();
        load();
      }

      btn.addEventListener("click", function (e) {
        e.preventDefault();
        doSearch();
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          doSearch();
        }
      });

      search.appendChild(input);
      search.appendChild(btn);
      right.insertBefore(search, box6);
    }
  }

  function findGoodsArea() {
    // prototype container: group_6 holds header + rows
    return document.querySelector(".group_6");
  }

  function parseTemplate(area) {
    var header = area ? area.querySelector(".group_8") : null;
    if (!header) return null;
    var row = header.nextElementSibling;
    if (!row) return null;
    return { header: header, row: row.cloneNode(true) };
  }

  function clearRows(area, header) {
    var node = header.nextElementSibling;
    while (node) {
      var next = node.nextElementSibling;
      node.parentNode.removeChild(node);
      node = next;
    }
  }

  function ensureEmpty(area, header, text) {
    if (!area || !header) return;
    var existing = area.querySelector("#picaiGoodsEmpty");
    if (!existing) {
      existing = document.createElement("div");
      existing.id = "picaiGoodsEmpty";
      existing.style.width = "1553px";
      existing.style.height = "260px";
      existing.style.margin = "24px 0 0 24px";
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
    existing.textContent = String(text || "没有数据");
  }

  function removeEmpty(area) {
    if (!area) return;
    var existing = area.querySelector("#picaiGoodsEmpty");
    if (existing) existing.parentNode.removeChild(existing);
  }

  function setRow(row, goods) {
    try {
      var img = row.querySelector("img.label_3") || row.querySelector("img");
      if (img && goods.goods_thumb) img.src = goods.goods_thumb;

      var nameWrap = row.querySelector(".text-wrapper_23");
      if (nameWrap) nameWrap.style.height = "34px";

      var name = row.querySelector(".text-wrapper_23 span:nth-child(1)");
      var sku = row.querySelector(".text-wrapper_23 span:nth-child(2)");
      if (name) {
        var fullName = goods.goods_name || "";
        name.textContent = fullName;
        name.title = fullName ? String(fullName) : "";
        name.style.overflow = "hidden";
        name.style.textOverflow = "ellipsis";
        name.style.whiteSpace = "nowrap";
        name.style.height = "16px";
        name.style.lineHeight = "16px";
      }
      if (sku) {
        var skuText = String(goods.goods_sn || "");
        sku.textContent = "SKU:" + skuText;
        sku.classList.add("sku-text");
        if (!sku.querySelector(".sku-copy-btn")) {
          var copyBtn = document.createElement("span");
          copyBtn.className = "sku-copy-btn";
          copyBtn.title = "复制SKU";
          copyBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            var val = skuText || "";
            if (!val) {
              showMsg("SKU为空，无法复制", { autoCloseMs: 1500 });
              return;
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(val).then(
                function () {
                  showMsg("SKU已复制", { autoCloseMs: 1200 });
                },
                function () {
                  fallbackCopy(val);
                }
              );
            } else {
              fallbackCopy(val);
            }
          });
          sku.appendChild(copyBtn);
        }
      }

      function fallbackCopy(text) {
        try {
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          showMsg("SKU已复制", { autoCloseMs: 1200 });
        } catch (e) {
          showMsg("复制失败", { autoCloseMs: 1500 });
        }
      }

      var cat = row.querySelector("span.text_23");
      if (cat) cat.textContent = goods.cat_name || "";
      var stock = row.querySelector("span.text_24");
      if (stock) stock.textContent = goods.goods_number || "0";
      var price = row.querySelector("span.text_25");
      if (price) price.textContent = goods.formated_shop_price || goods.shop_price || "";
      var length = row.querySelector("span.text_26");
      if (length) length.textContent = goods.length || "";
      var width = row.querySelector("span.text_27");
      if (width) width.textContent = goods.width || "";
      var height = row.querySelector("span.text_28");
      if (height) height.textContent = goods.height || "";
      var weight = row.querySelector("span.text_29");
      if (weight) weight.textContent = goods.goods_weight || "";

      var qtyHost = row.querySelector(".box_8");
      var minusBtn = row.querySelector(".image-wrapper_1 img");
      var plusBtn = row.querySelector(".image-wrapper_2 img");
      var addBtn = row.querySelector(".text-wrapper_3");

      var qtyInput = document.createElement("input");
      qtyInput.className = "picai-qty-input";
      qtyInput.type = "number";
      qtyInput.min = "1";
      qtyInput.value = "1";
      // Match .box_8 size; let container draw border.
      qtyInput.style.width = "100%";
      qtyInput.style.height = "100%";
      qtyInput.style.border = "0";
      qtyInput.style.borderRadius = "4px";
      qtyInput.style.textAlign = "center";
      qtyInput.style.fontSize = "12px";
      qtyInput.style.background = "transparent";
      qtyInput.style.padding = "0";
      qtyInput.style.margin = "0";
      qtyInput.style.outline = "none";
      qtyInput.style.boxSizing = "border-box";

      if (qtyHost) {
        qtyHost.innerHTML = "";
        qtyHost.appendChild(qtyInput);
      }

      function setQty(v) {
        var n = parseInt(v, 10);
        if (!isFinite(n) || n < 1) n = 1;
        qtyInput.value = String(n);
      }

      if (minusBtn) {
        minusBtn.style.cursor = "pointer";
        minusBtn.addEventListener("click", function () {
          setQty(parseInt(qtyInput.value, 10) - 1);
        });
      }
      if (plusBtn) {
        plusBtn.style.cursor = "pointer";
        plusBtn.addEventListener("click", function () {
          setQty(parseInt(qtyInput.value, 10) + 1);
        });
      }

      if (addBtn) {
        addBtn.style.cursor = "pointer";
        addBtn.addEventListener("click", async function () {
          var qty = parseInt(qtyInput.value, 10) || 1;
          var resp = await $.apiPost("/api/wholesales/goods.php?action=add_to_cart", $.withAuth({ goods_id: String(goods.goods_id), number: String(qty) }));
          if (String(resp.code) === "0") {
            $.showModalMessage("已加入购物车", { autoCloseMs: 900 });
          } else if (String(resp.code) === "2") {
            $.clearAuth();
            $.showModalMessage("登录已失效，请重新登录", { autoCloseMs: 900 });
            location.replace("/login.html");
          } else {
            $.showModalMessage((resp && resp.msg) || "加入失败");
          }
        });
      }
    } catch (e) {
      // keep page usable even if template differs
    }
  }

  async function load() {
    var area = findGoodsArea();
    var tpl = parseTemplate(area);
    if (!tpl) return;
    clearRows(area, tpl.header);
    ensureEmpty(area, tpl.header, "正在加载数据…");

    var resp = await $.apiPost(
      "/api/wholesales/goods.php?action=lists",
      $.withAuth({ page: 1, size: 15, keywords: state.keywords, lang: "zh_cn", cat_id: state.catId })
    );
    if (String(resp.code) === "2") {
      $.clearAuth();
      showMsg("登录已失效，请重新登录", { autoCloseMs: 900 });
      location.replace("/login.html");
      return;
    }
    if (String(resp.code) !== "0") {
      showMsg((resp && resp.msg) || "加载失败");
      ensureEmpty(area, tpl.header, "加载失败");
      return;
    }

    var list = (resp.data && (resp.data.list || resp.data.lists)) || [];
    if (list && !Array.isArray(list)) list = [list];

    clearRows(area, tpl.header);
    if (!list.length) {
      ensureEmpty(area, tpl.header, "没有数据");
      return;
    }
    removeEmpty(area);

    list.forEach(function (g) {
      var row = tpl.row.cloneNode(true);
      setRow(row, g || {});
      area.appendChild(row);
    });
  }

  mountSearchNextToCategory();
  wireCategoryFilter();
  load();
})();
