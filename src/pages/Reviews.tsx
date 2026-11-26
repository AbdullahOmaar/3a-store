import { useMemo, useState } from 'react'
import { getReviews, setReviewHidden } from '../data/reviews'
import { products } from '../data/sample'

// شاشة تقييمات الأدمن (حزمة P1-ج) — إخفاء/إظهار بس، بيتسجل مين وإمتى.
// مفيش تعديل على نص التقييم ومفيش حذف نهائي إطلاقًا.
export default function ReviewsAdminPage() {
  const [tick, setTick] = useState(0)
  const [showHidden, setShowHidden] = useState(true)
  const list = useMemo(
    () => getReviews().sort((a, b) => b.date.localeCompare(a.date)),
    [tick],
  )
  const visible = list.filter((r) => showHidden || !r.hidden)
  const hiddenCount = list.filter((r) => r.hidden).length

  const toggle = (id: string, hidden: boolean) => {
    setReviewHidden(id, hidden, 'الأدمن')
    setTick((t) => t + 1)
  }

  return (
    <main>
      <p className="hint">لوحة التحكم — التقييمات</p>
      <h1 className="page-title">تقييمات العملاء</h1>
      <nav className="admin-nav">
        <a href="/admin/reports">التقارير</a>
        <a href="/admin/coupons">إدارة الكوبونات</a>
        <a href="/admin/abandoned">السلة المتروكة</a>
      </nav>
      <p className="hint">
        كل تقييم مربوط بطلب مسلّم برقم الطلب. تقدر تخفي تقييم (وبيتسجل مين خفاه وإمتى) —
        لكن مفيش تعديل على نص العميل ومفيش حذف نهائي. المخفي دلوقتي: <span dir="ltr">{hiddenCount}</span>
      </p>
      <label className="f-check">
        <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
        ورّيني المخفي كمان
      </label>

      {visible.length === 0 ? (
        <p className="empty">مفيش تقييمات</p>
      ) : (
        visible.map((r) => (
          <div className="order-card" key={r.id}>
            <div>
              <strong>{products.find((p) => p.slug === r.slug)?.name ?? r.slug}</strong>{' '}
              <span aria-label={`${r.stars} نجوم`} style={{ color: '#e8a13a' }}>{'★'.repeat(r.stars)}</span>{' '}
              {r.hidden && <span className="badge badge-out">مخفي</span>}
            </div>
            <div className="hint">
              العميل: {r.customerName} • طلب مسلّم رقم <span dir="ltr">#{r.orderNumber}</span> •{' '}
              {new Date(r.date).toLocaleDateString('ar-EG', { dateStyle: 'medium' })}
            </div>
            {r.comment && <p>{r.comment}</p>}
            {r.hidden && r.hiddenAt && (
              <div className="hint">اتخفى بواسطة {r.hiddenBy ?? 'الأدمن'} — {new Date(r.hiddenAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</div>
            )}
            <div className="drawer-actions">
              {r.hidden ? (
                <button type="button" className="tool-btn" onClick={() => toggle(r.id, false)}>إظهار</button>
              ) : (
                <button type="button" className="tool-btn" onClick={() => toggle(r.id, true)}>إخفاء</button>
              )}
            </div>
          </div>
        ))
      )}
    </main>
  )
}
