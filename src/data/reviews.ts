// التقييمات (حزمة P1-ج) — كل تقييم مربوط بطلب مسلّم حقيقي، والأدمن يخفي بس:
// مايعدّلش نص ولا يحذف نهائي. التخزين المحلي بنفس شكل جدول reviews.
import { loadOrders } from '../lib/orders'
import { cleanEgyptPhone } from '../lib/arabic'

export interface Review {
  id: string
  slug: string
  customerName: string
  phone: string
  stars: number // 1..5
  comment: string
  date: string // ISO
  orderNumber: string // الطلب المسلّم اللي التقييم مربوط بيه
  hidden: boolean
  hiddenBy?: string
  hiddenAt?: string
}

const KEY = '3a-store-reviews'

function seedReviews(): Review[] {
  return [
    { id: 'rv-1', slug: 'tshirt-basic', customerName: 'أحمد سمير', phone: '01055501122', stars: 5, comment: 'الخامة حلوة جدًا والتفصيل مظبوط، المقاس طلع زي الجدول بالظبط.', date: '2026-11-18T14:20:00', orderNumber: '2031', hidden: false },
    { id: 'rv-2', slug: 'tshirt-basic', customerName: 'سارة أحمد', phone: '01098765432', stars: 4, comment: 'حلو وخفيف، بس التوصيل أخد ٤ أيام.', date: '2026-11-20T09:05:00', orderNumber: '2077', hidden: false },
    { id: 'rv-3', slug: 'tshirt-basic', customerName: 'محمد علي', phone: '01123456789', stars: 5, comment: 'تاني مرة أطلب منه، ثابت في الغسيل واللون مابهتش.', date: '2026-11-22T18:40:00', orderNumber: '2102', hidden: false },
    { id: 'rv-4', slug: 'hoodie-winter', customerName: 'كريم وليد', phone: '01555666777', stars: 4, comment: 'تقيل ويدفي فعلًا، المقاس كبير سنة — لو بين مقاسين اختار الأصغر.', date: '2026-11-19T11:15:00', orderNumber: '2050', hidden: false },
    { id: 'rv-5', slug: 'hoodie-winter', customerName: 'منى حسن', phone: '01011222333', stars: 5, comment: 'جبتُه هدية لأخويا وعجبه جدًا، الخامة نضيفة.', date: '2026-11-23T20:30:00', orderNumber: '2118', hidden: false },
    { id: 'rv-6', slug: 'dress-summer', customerName: 'نورهان سامي', phone: '01234567890', stars: 5, comment: 'لونه في الحقيقة أحلى من الصور، والقماش مريح في الحر.', date: '2026-11-21T16:00:00', orderNumber: '2090', hidden: false },
  ]
}

export function getReviews(): Review[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const s = seedReviews()
      localStorage.setItem(KEY, JSON.stringify(s))
      return s
    }
    return JSON.parse(raw) as Review[]
  } catch {
    return seedReviews()
  }
}

export function saveReviews(list: Review[]) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function publicReviews(slug: string): Review[] {
  return getReviews()
    .filter((r) => r.slug === slug && !r.hidden)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function reviewSummary(slug: string) {
  const list = publicReviews(slug)
  const count = list.length
  const avg = count ? list.reduce((a, r) => a + r.stars, 0) / count : 0
  const dist = [5, 4, 3, 2, 1].map((s) => ({ stars: s, n: list.filter((r) => r.stars === s).length }))
  return { avg, count, dist }
}

// أهلية التقييم: طلب مسلّم (delivered) بنفس الموبايل وفيه المنتج ده.
// من غير طلب مسلّم مفيش تقييم — دي قاعدة القبول الحاجبة في الحزمة.
export function deliveredOrderFor(slug: string, rawPhone: string) {
  const phone = cleanEgyptPhone(rawPhone)
  if (!phone) return null
  return (
    loadOrders().find(
      (o) =>
        o.status === 'delivered' &&
        cleanEgyptPhone(o.form.phone) === phone &&
        o.items.some((i) => i.slug === slug),
    ) ?? null
  )
}

export function myReview(slug: string, rawPhone: string): Review | null {
  const phone = cleanEgyptPhone(rawPhone)
  return getReviews().find((r) => r.slug === slug && cleanEgyptPhone(r.phone) === phone) ?? null
}

export function upsertReview(input: {
  slug: string
  customerName: string
  phone: string
  stars: number
  comment: string
  orderNumber: string
}): Review {
  const list = getReviews()
  const phone = cleanEgyptPhone(input.phone)
  const existing = list.find((r) => r.slug === input.slug && cleanEgyptPhone(r.phone) === phone)
  if (existing) {
    existing.stars = input.stars
    existing.comment = input.comment
    existing.date = new Date().toISOString()
    existing.hidden = false
    saveReviews(list)
    return existing
  }
  const review: Review = {
    id: `rv-${Date.now()}`,
    slug: input.slug,
    customerName: input.customerName,
    phone,
    stars: input.stars,
    comment: input.comment,
    date: new Date().toISOString(),
    orderNumber: input.orderNumber,
    hidden: false,
  }
  list.push(review)
  saveReviews(list)
  return review
}

export function setReviewHidden(id: string, hidden: boolean, actor: string) {
  const list = getReviews().map((r) =>
    r.id === id
      ? { ...r, hidden, hiddenBy: hidden ? actor : undefined, hiddenAt: hidden ? new Date().toISOString() : undefined }
      : r,
  )
  saveReviews(list)
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name
