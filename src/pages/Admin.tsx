import { useMemo, useState } from 'react'
import { categories, products } from '../data/sample'
import { CANCEL_REASON_LABELS, STATUS_LABELS } from '../data/settings'
import { ensureDemoOrder, formatDateTime, loadOrders, type LocalOrder } from '../lib/orders'
import {
  ALLOWED,
  adjustStock,
  effectiveGovernorates,
  getProductEdits,
  getStockLog,
  getStoreConfig,
  markConfirmed,
  saveProductEdit,
  saveStoreConfig,
  stockValue,
  transitionOrder,
  type StoreConfig,
} from '../data/admin'
import { AdminShell } from './Reports'

const arNum = (n: number) => n.toLocaleString('ar-EG')

// ---------- الرئيسية: أرقام اليوم + «محتاج شغلك دلوقتي» ----------
export function AdminHomePage() {
  ensureDemoOrder()
  const orders = loadOrders()
  const today = new Date().toDateString()
  const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today)
  const newOrders = orders.filter((o) => o.status === 'new')
  const month = new Date().getMonth()
  const monthSales = orders
    .filter((o) => o.status === 'delivered' && new Date(o.createdAt).getMonth() === month)
    .reduce((s, o) => s + o.total - o.shipping, 0)
  const edits = getProductEdits()
  const lowStock: string[] = []
  const outStock: string[] = []
  for (const p of products) {
    if (edits[p.slug]?.hidden) continue
    for (const v of p.variants) {
      const s = stockValue(p.slug, v.size, v.color, v.stock)
      if (s === 0) outStock.push(`${p.name} — ${v.size}/${v.color}`)
      else if (s <= 5) lowStock.push(`${p.name} — ${v.size}/${v.color} (باقي ${arNum(s)})`)
    }
  }
  return (
    <AdminShell title="لوحة التحكم">
      <div className="kpi-grid">
        <div className="kpi-card"><strong dir="ltr">{arNum(todayOrders.length)}</strong><span>طلبات النهاردة</span></div>
        <div className="kpi-card"><strong dir="ltr">{arNum(newOrders.length)}</strong><span>جديدة مستنية تأكيد</span></div>
        <div className="kpi-card"><strong dir="ltr">{arNum(monthSales)} ج.م</strong><span>مبيعات الشهر (مسلّمة بس)</span></div>
        <div className="kpi-card"><strong dir="ltr">{arNum(outStock.length + lowStock.length)}</strong><span>متغيرات نافدة/قليلة</span></div>
      </div>
      <h2>محتاج شغلك دلوقتي</h2>
      {newOrders.length === 0 && lowStock.length === 0 && outStock.length === 0 && <p className="hint">مفيش حاجة مستعجلة دلوقتي ✅</p>}
      {newOrders.map((o) => (
        <a key={o.number} className="order-card" href={`/admin/orders/${o.number}`}>
          <strong>طلب #{o.number}</strong> — {o.form.full_name} — {arNum(o.total)} ج.م — مستني التأكيد
        </a>
      ))}
      {outStock.map((s) => <p key={s} className="stock-line out">🔴 نافد: {s}</p>)}
      {lowStock.map((s) => <p key={s} className="stock-line low">🟡 مخزون قليل: {s}</p>)}
      <p className="hint">اللوحة شغالة على بيانات الجهاز لحد ما قاعدة البيانات تتربط (دفعة 2) — نفس الشاشات والقواعد هتشتغل على البيانات الحية.</p>
    </AdminShell>
  )
}

// ---------- قايمة الطلبات: فلتر بالحالة + بحث + عدّاد الجديد ----------
const STATUS_FILTERS = ['all', 'new', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled', 'returned', 'delivery_failed']

export function AdminOrdersPage() {
  ensureDemoOrder()
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const orders = loadOrders()
  const newCount = orders.filter((o) => o.status === 'new').length
  const shown = orders.filter((o) => {
    if (filter !== 'all' && o.status !== filter) return false
    const t = q.trim()
    if (!t) return true
    return o.number.includes(t) || o.form.full_name.includes(t) || o.form.phone.includes(t)
  })
  return (
    <AdminShell title="الطلبات">
      {newCount > 0 && <p className="alert-line">🔔 {arNum(newCount)} طلبات جديدة محتاجة تأكيد</p>}
      <input className="search" type="search" placeholder="دوّر برقم الطلب أو الاسم أو الموبايل…"
        value={q} onChange={(e) => setQ(e.target.value)} aria-label="بحث الطلبات" />
      <div className="chip-row">
        {STATUS_FILTERS.map((s) => (
          <button key={s} type="button" className={`chip${filter === s ? ' on' : ''}`} onClick={() => setFilter(s)}>
            {s === 'all' ? 'الكل' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="hint">مفيش طلبات مطابقة.</p>}
      {shown.map((o) => (
        <a key={o.number} className="order-card" href={`/admin/orders/${o.number}`}>
          <div className="order-head">
            <strong>#{o.number}</strong>
            {o.status === 'new' && <span className="badge badge-new">جديد</span>}
            <span className={`badge st-${o.status}`}>{STATUS_LABELS[o.status]}</span>
            <span dir="ltr">{arNum(o.total)} ج.م</span>
          </div>
          <div className="hint">{o.form.full_name} — {o.form.phone} — {formatDateTime(o.createdAt)}</div>
        </a>
      ))}
    </AdminShell>
  )
}

// ---------- تفاصيل طلب: تأكيد + انتقالات مقيدة + إلغاء بسبب + سجل ----------
export function AdminOrderDetailPage({ number }: { number: string }) {
  ensureDemoOrder()
  const [, setTick] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [channel, setChannel] = useState<'phone' | 'whatsapp'>('whatsapp')
  const [tracking, setTracking] = useState('')
  const [company, setCompany] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonNote, setReasonNote] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [copied, setCopied] = useState(false)
  const order = loadOrders().find((o) => o.number === number)

  if (!order) {
    return (
      <AdminShell title="تفاصيل الطلب">
        <p className="hint">الطلب ده مش موجود.</p>
        <a className="cta-btn" href="/admin/orders">ارجع للطلبات</a>
      </AdminShell>
    )
  }
  const o: LocalOrder = order
  const next = ALLOWED[o.status] ?? []
  const refresh = () => setTick((t) => t + 1)

  const doTransition = (to: string) => {
    const err = transitionOrder(o, to, {
      trackingNumber: to === 'shipped' ? tracking || o.trackingNumber : undefined,
      shippingCompany: to === 'shipped' ? company || o.shippingCompany : undefined,
    })
    setError(err)
    if (!err) refresh()
  }
  const doCancel = () => {
    const err = transitionOrder(o, 'cancelled', {
      reasonCode: reason || undefined,
      reasonNote,
      contactAttempts: attempts,
    })
    setError(err)
    if (!err) {
      setCancelOpen(false)
      refresh()
    }
  }
  const copyShipping = async () => {
    const items = o.items.map((i) => `${i.name} (${i.size}/${i.color}) × ${i.qty}`).join('، ')
    const text = `طلب #${o.number}\nالاسم: ${o.form.full_name}\nالموبايل: ${o.form.phone}\nالمحافظة: ${o.form.governorate} — ${o.form.city}\nالعنوان: ${o.form.address}\nالمنتجات: ${items}\nالإجمالي كاش: ${o.total} ج.م`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setError('المتصفح منع النسخ — انسخ البيانات يدويًا')
    }
  }
  const gated = (to: string) =>
    (to === 'preparing' || to === 'shipped' || to === 'confirmed') && !o.confirmedWithCustomer

  return (
    <AdminShell title={`طلب #${o.number}`}>
      <p>
        <span className={`badge st-${o.status}`}>{STATUS_LABELS[o.status]}</span>{' '}
        <span className="hint">{formatDateTime(o.createdAt)}</span>
      </p>
      <h2>المنتجات (أسعار متجمّدة وقت الطلب)</h2>
      {o.items.map((i, idx) => (
        <div key={idx} className="order-card">
          {i.emoji} {i.name} — {i.size}/{i.color} — × <span dir="ltr">{arNum(i.qty)}</span> —{' '}
          <span dir="ltr">{arNum(i.price * i.qty)} ج.م</span>
        </div>
      ))}
      <p>المنتجات: <span dir="ltr">{arNum(o.subtotal)} ج.م</span>
        {(o.discount ?? 0) > 0 && <> — خصم {o.couponCode}: <span dir="ltr">−{arNum(o.discount ?? 0)} ج.م</span></>}
        {' '}— الشحن: <span dir="ltr">{o.shipping === 0 ? 'مجاني' : `${arNum(o.shipping)} ج.م`}</span>
        {' '}— <strong>الإجمالي كاش: <span dir="ltr">{arNum(o.total)} ج.م</span></strong></p>

      <h2>العميل والشحن</h2>
      <div className="order-card">
        <div>{o.form.full_name} — <span dir="ltr">{o.form.phone}</span></div>
        <div className="hint">{o.form.governorate} — {o.form.city} — {o.form.address}</div>
        {o.form.notes && <div className="hint">ملحوظات: {o.form.notes}</div>}
        {o.trackingNumber && <div className="hint">رقم الشحنة: {o.trackingNumber}{o.shippingCompany ? ` — ${o.shippingCompany}` : ''}</div>}
        <div className="btn-row">
          <a className="chip" href={`tel:${o.form.phone}`}>📞 اتصال</a>
          <a className="chip" href={`https://wa.me/2${o.form.phone}`} target="_blank" rel="noreferrer">واتساب</a>
          <button type="button" className="chip" onClick={copyShipping}>{copied ? 'اتنسخ ✅' : 'انسخ بيانات الشحن'}</button>
        </div>
      </div>

      {!o.confirmedWithCustomer && !['cancelled', 'returned', 'delivered'].includes(o.status) && (
        <>
          <h2>تأكيد الطلب مع العميل</h2>
          <div className="order-card">
            <p className="hint">الطلب ماينفعش يجهّز أو يتشحن قبل توثيق التأكيد مع العميل.</p>
            <div className="chip-row">
              <button type="button" className={`chip${channel === 'whatsapp' ? ' on' : ''}`} onClick={() => setChannel('whatsapp')}>واتساب</button>
              <button type="button" className={`chip${channel === 'phone' ? ' on' : ''}`} onClick={() => setChannel('phone')}>تليفون</button>
            </div>
            <button type="button" className="cta-btn" onClick={() => { markConfirmed(o, channel); refresh() }}>
              تم التأكيد {channel === 'whatsapp' ? 'واتساب' : 'تليفون'}
            </button>
          </div>
        </>
      )}
      {o.confirmedWithCustomer && (
        <p className="hint">✅ مؤكد مع العميل ({o.confirmationChannel === 'whatsapp' ? 'واتساب' : 'تليفون'})</p>
      )}

      {next.length > 0 && (
        <>
          <h2>حرّك الطلب</h2>
          {next.includes('shipped') && (
            <div className="form-grid">
              <input placeholder="رقم الشحنة" value={tracking} onChange={(e) => setTracking(e.target.value)} aria-label="رقم الشحنة" />
              <input placeholder="شركة الشحن" value={company} onChange={(e) => setCompany(e.target.value)} aria-label="شركة الشحن" />
            </div>
          )}
          <div className="btn-row">
            {next.filter((s) => s !== 'cancelled').map((to) => (
              <button key={to} type="button" className="cta-btn" disabled={gated(to)} onClick={() => doTransition(to)}>
                {STATUS_LABELS[to]}
              </button>
            ))}
            {next.includes('cancelled') && (
              <button type="button" className="danger-btn" onClick={() => setCancelOpen(true)}>إلغاء الطلب</button>
            )}
          </div>
          {next.some(gated) && <p className="hint">أزرار الحركة مقفولة لحد توثيق التأكيد مع العميل.</p>}
        </>
      )}
      {error && <p className="err">{error}</p>}

      {cancelOpen && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-label="إلغاء الطلب">
            <h2>إلغاء الطلب #{o.number}</h2>
            <label>سبب الإلغاء (إلزامي)
              <select value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="">اختار السبب…</option>
                {Object.entries(CANCEL_REASON_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            {reason === 'no_answer' && (
              <label>عدد محاولات الاتصال الموثقة
                <input type="number" min={0} value={attempts} onChange={(e) => setAttempts(Number(e.target.value))} />
              </label>
            )}
            <label>توضيح (إلزامي مع «سبب تاني» — ١٠ حروف على الأقل)
              <textarea value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} rows={3} />
            </label>
            {error && <p className="err">{error}</p>}
            <div className="btn-row">
              <button type="button" className="danger-btn" onClick={doCancel}>أكّد الإلغاء</button>
              <button type="button" className="chip" onClick={() => setCancelOpen(false)}>رجوع</button>
            </div>
          </div>
        </div>
      )}

      <h2>سجل التغييرات (قراءة بس)</h2>
      {[...o.history].reverse().map((h, i) => (
        <div key={i} className="order-card">
          {h.from ? `${STATUS_LABELS[h.from] ?? h.from} ← ` : ''}{STATUS_LABELS[h.to] ?? h.to}
          <span className="hint"> — {formatDateTime(h.at)}{h.note ? ` — ${h.note}` : ''}{h.reason ? ` — السبب: ${CANCEL_REASON_LABELS[h.reason] ?? h.reason}` : ''}</span>
        </div>
      ))}
    </AdminShell>
  )
}

// ---------- المنتجات: قايمة + فورم تحقق + متغيرات ومخزون بسجل ----------
interface LocalProduct {
  slug: string
  name: string
  price: number
  priceBefore?: number | null
  material: string
  description: string
  categorySlug: string
  hidden: boolean
  isLocal?: boolean
}

const LOCAL_PRODUCTS_KEY = '3a-store-local-products'

function getLocalProducts(): LocalProduct[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PRODUCTS_KEY) ?? '[]') as LocalProduct[]
  } catch {
    return []
  }
}

export function AdminProductsPage() {
  const [, setTick] = useState(0)
  const refresh = () => setTick((t) => t + 1)
  const edits = getProductEdits()
  const [form, setForm] = useState({ slug: '', name: '', categorySlug: '', description: '', price: '', priceBefore: '', material: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [openSlug, setOpenSlug] = useState<string | null>(null)
  const log = getStockLog()

  const list: LocalProduct[] = [
    ...products.map((p) => {
      const e = edits[p.slug]
      return {
        slug: p.slug,
        name: e?.name ?? p.name,
        price: e?.price ?? p.price,
        priceBefore: e?.priceBefore !== undefined ? e.priceBefore : p.priceBefore,
        material: e?.material ?? p.material,
        description: e?.description ?? p.description,
        categorySlug: p.categorySlug,
        hidden: !!e?.hidden,
      }
    }),
    ...getLocalProducts(),
  ]

  const saveForm = () => {
    const price = Number(form.price)
    const priceBefore = form.priceBefore ? Number(form.priceBefore) : null
    if (form.name.trim().length < 3) return setFormError('اسم المنتج لازم يكون ٣ حروف على الأقل')
    if (!form.categorySlug) return setFormError('اختار قسم المنتج')
    if (form.description.trim().length < 20) return setFormError('الوصف لازم يكون ٢٠ حرف على الأقل')
    if (!(price > 0)) return setFormError('السعر لازم يكون أكبر من صفر')
    if (priceBefore !== null && priceBefore <= price) return setFormError('السعر قبل الخصم لازم يكون أكبر من السعر الحالي')
    if (!form.material.trim()) return setFormError('خامة المنتج مطلوبة')
    setFormError(null)
    if (form.slug) {
      if (getLocalProducts().some((p) => p.slug === form.slug)) {
        const all = getLocalProducts().map((p) => (p.slug === form.slug ? { ...p, name: form.name, price, priceBefore, material: form.material, description: form.description, categorySlug: form.categorySlug } : p))
        localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(all))
      } else {
        saveProductEdit(form.slug, { name: form.name, price, priceBefore, material: form.material, description: form.description })
      }
    } else {
      const slug = `local-${Date.now()}`
      const all = [...getLocalProducts(), { slug, name: form.name, price, priceBefore, material: form.material, description: form.description, categorySlug: form.categorySlug, hidden: false, isLocal: true }]
      localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(all))
    }
    setForm({ slug: '', name: '', categorySlug: '', description: '', price: '', priceBefore: '', material: '' })
    refresh()
  }

  return (
    <AdminShell title="المنتجات">
      {list.map((p) => {
        const src = products.find((x) => x.slug === p.slug)
        const totalStock = src ? src.variants.reduce((s, v) => s + stockValue(p.slug, v.size, v.color, v.stock), 0) : 0
        return (
          <div key={p.slug} className="order-card">
            <div className="order-head">
              <strong>{p.name}</strong>
              {p.hidden && <span className="badge badge-out">مخفي</span>}
              <span dir="ltr">{arNum(p.price)} ج.م</span>
            </div>
            <div className="hint">
              {categories.find((c) => c.slug === p.categorySlug)?.name ?? p.categorySlug} — {p.material}
              {src && <> — إجمالي المخزون: <span dir="ltr">{arNum(totalStock)}</span></>}
            </div>
            <div className="btn-row">
              <button type="button" className="chip" onClick={() => setForm({
                slug: p.slug, name: p.name, categorySlug: p.categorySlug, description: p.description,
                price: String(p.price), priceBefore: p.priceBefore ? String(p.priceBefore) : '', material: p.material,
              })}>تعديل</button>
              <button type="button" className="chip" onClick={() => {
                if (p.isLocal) {
                  const all = getLocalProducts().map((x) => (x.slug === p.slug ? { ...x, hidden: !x.hidden } : x))
                  localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(all))
                } else saveProductEdit(p.slug, { hidden: !p.hidden })
                refresh()
              }}>{p.hidden ? 'إظهار' : 'إخفاء'}</button>
              {src && (
                <button type="button" className="chip" onClick={() => setOpenSlug(openSlug === p.slug ? null : p.slug)}>
                  المتغيرات والمخزون
                </button>
              )}
            </div>
            {src && openSlug === p.slug && (
              <div>
                {src.variants.map((v) => {
                  const s = stockValue(p.slug, v.size, v.color, v.stock)
                  return (
                    <div key={`${v.size}-${v.color}`} className="variant-row">
                      <span>{v.size} / {v.color}</span>
                      <span className={s === 0 ? 'stock-out' : s <= 5 ? 'stock-low' : ''} dir="ltr">{arNum(s)}</span>
                      <span className="btn-row">
                        <button type="button" className="chip" aria-label="نقّص" onClick={() => { adjustStock(p.slug, v.size, v.color, s, -1, 'manual'); refresh() }}>−</button>
                        <button type="button" className="chip" aria-label="زوّد" onClick={() => { adjustStock(p.slug, v.size, v.color, s, 1, 'manual'); refresh() }}>+</button>
                      </span>
                    </div>
                  )
                })}
                <p className="hint">سجل الحركات (مين/إمتى/كام):</p>
                {log.filter((m) => m.slug === p.slug).slice(0, 5).map((m, i) => (
                  <p key={i} className="hint">{formatDateTime(m.at)} — {m.size}/{m.color} — {m.delta > 0 ? '+' : ''}{arNum(m.delta)} — أدمن — {m.reason}</p>
                ))}
                {log.filter((m) => m.slug === p.slug).length === 0 && <p className="hint">لسه مفيش حركات.</p>}
              </div>
            )}
          </div>
        )
      })}

      <h2>{form.slug ? 'تعديل منتج' : 'منتج جديد'}</h2>
      <div className="form-grid">
        <input placeholder="اسم المنتج" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="اسم المنتج" />
        <select value={form.categorySlug} onChange={(e) => setForm({ ...form, categorySlug: e.target.value })} aria-label="القسم">
          <option value="">اختار القسم…</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <input placeholder="السعر (ج.م)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} aria-label="السعر" />
        <input placeholder="السعر قبل الخصم (اختياري)" type="number" value={form.priceBefore} onChange={(e) => setForm({ ...form, priceBefore: e.target.value })} aria-label="السعر قبل الخصم" />
        <input placeholder="الخامة (مطلوبة)" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} aria-label="الخامة" />
        <textarea placeholder="الوصف (٢٠ حرف على الأقل)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} aria-label="الوصف" />
      </div>
      {formError && <p className="err">{formError}</p>}
      <div className="btn-row">
        <button type="button" className="cta-btn" onClick={saveForm}>حفظ المنتج</button>
        {form.slug && <button type="button" className="chip" onClick={() => setForm({ slug: '', name: '', categorySlug: '', description: '', price: '', priceBefore: '', material: '' })}>إلغاء التعديل</button>}
      </div>
      <p className="hint">مفيش حذف نهائي في اللوحة — الإخفاء بس. الصور بتترفع WebP مضغوطة مع ربط القاعدة.</p>
    </AdminShell>
  )
}

// ---------- الإعدادات: أرقام المتجر + رسوم المحافظات + الأقسام ----------
export function AdminSettingsPage() {
  const [cfg, setCfg] = useState<StoreConfig>(() => getStoreConfig())
  const [saved, setSaved] = useState(false)
  const govs = effectiveGovernorates()
  const setFee = (name: string, fee: number, days: string) =>
    setCfg((c) => ({ ...c, fees: { ...c.fees, [name]: { fee, days } } }))
  return (
    <AdminShell title="الإعدادات">
      <h2>إعدادات المتجر</h2>
      <div className="form-grid">
        <label>رقم واتساب المتجر (دولي من غير +)
          <input value={cfg.whatsapp} onChange={(e) => setCfg({ ...cfg, whatsapp: e.target.value })} dir="ltr" />
        </label>
        <label>أيام الاسترجاع
          <input type="number" value={cfg.returnDays} onChange={(e) => setCfg({ ...cfg, returnDays: Number(e.target.value) })} dir="ltr" />
        </label>
        <label>حد الشحن المجاني (ج.م)
          <input type="number" value={cfg.threshold} onChange={(e) => setCfg({ ...cfg, threshold: Number(e.target.value) })} dir="ltr" />
        </label>
        <label>رسالة التأكيد
          <input value={cfg.confirmationMessage} onChange={(e) => setCfg({ ...cfg, confirmationMessage: e.target.value })} />
        </label>
      </div>
      <h2>رسوم الشحن (٢٧ محافظة — ممنوع محافظة من غير رسم)</h2>
      {govs.map((g) => {
        const cur = cfg.fees[g.name] ?? { fee: g.fee, days: g.days }
        return (
          <div key={g.name} className="variant-row">
            <span>{g.name}</span>
            <input type="number" min={0} value={cur.fee} aria-label={`رسم ${g.name}`}
              onChange={(e) => setFee(g.name, Number(e.target.value), cur.days)} dir="ltr" />
            <input value={cur.days} aria-label={`مدة ${g.name}`}
              onChange={(e) => setFee(g.name, cur.fee, e.target.value)} />
          </div>
        )
      })}
      <div className="btn-row">
        <button type="button" className="cta-btn" onClick={() => { saveStoreConfig(cfg); setSaved(true) }}>
          {saved ? 'اتحفظ ✅' : 'حفظ الإعدادات'}
        </button>
      </div>
      <p className="hint">الأرقام دي هي نفس مصدر التشيك أوت وصفحتي الشحن والاسترجاع — تعديل هنا بيغيّر في الكل فورًا.</p>
      <h2>الأقسام</h2>
      {categories.map((c) => (
        <div key={c.slug} className="order-card">
          {c.emoji} {c.name} — <span dir="ltr">{arNum(products.filter((p) => p.categorySlug === c.slug).length)}</span> منتج
          <div className="hint">{c.subs.join(' • ')}</div>
        </div>
      ))}
    </AdminShell>
  )
}
