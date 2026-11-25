import { useMemo, useState } from 'react'
import { categories } from '../data/sample'
import {
  couponStatus,
  couponUses,
  getCoupons,
  saveCoupons,
  validateCouponFields,
  type Coupon,
} from '../data/coupons'
import { sampleOrders } from '../data/reports'

const emptyCoupon: Coupon = {
  code: '',
  type: 'percent',
  value: 10,
  minOrder: 0,
  useLimit: null,
  perCustomerLimit: 1,
  startsAt: new Date().toISOString().slice(0, 10),
  endsAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  status: 'active',
  categories: [],
}

const STATUS_LABEL: Record<string, string> = { active: 'شغال', paused: 'موقوف', expired: 'منتهي' }

export default function CouponsAdminPage() {
  const [coupons, setCoupons] = useState<Coupon[]>(() => getCoupons())
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [form, setForm] = useState<Coupon>(emptyCoupon)
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const refresh = () => setCoupons(getCoupons())

  const discountTotal = (code: string) =>
    sampleOrders
      .filter((o) => o.coupon === code)
      .reduce((a, o) => a + (o.discount ?? 0), 0)

  const toggle = (c: Coupon) => {
    const next = coupons.map((x) =>
      x.code === c.code ? { ...x, status: x.status === 'paused' ? 'active' as const : 'paused' as const } : x,
    )
    saveCoupons(next)
    refresh()
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyCoupon)
    setFormError(null)
    setSaved(false)
  }

  const openEdit = (c: Coupon) => {
    setEditing(c)
    setForm({ ...c })
    setFormError(null)
    setSaved(false)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned: Coupon = { ...form, code: form.code.trim().toUpperCase() }
    const err = validateCouponFields(cleaned, editing?.code)
    if (err) return setFormError(err)
    const next = editing
      ? coupons.map((x) => (x.code === editing.code ? cleaned : x))
      : [...coupons, cleaned]
    saveCoupons(next)
    refresh()
    setSaved(true)
    setEditing(null)
    setForm(emptyCoupon)
  }

  const set = <K extends keyof Coupon>(k: K, v: Coupon[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setFormError(null)
    setSaved(false)
  }

  const formTitle = editing ? `تعديل الكود ${editing.code}` : 'كود خصم جديد'

  return (
    <main>
      <p className="hint">لوحة التحكم — الكوبونات</p>
      <h1 className="page-title">إدارة الكوبونات</h1>
      <nav className="admin-nav">
        <a href="/admin/reports">التقارير</a>
        <a href="/admin/reports/coupons">تقرير الكوبونات</a>
      </nav>

      <h2>الكوبونات (<span dir="ltr">{coupons.length}</span>)</h2>
      {coupons.map((c) => {
        const st = couponStatus(c)
        const uses = couponUses(c.code)
        return (
          <div className="order-card" key={c.code}>
            <div>
              <strong dir="ltr">{c.code}</strong>{' '}
              <span className="badge badge-sale">{c.type === 'percent' ? `خصم ${c.value}٪` : `خصم ${c.value} ج.م`}</span>{' '}
              <span className="badge badge-new">{STATUS_LABEL[st]}</span>
            </div>
            <div className="hint">
              الحد الأدنى: <span dir="ltr">{c.minOrder} ج.م</span> • الاستخدام: <span dir="ltr">{uses}{c.useLimit !== null ? ` / ${c.useLimit}` : ''}</span> • لكل عميل: <span dir="ltr">{c.perCustomerLimit}</span>
            </div>
            <div className="hint">من {c.startsAt} لحد {c.endsAt} • إجمالي الخصم المصروف: <span dir="ltr">{discountTotal(c.code)} ج.م</span>{c.categories.length ? ` • الأقسام: ${c.categories.map((s) => categories.find((x) => x.slug === s)?.name ?? s).join('، ')}` : ' • كل المنتجات'}</div>
            <div className="drawer-actions">
              <button type="button" className="tool-btn" onClick={() => openEdit(c)}>تعديل</button>
              {st !== 'expired' && (
                <button type="button" className="tool-btn" onClick={() => toggle(c)}>
                  {st === 'paused' ? 'تشغيل' : 'إيقاف'}
                </button>
              )}
            </div>
            <p className="hint">مفيش حذف لكود اتستخدم قبل كده — بيتوقف بس.</p>
          </div>
        )
      })}

      <h2>{formTitle}</h2>
      <form onSubmit={submit} noValidate>
        <label className="f-field">الكود (حروف وأرقام إنجليزي بس، ٣–٢٠ حرف)
          <input dir="ltr" value={form.code} onChange={(e) => set('code', e.target.value)} disabled={!!editing} />
        </label>
        <label className="f-field">النوع
          <select value={form.type} onChange={(e) => set('type', e.target.value as 'percent' | 'fixed')}>
            <option value="percent">نسبة ٪</option>
            <option value="fixed">مبلغ ثابت بالجنيه</option>
          </select>
        </label>
        <label className="f-field">{form.type === 'percent' ? 'النسبة (١–٩٠٪)' : 'المبلغ بالجنيه'}
          <input type="number" dir="ltr" value={form.value} onChange={(e) => set('value', Number(e.target.value))} />
        </label>
        <label className="f-field">الحد الأدنى للطلب (ج.م — اختياري، ٠ = بلا حد)
          <input type="number" dir="ltr" value={form.minOrder} onChange={(e) => set('minOrder', Number(e.target.value))} />
        </label>
        <label className="f-field">حد الاستخدام الكلي (اختياري — سيبه فاضي لبلا حد)
          <input type="number" dir="ltr" value={form.useLimit ?? ''} onChange={(e) => set('useLimit', e.target.value === '' ? null : Number(e.target.value))} />
        </label>
        <label className="f-field">حد الاستخدام لكل عميل
          <input type="number" dir="ltr" value={form.perCustomerLimit} onChange={(e) => set('perCustomerLimit', Number(e.target.value))} />
        </label>
        <div className="f-price">
          <label className="f-field">تاريخ البداية
            <input type="date" dir="ltr" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
          </label>
          <label className="f-field">تاريخ النهاية
            <input type="date" dir="ltr" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
          </label>
        </div>
        <fieldset className="f-group">
          <legend className="f-title">الأقسام المشمولة (فاضي = كل المنتجات)</legend>
          <div className="chips-row">
            {categories.map((cat) => {
              const on = form.categories.includes(cat.slug)
              return (
                <button key={cat.slug} type="button" className={`chip${on ? ' on' : ''}`}
                  onClick={() => set('categories', on ? form.categories.filter((s) => s !== cat.slug) : [...form.categories, cat.slug])}>
                  {cat.name}
                </button>
              )
            })}
          </div>
        </fieldset>
        {formError && <div className="f-error">{formError}</div>}
        {saved && <p className="hint">اتحفظ الكود ✅</p>}
        <div className="drawer-actions">
          <button type="submit" className="cta-btn">{editing ? 'حفظ التعديل' : 'إنشاء الكود'}</button>
          {!editing && <button type="button" className="tool-btn" onClick={openCreate}>مسح الفورم</button>}
          {editing && <button type="button" className="tool-btn" onClick={openCreate}>إلغاء التعديل</button>}
        </div>
      </form>
    </main>
  )
}
