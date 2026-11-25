// أوامر محلية بنفس شكل جداول orders + order_items + order_status_history.
// بتتقرأ من localStorage (طلبات اتعملت من التشيك أوت) + طلب عرض واحد للاختبار.
import { cleanEgyptPhone } from './arabic'

export interface OrderHistoryEntry {
  from: string | null
  to: string
  at: string
  actor: 'system' | 'admin' | 'customer'
  reason?: string
  note?: string
}

export interface LocalOrder {
  number: string
  items: { slug: string; name: string; emoji: string; size: string; color: string; price: number; qty: number }[]
  form: { full_name: string; phone: string; governorate: string; city: string; address: string; notes?: string }
  subtotal: number
  couponCode?: string
  discount?: number
  shipping: number
  total: number
  status: string
  trackingNumber?: string
  shippingCompany?: string
  cancelReason?: string
  cancelNote?: string
  createdAt: string
  history: OrderHistoryEntry[]
}

const PREFIX = '3a-store-order-'
const DEMO_KEY = '3a-store-order-1001'

function demoOrder(): LocalOrder {
  const now = new Date()
  const at = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600_000).toISOString()
  return {
    number: '1001',
    items: [
      { slug: 'tshirt-basic', name: 'تيشيرت قطن أساسي', emoji: '👕', size: 'L', color: 'أسود', price: 299, qty: 2 },
      { slug: 'hoodie-winter', name: 'هودي شتوي تقيل', emoji: '🧥', size: 'XL', color: 'كحلي', price: 599, qty: 1 },
    ],
    form: {
      full_name: 'عميل تجريبي',
      phone: '01012345678',
      governorate: 'القاهرة',
      city: 'مدينة نصر',
      address: 'شارع عباس العقاد، عمارة ١٢',
    },
    subtotal: 1197,
    shipping: 0,
    total: 1197,
    status: 'shipped',
    trackingNumber: 'TRK-2026-1001',
    shippingCompany: 'شركة الشحن التجريبية',
    createdAt: at(26),
    history: [
      { from: null, to: 'new', at: at(26), actor: 'system' },
      { from: 'new', to: 'confirmed', at: at(24), actor: 'admin', note: 'تم التأكيد واتساب' },
      { from: 'confirmed', to: 'preparing', at: at(20), actor: 'admin' },
      { from: 'preparing', to: 'shipped', at: at(5), actor: 'admin', note: 'خرج مع المندوب' },
    ],
  }
}

// طلب عرض للاختبار بس — بيتزرع مرة واحدة، ومكتوب عليه إنه تجريبي في شاشة التتبع
export function ensureDemoOrder() {
  if (!localStorage.getItem(DEMO_KEY)) {
    localStorage.setItem(DEMO_KEY, JSON.stringify(demoOrder()))
  }
}

export function loadOrders(): LocalOrder[] {
  const out: LocalOrder[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    // مفاتيح الطلبات بس (أرقام) — مفاتيح التشيك أوت المساعدة (order-key / order-number)
    // قيمها مش JSON لطلب، ولو اتقريت كطلب بتكسر الترتيب (createdAt مش موجود)
    if (k && /^3a-store-order-[0-9]+$/.test(k)) {
      try {
        const parsed = JSON.parse(localStorage.getItem(k)!) as LocalOrder
        if (parsed && typeof parsed === 'object' && parsed.number && Array.isArray(parsed.items)) {
          out.push(parsed)
        }
      } catch {
        // سطر تالف بيتساب
      }
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// التتبع: رقم الطلب + الموبايل اللي اتعمل بيه — عدم التطابق رسالة واحدة مبهمة عمدًا
// (ممنوع توضيح «الرقم صح والموبايل غلط» عشان مايتكشفش بيانات طلبات الناس — حزمة 6)
export function findOrderForTracking(number: string, phone: string): LocalOrder | null {
  ensureDemoOrder()
  const cleaned = cleanEgyptPhone(phone)
  const order = loadOrders().find((o) => o.number === number.trim())
  if (!order) return null
  if (cleanEgyptPhone(order.form.phone) !== cleaned) return null
  return order
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
}
