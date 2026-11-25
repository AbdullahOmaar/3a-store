// الكوبونات — مخزن محلي بنفس شكل جدول coupons في السكيما (حزمة P1-أ).
// التحقق بيحصل هنا (طبقة واحدة) وبيستخدمه العميل (السلة/التشيك أوت) والأدمن والتقارير،
// عشان القاعدة واحدة في كل حتة. لما القاعدة تتربط، الدوال دي بتتبدل باستعلامات.
import { sampleOrders } from './reports'
import { products } from './sample'

export interface Coupon {
  code: string
  type: 'percent' | 'fixed'
  value: number
  minOrder: number
  useLimit: number | null // حد الاستخدام الكلي — فاضي = بلا حد
  perCustomerLimit: number // افتراضي ١
  startsAt: string // YYYY-MM-DD
  endsAt: string
  status: 'active' | 'paused' // «منتهي» بيتحسب من التاريخ، مش حالة مخزنة
  categories: string[] // فاضي = يشمل الكل
}

export interface CouponUse {
  code: string
  phone: string
  orderNumber: string
  at: string
}

const COUPONS_KEY = '3a-store-coupons'
const USES_KEY = '3a-store-coupon-uses'

function defaultCoupons(): Coupon[] {
  return [
    { code: 'WELCOME10', type: 'percent', value: 10, minOrder: 300, useLimit: 100, perCustomerLimit: 1, startsAt: '2026-10-20', endsAt: '2026-12-31', status: 'active', categories: [] },
    { code: 'SALE15', type: 'percent', value: 15, minOrder: 500, useLimit: 50, perCustomerLimit: 1, startsAt: '2026-11-10', endsAt: '2026-11-30', status: 'active', categories: [] },
    { code: 'OLD5', type: 'percent', value: 5, minOrder: 0, useLimit: null, perCustomerLimit: 1, startsAt: '2026-10-01', endsAt: '2026-12-31', status: 'active', categories: [] },
  ]
}

export function getCoupons(): Coupon[] {
  try {
    const raw = localStorage.getItem(COUPONS_KEY)
    if (!raw) {
      const d = defaultCoupons()
      localStorage.setItem(COUPONS_KEY, JSON.stringify(d))
      return d
    }
    return JSON.parse(raw) as Coupon[]
  } catch {
    return defaultCoupons()
  }
}

export function saveCoupons(list: Coupon[]) {
  localStorage.setItem(COUPONS_KEY, JSON.stringify(list))
}

export function getCouponUses(): CouponUse[] {
  try {
    return JSON.parse(localStorage.getItem(USES_KEY) ?? '[]') as CouponUse[]
  } catch {
    return []
  }
}

// عدد مرات الاستخدام = استخدامات الطلبات التجريبية + الاستخدامات المحلية الحقيقية
export function couponUses(code: string): number {
  const sample = sampleOrders.filter((o) => o.coupon === code).length
  return sample + getCouponUses().filter((u) => u.code === code).length
}

export function couponStatus(c: Coupon): 'active' | 'paused' | 'expired' {
  if (c.status === 'paused') return 'paused'
  const today = new Date().toISOString().slice(0, 10)
  if (today > c.endsAt) return 'expired'
  if (today < c.startsAt) return 'paused' // لسه مابدأش — بيتعامل كموقوف لحد بدايته
  return 'active'
}

export function recordCouponUse(code: string, phone: string, orderNumber: string) {
  const uses = getCouponUses()
  uses.push({ code, phone, orderNumber, at: new Date().toISOString() })
  localStorage.setItem(USES_KEY, JSON.stringify(uses))
}

// التحقق الكامل للكود — نفس رسائل الخطأ بالمصري في كل حتة (حزمة P1-أ)
export function validateCoupon(
  rawCode: string,
  subtotal: number,
  slugs: string[],
  phone?: string,
): { ok: true; coupon: Coupon; discount: number } | { ok: false; error: string } {
  const code = rawCode.trim().toUpperCase()
  const c = getCoupons().find((x) => x.code === code)
  if (!c) return { ok: false, error: 'الكود ده مش موجود — راجعه وكتبه تاني' }
  const st = couponStatus(c)
  if (st === 'expired') return { ok: false, error: 'الكود ده خلصت مدته' }
  if (st === 'paused') return { ok: false, error: 'الكود ده مش شغال دلوقتي' }
  if (c.useLimit !== null && couponUses(code) >= c.useLimit)
    return { ok: false, error: 'الكود ده خلص عدد مرات استخدامه' }
  if (subtotal < c.minOrder)
    return { ok: false, error: `الكود ده بيشتغل على طلبات من ${c.minOrder} جنيه وانت طلبك ${subtotal} جنيه` }
  if (c.categories.length > 0) {
    const okSlugs = slugs.some((s) => {
      const p = products.find((x) => x.slug === s)
      return p && c.categories.includes(p.categorySlug)
    })
    if (!okSlugs) return { ok: false, error: 'الكود ده مش شغال على المنتجات اللي في سلتك' }
  }
  if (phone) {
    const used = getCouponUses().filter((u) => u.code === code && u.phone === phone).length
    if (used >= c.perCustomerLimit) return { ok: false, error: 'الكود ده اتطبق قبل كده على طلبك' }
  }
  const discount =
    c.type === 'percent' ? Math.round((subtotal * c.value) / 100) : Math.min(c.value, subtotal)
  return { ok: true, coupon: c, discount }
}

// تحقق حقول إنشاء/تعديل كود (رسائل الأدمن — حزمة P1-أ)
export function validateCouponFields(
  c: Coupon,
  existingCode?: string,
): string | null {
  if (!/^[A-Za-z0-9]{3,20}$/.test(c.code)) return 'الكود لازم يكون حروف وأرقام إنجليزي بس، من ٣ لـ٢٠ حرف'
  if (getCoupons().some((x) => x.code === c.code.toUpperCase() && x.code !== existingCode))
    return 'الكود ده موجود قبل كده'
  if (c.type === 'percent' && (c.value < 1 || c.value > 90)) return 'النسبة لازم تكون بين ١ و٩٠٪'
  if (c.type === 'fixed' && c.value <= 0) return 'المبلغ لازم يكون أكبر من صفر'
  if (c.minOrder < 0) return 'الحد الأدنى للطلب ماينفعش يكون بالسالب'
  if (c.endsAt < c.startsAt) return 'تاريخ النهاية لازم يكون بعد البداية'
  return null
}
