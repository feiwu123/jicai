(function () {
  var $ = window.picai;
  var auth = $.requireAuth();
  if (!auth) return;

  function makeNavClick(el, href) {
    if (!el) return;
    el.style.cursor = "pointer";
    el.addEventListener("click", function () {
      var target = $.toUrl ? $.toUrl(href) : href;
      location.href = target;
    });
  }

  makeNavClick(document.querySelector(".box_11"), "/yuanxing/goods_list/index.html");
  makeNavClick(document.querySelector(".block_5"), "/yuanxing/orders_list/index.html");
  makeNavClick(document.querySelector("[data-nav='address_manage']"), "/yuanxing/lanhu_dizhiguanli/index.html");
  makeNavClick(document.querySelector(".section_2"), "/yuanxing/cart/index.html");

  // Avatar-side settings icon -> logout dropdown
  try {
    var avatar = document.querySelector("img.label_2");
    var settings = avatar && avatar.parentNode ? avatar.parentNode.querySelector("img.thumbnail_2") : null;
    $.mountLogoutMenu(settings);
  } catch (e) {}

  function getOrderId() {
    try {
      var u = new URL(location.href);
      return (u.searchParams.get("order_id") || "").trim();
    } catch (e) {
      return "";
    }
  }

  async function load() {
    var orderId = getOrderId();
    if (!orderId) return;
    var resp = await $.apiPost("/api/wholesales/orders.php?action=info", $.withAuth({ order_id: orderId }));
    if (String(resp.code) !== "0") return;
    var d = resp.data || {};

    // Fill some obvious fields if present; keep prototype layout.
    var title = document.querySelector(".text_2");
    if (title) title.textContent = "物流/订单信息";
    var sn = document.querySelector("span.text_9") || document.querySelector("span.text_17");
    if (sn && d.order_sn) sn.textContent = "订单号：" + d.order_sn;
  }

  load();
})();
