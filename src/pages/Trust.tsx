import { useState } from 'react'
import { effectiveGovernorates, getStoreConfig } from '../data/admin'
import {
  CANCEL_REASON_LABELS,
  REFUND_DAYS,
  STATUS_LABELS,
  STORE_HOURS,
  TERMINAL_STATUSES,
  TRACK_STEPS,
} from '../data/settings'
import { cleanEgyptPhone, egyptPhoneError } from '../lib/arabic'
import { findOrderForTracking, formatDateTime, loadOrders, type LocalOrder } from '../lib/orders'

function WhatsAppButton({ label, message }: { label: string; message?: string }) {
  const href = `https://wa.me/${getStoreConfig().whatsapp}${message ? `?text=${encodeURIComponent(message)}` : ''}`
  return (
    <a className="cta-btn" href={href} target="_blank" rel="noreferrer">{label}</a>
  )
}

// شاشة د1 — الاستبدال والاسترجاع (الأرقام من الإعدادات مش نص ثابت — حزمة 6)
export function ReturnsPage() {
  const returnDays = getStoreConfig().returnDays
  return (
    <main>
      <h1 className="page-title">الاستبدال والاسترجاع</h1>
      <ul className="trust-list">
        <li>المدة: استبدال واسترجاع خلال <strong dir="ltr">{returnDays}</strong> يوم من الاستلام.</li>
        <li>الحالة المطلوبة: القطعة بحالتها الأصلية وبالتكت، من غير ما تتغسل أو تتلبس.</li>
        <li>مين بيدفع شحن الاسترجاع: العميل، إلا لو الغلط من المتجر — ساعتها الشحن علينا.</li>
        <li>إزاي الفلوس بترجع: كاش عند الاستلام من المندوب، أو تحويل — وبتوصل خلال <strong dir="ltr">{REFUND_DAYS}</strong> أيام من الاستلام.</li>
      </ul>
      <h2>خطوات الاسترجاع</h2>
      <ol className="steps">
        <li>كلّمنا واتساب برقم الطلب</li>
        <li>هنبعت مندوب يستلم القطعة</li>
        <li>الفلوس بترجع خلال {REFUND_DAYS} أيام</li>
      </ol>
      <h2>حالات مستثناة</h2>
      <p>ملابس داخلية • قطع اتغسلت أو اتلبست • قطع مخصصة أو معدّلة حسب طلبك — مفيش استثناء تاني مخفي.</p>
      <WhatsAppButton label="ابدأ استرجاع — واتساب" message="عايز أبدأ استرجاع، رقم الطلب: " />
    </main>
  )
}

// شاشة د2 — الشحن والتوصيل (نفس جدول التشيك أوت حرفيًا)
export function ShippingPage() {
  const cfg = getStoreConfig()
  return (
    <main>
      <h1 className="page-title">الشحن والتوصيل</h1>
      <p>الشحن مجاني للطلبات فوق <strong dir="ltr">{cfg.threshold}</strong> جنيه.</p>
      <p>الدفع كاش عند الاستلام، والمندوب بيسلّمك وبياخد الفلوس. لو مش موجود وقت التسليم، المندوب بيحاول مرة تانية، وبعدها كلّمنا واتساب.</p>
      <div className="table-scroll">
        <table className="size-table">
          <thead>
            <tr><th>المحافظة</th><th>الشحن (ج.م)</th><th>المدة</th></tr>
          </thead>
          <tbody>
            {effectiveGovernorates().map((g) => (
              <tr key={g.name}>
                <td>{g.name}</td>
                <td dir="ltr">{g.fee === 0 ? 'مجاني' : g.fee}</td>
                <td>{g.days}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}

// شاشة د3 — تواصل معانا
export function ContactPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<{ name?: string; phone?: string; message?: string }>({})
  const [sent, setSent] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: typeof errors = {}
    if (!name.trim()) errs.name = 'اكتب اسمك'
    const pe = egyptPhoneError(phone)
    if (pe) errs.phone = pe
    if (message.trim().length < 20) errs.message = 'اكتب رسالتك — ٢٠ حرف على الأقل عشان نفهمك'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const messages = JSON.parse(localStorage.getItem('3a-store-messages') ?? '[]') as unknown[]
    messages.push({ name, phone: cleanEgyptPhone(phone), message, at: new Date().toISOString() })
    localStorage.setItem('3a-store-messages', JSON.stringify(messages))
    setSent(true)
  }

  if (sent) {
    return (
      <main className="empty">
        <h1 className="page-title">وصلت رسالتك ✅</h1>
        <p>وهنرد عليك على واتساب في أقرب وقت.</p>
        <WhatsAppButton label="كلّمنا واتساب" />
      </main>
    )
  }

  return (
    <main>
      <h1 className="page-title">تواصل معانا</h1>
      <p>{STORE_HOURS}</p>
      <WhatsAppButton label="كلّمنا واتساب" />
      <form onSubmit={submit} noValidate className="contact-form">
        <label className="f-field">الاسم
          <input value={name} onChange={(e) => setName(e.target.value)} />
          {errors.name && <span className="f-error">{errors.name}</span>}
        </label>
        <label className="f-field">الموبايل
          <input type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
          {errors.phone && <span className="f-error">{errors.phone}</span>}
        </label>
        <label className="f-field">رسالتك
          <textarea rows={4} value={message} maxLength={500} onChange={(e) => setMessage(e.target.value)} />
          {errors.message && <span className="f-error">{errors.message}</span>}
        </label>
        <button type="submit" className="cta-btn block">ابعت رسالتك</button>
      </form>
      <p className="hint">رسالتك بتتسجل في لوحة التحكم للمتجر — مفيش إيميل في النسخة الأولى.</p>
    </main>
  )
}

// خط التتبع — بيعكس سجل الحالات الحقيقي، مش حالات مكتوبة يدويًا (حزمة 6)
export function OrderTimeline({ order }: { order: LocalOrder }) {
  const terminal = TERMINAL_STATUSES.includes(order.status) || order.status === 'delivery_failed'
  const currentIdx = TRACK_STEPS.indexOf(order.status)
  return (
    <div>
      <ol className="timeline">
        {TRACK_STEPS.map((s, i) => {
          const entry = [...order.history].reverse().find((h) => h.to === s)
          const reached = currentIdx >= 0 && i <= currentIdx
          return (
            <li key={s} className={reached ? 'done' : ''}>
              <strong>{STATUS_LABELS[s]}</strong>
              <span className="hint">{entry ? formatDateTime(entry.at) : '—'}</span>
              {entry?.note && <span className="hint">{entry.note}</span>}
            </li>
          )
        })}
      </ol>
      {terminal && (
        <p className="f-error">
          الطلب {STATUS_LABELS[order.status]}
          {order.cancelReason ? ` — ${CANCEL_REASON_LABELS[order.cancelReason] ?? order.cancelReason}` : ''}
          {order.cancelNote ? ` — ${order.cancelNote}` : ''}
        </p>
      )}
      {order.trackingNumber && (
        <p>رقم تتبع شركة الشحن: <strong dir="ltr">{order.trackingNumber}</strong>
          {order.shippingCompany ? ` (${order.shippingCompany})` : ''}
        </p>
      )}
    </div>
  )
}

export function OrderDetails({ order }: { order: LocalOrder }) {
  return (
    <div>
      <div className="summary-box">
        <div className="sum-row"><span>رقم الطلب</span><strong dir="ltr">#{order.number}</strong></div>
        <div className="sum-row"><span>الحالة</span><strong>{STATUS_LABELS[order.status]}</strong></div>
        <div className="sum-row"><span>التاريخ</span><span>{formatDateTime(order.createdAt)}</span></div>
        {order.items.map((i) => (
          <div className="cart-line" key={`${i.slug}-${i.size}-${i.color}`}>
            <span aria-hidden>{i.emoji}</span>
            <div className="cart-line-main">
              <div>{i.name}</div>
              <div className="hint">مقاس {i.size} • {i.color} • <span dir="ltr">×{i.qty}</span></div>
            </div>
            <span dir="ltr">{i.price * i.qty} ج.م</span>
          </div>
        ))}
        <div className="sum-row"><span>الإجمالي الفرعي</span><span dir="ltr">{order.subtotal} ج.م</span></div>
        <div className="sum-row"><span>الشحن</span><span dir="ltr">{order.shipping === 0 ? 'مجاني' : `${order.shipping} ج.م`}</span></div>
        <div className="sum-row total"><span>الإجمالي</span><span dir="ltr">{order.total} ج.م</span></div>
        <div className="sum-row"><span>العنوان</span><span>{order.form.address}، {order.form.city}، {order.form.governorate}</span></div>
      </div>
      <h2>تتبّع طلبك</h2>
      <OrderTimeline order={order} />
      {order.number === '1001' && <p className="hint">طلب عرض للاختبار — رقم التتبع التجريبي: 01012345678.</p>}
    </div>
  )
}

// شاشة د4 — تتبع الطلب من غير تسجيل دخول
export function TrackPage({ presetNumber }: { presetNumber?: string }) {
  const [number, setNumber] = useState(presetNumber ?? '')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<LocalOrder | null>(null)
  const [tried, setTried] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!number.trim()) return setError('اكتب رقم الطلب')
    if (!/^[0-9]{3,}$/.test(number.trim())) return setError('رقم الطلب شكله مش صح — راجعه من رسالة التأكيد')
    const pe = egyptPhoneError(phone)
    if (pe) return setError(pe)
    const found = findOrderForTracking(number.trim(), phone)
    setTried(true)
    if (!found) return setError('البيانات دي مش متطابقة مع أي طلب — راجع رقم الطلب والموبايل')
    setError(null)
    setOrder(found)
  }

  if (order) return <main><h1 className="page-title">تتبّع الطلب #{order.number}</h1><OrderDetails order={order} /></main>

  return (
    <main>
      <h1 className="page-title">تتبّع طلبك</h1>
      <p className="hint">اكتب رقم الطلب ورقم الموبايل اللي اتعمل بيه الطلب — الموبايل هو اللي بيأكد إن الطلب بتاعك.</p>
      <form onSubmit={submit} noValidate>
        <label className="f-field">رقم الطلب
          <input inputMode="numeric" dir="ltr" value={number} onChange={(e) => setNumber(e.target.value)} />
        </label>
        <label className="f-field">رقم الموبايل
          <input type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        {error && <div className="f-error">{error}</div>}
        <button type="submit" className="cta-btn block">تتبّع</button>
      </form>
      {tried && !error && <p className="hint">…</p>}
    </main>
  )
}

// شاشة د5 — «طلباتي» — الضيف بيتوجّه للتتبع، مش بيشوف «مفيش طلبات» كأنه مسجّل فاضي
export function MyOrdersPage() {
  const orders = loadOrders().filter((o) => o.number !== '1001')
  if (orders.length === 0) {
    return (
      <main className="empty">
        <h1 className="page-title">طلباتي</h1>
        <p>سجّل دخولك عشان تشوف طلباتك، أو تتبّع طلبك برقم الطلب والموبايل.</p>
        <p>
          <a className="cta" href="/track">تتبّع طلبك</a>{' '}
          <a className="cta" href="/">ارجع للمتجر</a>
        </p>
        <p className="hint">تسجيل الدخول لسه في الدفعة الجاية مع ربط قاعدة البيانات — التتبع شغال من غير حساب.</p>
      </main>
    )
  }
  return (
    <main>
      <h1 className="page-title">طلباتي (على الجهاز ده)</h1>
      {orders.map((o) => (
        <a className="order-card" key={o.number} href={`/track?number=${o.number}`}>
          <div><strong dir="ltr">#{o.number}</strong> — {formatDateTime(o.createdAt)}</div>
          <div className="hint"><span dir="ltr">{o.items.length}</span> منتج • الإجمالي <span dir="ltr">{o.total} ج.م</span></div>
          <div><span className="badge badge-new">{STATUS_LABELS[o.status]}</span></div>
        </a>
      ))}
    </main>
  )
}
