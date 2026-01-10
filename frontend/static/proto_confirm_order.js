(function () {
  var $ = window.picai;
  var auth = $.requireAuth();
  if (!auth) return;
  var cachedConfirmTpl = null;
  var cachedAddressTpl = null;
  var cachedAddressUiDisplay = { list: null, card: null };
  var cachedAddressActions = { add: null, topm: null };
  var lastCartGroups = [];
  var isSubmitting = false;

  function makeNavClick(el, href) {
    if (!el) return;
    el.style.cursor = "pointer";
    el.addEventListener("click", function () {
      location.href = href;
    });
  }

  makeNavClick(document.querySelector(".box_14"), "/yuanxing/orders_list/index.html");
  makeNavClick(document.querySelector("[data-nav='address_manage']"), "/yuanxing/lanhu_dizhiguanli/index.html");
  makeNavClick(document.querySelector(".block_3"), "/yuanxing/goods_list/index.html");
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

  function showMsg(msg, opts) {
    if ($ && $.showModalMessage) return $.showModalMessage(msg, opts || {});
    alert(msg);
  }

  async function confirmDeleteAddress(a) {
    var who = (a && a.name) ? "「" + String(a.name) + "」" : "";
    var msg = who ? "确定删除" + who + "的收货地址吗？删除后不可恢复。" : "确定删除该收货地址吗？删除后不可恢复。";
    if ($ && $.showModalConfirm) {
      return await $.showModalConfirm(msg, { title: "删除地址", confirmText: "删除", cancelText: "取消", danger: true });
    }
    return confirm("确认删除该地址？");
  }

  function ensureAddressModal() {
    var modalId = "picaiAddressUpsertModal";
    var modal = document.getElementById(modalId);
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = modalId;
    modal.className = "addr-modal-overlay";
    modal.style.display = "none";
    modal.innerHTML =
      "" +
      '<div class="addr-modal-panel" role="dialog" aria-modal="true">' +
      '  <div class="addr-modal-header">' +
      '    <div class="addr-modal-title" data-role="title">新增地址</div>' +
      '    <button type="button" class="addr-modal-close" data-role="close" aria-label="关闭">×</button>' +
      "  </div>" +
      '  <form class="addr-modal-form" data-role="form">' +
      '    <div class="addr-modal-row">' +
      '      <div class="addr-modal-field">' +
      '        <div class="addr-modal-label"><span class="req">*</span><span>收件人姓名</span></div>' +
      '        <input class="addr-modal-input" data-role="name" autocomplete="name" />' +
      "      </div>" +
      '      <div class="addr-modal-field">' +
      '        <div class="addr-modal-label"><span>收件公司名称</span></div>' +
      '        <input class="addr-modal-input" data-role="company" autocomplete="organization" />' +
      "      </div>" +
      "    </div>" +
      '    <div class="addr-modal-row">' +
      '      <div class="addr-modal-field">' +
      '        <div class="addr-modal-label"><span class="req">*</span><span>手机号</span></div>' +
      '        <input class="addr-modal-input" data-role="mobile" autocomplete="tel" />' +
      "      </div>" +
      '      <div class="addr-modal-field">' +
      '        <div class="addr-modal-label"><span>收件电话</span></div>' +
      '        <input class="addr-modal-input" data-role="phone" autocomplete="tel" />' +
      "      </div>" +
      "    </div>" +
      '    <div class="addr-modal-row">' +
      '      <div class="addr-modal-field">' +
      '        <div class="addr-modal-label"><span class="req">*</span><span>国家三字码</span></div>' +
      '        <input class="addr-modal-input" data-role="countryCode" placeholder="如：MEX" />' +
      "      </div>" +
      '      <div class="addr-modal-field">' +
      '        <div class="addr-modal-label"><span class="req">*</span><span>邮政编码</span></div>' +
      '        <input class="addr-modal-input" data-role="postCode" autocomplete="postal-code" />' +
      "      </div>" +
      "    </div>" +
      '    <div class="addr-modal-row">' +
      '      <div class="addr-modal-field">' +
      '        <div class="addr-modal-label"><span class="req">*</span><span>州/省</span></div>' +
      '        <input class="addr-modal-input" data-role="prov" />' +
      "      </div>" +
      '      <div class="addr-modal-field">' +
      '        <div class="addr-modal-label"><span class="req">*</span><span>城市</span></div>' +
      '        <input class="addr-modal-input" data-role="city" />' +
      "      </div>" +
      "    </div>" +
      '    <div class="addr-modal-row">' +
      '      <div class="addr-modal-field">' +
      '        <div class="addr-modal-label"><span class="req">*</span><span>区域</span></div>' +
      '        <input class="addr-modal-input" data-role="area" />' +
      "      </div>" +
      '      <div class="addr-modal-field">' +
      '        <div class="addr-modal-label"><span class="req">*</span><span>详细地址</span></div>' +
      '        <input class="addr-modal-input" data-role="address" autocomplete="street-address" />' +
      "      </div>" +
      "    </div>" +
      '    <div class="addr-modal-actions">' +
      '      <button type="button" class="addr-modal-cancel" data-role="cancel">取消</button>' +
      '      <button type="submit" class="addr-modal-submit" data-role="submit">确认</button>' +
      "    </div>" +
      "  </form>" +
      "</div>";

    document.body.appendChild(modal);
    return modal;
  }

  function ensureAddressSubmittingMask() {
    var maskId = "picaiAddressSubmittingMask";
    var mask = document.getElementById(maskId);
    if (mask) return mask;

    mask = document.createElement("div");
    mask.id = maskId;
    mask.style.position = "fixed";
    mask.style.inset = "0";
    mask.style.zIndex = "10060";
    mask.style.display = "none";
    mask.style.alignItems = "center";
    mask.style.justifyContent = "center";
    mask.style.background = "rgba(0,0,0,0.55)";
    mask.style.padding = "24px";

    var panel = document.createElement("div");
    panel.style.width = "min(360px, 92vw)";
    panel.style.background = "rgba(255,255,255,0.98)";
    panel.style.border = "1px solid rgba(0,0,0,0.08)";
    panel.style.borderRadius = "14px";
    panel.style.boxShadow = "0 18px 60px rgba(0,0,0,0.22)";
    panel.style.padding = "18px";
    panel.style.fontFamily =
      "system-ui, -apple-system, Segoe UI, Roboto, Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif";

    var text = document.createElement("div");
    text.textContent = "正在提交…";
    text.style.fontSize = "14px";
    text.style.color = "#1f2a44";
    text.style.lineHeight = "1.5";
    text.style.wordBreak = "break-word";
    text.style.textAlign = "center";

    panel.appendChild(text);
    mask.appendChild(panel);
    document.body.appendChild(mask);
    return mask;
  }

  function setAddressSubmitting(isSubmitting) {
    var mask = ensureAddressSubmittingMask();
    mask.style.display = isSubmitting ? "flex" : "none";
  }

  function openAddressModal(opts) {
    opts = opts || {};
    var mode = opts.mode || "add";
    var initial = opts.initial || {};
    var modal = ensureAddressModal();

    function qs(role) {
      return modal.querySelector("[data-role='" + role + "']");
    }

    var titleEl = qs("title");
    var closeBtn = qs("close");
    var cancelBtn = qs("cancel");
    var form = qs("form");
    var submitBtn = qs("submit");

    var nameEl = qs("name");
    var companyEl = qs("company");
    var mobileEl = qs("mobile");
    var phoneEl = qs("phone");
    var countryCodeEl = qs("countryCode");
    var postCodeEl = qs("postCode");
    var provEl = qs("prov");
    var cityEl = qs("city");
    var areaEl = qs("area");
    var addressEl = qs("address");

    if (titleEl) titleEl.textContent = mode === "edit" ? "编辑地址" : "新增地址";
    if (submitBtn) submitBtn.textContent = mode === "edit" ? "保存" : "确认";

    function setVal(el, v) {
      if (!el) return;
      el.value = v == null ? "" : String(v);
    }

    setVal(nameEl, initial.name || "");
    setVal(companyEl, initial.company || "");
    setVal(mobileEl, initial.mobile || initial.phone || "");
    setVal(phoneEl, initial.phone || "");
    setVal(countryCodeEl, initial.countryCode || initial.country_code || "MEX");
    setVal(postCodeEl, initial.postCode || initial.post_code || "");
    setVal(provEl, initial.prov || "");
    setVal(cityEl, initial.city || "");
    setVal(areaEl, initial.area || "");
    setVal(addressEl, initial.address || "");

    modal.style.display = "flex";
    setTimeout(function () {
      if (nameEl) nameEl.focus();
    }, 0);

    return new Promise(function (resolve) {
      function cleanup() {
        modal.removeEventListener("click", onOverlayClick);
        if (closeBtn) closeBtn.removeEventListener("click", onCancel);
        if (cancelBtn) cancelBtn.removeEventListener("click", onCancel);
        if (form) form.removeEventListener("submit", onSubmit);
        document.removeEventListener("keydown", onKeydown);
      }

      function close(result) {
        cleanup();
        modal.style.display = "none";
        resolve(result || null);
      }

      function onOverlayClick(e) {
        if (e.target === modal) close(null);
      }

      function onKeydown(e) {
        if (e.key === "Escape") close(null);
      }

      function onCancel(e) {
        e.preventDefault();
        close(null);
      }

      function readTrim(el) {
        return (el && el.value ? String(el.value) : "").trim();
      }

      function onSubmit(e) {
        e.preventDefault();
        var values = {
          name: readTrim(nameEl),
          company: readTrim(companyEl),
          mobile: readTrim(mobileEl),
          phone: readTrim(phoneEl),
          countryCode: readTrim(countryCodeEl) || "MEX",
          postCode: readTrim(postCodeEl),
          prov: readTrim(provEl),
          city: readTrim(cityEl),
          area: readTrim(areaEl),
          address: readTrim(addressEl),
        };

        if (!values.name) return showMsg("请填写收件人姓名");
        if (!values.mobile && !values.phone) return showMsg("手机号/收件电话至少填写一个");
        if (!values.postCode) return showMsg("请填写邮政编码");
        if (!values.prov) return showMsg("请填写州/省");
        if (!values.city) return showMsg("请填写城市");
        if (!values.area) return showMsg("请填写区域");
        if (!values.address) return showMsg("请填写详细地址");

        close(values);
      }

      modal.addEventListener("click", onOverlayClick);
      if (closeBtn) closeBtn.addEventListener("click", onCancel);
      if (cancelBtn) cancelBtn.addEventListener("click", onCancel);
      if (form) form.addEventListener("submit", onSubmit);
      document.addEventListener("keydown", onKeydown);
    });
  }

  async function upsertAddress(mode, existingAddress) {
    var openFn = ($.addressModal && $.addressModal.open) || openAddressModal;
    var setSubmittingFn = ($.addressModal && $.addressModal.setSubmitting) || setAddressSubmitting;

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
        loadAddresses();
        showMsg(mode === "edit" ? "编辑成功" : "新增成功", { autoCloseMs: 3000 });
      } else {
        showMsg((resp && resp.msg) || (mode === "edit" ? "编辑失败" : "新增失败"), { autoCloseMs: 3000 });
      }
    } finally {
      setSubmittingFn(false);
    }
  }

  function ensureSubmitProgressModal() {
    var modalId = "picaiSubmitProgressModal";
    var modal = document.getElementById(modalId);
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = modalId;
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.zIndex = "10003";
    modal.style.background = "rgba(0,0,0,0.55)";
    modal.style.display = "none";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.padding = "24px";

    var panel = document.createElement("div");
    panel.id = "picaiSubmitProgressPanel";
    panel.style.width = "min(520px, 94vw)";
    panel.style.maxHeight = "min(560px, 86vh)";
    panel.style.overflow = "hidden";
    panel.style.background = "rgba(255,255,255,0.98)";
    panel.style.border = "1px solid rgba(0,0,0,0.08)";
    panel.style.borderRadius = "16px";
    panel.style.boxShadow = "0 20px 70px rgba(0,0,0,0.28)";
    panel.style.fontFamily =
      "system-ui, -apple-system, Segoe UI, Roboto, Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif";

    var header = document.createElement("div");
    header.style.padding = "16px 16px 12px";
    header.style.borderBottom = "1px solid rgba(15,23,42,0.08)";

    var title = document.createElement("div");
    title.id = "picaiSubmitProgressTitle";
    title.textContent = "正在提交订单";
    title.style.fontSize = "16px";
    title.style.fontWeight = "800";
    title.style.color = "#0f172a";

    var sub = document.createElement("div");
    sub.id = "picaiSubmitProgressSub";
    sub.textContent = "请勿关闭页面，按店铺依次提交中…";
    sub.style.marginTop = "6px";
    sub.style.fontSize = "13px";
    sub.style.color = "#64748b";
    sub.style.lineHeight = "1.4";

    header.appendChild(title);
    header.appendChild(sub);

    var body = document.createElement("div");
    body.id = "picaiSubmitProgressBody";
    body.style.padding = "12px 16px 16px";
    body.style.maxHeight = "calc(min(560px, 86vh) - 64px)";
    body.style.overflow = "auto";

    var list = document.createElement("div");
    list.id = "picaiSubmitProgressList";
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "10px";

    body.appendChild(list);
    panel.appendChild(header);
    panel.appendChild(body);
    modal.appendChild(panel);
    document.body.appendChild(modal);

    return modal;
  }

  function setSubmitProgress(steps) {
    var modal = ensureSubmitProgressModal();
    var list = modal.querySelector("#picaiSubmitProgressList");
    var sub = modal.querySelector("#picaiSubmitProgressSub");
    if (!list) return;
    list.innerHTML = "";

    var done = steps.filter(function (s) {
      return s.status === "done";
    }).length;
    var fail = steps.filter(function (s) {
      return s.status === "fail";
    }).length;
    var total = steps.length;
    if (sub) sub.textContent = "进度：" + done + "/" + total + "（失败 " + fail + "）";

    steps.forEach(function (s, idx) {
      var row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.gap = "10px";
      row.style.padding = "12px 12px";
      row.style.borderRadius = "12px";
      row.style.border = "1px solid rgba(15,23,42,0.10)";
      row.style.background = "rgba(249,250,252,1)";

      var left = document.createElement("div");
      left.style.display = "flex";
      left.style.flexDirection = "column";
      left.style.gap = "4px";
      left.style.minWidth = "0";

      var name = document.createElement("div");
      name.textContent = (idx + 1) + ". " + (s.shopName || "店铺");
      name.style.fontSize = "14px";
      name.style.fontWeight = "700";
      name.style.color = "#0f172a";
      name.style.whiteSpace = "nowrap";
      name.style.overflow = "hidden";
      name.style.textOverflow = "ellipsis";

      var meta = document.createElement("div");
      meta.textContent = s.detail || "";
      meta.style.fontSize = "12px";
      meta.style.color = "#64748b";
      meta.style.whiteSpace = "pre-line";

      left.appendChild(name);
      if (s.detail) left.appendChild(meta);

      var badge = document.createElement("div");
      badge.textContent =
        s.status === "doing" ? "提交中…" : s.status === "done" ? "已完成" : s.status === "fail" ? "失败" : "等待中";
      badge.style.flexShrink = "0";
      badge.style.fontSize = "12px";
      badge.style.fontWeight = "700";
      badge.style.padding = "6px 10px";
      badge.style.borderRadius = "999px";
      badge.style.border = "1px solid rgba(15,23,42,0.12)";
      badge.style.background = "rgba(255,255,255,1)";
      badge.style.color = "#0f172a";

      if (s.status === "doing") {
        badge.style.border = "1px solid rgba(106,124,255,0.28)";
        badge.style.background = "rgba(106,124,255,0.10)";
        badge.style.color = "#2f3dd9";
      } else if (s.status === "done") {
        badge.style.border = "1px solid rgba(29,153,111,0.28)";
        badge.style.background = "rgba(29,153,111,0.10)";
        badge.style.color = "#0f7a56";
      } else if (s.status === "fail") {
        badge.style.border = "1px solid rgba(232,69,122,0.28)";
        badge.style.background = "rgba(232,69,122,0.10)";
        badge.style.color = "#c21f55";
      }

      row.appendChild(left);
      row.appendChild(badge);
      list.appendChild(row);
    });
  }

  function showSubmitProgress(steps) {
    var modal = ensureSubmitProgressModal();
    setSubmitProgress(steps);
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  function hideSubmitProgress() {
    var modal = document.getElementById("picaiSubmitProgressModal");
    if (!modal) return;
    modal.style.display = "none";
    document.body.style.overflow = "";
  }

  function getCartValue() {
    try {
      var u = new URL(location.href);
      return (u.searchParams.get("cart_value") || "").trim();
    } catch (e) {
      return "";
    }
  }

  var cartValue = getCartValue();
  if (!cartValue) {
    showMsg("缺少 cart_value，请从购物车进入");
  }

  function findAddressList() {
    return document.querySelector(".list_4");
  }

  function findSelectedAddressCard() {
    return document.querySelector(".group_6");
  }

  function parseAddressTemplate(list) {
    if (cachedAddressTpl) return cachedAddressTpl;
    if (!list) return null;
    var tpl = list.querySelector("[class^='list-items_']");
    cachedAddressTpl = tpl ? tpl.cloneNode(true) : null;
    return cachedAddressTpl;
  }

  function clearList(list) {
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);
  }

  function setAddressUiVisible(hasAddresses) {
    var list = findAddressList();
    var card = findSelectedAddressCard();
    var bar = document.querySelector(".group_12");

    if (list && cachedAddressUiDisplay.list == null) cachedAddressUiDisplay.list = list.style.display || "";
    if (card && cachedAddressUiDisplay.card == null) cachedAddressUiDisplay.card = card.style.display || "";

    // Prototype has a separate action bar (.group_12) and a "selected address" card (.group_6).
    // We render everything in the same list below, so keep them hidden to avoid duplicates/layout issues.
    if (bar) bar.style.display = "none";
    if (card) card.style.display = "none";

    // Keep the list visible: it always contains "新增地址" + "TOPM收货仓" (and then user addresses).
    if (list) list.style.display = cachedAddressUiDisplay.list;
  }

  function makeSpecialAddressItem(label, onClick) {
    var list = findAddressList();
    var tpl = parseAddressTemplate(list);
    if (!tpl) return null;
    var item = tpl.cloneNode(true);
    item.style.cursor = onClick ? "pointer" : "default";
    item.style.textAlign = "left";
    item.style.margin = "0";

    var nameEl = item.querySelector("span[class^='text_17']") || item.querySelector("span");
    var editEl = item.querySelector("[data-role='addr-edit']");
    var delEl = item.querySelector("[data-role='addr-delete']") || item.querySelector("span[class^='text_18']");
    var phoneEl = item.querySelector("span[class^='text_19']");
    var addrEl = item.querySelector("span[class^='text_20']");

    if (nameEl) nameEl.textContent = label;
    if (editEl) editEl.style.display = "none";
    if (delEl) delEl.style.display = "none";
    if (phoneEl) phoneEl.style.display = "none";
    if (addrEl) addrEl.style.display = "none";

    if (onClick) {
      item.addEventListener("click", function (e) {
        e.stopPropagation();
        onClick();
      });
    }

    return item;
  }

  function getAddressActionNodes() {
    if (cachedAddressActions.add || cachedAddressActions.topm) return cachedAddressActions;

    // Use the original prototype cards so styling matches "新增地址" / "TOPM收货仓".
    // They start under .group_12, but we move them into the address list for sequential layout.
    var add = document.querySelector(".group_5");
    var topm = document.querySelector(".text-wrapper_2");

    if (add) {
      add.style.marginLeft = "0";
      add.style.marginRight = "0";
      add.style.marginTop = "0";
      add.style.marginBottom = "0";
    }
    if (topm) {
      // Let the 3-column grid control spacing.
      topm.style.marginLeft = "0";
      topm.style.marginRight = "0";
      topm.style.marginTop = "0";
      topm.style.marginBottom = "0";
    }

    cachedAddressActions.add = add || null;
    cachedAddressActions.topm = topm || null;
    return cachedAddressActions;
  }

  function fillSelectedAddressCard(a) {
    var card = findSelectedAddressCard();
    if (!card) return;

    card.style.textAlign = "left";
    var cardBlock = card.querySelector(".block_5") || card;
    cardBlock.style.textAlign = "left";

    var nameEl = card.querySelector("span.text_13") || card.querySelector("span[class^='text_13']");
    var editEl = card.querySelector("[data-role='addr-edit']");
    var delEl = card.querySelector("[data-role='addr-delete']") || card.querySelector("span.text_14") || card.querySelector("span[class^='text_14']");
    var phoneEl = card.querySelector("span.text_15") || card.querySelector("span[class^='text_15']");
    var addrEl = card.querySelector("span.text_16") || card.querySelector("span[class^='text_16']");

    if (nameEl) nameEl.textContent = (a && a.name) || "";
    if (phoneEl) phoneEl.textContent = (a && (a.mobile || a.phone)) || "";
    if (addrEl) {
      addrEl.textContent =
        ((a && a.prov) || "") + " " + ((a && a.city) || "") + " " + ((a && a.area) || "") + " " + ((a && a.address) || "");
      addrEl.style.textAlign = "left";
      addrEl.style.wordBreak = "break-word";
    }

    if (delEl) {
      var canDelete = !!(a && a.address_id);
      delEl.style.display = canDelete ? "" : "none";
      delEl.style.cursor = "pointer";
      delEl.onclick = async function (e) {
        e.stopPropagation();
        if (!a || !a.address_id) return;
        if (!(await confirmDeleteAddress(a))) return;
        var resp = await $.apiPost("/api/wholesales/user.php?action=receiver_drop", $.withAuth({ address_id: Number(a.address_id) }));
        if (String(resp.code) === "0") {
          loadAddresses();
        } else {
          alert((resp && resp.msg) || "删除失败");
        }
      };
    }

    if (editEl) {
      editEl.style.display = a && a.address_id ? "" : "none";
      editEl.style.cursor = "pointer";
      editEl.onclick = function (e) {
        e.stopPropagation();
        if (!a || !a.address_id) return;
        upsertAddress("edit", a);
      };
    }
  }

  var selectedAddressId = "";
  function renderAddresses(addrs) {
    var list = findAddressList();
    var tpl = parseAddressTemplate(list);
    if (!list || !tpl) return;

    // 3 columns per row; wrap to new rows without horizontal scrolling.
    list.style.display = "grid";
    list.style.gridTemplateColumns = "377px 377px 377px";
    list.style.columnGap = "16px";
    list.style.rowGap = "16px";
    list.style.height = "auto";
    list.style.overflow = "visible";

    addrs = addrs || [];
    if (addrs && !Array.isArray(addrs)) addrs = [addrs];

    setAddressUiVisible(true);
    clearList(list);

    var actions = getAddressActionNodes();
    if (actions.add) list.appendChild(actions.add);
    if (actions.topm) list.appendChild(actions.topm);

    // Fallback if prototype nodes are missing for some reason.
    if (!actions.add) {
      var addItem = makeSpecialAddressItem("新增地址", function () {
        upsertAddress("add", {});
      });
      if (addItem) list.appendChild(addItem);
    }
    if (!actions.topm) {
      var topmItem = makeSpecialAddressItem("TOPM收货仓", null);
      if (topmItem) list.appendChild(topmItem);
    }

    if (!addrs.length) {
      selectedAddressId = "";
      return;
    }

    if (selectedAddressId) {
      var selectedExists = addrs.some(function (x) {
        return String(x && x.address_id) === String(selectedAddressId);
      });
      if (!selectedExists) selectedAddressId = "";
    }

    addrs.forEach(function (a, idx) {
      var item = tpl.cloneNode(true);
      item.style.cursor = "pointer";
      item.style.textAlign = "left";
      item.style.margin = "0";

      var nameEl = item.querySelector("span[class^='text_17']") || item.querySelector("span");
      var editEl = item.querySelector("[data-role='addr-edit']");
      var delEl = item.querySelector("[data-role='addr-delete']") || item.querySelector("span[class^='text_18']");
      if (delEl && !delEl.getAttribute("data-role")) delEl.setAttribute("data-role", "addr-delete");
      if (!editEl) {
        editEl = document.createElement("span");
        editEl.className = "addr-edit-btn";
        editEl.textContent = "编辑";
        editEl.setAttribute("data-role", "addr-edit");
        if (delEl) {
          if (delEl.parentNode && delEl.parentNode.classList && delEl.parentNode.classList.contains("addr-item-actions")) {
            delEl.parentNode.insertBefore(editEl, delEl);
          } else {
            var actionWrap = document.createElement("div");
            actionWrap.className = "addr-item-actions flex-row";
            delEl.parentNode.insertBefore(actionWrap, delEl);
            actionWrap.appendChild(editEl);
            actionWrap.appendChild(delEl);
          }
        }
      }
      var phoneEl = item.querySelector("span[class^='text_19']");
      var addrEl = item.querySelector("span[class^='text_20']");

      if (nameEl) nameEl.textContent = a.name || "";
      if (phoneEl) phoneEl.textContent = a.mobile || a.phone || "";
      if (addrEl) {
        addrEl.textContent = (a.prov || "") + " " + (a.city || "") + " " + (a.area || "") + " " + (a.address || "");
        addrEl.style.textAlign = "left";
        addrEl.style.wordBreak = "break-word";
      }

      item.setAttribute("data-address-id", String(a.address_id || ""));

      function select() {
        selectedAddressId = String(a.address_id || "");
        window.picai.qsa("[data-address-id]").forEach(function (el) {
          el.style.outline = "none";
          el.style.borderRadius = "10px";
        });
        item.style.outline = "2px solid rgba(106,124,255,0.55)";
      }

      item.addEventListener("click", function (e) {
        if (e.target === delEl || e.target === editEl) return;
        select();
      });

      if (!selectedAddressId && idx === 0) select();

      if (editEl) {
        if (!a.address_id) {
          editEl.style.display = "none";
        } else {
          editEl.style.display = "";
          editEl.style.cursor = "pointer";
          editEl.addEventListener("click", function (e) {
            e.stopPropagation();
            upsertAddress("edit", a);
          });
        }
      }

      if (delEl) {
        if (!a.address_id) {
          delEl.style.display = "none";
        } else {
          delEl.style.display = "";
          delEl.style.cursor = "pointer";
          delEl.addEventListener("click", async function (e) {
            e.stopPropagation();
            if (!(await confirmDeleteAddress(a))) return;
            var resp = await $.apiPost(
              "/api/wholesales/user.php?action=receiver_drop",
              $.withAuth({ address_id: Number(a.address_id) })
            );
            if (String(resp.code) === "0") {
              loadAddresses();
            } else {
              alert((resp && resp.msg) || "删除失败");
            }
          });
        }
      }

      list.appendChild(item);
    });

    if (selectedAddressId) {
      var selected = addrs.find(function (x) {
        return String(x && x.address_id) === String(selectedAddressId);
      });
      if (selected) fillSelectedAddressCard(selected);
    }
  }

  async function loadAddresses() {
    var resp = await $.apiPost("/api/wholesales/users.php?action=receiver_lists", $.withAuth({}));
    if (String(resp.code) === "2") {
      $.clearAuth();
      showMsg("登录已失效，请重新登录", { autoCloseMs: 900 });
      location.replace("/login.html");
      return;
    }
    if (String(resp.code) !== "0") {
      setAddressUiVisible(false);
      showMsg((resp && resp.msg) || "加载地址失败");
      renderAddresses([]);
      return;
    }
    var addrs = (resp.data && resp.data.lists) || resp.data || [];
    if (addrs && !Array.isArray(addrs)) addrs = [addrs];
    renderAddresses(addrs);
  }

  function findConfirmArea() {
    return document.querySelector(".group_8");
  }

  function parseConfirmTemplates(area) {
    if (cachedConfirmTpl) return cachedConfirmTpl;
    if (!area) return null;
    var title = area.querySelector("span.text_31");
    var shopHeader = area.querySelector(".box_5") || area.querySelector(".box_8");
    var itemRow = area.querySelector(".box_6") || area.querySelector(".box_15") || area.querySelector(".box_16");
    if (!title || !shopHeader || !itemRow) return null;
    cachedConfirmTpl = { title: title, shopHeader: shopHeader.cloneNode(true), itemRow: itemRow.cloneNode(true) };
    return cachedConfirmTpl;
  }

  function clearConfirmArea(area, titleEl) {
    if (!area) return;
    var kids = Array.prototype.slice.call(area.children);
    kids.forEach(function (k) {
      if (titleEl && k === titleEl) return;
      area.removeChild(k);
    });
  }

  function computeSkuCount(groups) {
    var seen = {};
    var n = 0;
    (groups || []).forEach(function (g) {
      var items = (g && g.lists) || [];
      if (items && !Array.isArray(items)) items = [items];
      items.forEach(function (it) {
        var gid = String((it && (it.goods_id || it.goods_sn || it.rec_id)) || "");
        if (!gid) return;
        if (seen[gid]) return;
        seen[gid] = true;
        n += 1;
      });
    });
    return n;
  }

  function fillRightSummary(total, skuCount) {
    var goodsAmount = total && (total.goods_amount || total.goodsAmount);
    var goodsNum = total && (total.goods_num || total.goodsNum);

    var goodsAmountEl = document.querySelector("span.text_23");
    if (goodsAmountEl && goodsAmount != null) goodsAmountEl.textContent = String(goodsAmount);
    var goodsNumEl = document.querySelector("span.text_25");
    if (goodsNumEl && goodsNum != null) goodsNumEl.textContent = String(goodsNum);
    var skuEl = document.querySelector("span.text_27");
    if (skuEl && skuCount != null) skuEl.textContent = String(skuCount);
    var totalEl = document.querySelector("span.text_29");
    if (totalEl && goodsAmount != null) totalEl.textContent = String(goodsAmount);
  }

  function setRightSummaryEmpty() {
    fillRightSummary({ goods_amount: "暂无", goods_num: "暂无" }, "暂无");
  }

  function ensureConfirmEmpty(area, titleEl) {
    if (!area) return;
    var existing = area.querySelector("#picaiConfirmEmpty");
    if (existing) return;

    var empty = document.createElement("div");
    empty.id = "picaiConfirmEmpty";
    empty.textContent = "暂无信息";
    empty.style.width = "1163px";
    empty.style.height = "140px";
    empty.style.margin = "16px 0 0 0";
    empty.style.display = "flex";
    empty.style.alignItems = "center";
    empty.style.justifyContent = "center";
    empty.style.border = "1px dashed rgba(15,23,42,0.18)";
    empty.style.borderRadius = "14px";
    empty.style.background = "rgba(249,250,252,1)";
    empty.style.color = "rgba(84,98,116,1)";
    empty.style.fontSize = "14px";
    empty.style.letterSpacing = "0.2px";

    area.appendChild(empty);
    if (titleEl && titleEl.parentNode !== area) area.insertBefore(titleEl, empty);
  }

  function removeConfirmEmpty(area) {
    if (!area) return;
    var existing = area.querySelector("#picaiConfirmEmpty");
    if (existing) existing.parentNode.removeChild(existing);
  }

  function hasConfirmItems(groups) {
    var has = false;
    (groups || []).forEach(function (g) {
      if (has) return;
      var items = (g && g.lists) || [];
      if (items && !Array.isArray(items)) items = [items];
      if (items && items.length) has = true;
    });
    return has;
  }

  function fillShopHeader(node, shop) {
    if (!node) return;
    var nameEl = node.querySelector("span.text-group_2") || node.querySelector("span.text-group_5") || node.querySelector("span");
    if (nameEl) nameEl.textContent = (shop && shop.shop_name) || "店铺";
  }

  function fillItemRow(node, it) {
    if (!node) return;
    var img = node.querySelector("img.image_1") || node.querySelector("img.image_2") || node.querySelector("img.image_3") || node.querySelector("img");
    if (img && it && it.goods_thumb) img.src = it.goods_thumb;

    var nameEl = node.querySelector("span.text_32") || node.querySelector("span.text_39") || node.querySelector("span.text_46") || node.querySelector("span");
    if (nameEl) nameEl.textContent = (it && it.goods_name) || "";
    if (nameEl) {
      // Allow product names to wrap (prototype CSS uses nowrap + fixed height).
      nameEl.style.whiteSpace = "normal";
      nameEl.style.height = "auto";
      nameEl.style.lineHeight = "18px";
      nameEl.style.wordBreak = "break-word";
    }

    // Use second line as SKU when present
    var skuEl = node.querySelector("span.text_33") || node.querySelector("span.text_40") || node.querySelector("span.text_47");
    if (skuEl) skuEl.textContent = "SKU:" + ((it && it.goods_sn) || "");

    // Clear third line if exists
    var line3 = node.querySelector("span.text_34") || node.querySelector("span.text_41") || node.querySelector("span.text_48");
    if (line3) {
      line3.textContent = "";
      line3.style.display = "none";
    }

    var priceEl = node.querySelector("span.text_36") || node.querySelector("span.text_43") || node.querySelector("span.text_50");
    if (priceEl) priceEl.textContent = (it && it.goods_price) || "";

    var qtyEl = node.querySelector("span.text_37") || node.querySelector("span.text_44") || node.querySelector("span.text_51");
    if (qtyEl) qtyEl.textContent = "×" + String((it && it.goods_number) || "1");

    var amountEl = node.querySelector("span.text_38") || node.querySelector("span.text_45") || node.querySelector("span.text_52");
    if (amountEl) amountEl.textContent = (it && it.goods_amount) || "";
  }

  function renderConfirmGoods(groups) {
    var area = findConfirmArea();
    var tpl = parseConfirmTemplates(area);
    if (!area || !tpl) return;

    clearConfirmArea(area, tpl.title);
    if (tpl.title && tpl.title.parentNode !== area) area.appendChild(tpl.title);

    if (!hasConfirmItems(groups)) {
      ensureConfirmEmpty(area, tpl.title);
      return;
    }
    removeConfirmEmpty(area);

    (groups || []).forEach(function (g) {
      var shop = (g && g.shop) || {};
      var shopHeader = tpl.shopHeader.cloneNode(true);
      fillShopHeader(shopHeader, shop);
      area.appendChild(shopHeader);

      var items = (g && g.lists) || [];
      if (items && !Array.isArray(items)) items = [items];
      items.forEach(function (it) {
        var row = tpl.itemRow.cloneNode(true);
        fillItemRow(row, it || {});
        area.appendChild(row);
      });
    });
  }

  async function loadCartPreview() {
    if (!cartValue) {
      lastCartGroups = [];
      setRightSummaryEmpty();
      renderConfirmGoods([]);
      return;
    }
    var resp = await $.apiPost("/api/wholesales/goods.php?action=get_cart", $.withAuth({ cart_value: cartValue }));
    if (String(resp.code) === "2") {
      $.clearAuth();
      showMsg("登录已失效，请重新登录", { autoCloseMs: 900 });
      location.replace("/login.html");
      return;
    }
    if (String(resp.code) !== "0") {
      lastCartGroups = [];
      showMsg((resp && resp.msg) || "加载确认订单信息失败");
      setRightSummaryEmpty();
      renderConfirmGoods([]);
      return;
    }

    var groups = (resp.data && resp.data.goods) || [];
    if (groups && !Array.isArray(groups)) groups = [groups];
    lastCartGroups = groups || [];

    renderConfirmGoods(groups);
    var skuCount = computeSkuCount(groups);
    fillRightSummary(resp.data && resp.data.total, skuCount);
  }

  async function createOrder() {
    if (!cartValue) return;
    if (isSubmitting) return;
    if (!selectedAddressId) {
      showMsg("请选择收货地址");
      return;
    }

    var groups = lastCartGroups || [];
    if (!groups.length) {
      showMsg("暂无可提交的商品信息，请稍后重试");
      return;
    }

    // One shop per request, sequentially.
    var steps = [];
    groups.forEach(function (g) {
      var shop = (g && g.shop) || {};
      var shopName = shop.shop_name || shop.shopName || "店铺";
      var items = (g && g.lists) || [];
      if (items && !Array.isArray(items)) items = [items];
      var recIds = (items || [])
        .map(function (it) {
          return it && (it.rec_id || it.recId);
        })
        .filter(function (x) {
          return x != null && String(x).trim() !== "";
        })
        .map(function (x) {
          return String(x);
        });
      if (!recIds.length) return;
      steps.push({ shopName: shopName, status: "pending", recIds: recIds, detail: "商品数：" + recIds.length });
    });

    if (!steps.length) {
      showMsg("暂无可提交的商品信息，请稍后重试");
      return;
    }

    var submitBtn = document.querySelector("span.text_30");
    var originalBtnText = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
      submitBtn.textContent = "提交中…";
      submitBtn.style.pointerEvents = "none";
      submitBtn.style.opacity = "0.75";
    }

    isSubmitting = true;
    showSubmitProgress(steps);

    var results = [];
    var failures = [];
    try {
      for (var i = 0; i < steps.length; i += 1) {
        steps[i].status = "doing";
        steps[i].detail = "商品数：" + steps[i].recIds.length + "\n正在提交…";
        setSubmitProgress(steps);

        var resp = await $.apiPost(
          "/api/wholesales/goods.php?action=done",
          $.withAuth({ done_cart_value: steps[i].recIds.join(","), address_id: String(selectedAddressId) })
        );

        if (String(resp.code) === "2") {
          $.clearAuth();
          hideSubmitProgress();
          showMsg("登录已失效，请重新登录", { autoCloseMs: 900 });
          location.replace("/login.html");
          return;
        }

        if (String(resp.code) === "0" && resp.data && resp.data.order_id) {
          steps[i].status = "done";
          steps[i].detail = "商品数：" + steps[i].recIds.length + "\n订单号：" + String(resp.data.order_id);
          results.push({ shopName: steps[i].shopName, orderId: String(resp.data.order_id), count: steps[i].recIds.length });
        } else {
          steps[i].status = "fail";
          steps[i].detail = "商品数：" + steps[i].recIds.length + "\n原因：" + String((resp && resp.msg) || "提交失败");
          failures.push({ shopName: steps[i].shopName, msg: String((resp && resp.msg) || "提交失败") });
        }
        setSubmitProgress(steps);
      }
    } finally {
      isSubmitting = false;
      if (submitBtn) {
        submitBtn.textContent = originalBtnText || "提交";
        submitBtn.style.pointerEvents = "";
        submitBtn.style.opacity = "";
      }
      hideSubmitProgress();
    }

    var lines = [];
    lines.push("店铺数：" + steps.length);
    lines.push("成功：" + results.length + "，失败：" + failures.length);
    if (results.length) {
      lines.push("");
      lines.push("已提交订单：");
      results.forEach(function (r, idx) {
        lines.push((idx + 1) + ". " + r.shopName + "  订单号：" + r.orderId + "  商品数：" + r.count);
      });
    }
    if (failures.length) {
      lines.push("");
      lines.push("失败明细：");
      failures.forEach(function (f, idx) {
        lines.push((idx + 1) + ". " + f.shopName + "  " + f.msg);
      });
    }

    if ($ && $.showModalConfirm) {
      var go = await $.showModalConfirm(lines.join("\n"), {
        title: "提交完成",
        confirmText: "查看订单",
        cancelText: "关闭",
        danger: false,
        dismissible: false,
      });
      if (go) location.replace("/yuanxing/orders_list/index.html");
      return;
    }

    showMsg(lines.join("\n"));
  }

  function wireSubmit() {
    var btn = document.querySelector("span.text_30");
    if (!btn) return;
    btn.style.cursor = "pointer";
    btn.addEventListener("click", function () {
      createOrder();
    });
  }

  function wireAddAddress() {
    var btn = document.querySelector(".group_5");
    if (!btn) return;
    btn.style.cursor = "pointer";
    btn.addEventListener("click", function () {
      upsertAddress("add", {});
    });
  }

  wireSubmit();
  wireAddAddress();
  // Clear prototype placeholder address blocks until real data is loaded.
  (function initAddressUi() {
    renderAddresses([]);
    renderConfirmGoods([]);
    setRightSummaryEmpty();
  })();
  loadAddresses();
  loadCartPreview();
})();
