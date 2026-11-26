import { useMemo, useState } from 'react'
import {
  abandonedDuration,
  cartStatus,
  cartTotal,
  getReminders,
  markReminded,
  reminderLink,
  sampleAbandonedCarts,
  type AbandonedStatus,
} from '../data/abandoned'

const STATUS_LABEL: Record<AbandonedStatus, string> = {
  new: 'جديدة',
  reminded: 'اتبعت تذكير',
  converted: 'رجعت واشترت',
  closed: 'مقفولة',
}

const FILTERS: { key: AbandonedStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'new', label: 'جديدة' },
  { key: 'reminded', label: 'اتبعت تذكير' },
  { key: 'converted', label: 'رجعت واشترت' },
  { key: 'closed', label: 'مقفولة' },
]

// السلة المتروكة (حزمة P1-ب) — التذكير يدوي من الأدمن، مرة واحدة بس لكل سلة.
// الأتمتة قرار تسويقي لاحق (محتاجة موافقة تسويق) — مش في المرحلة دي.
export default function AbandonedPage() {
  const [reminders, setReminders] = useState<Record<string, string>>(() => getReminders())
  const [filter, setFilter] = useState<AbandonedStatus | 'all'>('all')

  const rows = useMemo(
    () =>
      sampleAbandonedCarts
        .map((c) => ({ cart: c, status: cartStatus(c, reminders) }))
        .sort((a, b) => b.cart.lastTouchedAt.localeCompare(a.cart.lastTouchedAt)),
    [reminders],
  )
  const visible = rows.filter((r) => filter === 'all' || r.status === filter)
  const newCount = rows.filter((r) => r.status === 'new').length

  return (
    <main>
      <p className="hint">لوحة التحكم — السلة المتروكة</p>
      <h1 className="page-title">السلال المتروكة</h1>
      <nav className="admin-nav">
        <a href="/admin/reports">التقارير</a>
        <a href="/admin/coupons">إدارة الكوبونات</a>
      </nav>
      <p className="hint">
        سلة ما اتلمستش من ساعتين من غير طلب (عملاء مسجلين بس).{' '}
        <span dir="ltr">{newCount}</span> سلة جديدة مستنية تذكير. التذكير يدوي ومرة واحدة بس لكل سلة،
        والسلال اللي عمرها أكتر من ٧ أيام بتتقفل تلقائيًا.
      </p>

      <div className="chips-row">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className={`chip${filter === f.key ? ' on' : ''}`}
            onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="empty">مفيش سلال بالحالة دي</p>
      ) : (
        visible.map(({ cart, status }) => (
          <div className="order-card" key={cart.id}>
            <div>
              <strong>{cart.customerName}</strong>{' '}
              <span className="badge badge-new">{STATUS_LABEL[status]}</span>
            </div>
            <div className="hint">الموبايل: <span dir="ltr">{cart.phone}</span> • متروكة {abandonedDuration(cart)}</div>
            {cart.items.map((i) => (
              <div className="cart-line" key={`${i.slug}-${i.size}-${i.color}`}>
                <span aria-hidden>{i.emoji}</span>
                <div className="cart-line-main">
                  <div>{i.name}</div>
                  <div className="hint">مقاس {i.size} • {i.color} • <span dir="ltr">×{i.qty}</span></div>
                </div>
                <span dir="ltr">{i.price * i.qty} ج.م</span>
              </div>
            ))}
            <div className="sum-row"><span>إجمالي السلة</span><span dir="ltr">{cartTotal(cart)} ج.م</span></div>
            {status === 'new' && (
              <div className="drawer-actions">
                <a className="cta-btn" href={reminderLink(cart)} target="_blank" rel="noreferrer"
                  onClick={() => { markReminded(cart.id); setReminders(getReminders()) }}>
                  ذكّرها واتساب
                </a>
              </div>
            )}
            {status === 'reminded' && (
              <p className="hint">
                اتبعت تذكير — الزرار مقفول، مفيش تذكير تاني لنفس السلة.
                {reminders[cart.id] && <> (اتسجل {new Date(reminders[cart.id]).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })})</>}
              </p>
            )}
            {status === 'converted' && <p className="hint">العميلة كمّلت شراء — السلة اتقفلت تلقائيًا «رجعت واشترت».</p>}
            {status === 'closed' && <p className="hint">عدّى عليها أكتر من ٧ أيام — اتقفلت تلقائيًا من غير تذكير.</p>}
          </div>
        ))
      )}
    </main>
  )
}
