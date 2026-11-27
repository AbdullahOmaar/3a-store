// طبقة بيانات لوحة التحكم (دفعة 5 — حزمة 4) على التخزين المحلي بنفس أشكال
// السكيما: آلة انتقالات مطابقة لتريجر قاعدة البيانات، مخزون بسجل حركات،
// وإعدادات متجر واحدة بيقرأ منها التشيك أوت وصفحات الثقة (لا أرقام مكررة).
import { governorates } from './governorates'
import type { LocalOrder } from '../lib/orders'

const SETTINGS_KEY = '3a-store-admin-settings'
const STOCK_KEY = '3a-store-stock'
const STOCK_LOG_KEY = '3a-store-stock-log'
const PRODUCT_EDITS_KEY = '3a-store-product-edits'

// ---------- إعدادات المتجر (مصدر واحد) ----------
export interface StoreConfig {
  threshold: number
  whatsapp: string
  returnDays: number
  confirmationMessage: string
  fees: Record<string, { fee: number; days: string }>
}

export function getStoreConfig(): StoreConfig {
  const base: StoreConfig = {
    threshold: 1000,
    whatsapp: '201001234567',
    returnDays: 14,
    confirmationMessage: 'هنأكد طلبك تليفونيًا/واتساب قبل الشحن، والدفع كاش عند الاستلام',
    fees: {},
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...base, ...JSON.parse(raw) }
  } catch { /* تجاهل */ }
  return base
}

export function saveStoreConfig(cfg: StoreConfig) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(cfg))
}

export function effectiveGovernorates() {
  const cfg = getStoreConfig()
  return governorates.map((g) => {
    const o = cfg.fees[g.name]
    return o ? { ...g, fee: o.fee, days: o.days } : g
  })
}

// ---------- المخزون: قيم مطلقة فوق بيانات العرض + سجل حركات ----------
type StockMap = Record<string, number>
export interface StockMovement {
  at: string
  slug: string
  size: string
  color: string
  delta: number
  reason: string
}

export const stockKey = (slug: string, size: string, color: string) => `${slug}|${size}|${color}`

function getStockMap(): StockMap {
  try {
    return JSON.parse(localStorage.getItem(STOCK_KEY) ?? '{}') as StockMap
  } catch {
    return {}
  }
}

export function stockValue(slug: string, size: string, color: string, fallback: number): number {
  const map = getStockMap()
  const v = map[stockKey(slug, size, color)]
  return typeof v === 'number' ? v : fallback
}

export function adjustStock(slug: string, size: string, color: string, current: number, delta: number, reason: string): number {
  const next = Math.max(0, current + delta)
  const map = getStockMap()
  map[stockKey(slug, size, color)] = next
  localStorage.setItem(STOCK_KEY, JSON.stringify(map))
  const log = getStockLog()
  log.unshift({ at: new Date().toISOString(), slug, size, color, delta: next - current, reason })
  localStorage.setItem(STOCK_LOG_KEY, JSON.stringify(log.slice(0, 200)))
  return next
}

export function getStockLog(): StockMovement[] {
  try {
    return JSON.parse(localStorage.getItem(STOCK_LOG_KEY) ?? '[]') as StockMovement[]
  } catch {
    return []
  }
}

// ---------- تعديلات المنتجات من اللوحة (إخفاء/تعديل — مفيش حذف نهائي) ----------
export interface ProductEdit {
  name?: string
  price?: number
  priceBefore?: number | null
  material?: string
  description?: string
  hidden?: boolean
}

export function getProductEdits(): Record<string, ProductEdit> {
  try {
    return JSON.parse(localStorage.getItem(PRODUCT_EDITS_KEY) ?? '{}') as Record<string, ProductEdit>
  } catch {
    return {}
  }
}

export function saveProductEdit(slug: string, edit: ProductEdit) {
  const all = getProductEdits()
  all[slug] = { ...all[slug], ...edit }
  localStorage.setItem(PRODUCT_EDITS_KEY, JSON.stringify(all))
}

// ---------- آلة انتقالات الطلب: نفس قواعد تريجر القاعدة حرفيًا ----------
export const ALLOWED: Record<string, string[]> = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'delivery_failed', 'returned'],
  delivery_failed: ['shipped', 'returned', 'cancelled'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
}

export function saveOrder(order: LocalOrder) {
  localStorage.setItem(`3a-store-order-${order.number}`, JSON.stringify(order))
}

export interface TransitionOpts {
  reasonCode?: string
  reasonNote?: string
  contactAttempts?: number
  trackingNumber?: string
  shippingCompany?: string
}

export function transitionOrder(order: LocalOrder, to: string, opts: TransitionOpts = {}): string | null {
  const from = order.status
  if (!(ALLOWED[from] ?? []).includes(to)) return `مينفعش الطلب يتحرك من ${from} إلى ${to}`
  if (to === 'shipped' && from === 'delivery_failed' && (order.deliveryAttempts ?? 0) >= 2) {
    return 'محاولات التسليم خلصت (مرتين بالكتير)'
  }
  if ((to === 'preparing' || to === 'shipped') && !order.confirmedWithCustomer) {
    return 'أكّد الطلب مع العميل الأول (تليفون/واتساب)'
  }
  if (to === 'cancelled') {
    if (!opts.reasonCode) return 'اختار سبب الإلغاء الأول'
    if (opts.reasonCode === 'other' && (opts.reasonNote ?? '').trim().length < 10) {
      return 'سبب الإلغاء «تاني» محتاج توضيح 10 حروف على الأقل'
    }
    if (opts.reasonCode === 'no_answer' && (opts.contactAttempts ?? order.contactAttempts ?? 0) < 3) {
      return '«العميل مش بيرد» محتاجة 3 محاولات اتصال موثقة على الأقل'
    }
  }
  if (opts.trackingNumber !== undefined) order.trackingNumber = opts.trackingNumber
  if (opts.shippingCompany !== undefined) order.shippingCompany = opts.shippingCompany
  if (opts.contactAttempts !== undefined) order.contactAttempts = opts.contactAttempts
  if (to === 'delivery_failed') order.deliveryAttempts = (order.deliveryAttempts ?? 0) + 1
  if (to === 'cancelled') {
    order.cancelReason = opts.reasonCode
    order.cancelNote = opts.reasonNote
    // استرجاع المخزون للإلغاء قبل الشحن — نفس سلوك التريجر
    if (['new', 'confirmed', 'preparing'].includes(from)) {
      for (const it of order.items) {
        const cur = stockValue(it.slug, it.size, it.color, 0)
        adjustStock(it.slug, it.size, it.color, cur, it.qty, 'cancel_return')
      }
    }
  }
  order.status = to
  order.history = [
    ...order.history,
    {
      from,
      to,
      at: new Date().toISOString(),
      actor: 'admin' as const,
      reason: opts.reasonCode,
      note: opts.reasonNote,
    },
  ]
  saveOrder(order)
  return null
}

export function markConfirmed(order: LocalOrder, channel: 'phone' | 'whatsapp'): LocalOrder {
  order.confirmedWithCustomer = true
  order.confirmationChannel = channel
  order.history = [
    ...order.history,
    {
      from: order.status,
      to: order.status,
      at: new Date().toISOString(),
      actor: 'admin' as const,
      note: channel === 'whatsapp' ? 'تم التأكيد واتساب' : 'تم التأكيد تليفون',
    },
  ]
  saveOrder(order)
  return order
}
