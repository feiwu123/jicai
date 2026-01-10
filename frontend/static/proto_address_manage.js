(function () {
  var $ = window.picai;
  var auth = $ && $.requireAuth ? $.requireAuth() : null;
  if (!auth) return;

  function makeNavClick(el, href) {
    if (!el) return;
    el.style.cursor = "pointer";
    el.addEventListener("click", function () {
      location.href = href;
    });
  }

  makeNavClick(document.querySelector("[data-nav='goods_list']"), "/yuanxing/goods_list/index.html");
  makeNavClick(document.querySelector("[data-nav='orders_list']"), "/yuanxing/orders_list/index.html");
  // Top-right icon (same role as goods_list cart icon)
  makeNavClick(document.querySelector(".box_3"), "/yuanxing/cart/index.html");

  // Avatar-side settings icon -> logout dropdown
  try {
    var avatar = document.querySelector("img.label_2");
    var settings = avatar && avatar.parentNode ? avatar.parentNode.querySelector("img.thumbnail_2") : null;
    $.mountLogoutMenu(settings);
  } catch (e) {}

  function showMsg(msg, opts) {
    if ($ && $.showModalMessage) return $.showModalMessage(msg, opts || {});
    alert(msg);
  }

  function fmtPhone(p) {
    return String(p || "").trim();
  }

  async function confirmDeleteAddress(a) {
    var who = (a && a.name) || "";
    var msg = who ? "确定删除" + who + "的收货地址吗？删除后不可恢复。" : "确定删除该收货地址吗？删除后不可恢复。";
    if ($ && $.showModalConfirm) {
      return await $.showModalConfirm(msg, { title: "删除地址", confirmText: "删除", cancelText: "取消", danger: true });
    }
    return confirm("确认删除该地址？");
  }

  async function upsertAddress(mode, existingAddress) {
    var openFn = ($.addressModal && $.addressModal.open) || null;
    var setSubmittingFn = ($.addressModal && $.addressModal.setSubmitting) || function () {};
    if (!openFn) {
      showMsg("缺少地址弹窗组件（/static/address_modal.js）");
      return;
    }

    var values = await openFn({ mode: mode, initial: existingAddress || {} });
    if (!values) return;

    var action = mode === "edit" ? "receiver_edit" : "receiver_add";
    var mobileOrPhone = values.mobile || values.phone || "";
    var payload = {
      name: values.name,
      company: values.company || "",
      postCode: values.postCode,
      mailBox: "",
      mobile: values.mobile || mobileOrPhone,
      phone: values.phone || mobileOrPhone,
      countryCode: values.countryCode,
      prov: values.prov,
      city: values.city,
      area: values.area,
      address: values.address,
    };
    if (mode === "edit" && existingAddress && existingAddress.address_id != null) {
      payload.address_id = Number(existingAddress.address_id);
    }

    setSubmittingFn(true);
    try {
      var resp = await $.apiPost("/api/wholesales/users.php?action=" + action, $.withAuth(payload));
      if (String(resp.code) === "2") {
        $.clearAuth();
        showMsg("登录已失效，请重新登录", { autoCloseMs: 900 });
        location.replace("/login.html");
        return;
      }
      if (String(resp.code) === "0") {
        await loadAddresses();
        showMsg(mode === "edit" ? "编辑成功" : "新增成功", { autoCloseMs: 1200 });
      } else {
        showMsg((resp && resp.msg) || (mode === "edit" ? "编辑失败" : "新增失败"));
      }
    } finally {
      setSubmittingFn(false);
    }
  }

  var cached = { listHost: null, header: null, pager: null, rowTemplate: null };

  function ensureTemplates() {
    if (cached.listHost && cached.rowTemplate) return cached;

    var listHost = document.querySelector(".group_6");
    if (!listHost) return cached;
    cached.listHost = listHost;
    cached.header = listHost.querySelector(".text-wrapper_3") || null;
    cached.pager = listHost.querySelector(".block_9") || null;
    if (cached.pager) cached.pager.style.display = "none";

    var tplRow = listHost.querySelector(".block_4") || listHost.querySelector(".block_5") || null;
    if (!tplRow) return cached;
    cached.rowTemplate = tplRow.cloneNode(true);
    return cached;
  }

  function clearRows(keep) {
    ensureTemplates();
    var listHost = cached.listHost;
    if (!listHost) return;
    keep = keep || [];
    var children = Array.prototype.slice.call(listHost.children || []);
    children.forEach(function (el) {
      if (keep.indexOf(el) >= 0) return;
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
  }

  function fillItem(itemEl, a) {
    if (!itemEl) return;

    var nameLine = itemEl.querySelector("span[class^='paragraph_']") || itemEl.querySelector("span.paragraph_1");
    var addrLine = itemEl.querySelector("span[class^='text_']") || null;

    // Pick the second text span as address line when possible.
    try {
      var spans = itemEl.querySelectorAll("span");
      if (spans && spans.length >= 2) addrLine = spans[1];
    } catch (e) {}

    var name = (a && a.name) || "";
    var phone = (a && (a.mobile || a.phone)) || "";
    if (nameLine) {
      nameLine.textContent = name + "  " + fmtPhone(phone);
      nameLine.style.display = "block";
      nameLine.style.whiteSpace = "nowrap";
      nameLine.style.textOverflow = "ellipsis";
      nameLine.style.overflow = "hidden";
    }

    var addr = "";
    if (a) {
      addr =
        ((a.prov || "").trim() + " " + (a.city || "").trim() + " " + (a.area || "").trim() + " " + (a.address || "").trim())
          .replace(/\s+/g, " ")
          .trim();
    }
    if (addrLine) {
      addrLine.textContent = addr;
      addrLine.style.display = "block";
      addrLine.style.wordBreak = "break-word";
    }

    var actionWrap =
      itemEl.querySelector("div[class^='text-wrapper_'][class*='flex-col']") ||
      itemEl.querySelector("div[class*='text-wrapper_'][class*='flex-col']");
    var editBtn = null;
    var delBtn = null;
    if (actionWrap) {
      var btns = actionWrap.querySelectorAll("span");
      if (btns && btns[0]) editBtn = btns[0];
      if (btns && btns[1]) delBtn = btns[1];
    }

    if (editBtn) {
      editBtn.textContent = "修改";
      editBtn.style.cursor = a && a.address_id ? "pointer" : "default";
      editBtn.onclick = function (e) {
        e.stopPropagation();
        if (!a || !a.address_id) return;
        upsertAddress("edit", a);
      };
    }
    if (delBtn) {
      delBtn.textContent = "删除";
      delBtn.style.cursor = a && a.address_id ? "pointer" : "default";
      delBtn.onclick = async function (e) {
        e.stopPropagation();
        if (!a || !a.address_id) return;
        if (!(await confirmDeleteAddress(a))) return;
        var resp = await $.apiPost("/api/wholesales/user.php?action=receiver_drop", $.withAuth({ address_id: Number(a.address_id) }));
        if (String(resp.code) === "2") {
          $.clearAuth();
          showMsg("登录已失效，请重新登录", { autoCloseMs: 900 });
          location.replace("/login.html");
          return;
        }
        if (String(resp.code) === "0") {
          await loadAddresses();
          showMsg("删除成功", { autoCloseMs: 1200 });
        } else {
          showMsg((resp && resp.msg) || "删除失败");
        }
      };
    }
  }

  function renderStatus(message) {
    ensureTemplates();
    if (!cached.listHost || !cached.rowTemplate) return;
    clearRows([cached.header, cached.pager]);

    var row = cached.rowTemplate.cloneNode(true);
    var left = row.querySelector(".group_7") || row.firstElementChild;
    var right = row.querySelector(".group_8") || row.lastElementChild;

    fillItem(left, { name: String(message || ""), mobile: "", phone: "", prov: "", city: "", area: "", address: "" });

    // Hide actions for status rows.
    try {
      row.style.justifyContent = "center";
      row.style.gap = "0";

      left.style.display = "flex";
      left.style.alignItems = "center";
      left.style.justifyContent = "center";
      left.style.paddingLeft = "16px";
      left.style.paddingRight = "16px";
      left.style.width = "100%";

      var actionWrap =
        left.querySelector("div[class^='text-wrapper_'][class*='flex-col']") || left.querySelector("div[class*='text-wrapper_'][class*='flex-col']");
      if (actionWrap) actionWrap.style.display = "none";
      var addr = left.querySelector("span[class^='text_']") || null;
      if (addr) addr.textContent = "";

      var nameLine = left.querySelector("span[class^='paragraph_']") || left.querySelector("span.paragraph_1");
      if (nameLine) {
        nameLine.style.width = "auto";
        nameLine.style.textAlign = "center";
      }
    } catch (e) {}

    if (right) right.style.display = "none";
    cached.listHost.insertBefore(row, cached.pager || null);
  }

  function renderAddresses(addrs) {
    ensureTemplates();
    if (!cached.listHost || !cached.rowTemplate) return;
    clearRows([cached.header, cached.pager]);

    addrs = addrs || [];
    if (addrs && !Array.isArray(addrs)) addrs = [addrs];
    if (!addrs.length) {
      renderStatus("暂时没有地址");
      return;
    }

    for (var i = 0; i < addrs.length; i += 2) {
      var row = cached.rowTemplate.cloneNode(true);
      var left = row.querySelector(".group_7") || row.firstElementChild;
      var right = row.querySelector(".group_8") || row.lastElementChild;
      fillItem(left, addrs[i]);
      if (addrs[i + 1]) {
        fillItem(right, addrs[i + 1]);
        if (right) right.style.display = "";
      } else if (right) {
        right.style.display = "none";
      }
      cached.listHost.insertBefore(row, cached.pager || null);
    }
  }

  async function loadAddresses() {
    renderStatus("正在请求数据");
    var resp = await $.apiPost("/api/wholesales/users.php?action=receiver_lists", $.withAuth({}));
    if (String(resp.code) === "2") {
      $.clearAuth();
      showMsg("登录已失效，请重新登录", { autoCloseMs: 900 });
      location.replace("/login.html");
      return;
    }
    if (String(resp.code) !== "0") {
      showMsg((resp && resp.msg) || "加载地址失败");
      renderStatus("暂时没有地址");
      return;
    }

    var addrs = (resp.data && (resp.data.list || resp.data.lists || resp.data)) || [];
    if (addrs && !Array.isArray(addrs)) addrs = [addrs];
    renderAddresses(addrs);
  }

  function wireAddAddress() {
    var add = document.querySelector("[data-role='addr-add']");
    if (!add) return;
    add.style.cursor = "pointer";
    add.addEventListener("click", function () {
      upsertAddress("add", {});
    });
  }

  wireAddAddress();
  // Default state before request
  renderStatus("暂时没有地址");
  loadAddresses();
})();
