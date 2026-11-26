import { useMemo, useState } from 'react'
import {
  deliveredOrderFor,
  firstName,
  myReview,
  publicReviews,
  reviewSummary,
  upsertReview,
} from '../data/reviews'
import { egyptPhoneError } from '../lib/arabic'

function Stars({ n, size = 18 }: { n: number; size?: number }) {
  return (
    <span aria-label={`${n} من ٥ نجوم`} style={{ fontSize: size, color: '#e8a13a', letterSpacing: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ opacity: i <= Math.round(n) ? 1 : 0.25 }}>★</span>
      ))}
    </span>
  )
}

// قسم التقييمات في صفحة المنتج (حزمة P1-ج)
export default function ReviewsSection({ slug, productName }: { slug: string; productName: string }) {
  const [tick, setTick] = useState(0)
  const summary = useMemo(() => reviewSummary(slug), [slug, tick])
  const list = useMemo(() => publicReviews(slug), [slug, tick])

  const [phone, setPhone] = useState('')
  const [stage, setStage] = useState<'idle' | 'form' | 'denied'>('idle')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState(false)
  const [editing, setEditing] = useState(false)

  const openForm = () => {
    const pe = egyptPhoneError(phone)
    if (pe) return setPhoneError(pe)
    setPhoneError(null)
    const order = deliveredOrderFor(slug, phone)
    if (!order) return setStage('denied')
    const mine = myReview(slug, phone)
    if (mine) {
      setStars(mine.stars)
      setComment(mine.comment)
      setEditing(true)
    } else {
      setEditing(false)
    }
    setStage('form')
  }

  const submit = () => {
    if (!stars) return setFormError('اختار عدد النجوم الأول')
    const order = deliveredOrderFor(slug, phone)
    if (!order) return setStage('denied')
    upsertReview({
      slug,
      customerName: order.form.full_name,
      phone,
      stars,
      comment: comment.trim(),
      orderNumber: order.number,
    })
    setFormError(null)
    setSavedMsg(true)
    setStage('idle')
    setTick((t) => t + 1)
  }

  return (
    <section aria-label="التقييمات">
      <h2>التقييمات</h2>
      {summary.count === 0 ? (
        <p className="empty">لسه مفيش تقييمات — كن أول واحد يقيّم بعد ما تستلم طلبك</p>
      ) : (
        <>
          <div className="review-summary">
            <Stars n={summary.avg} size={22} />
            <span><strong dir="ltr">{summary.avg.toFixed(1)}</strong> من ٥ — <span dir="ltr">{summary.count}</span> تقييم</span>
          </div>
          <div className="review-dist">
            {summary.dist.map((d) => (
              <div className="dist-row" key={d.stars}>
                <span dir="ltr">{d.stars}★</span>
                <span className="dist-bar"><span style={{ width: `${summary.count ? (d.n / summary.count) * 100 : 0}%` }} /></span>
                <span dir="ltr">{d.n}</span>
              </div>
            ))}
          </div>
          {list.map((r) => (
            <div className="review-card" key={r.id}>
              <div className="review-head">
                <strong>{firstName(r.customerName)}</strong>
                <Stars n={r.stars} size={15} />
              </div>
              {r.comment && <p>{r.comment}</p>}
              <div className="hint">{new Date(r.date).toLocaleDateString('ar-EG', { dateStyle: 'medium' })} • اشترى واستلم {productName}</div>
            </div>
          ))}
        </>
      )}

      {savedMsg && <p className="hint">شكرًا! تقييمك اتسجل ✅</p>}

      {stage === 'idle' && (
        <div className="review-cta">
          <label className="f-field">قيّمت المنتج ده؟ اكتب رقم الموبايل اللي طلبت بيه
            <input type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" />
            {phoneError && <span className="f-error">{phoneError}</span>}
          </label>
          <button type="button" className="tool-btn" onClick={openForm}>قيّم المنتج ده</button>
        </div>
      )}

      {stage === 'denied' && (
        <div className="review-cta">
          <p className="f-error">التقييم متاح للي اشتروا المنتج واستلموه</p>
          <p className="hint">لازم يكون عندك طلب مسلّم فيه «{productName}» بنفس رقم الموبايل ده عشان تقيّم.</p>
          <button type="button" className="tool-btn" onClick={() => setStage('idle')}>جرّب رقم تاني</button>
        </div>
      )}

      {stage === 'form' && (
        <div className="review-form">
          <div className="f-title">{editing ? 'عدّل تقييمك' : 'تقييمك'}</div>
          <div className="star-input" role="radiogroup" aria-label="عدد النجوم">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} type="button" role="radio" aria-checked={stars === i}
                className={`star-btn${i <= stars ? ' on' : ''}`}
                onClick={() => setStars(i)}>
                ★
              </button>
            ))}
          </div>
          <label className="f-field">تعليقك (اختياري — <span dir="ltr">{comment.length}</span>/٥٠٠)
            <textarea value={comment} maxLength={500} rows={3} onChange={(e) => setComment(e.target.value)}
              placeholder="إيه رأيك في الخامة والمقاس والتوصيل؟" />
          </label>
          {formError && <div className="f-error">{formError}</div>}
          <div className="drawer-actions">
            <button type="button" className="cta-btn" onClick={submit}>{editing ? 'حفظ التعديل' : 'انشر تقييمك'}</button>
            <button type="button" className="tool-btn" onClick={() => setStage('idle')}>إلغاء</button>
          </div>
        </div>
      )}
    </section>
  )
}
