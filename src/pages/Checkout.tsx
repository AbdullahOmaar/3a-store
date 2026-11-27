import { useMemo, useRef, useState } from 'react'
import { useCart } from '../store/cart'
import { cleanEgyptPhone, egyptPhoneError } from '../lib/arabic'
import { effectiveGovernorates, getStoreConfig } from '../data/admin'
import { recordCouponUse, validateCoupon } from '../data/coupons'
import CouponField from '../components/CouponField'

interface FormState {
  name: string
  phone: string
  phoneAlt: string
  gov: string
  city: string
  address: string
  landmark: string
  notes: string
}

const initial: FormState = {
  name: '', phone: '', phoneAlt: '', gov: '', city: '', address: '', landmark: '', notes: '',
}

// تشيك أوت صفحة واحدة (حزمة 2-ب). الأسعار النهائية هتتحسب من الخادم وقت الربط —
// هنا الحساب المحلي للعرض، ومفتاح الإرسال بيمنع الطلب المكرر من ضغطة تانية.
export default function CheckoutPage() {
  const cart = useCart()
  const [form, setForm] = useState<FormState>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState<{ number: string; total: number } | null>(null)
  const idempotencyKey = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `order-${Date.now()}`,
  )

  const [couponError, setCouponError] = useState<string | null>(null)
  const govs = effectiveGovernorates()
  const threshold = getStoreConfig().threshold
  const gov = govs.find((g) => g.name === form.gov)
  // الخصم على إجمالي المنتجات بس مش الشحن، والشحن المجاني بيتحسب على قيمة المنتجات بعد الخصم
  const productsTotal = cart.subtotal - cart.couponDiscount
  const freeShip = productsTotal >= threshold && productsTotal > 0
  const shipping = !gov ? 0 : freeShip ? 0 : gov.fee
  const total = productsTotal + shipping
  const remaining = Math.max(0, threshold - productsTotal)

  const set = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v, ...(k === 'gov' ? { city: '' } : {}) }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) e.name = 'اكتب اسمك بالكامل'
    else if (form.name.trim().length < 3) e.name = 'الاسم قصير قوي، اكتبه زي ما هو في البطاقة'
    const pe = egyptPhoneError(form.phone)
    if (pe) e.phone = pe
    if (form.phoneAlt) {
      const pa = egyptPhoneError(form.phoneAlt)
      if (pa) e.phoneAlt = pa
      else if (cleanEgyptPhone(form.phoneAlt) === cleanEgyptPhone(form.phone))
        e.phoneAlt = 'ده نفس الرقم الأساسي، اكتب رقم تاني أو سيبه فاضي'
    }
    if (!form.gov) e.gov = 'اختار محافظتك عشان نحسبلك الشحن'
    if (form.gov && !form.city) e.city = 'اختار مدينتك/منطقتك'
    if (!form.address.trim()) e.address = 'اكتب عنوانك بالتفصيل (شارع وعمارة) عشان المندوب يوصلك من غير ما يدوخ'
    else if (form.address.trim().length < 10)
      e.address = 'اكتب عنوانك بالتفصيل (شارع وعمارة) عشان المندوب يوصلك من غير ما يدوخ'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = () => {
    if (sending) return
    if (cart.items.length === 0) return
    if (!validate()) {
      const firstBad = document.querySelector('.f-error')
      firstBad?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    // إعادة تحقق الكود بالموبايل قبل الإنشاء — حد الاستخدام لكل عميل بيتفحص هنا
    if (cart.couponCode) {
      const r = validateCoupon(cart.couponCode, cart.subtotal, cart.items.map((i) => i.slug), cleanEgyptPhone(form.phone))
      if (!r.ok) {
        setCouponError(r.error)
        document.querySelector('.coupon-field')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
    }
    setCouponError(null)
    setSending(true)
    // محاكاة إنشاء الطلب محليًا لحد ربط الخادم — نفس مفتاح الإرسال = نفس رقم الطلب
    const savedKey = localStorage.getItem('3a-store-order-key')
    const savedNumber = localStorage.getItem('3a-store-order-number')
    const number =
      savedKey === idempotencyKey.current && savedNumber
        ? savedNumber
        : String(1000 + Math.floor(Math.random() * 9000))
    localStorage.setItem('3a-store-order-key', idempotencyKey.current)
    localStorage.setItem('3a-store-order-number', number)
    const createdAt = new Date().toISOString()
    const order = {
      number,
      items: cart.items.map((i) => ({
        slug: i.slug, name: i.name, emoji: i.emoji, size: i.size, color: i.color, price: i.price, qty: i.qty,
      })),
      form: {
        full_name: form.name,
        phone: cleanEgyptPhone(form.phone),
        governorate: form.gov,
        city: form.city,
        address: form.address,
        notes: form.notes,
      },
      subtotal: cart.subtotal,
      // الخصم بيتجمّد في الطلب وقت الإنشاء — أي تعديل على الكود بعدها مايأثرش عليه
      couponCode: cart.couponCode ?? undefined,
      discount: cart.couponDiscount,
      shipping,
      total,
      status: 'new',
      createdAt,
      // سجل التغييرات بيبدأ بسطر الإنشاء — أي انتقال بعد كده لازم يسجّل سطر زيه (حزمة 2)
      history: [{ from: null, to: 'new', at: createdAt, actor: 'system' }],
    }
    localStorage.setItem(`3a-store-order-${number}`, JSON.stringify(order))
    if (cart.couponCode && cart.couponDiscount > 0) {
      recordCouponUse(cart.couponCode, cleanEgyptPhone(form.phone), number)
    }
    setTimeout(() => {
      setDone({ number, total })
      setSending(false)
      cart.clearCart() // الطلب اتعمل — السلة (والكود) بتتفضى
    }, 600)
  }

  if (done) {
    return (
      <main className="empty">
        <h1 className="page-title">اتعمل طلبك ✅</h1>
        <p>رقم الطلب: <strong dir="ltr">#{done.number}</strong></p>
        <p>
          الإجمالي المطلوب كاش عند الاستلام: <strong dir="ltr">{done.total} ج.م</strong>
        </p>
        <p className="hint">
          هنكلّمك على واتساب/تليفونك نأكد الطلب قبل الشحن، والدفع كاش عند الاستلام.
        </p>
        <a className="cta" href={`/track?number=${done.number}`}>تتبّع طلبك</a>{' '}
        <a className="cta" href="/">كمّل تسوّق</a>
      </main>
    )
  }

  if (cart.items.length === 0) {
    return (
      <main className="empty">
        <p>سلتك فاضية — ضيف منتجات الأول</p>
        <a className="cta" href="/">ارجع للمتجر</a>
      </main>
    )
  }

  const errorCount = Object.values(errors).filter(Boolean).length

  return (
    <main>
      <h1 className="page-title">إتمام الطلب</h1>

      <section className="summary-box">
        {cart.items.map((i) => (
          <div className="cart-line" key={i.key}>
            <span aria-hidden>{i.emoji}</span>
            <div className="cart-line-main">
              <div>{i.name}</div>
              <div className="hint">مقاس {i.size} • {i.color} • <span dir="ltr">×{i.qty}</span></div>
            </div>
            <span dir="ltr">{i.price * i.qty} ج.م</span>
          </div>
        ))}
        <div className="sum-row"><span>الإجمالي الفرعي</span><span dir="ltr">{cart.subtotal} ج.م</span></div>
        <CouponField />
        {cart.couponDiscount > 0 && (
          <div className="sum-row"><span>خصم الكود</span><span dir="ltr">−{cart.couponDiscount} ج.م</span></div>
        )}
        {couponError && <div className="f-error">{couponError}</div>}
        <div className="sum-row">
          <span>الشحن{gov ? ` (${gov.name})` : ''}</span>
          <span dir="ltr">{!gov ? '—' : freeShip ? 'مجاني' : `${shipping} ج.م`}</span>
        </div>
        <div className="sum-row total"><span>الإجمالي</span><span dir="ltr">{gov || freeShip ? `${total} ج.م` : `${productsTotal} ج.م + الشحن`}</span></div>
        {!freeShip && remaining > 0 && (
          <p className="hint">فاضلك بـ<span dir="ltr">{remaining}</span> جنيه ويبقى الشحن مجاني</p>
        )}
        {gov && <p className="hint">التوصيل المتوقع: {gov.days}</p>}
      </section>

      {errorCount > 0 && (
        <div className="f-error">فيه <span dir="ltr">{errorCount}</span> حاجات محتاجة تتصلح تحت</div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); submit() }} noValidate>
        <label className="f-field">الاسم بالكامل
          <input value={form.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" />
          {errors.name && <span className="f-error">{errors.name}</span>}
        </label>
        <label className="f-field">رقم الموبايل
          <input type="tel" dir="ltr" value={form.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" />
          {errors.phone && <span className="f-error">{errors.phone}</span>}
        </label>
        <label className="f-field">موبايل بديل (اختياري)
          <input type="tel" dir="ltr" value={form.phoneAlt} onChange={(e) => set('phoneAlt', e.target.value)} />
          {errors.phoneAlt && <span className="f-error">{errors.phoneAlt}</span>}
        </label>
        <label className="f-field">المحافظة
          <select value={form.gov} onChange={(e) => set('gov', e.target.value)}>
            <option value="">اختار محافظتك…</option>
            {govs.map((g) => (
              <option key={g.name} value={g.name}>{g.name} — شحن {g.fee} ج.م</option>
            ))}
          </select>
          {errors.gov && <span className="f-error">{errors.gov}</span>}
        </label>
        <label className="f-field">المدينة/المنطقة
          <select value={form.city} onChange={(e) => set('city', e.target.value)} disabled={!gov}>
            <option value="">اختار مدينتك…</option>
            {gov?.cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.city && <span className="f-error">{errors.city}</span>}
        </label>
        <label className="f-field">العنوان بالتفصيل
          <input value={form.address} onChange={(e) => set('address', e.target.value)} autoComplete="street-address" />
          {errors.address && <span className="f-error">{errors.address}</span>}
        </label>
        <label className="f-field">علامة مميزة (اختياري)
          <input value={form.landmark} onChange={(e) => set('landmark', e.target.value)} placeholder="جنب صيدلية كذا…" />
        </label>
        <label className="f-field">ملاحظات الطلب (اختياري — <span dir="ltr">{form.notes.length}</span>/٥٠٠)
          <textarea value={form.notes} maxLength={500} onChange={(e) => set('notes', e.target.value)} rows={3} />
        </label>

        <div className="pay-box">
          <strong>طريقة الدفع: الدفع عند الاستلام (كاش)</strong>
          <p className="hint">
            هتدفع <span dir="ltr">{total}</span> جنيه للمندوب عند الاستلام
            {gov ? '' : ' — اختار المحافظة عشان يظهر الإجمالي النهائي بالشحن'}.
          </p>
        </div>

        <button type="submit" className="cta-btn block big" disabled={sending}>
          {sending ? 'بنعمل طلبك…' : 'أكّد الطلب'}
        </button>
      </form>
    </main>
  )
}

export function useCheckoutSummary() {
  return useMemo(() => getStoreConfig().threshold, [])
}
