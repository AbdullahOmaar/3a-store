// السلة المتروكة (حزمة P1-ب) — بيانات عرض بنفس شكل الجدول، على نفس نمط دفعات 7–9.
// التعريف: سلة ما اتلمستش من ساعتين من غير طلب. المرحلة دي للعملاء المسجلين بس —
// سلال الضيوف المحلية ما بتتتبعش (خصوصية). التذكير يدوي مرة واحدة بس.
export interface AbandonedItem {
  slug: string
  name: string
  emoji: string
  size: string
  color: string
  price: number
  qty: number
}

export interface AbandonedCart {
  id: string
  customerName: string
  phone: string // محلي 01xxxxxxxxx
  items: AbandonedItem[]
  lastTouchedAt: string // ISO
  converted?: boolean // العميل كمّل شراء بعدها — بتتقفل «رجعت واشترت»
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()

export const sampleAbandonedCarts: AbandonedCart[] = [
  {
    id: 'ab-1',
    customerName: 'سارة أحمد',
    phone: '01098765432',
    items: [
      { slug: 'tshirt-basic', name: 'تيشيرت قطن أساسي', emoji: '👕', size: 'M', color: 'أسود', price: 299, qty: 1 },
      { slug: 'bag-everyday', name: 'شنطة يومية', emoji: '👜', size: 'مقاس واحد', color: 'بني', price: 549, qty: 1 },
    ],
    lastTouchedAt: hoursAgo(3),
  },
  {
    id: 'ab-2',
    customerName: 'محمد علي',
    phone: '01123456789',
    items: [
      { slug: 'hoodie-winter', name: 'هودي شتوي', emoji: '🧥', size: 'L', color: 'رمادي', price: 599, qty: 1 },
    ],
    lastTouchedAt: hoursAgo(26),
  },
  {
    id: 'ab-3',
    customerName: 'نورهان سامي',
    phone: '01234567890',
    items: [
      { slug: 'dress-summer', name: 'فستان صيفي', emoji: '👗', size: 'M', color: 'أحمر', price: 649, qty: 1 },
    ],
    lastTouchedAt: hoursAgo(72),
  },
  {
    id: 'ab-4',
    customerName: 'منى حسن',
    phone: '01011222333',
    items: [
      { slug: 'kids-set', name: 'طقم أطفال', emoji: '🧒', size: '6 سنوات', color: 'أزرق', price: 449, qty: 1 },
    ],
    lastTouchedAt: hoursAgo(49),
    converted: true,
  },
  {
    id: 'ab-5',
    customerName: 'كريم وليد',
    phone: '01555666777',
    items: [
      { slug: 'sport-shoes', name: 'حذاء رياضي', emoji: '👟', size: '42', color: 'أبيض', price: 899, qty: 1 },
    ],
    lastTouchedAt: hoursAgo(8 * 24 + 2), // أكتر من ٧ أيام — إغلاق تلقائي
  },
]

export type AbandonedStatus = 'new' | 'reminded' | 'converted' | 'closed'

const REMINDERS_KEY = '3a-store-abandoned-reminders'

export function getReminders(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(REMINDERS_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

export function markReminded(id: string) {
  const r = getReminders()
  r[id] = new Date().toISOString()
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(r))
}

// الحالة بتتحسب من البيانات — مفيش حالة بتختفي أو تتغير من غير سبب موثّق:
// محوّلة (شراء مكتمل) > مقفولة تلقائيًا (٧ أيام) > تم التذكير (قرار أدمن) > جديدة
export function cartStatus(c: AbandonedCart, reminders: Record<string, string>): AbandonedStatus {
  if (c.converted) return 'converted'
  const ageDays = (Date.now() - new Date(c.lastTouchedAt).getTime()) / 86400_000
  if (ageDays > 7) return 'closed'
  if (reminders[c.id]) return 'reminded'
  return 'new'
}

export function cartTotal(c: AbandonedCart): number {
  return c.items.reduce((a, i) => a + i.price * i.qty, 0)
}

const arNum = (n: number) => n.toLocaleString('ar-EG', { maximumFractionDigits: 0 })

// «من ٣ ساعات» / «من يومين» / «من ٥ أيام»
export function abandonedDuration(c: AbandonedCart): string {
  const hours = Math.floor((Date.now() - new Date(c.lastTouchedAt).getTime()) / 3600_000)
  if (hours < 24) {
    if (hours <= 1) return 'من ساعة'
    if (hours === 2) return 'من ساعتين'
    if (hours <= 10) return `من ${arNum(hours)} ساعات`
    return `من ${arNum(hours)} ساعة`
  }
  const days = Math.floor(hours / 24)
  if (days === 1) return 'من يوم'
  if (days === 2) return 'من يومين'
  if (days <= 10) return `من ${arNum(days)} أيام`
  return `من ${arNum(days)} يوم`
}

// رابط واتساب العميل — الرقم المحلي بيتحول دولي (+20) من غير الصفر
export function reminderLink(c: AbandonedCart): string {
  const intl = '20' + c.phone.slice(1)
  const text =
    `أهلًا يا ${c.customerName}! سلتك لسه مستنياك عندنا — ` +
    `فيها ${c.items.map((i) => i.name).join(' و')} بإجمالي ${cartTotal(c)} جنيه. ` +
    `كمّل طلبك من هنا: ${location.origin}/ ` +
    `ولو محتاج مساعدة في المقاس أو أي حاجة، رد على الرسالة دي وهنساعدك.`
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`
}
