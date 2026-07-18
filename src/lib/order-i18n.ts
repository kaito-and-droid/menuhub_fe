export type OrderLocale = "en" | "vi";

export const ORDER_LOCALES: OrderLocale[] = ["en", "vi"];
export const DEFAULT_ORDER_LOCALE: OrderLocale = "en";

function isOrderLocale(v: string | null | undefined): v is OrderLocale {
  return v === "en" || v === "vi";
}

/** Maps an app locale to a BCP-47 tag for Intl date/time formatting. */
const INTL_LOCALES: Record<OrderLocale, string> = {
  en: "en-SG",
  vi: "vi-VN",
};

export function intlLocale(locale: OrderLocale): string {
  return INTL_LOCALES[locale] ?? "en-SG";
}

/** Locale-aware short time, e.g. "3:45 PM" / "15:45". */
export function formatOrderTime(value: string | Date, locale: OrderLocale): string {
  return new Date(value).toLocaleTimeString(intlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Locale-aware short date. */
export function formatOrderDate(value: string | Date, locale: OrderLocale): string {
  return new Date(value).toLocaleDateString(intlLocale(locale));
}

/** Locale-aware date + time. */
export function formatOrderDateTime(value: string | Date, locale: OrderLocale): string {
  return new Date(value).toLocaleString(intlLocale(locale));
}

export function resolveOrderLocale(search: string): {
  locale: OrderLocale;
  fromQuery: boolean;
} {
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(search).get("lang");
    if (isOrderLocale(q)) return { locale: q, fromQuery: true };
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isOrderLocale(stored)) return { locale: stored, fromQuery: false };
  }
  return { locale: DEFAULT_ORDER_LOCALE, fromQuery: false };
}

const LOCALE_STORAGE_KEY = "menuhub_order_locale";

export function persistOrderLocale(locale: OrderLocale) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }
}

type Dict = Record<string, string>;

const en: Dict = {
  "order_online": "Order online",
  "shop_not_found": "Shop not found.",
  "order_placed": "Order placed!",
  "at_shop": "at {shop}",
  "you_saved": "You saved {amount}",
  "ready_around": "Ready around {time}",
  "member_saved": "Member details saved — next order is one tap away",
  "pay_with_paynow": "Pay with PayNow",
  "paynow_help": "Scan with any Singapore banking app — the amount and order reference are already filled in. The shop confirms your payment shortly after.",
  "paynow_ref": "Ref {order}",
  "track_order": "Track your order",
  "get_messenger": "Get updates on Messenger",
  "order_else": "Order something else",
  "min_prep": "~{min} min prep",
  "welcome_back": "Welcome back, {name}",
  "promotions": "Promotions",
  "until": "Until {date}",
  "categories": "Categories",
  "add": "Add",
  "item_one": "{n} item",
  "item_other": "{n} items",
  "checkout": "Checkout",
  "promo_applied": "−{amount} promo",
  "add_more_nudge": "Add {amount} more for {label}",
  "your_order": "Your order",
  "back_to_menu": "Back to menu",
  "remove_one": "Remove one {label}",
  "add_one": "Add one {label}",
  "promotion": "Promotion",
  "your_details": "Your details",
  "not_you_clear": "Not {name}? Clear",
  "name": "Name",
  "phone": "Phone number",
  "email_optional": "Email (optional)",
  "become_member": "Become a member — it's free",
  "become_member_help": "We'll remember your details on this device for one-tap checkout, and the shop can reward you as a returning customer. Untick to order as a guest.",
  "receive_it": "Receive it",
  "pickup": "Pickup",
  "delivery": "Delivery",
  "delivery_address": "Delivery address",
  "postal_code": "Postal code ({hint})",
  "postal_hint_sgd": "6 digits",
  "postal_hint_other": "5-6 digits",
  "pay_with": "Pay with",
  "paynow_after": "You'll get a PayNow QR to scan with your banking app after placing the order.",
  "notes_optional": "Notes (optional)",
  "notes_placeholder": "e.g. less sugar, call on arrival…",
  "placing_order": "Placing your order…",
  "place_order": "Place order · {amount}",
  "loading": "Loading…",
  "order_not_found": "Order not found",
  "order": "Order",
  "awaiting_paynow": "Awaiting PayNow payment",
  "awaiting_paynow_help": "Scan with your banking app if you haven't paid yet.",
  "payment_received": "Payment received",
  "order_cancelled": "This order was cancelled.",
  "step_received": "Received",
  "step_preparing": "Preparing",
  "step_ready": "Ready for you",
  "step_done": "Done",
  "updates_auto": "Updates automatically · placed {time}",
  "language": "Language",
  "currency_label": "Currency",
  "menu_layout": "Menu layout",
  "layout_grid": "Grid view",
  "layout_list": "List view",
  "view_details": "View details for {label}",
  "close": "Close",
  "choose_option": "Choose an option",
  "decrease_qty": "Decrease quantity",
  "increase_qty": "Increase quantity",
  "add_to_cart": "Add to cart · {amount}",
  "update_cart": "Update cart · {amount}",
  "phone_hint": "We'll use this to update you about your order.",
  "err_name_required": "Please enter your name.",
  "err_phone_required": "Please enter your phone number.",
  "err_phone_invalid": "Please enter a valid phone number.",
  "err_email_invalid": "Please enter a valid email address.",
  "err_address_required": "Please enter your delivery address.",
  "err_postal_required": "Please enter your postal code.",
  "err_postal_invalid": "Please enter a valid postal code.",
  "status_now": "Order status: {status}",
  "load_error_title": "Couldn't load the menu",
  "load_error_help": "Something went wrong. Please check your connection and try again.",
  "try_again": "Try again",
  "menu_empty_title": "Nothing on the menu yet",
  "menu_empty_help": "This shop hasn't added any items. Please check back soon.",
  "category_empty": "No items in this category yet.",
};

const vi: Dict = {
  "order_online": "Đặt hàng online",
  "shop_not_found": "Không tìm thấy cửa hàng.",
  "order_placed": "Đặt hàng thành công!",
  "at_shop": "tại {shop}",
  "you_saved": "Bạn tiết kiệm {amount}",
  "ready_around": "Sẵn sàng khoảng {time}",
  "member_saved": "Đã lưu thông tin thành viên — lần sau đặt chỉ một chạm",
  "pay_with_paynow": "Thanh toán qua PayNow",
  "paynow_help": "Quét bằng bất kỳ ứng dụng ngân hàng Singapore nào — số tiền và mã đơn hàng đã được điền sẵn. Cửa hàng sẽ xác nhận thanh toán của bạn ngay sau đó.",
  "paynow_ref": "Mã {order}",
  "track_order": "Theo dõi đơn hàng",
  "get_messenger": "Nhận cập nhật qua Messenger",
  "order_else": "Đặt món khác",
  "min_prep": "~{min} phút chuẩn bị",
  "welcome_back": "Chào mừng trở lại, {name}",
  "promotions": "Khuyến mãi",
  "until": "Đến {date}",
  "categories": "Danh mục",
  "add": "Thêm",
  "item_one": "{n} món",
  "item_other": "{n} món",
  "checkout": "Thanh toán",
  "promo_applied": "−{amount} khuyến mãi",
  "add_more_nudge": "Thêm {amount} nữa để được {label}",
  "your_order": "Đơn hàng của bạn",
  "back_to_menu": "Quay lại thực đơn",
  "remove_one": "Bớt 1 {label}",
  "add_one": "Thêm 1 {label}",
  "promotion": "Khuyến mãi",
  "your_details": "Thông tin của bạn",
  "not_you_clear": "Không phải {name}? Xóa",
  "name": "Tên",
  "phone": "Số điện thoại",
  "email_optional": "Email (tùy chọn)",
  "become_member": "Trở thành thành viên — miễn phí",
  "become_member_help": "Chúng tôi sẽ ghi nhớ thông tin của bạn trên thiết bị này để thanh toán một chạm, và cửa hàng có thể tặng ưu đãi cho khách quen. Bỏ chọn để đặt hàng khách.",
  "receive_it": "Nhận hàng",
  "pickup": "Tự đến lấy",
  "delivery": "Giao hàng",
  "delivery_address": "Địa chỉ giao hàng",
  "postal_code": "Mã bưu chính ({hint})",
  "postal_hint_sgd": "6 chữ số",
  "postal_hint_other": "5-6 chữ số",
  "pay_with": "Thanh toán bằng",
  "paynow_after": "Bạn sẽ nhận mã QR PayNow để quét bằng ứng dụng ngân hàng sau khi đặt hàng.",
  "notes_optional": "Ghi chú (tùy chọn)",
  "notes_placeholder": "vd: ít đường, gọi khi đến nơi…",
  "placing_order": "Đang đặt hàng…",
  "place_order": "Đặt hàng · {amount}",
  "loading": "Đang tải…",
  "order_not_found": "Không tìm thấy đơn hàng",
  "order": "Đơn hàng",
  "awaiting_paynow": "Chờ thanh toán PayNow",
  "awaiting_paynow_help": "Quét bằng ứng dụng ngân hàng nếu bạn chưa thanh toán.",
  "payment_received": "Đã nhận thanh toán",
  "order_cancelled": "Đơn hàng này đã bị hủy.",
  "step_received": "Đã nhận",
  "step_preparing": "Đang chuẩn bị",
  "step_ready": "Sẵn sàng",
  "step_done": "Hoàn tất",
  "updates_auto": "Tự động cập nhật · đặt lúc {time}",
  "language": "Ngôn ngữ",
  "currency_label": "Tiền tệ",
  "menu_layout": "Kiểu hiển thị",
  "layout_grid": "Lưới",
  "layout_list": "Danh sách",
  "view_details": "Xem chi tiết {label}",
  "close": "Đóng",
  "choose_option": "Chọn một tùy chọn",
  "decrease_qty": "Giảm số lượng",
  "increase_qty": "Tăng số lượng",
  "add_to_cart": "Thêm vào giỏ · {amount}",
  "update_cart": "Cập nhật giỏ · {amount}",
  "phone_hint": "Chúng tôi sẽ dùng số này để cập nhật đơn hàng cho bạn.",
  "err_name_required": "Vui lòng nhập tên của bạn.",
  "err_phone_required": "Vui lòng nhập số điện thoại.",
  "err_phone_invalid": "Vui lòng nhập số điện thoại hợp lệ.",
  "err_email_invalid": "Vui lòng nhập email hợp lệ.",
  "err_address_required": "Vui lòng nhập địa chỉ giao hàng.",
  "err_postal_required": "Vui lòng nhập mã bưu chính.",
  "err_postal_invalid": "Vui lòng nhập mã bưu chính hợp lệ.",
  "status_now": "Trạng thái đơn hàng: {status}",
  "load_error_title": "Không tải được thực đơn",
  "load_error_help": "Đã có lỗi xảy ra. Vui lòng kiểm tra kết nối và thử lại.",
  "try_again": "Thử lại",
  "menu_empty_title": "Chưa có món nào trong thực đơn",
  "menu_empty_help": "Cửa hàng này chưa thêm món nào. Vui lòng quay lại sau.",
  "category_empty": "Chưa có món nào trong danh mục này.",
};

const dicts: Record<OrderLocale, Dict> = { en, vi };

export function translate(locale: OrderLocale, key: string, vars?: Record<string, string | number>): string {
  let str = dicts[locale][key] ?? dicts.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}
