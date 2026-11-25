// إعدادات المتجر — نفس قيم جدول store_settings في السكيما (مصدر واحد للأرقام:
// مدة الاسترجاع وحد الشحن المجاني ورقم الواتساب لازم ييجوا من نفس الإعداد اللي
// بيحسب بيه التشيك أوت، عشان صفحة الثقة والتشيك أوت مايتناقضوش — حزمة 6).
// لحد ربط القاعدة، القيم دي قيم بداية وبيتظبطوا من لوحة التحكم لما تتربط.
export const RETURN_DAYS = 14
export const REFUND_DAYS = 5
// رقم واتساب المتجر بصيغة دولية من غير + — قيمة بداية، الأدمن بيظبطها من الإعدادات
export const STORE_WHATSAPP = '201001234567'
export const STORE_HOURS = 'بنرد من ١٠ الصبح لـ١٠ بالليل'

export const STATUS_LABELS: Record<string, string> = {
  new: 'جديد',
  confirmed: 'تم التأكيد',
  preparing: 'بيجهّز',
  shipped: 'اتشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
  returned: 'مرتجع',
  delivery_failed: 'فشل التسليم',
}

// خط التتبع الرئيسي (حزمة 2) — الحالات النهائية بتوقف الخط عندها
export const TRACK_STEPS = ['new', 'confirmed', 'preparing', 'shipped', 'delivered']
export const TERMINAL_STATUSES = ['cancelled', 'returned']

export const CANCEL_REASON_LABELS: Record<string, string> = {
  customer_request: 'طلب العميل',
  no_answer: 'العميل مش بيرد',
  wrong_number: 'الرقم غلط',
  duplicate: 'طلب مكرر',
  out_of_stock: 'نفد قبل الشحن',
  address_problem: 'مشكلة في العنوان',
  shipping_disagreement: 'رفض سعر الشحن',
  other: 'سبب تاني',
}
