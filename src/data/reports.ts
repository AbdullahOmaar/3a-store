// بيانات عرض للتقارير — بنفس شكل جداول orders/order_items في السكيما.
// كل الأرقام في شاشات التقارير بتتحسب من المصفوفة دي (المبيعات = المسلّمة بس،
// والشحن منفصل دايمًا) — مفيش عدّادات محفوظة. التوليد حتمي (بذرة ثابتة) عشان
// الأرقام تبقى ثابتة بين كل تحميل. لما القاعدة تتربط، المصفوفة دي بتتبدل باستعلامات.
import { governorates } from './governorates'
import { products } from './sample'
import type { Coupon } from './coupons'

export interface ReportItem {
  slug: string
  size: string
  color: string
  price: number
  qty: number
}

export interface ReportOrder {
  number: string
  date: string // ISO
  status: 'delivered' | 'cancelled' | 'returned' | 'delivery_failed'
  governorate: string
  items: ReportItem[]
  shipping: number
  coupon?: string
  discount?: number
}

// حد إعادة الطلب اللي الأدمن حاطه لكل منتج (افتراضي ٥ — حزمة التقارير هـ٥)
export const REORDER_DEFAULT = 5
export const reorderThreshold: Record<string, number> = {
  'tshirt-basic': 5,
  'hoodie-winter': 5,
  'sport-shoes': 3,
}

function lcg(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

function buildOrders(): ReportOrder[] {
  const rnd = lcg(20261125)
  const govs = ['القاهرة', 'القاهرة', 'القاهرة', 'الجيزة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'الغربية', 'المنوفية', 'القليوبية', 'أسيوط', 'البحر الأحمر']
  const out: ReportOrder[] = []
  let n = 2001
  for (let dayAgo = 40; dayAgo >= 0; dayAgo--) {
    const count = dayAgo === 0 ? 1 : Math.floor(rnd() * 3) // 0–2 طلب في اليوم
    for (let k = 0; k < count; k++) {
      const p = products[Math.floor(rnd() * products.length)]
      const v = p.variants[Math.floor(rnd() * p.variants.length)]
      const qty = 1 + Math.floor(rnd() * 2)
      const gov = govs[Math.floor(rnd() * govs.length)]
      const fee = governorates.find((g) => g.name === gov)?.fee ?? 50
      const subtotal = p.price * qty
      const r = rnd()
      const status: ReportOrder['status'] = r < 0.82 ? 'delivered' : r < 0.92 ? 'cancelled' : r < 0.97 ? 'delivery_failed' : 'returned'
      const useCoupon = status === 'delivered' && rnd() < 0.3
      const coupon = useCoupon ? (rnd() < 0.7 ? 'WELCOME10' : 'SALE15') : undefined
      const discount = coupon === 'WELCOME10' ? Math.round(subtotal * 0.1) : coupon === 'SALE15' ? Math.round(subtotal * 0.15) : 0
      const d = new Date()
      d.setDate(d.getDate() - dayAgo)
      d.setHours(10 + Math.floor(rnd() * 10), Math.floor(rnd() * 60), 0, 0)
      out.push({
        number: String(n++),
        date: d.toISOString(),
        status,
        governorate: gov,
        items: [{ slug: p.slug, size: v.size, color: v.color, price: p.price, qty }],
        shipping: subtotal >= 1000 ? 0 : fee,
        coupon,
        discount: discount || undefined,
      })
    }
  }
  return out
}

export const sampleOrders: ReportOrder[] = buildOrders()

// ---------- حسابات (كلها من الطلبات الحقيقية في المصفوفة) ----------

export const delivered = (orders: ReportOrder[]) => orders.filter((o) => o.status === 'delivered')
export const orderProductsTotal = (o: ReportOrder) =>
  o.items.reduce((a, i) => a + i.price * i.qty, 0) - (o.discount ?? 0)

export function inRange(orders: ReportOrder[], from: Date, to: Date) {
  const f = from.getTime()
  const t = to.getTime() + 24 * 3600_000 - 1
  return orders.filter((o) => {
    const d = new Date(o.date).getTime()
    return d >= f && d <= t
  })
}

export function salesTotals(orders: ReportOrder[]) {
  const d = delivered(orders)
  return {
    sales: d.reduce((a, o) => a + orderProductsTotal(o), 0),
    orders: d.length,
    avg: d.length ? Math.round(d.reduce((a, o) => a + orderProductsTotal(o), 0) / d.length) : 0,
    shipping: d.reduce((a, o) => a + o.shipping, 0),
    cancelledCount: orders.filter((o) => o.status === 'cancelled').length,
    cancelledValue: orders
      .filter((o) => o.status === 'cancelled')
      .reduce((a, o) => a + o.items.reduce((x, i) => x + i.price * i.qty, 0), 0),
  }
}

export function dailySeries(orders: ReportOrder[], from: Date, to: Date) {
  const days: { date: string; orders: number; sales: number; shipping: number; cancelled: number; cancelledValue: number }[] = []
  const cur = new Date(from)
  cur.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(0, 0, 0, 0)
  while (cur <= end) {
    const day = inRange(orders, cur, cur)
    const t = salesTotals(day)
    days.push({
      date: cur.toISOString().slice(0, 10),
      orders: t.orders,
      sales: t.sales,
      shipping: t.shipping,
      cancelled: t.cancelledCount,
      cancelledValue: t.cancelledValue,
    })
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

export function byGovernorate(orders: ReportOrder[]) {
  const map = new Map<string, { orders: number; sales: number; failed: number; total: number }>()
  for (const o of orders) {
    const g = map.get(o.governorate) ?? { orders: 0, sales: 0, failed: 0, total: 0 }
    g.total++
    if (o.status === 'delivered') {
      g.orders++
      g.sales += orderProductsTotal(o)
    }
    if (o.status === 'delivery_failed') g.failed++
    map.set(o.governorate, g)
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v, failRate: v.total ? Math.round((v.failed / v.total) * 100) : 0 }))
    .sort((a, b) => b.sales - a.sales)
}

export interface BestRow {
  slug: string
  name: string
  emoji: string
  category: string
  qty: number
  sales: number
  topVariant: string
}

export function bestSellers(orders: ReportOrder[]) {
  const d = delivered(orders)
  const map = new Map<string, BestRow & { variants: Map<string, number> }>()
  for (const o of d) {
    for (const i of o.items) {
      const p = products.find((x) => x.slug === i.slug)
      if (!p) continue
      const row = map.get(i.slug) ?? {
        slug: i.slug, name: p.name, emoji: p.emoji, category: p.categorySlug, qty: 0, sales: 0, topVariant: '', variants: new Map(),
      }
      row.qty += i.qty
      row.sales += i.price * i.qty
      row.variants.set(`${i.size} / ${i.color}`, (row.variants.get(`${i.size} / ${i.color}`) ?? 0) + i.qty)
      map.set(i.slug, row)
    }
  }
  return [...map.values()]
    .map((r) => ({
      ...r,
      topVariant: [...r.variants.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—',
    }))
    .sort((a, b) => b.qty - a.qty)
}

export function couponStats(orders: ReportOrder[], coupons: Coupon[]) {
  const d = delivered(orders)
  return coupons.map((c) => {
    const used = d.filter((o) => o.coupon === c.code)
    const usedSales = used.reduce((a, o) => a + orderProductsTotal(o), 0)
    const noCoupon = d.filter((o) => !o.coupon)
    const avgWith = used.length ? Math.round(usedSales / used.length) : 0
    const avgWithout = noCoupon.length
      ? Math.round(noCoupon.reduce((a, o) => a + orderProductsTotal(o), 0) / noCoupon.length)
      : 0
    const createdDays = Math.floor((Date.now() - new Date(c.startsAt).getTime()) / 86400000)
    return {
      ...c,
      uses: used.length,
      discountTotal: used.reduce((a, o) => a + (o.discount ?? 0), 0),
      sales: usedSales,
      avgWith,
      avgWithout,
      unused: used.length === 0 && createdDays >= 14,
    }
  })
}

export interface InventoryRow {
  slug: string
  name: string
  emoji: string
  category: string
  size: string
  color: string
  stock: number
  lastSold: string | null
  status: 'out' | 'low' | 'ok'
}

export function inventoryRows(orders: ReportOrder[]): InventoryRow[] {
  const d = delivered(orders)
  const lastSold = new Map<string, string>()
  for (const o of d) {
    for (const i of o.items) {
      const k = `${i.slug}|${i.size}|${i.color}`
      if (!lastSold.get(k) || o.date > lastSold.get(k)!) lastSold.set(k, o.date)
    }
  }
  const rows: InventoryRow[] = []
  for (const p of products) {
    for (const v of p.variants) {
      rows.push({
        slug: p.slug,
        name: p.name,
        emoji: p.emoji,
        category: p.categorySlug,
        size: v.size,
        color: v.color,
        stock: v.stock,
        lastSold: lastSold.get(`${p.slug}|${v.size}|${v.color}`) ?? null,
        status: v.stock === 0 ? 'out' : v.stock <= 5 ? 'low' : 'ok',
      })
    }
  }
  return rows
}

export interface ReorderRow extends InventoryRow {
  threshold: number
  dailyAvg: number
  daysLeft: number | null
}

// قرارات الأدمن على التنبيهات — بتتحفظ محليًا (مين/إمتى/السبب) والتنبيه مايختفيش من نفسه
export interface ReorderDecision {
  action: 'ordered' | 'not_needed'
  at: string
  reason?: string
}
const REORDER_KEY = '3a-store-reorder-decisions'
export function getReorderDecisions(): Record<string, ReorderDecision> {
  try {
    return JSON.parse(localStorage.getItem(REORDER_KEY) ?? '{}') as Record<string, ReorderDecision>
  } catch {
    return {}
  }
}
export function setReorderDecision(key: string, d: ReorderDecision) {
  const all = getReorderDecisions()
  all[key] = d
  localStorage.setItem(REORDER_KEY, JSON.stringify(all))
}

export function reorderAlerts(orders: ReportOrder[]): ReorderRow[] {
  const d = delivered(orders)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sold30 = new Map<string, number>()
  for (const o of d) {
    if (new Date(o.date) < thirtyDaysAgo) continue
    for (const i of o.items) {
      const k = `${i.slug}|${i.size}|${i.color}`
      sold30.set(k, (sold30.get(k) ?? 0) + i.qty)
    }
  }
  const decided = getReorderDecisions()
  return inventoryRows(orders)
    .map((r) => {
      const threshold = reorderThreshold[r.slug] ?? REORDER_DEFAULT
      const sold = sold30.get(`${r.slug}|${r.size}|${r.color}`) ?? 0
      const dailyAvg = sold / 30
      return {
        ...r,
        threshold,
        dailyAvg,
        daysLeft: dailyAvg > 0 ? Math.floor(r.stock / dailyAvg) : null,
      }
    })
    .filter((r) => r.stock <= r.threshold && !decided[`${r.slug}|${r.size}|${r.color}`])
    .sort((a, b) => {
      if (a.stock === 0 && b.stock !== 0) return -1
      if (b.stock === 0 && a.stock !== 0) return 1
      return b.dailyAvg - a.dailyAvg
    })
}

// ---------- أدوات مشتركة ----------

export function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function downloadCSV(filename: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const csv = '\ufeff' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function lastUpdatedText() {
  return new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}
