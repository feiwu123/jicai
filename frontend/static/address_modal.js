(function () {
  var $ = window.picai;
  if (!$) return;

  function showMsg(msg, opts) {
    if ($ && $.showModalMessage) return $.showModalMessage(msg, opts || {});
    alert(msg);
  }

  function ensureAddressModalStyle() {
    var styleId = "picaiAddressModalStyle";
    if (document.getElementById(styleId)) return;
    var style = document.createElement("style");
    style.id = styleId;
    style.textContent =
      "" +
      ".addr-modal-overlay{position:fixed;inset:0;z-index:10050;display:none;align-items:flex-start;justify-content:flex-end;padding:24px;box-sizing:border-box;background:rgba(0,0,0,0.6)}" +
      ".addr-modal-panel{width:595px;max-width:calc(100vw - 48px);height:min(1032px, calc(100vh - 48px));overflow:auto;background:rgba(255,255,255,1);border-radius:16px;box-sizing:border-box;padding:24px}" +
      ".addr-modal-header{display:flex;align-items:center;justify-content:space-between;gap:12px}" +
      ".addr-modal-title{color:rgba(24,31,39,1);font-size:18px;font-family:PingFang HK-Semibold;font-weight:600;white-space:nowrap;line-height:18px}" +
      ".addr-modal-close{width:24px;height:24px;border:0;background:transparent;cursor:pointer;font-size:20px;line-height:24px;color:rgba(24,31,39,1)}" +
      ".addr-modal-form{margin-top:18px;display:flex;flex-direction:column;gap:12px}" +
      ".addr-modal-row{display:flex;gap:12px}" +
      ".addr-modal-field{flex:1;display:flex;flex-direction:column;gap:8px;min-width:0}" +
      ".addr-modal-label{display:flex;align-items:center;gap:4px;color:rgba(0,0,0,1);font-size:14px;font-family:PingFang SC-Regular;line-height:16px}" +
      ".addr-modal-label .req{color:rgba(247,63,123,1)}" +
      ".addr-modal-input{width:100%;height:50px;padding:0 12px;box-sizing:border-box;border-radius:8px;border:1px solid transparent;background:rgba(242,243,247,1);font-size:14px;outline:none}" +
      ".addr-modal-input:focus{background:rgba(255,255,255,1);border-color:rgba(59,131,246,0.55)}" +
      ".addr-modal-actions{display:flex;gap:16px;margin-top:12px}" +
      ".addr-modal-cancel,.addr-modal-submit{flex:1;height:50px;border-radius:8px;border:0;cursor:pointer;font-size:16px;font-family:PingFang HK-Medium;font-weight:500}" +
      ".addr-modal-cancel{background:rgba(242,243,247,1);color:rgba(24,31,39,1)}" +
      ".addr-modal-submit{background:rgba(59,131,246,1);color:rgba(255,255,255,1)}";
    document.head.appendChild(style);
  }

  function ensureAddressModal() {
    ensureAddressModalStyle();

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

  $.addressModal = {
    open: openAddressModal,
    setSubmitting: setAddressSubmitting,
  };
})();

