import { useMemo, useState } from 'react'
import { categories, products } from '../data/sample'
import { couponStatus, getCoupons } from '../data/coupons'
import {
  bestSellers,
  byGovernorate,
  couponStats,
  dailySeries,
  downloadCSV,
  fmtDay,
  getReorderDecisions,
  inRange,
  inventoryRows,
  lastUpdatedText,
  reorderAlerts,
  salesTotals,
  sampleOrders,
  setReorderDecision,
} from '../data/reports'

// ---------- هيكل لوحة التقارير (دفعة 5 هتبني لوحة التحكم الكاملة — دي شاشات التقارير بس) ----------

function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const alerts = reorderAlerts(sampleOrders).length
  return (
    <main>
      <p className="hint">لوحة التحكم — التقارير</p>
      <h1 className="page-title">{title}</h1>
      <nav className="admin-nav">
        <a href="/admin/reports/sales">المبيعات</a>
        <a href="/admin/reports/best-sellers">الأعلى مبيعًا</a>
        <a href="/admin/reports/coupons">الكوبونات</a>
        <a href="/admin/reports/inventory">المخزون</a>
        <a href="/admin/reports/reorder">إعادة الطلب {alerts > 0 && <span className="badge badge-out">{alerts}</span>}</a>
        <a href="/admin/coupons">إدارة الكوبونات</a>
      </nav>
      <p className="hint">البيانات لحد {lastUpdatedText()} — بيانات عرض محسوبة من طلبات تجريبية (المبيعات = المسلّمة بس).</p>
      {children}
    </main>
  )
}

// فلتر الفترة المشترك — أزرار سريعة + من/إلى + رسائل الخطأ المحددة (حزمة التقارير)
function usePeriod() {
  const today = new Date()
  const [from, setFrom] = useState(() => {
    const d = new Date(today)
    d.setDate(d.getDate() - 6)
    return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(() => today.toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)

  const apply = (f: string, t: string) => {
    const fd = new Date(f)
    const td = new Date(t)
    if (td < fd) return setError('تاريخ النهاية لازم يكون بعد البداية')
    if ((td.getTime() - fd.getTime()) / 86400000 > 365) return setError('اختار فترة أقل من سنة عشان التقرير يطلع بسرعة')
    setError(null)
    setFrom(f)
    setTo(t)
  }

  const quick = (days: number, label: string) => {
    const t = new Date(today)
    const f = new Date(today)
    f.setDate(f.getDate() - (days - 1))
    apply(f.toISOString().slice(0, 10), t.toISOString().slice(0, 10))
  }
  const lastMonth = () => {
    const f = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const t = new Date(today.getFullYear(), today.getMonth(), 0)
    apply(f.toISOString().slice(0, 10), t.toISOString().slice(0, 10))
  }

  const controls = (
    <div className="period-filter">
      <div className="chips-row">
        <button type="button" className="chip" onClick={() => quick(1, '')}>النهاردة</button>
        <button type="button" className="chip" onClick={() => quick(7, '')}>آخر ٧ أيام</button>
        <button type="button" className="chip" onClick={() => quick(30, '')}>الشهر ده</button>
        <button type="button" className="chip" onClick={lastMonth}>الشهر اللي فات</button>
      </div>
      <div className="f-price">
        <label className="f-field">من
          <input type="date" dir="ltr" value={from} onChange={(e) => apply(e.target.value, to)} />
        </label>
        <label className="f-field">إلى
          <input type="date" dir="ltr" value={to} onChange={(e) => apply(from, e.target.value)} />
        </label>
      </div>
      {error && <div className="f-error">{error}</div>}
    </div>
  )
  return { from: new Date(from), to: new Date(to), error, controls }
}

function pctChange(cur: number, prev: number) {
  if (!prev) return '—'
  const p = Math.round(((cur - prev) / prev) * 100)
  return `${p >= 0 ? 'أعلى' : 'أقل'} ${Math.abs(p)}٪ من الفترة اللي قبلها`
}

function Empty() {
  return <p className="empty">مفيش مبيعات في الفترة دي — جرّب فترة تانية</p>
}

// ---------- هـ١ — تقرير المبيعات ----------

export function SalesReportPage() {
  const { from, to, controls } = usePeriod()
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const orders = useMemo(() => inRange(sampleOrders, from, to), [from, to])
  const totals = useMemo(() => salesTotals(orders), [orders])
  const prevOrders = useMemo(() => {
    const len = Math.round((to.getTime() - from.getTime()) / 86400000) + 1
    const pf = new Date(from)
    pf.setDate(pf.getDate() - len)
    const pt = new Date(from)
    pt.setDate(pt.getDate() - 1)
    return inRange(sampleOrders, pf, pt)
  }, [from, to])
  const prev = useMemo(() => salesTotals(prevOrders), [prevOrders])
  const days = useMemo(() => dailySeries(orders, from, to), [orders, from, to])
  const govs = useMemo(() => byGovernorate(orders), [orders])
  const maxDay = Math.max(1, ...days.map((d) => d.sales))
  const dayDetail = selectedDay ? days.find((d) => d.date === selectedDay) : null

  return (
    <AdminShell title="تقرير المبيعات">
      {controls}
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">إجمالي المبيعات (منتجات بس)</div><div className="kpi-value" dir="ltr">{totals.sales} ج.م</div><div className="hint">{pctChange(totals.sales, prev.sales)}</div></div>
        <div className="kpi"><div className="kpi-label">الطلبات المسلّمة</div><div className="kpi-value" dir="ltr">{totals.orders}</div><div className="hint">{pctChange(totals.orders, prev.orders)}</div></div>
        <div className="kpi"><div className="kpi-label">متوسط قيمة الطلب</div><div className="kpi-value" dir="ltr">{totals.avg} ج.م</div><div className="hint">{pctChange(totals.avg, prev.avg)}</div></div>
        <div className="kpi"><div className="kpi-label">الشحن المحصّل (منفصل)</div><div className="kpi-value" dir="ltr">{totals.shipping} ج.م</div><div className="hint">{pctChange(totals.shipping, prev.shipping)}</div></div>
      </div>
      {days.length === 0 || totals.orders === 0 ? (
        <Empty />
      ) : (
        <>
          <h2>مبيعات كل يوم</h2>
          <p className="hint">اضغط على عمود عشان تشوف تفصيل اليوم ده — الملغي بيتعرض عشان تشوف حجم الخسارة، بس مابيتجمعش على المبيعات.</p>
          <div className="bars" role="img" aria-label="مبيعات كل يوم">
            {days.map((d) => (
              <button key={d.date} type="button" className={`bar${selectedDay === d.date ? ' on' : ''}`}
                style={{ height: `${Math.max(6, Math.round((d.sales / maxDay) * 120))}px` }}
                title={`${fmtDay(d.date)} — ${d.sales} ج.م`}
                onClick={() => setSelectedDay(d.date)}>
                <span className="bar-val" dir="ltr">{d.sales > 0 ? d.sales : ''}</span>
              </button>
            ))}
          </div>
          <div className="bars-labels">
            {days.map((d) => <span key={d.date}>{new Date(d.date).getDate()}</span>)}
          </div>
          {dayDetail && (
            <div className="summary-box">
              <div className="sum-row"><span>اليوم</span><strong>{fmtDay(dayDetail.date)}</strong></div>
              <div className="sum-row"><span>الطلبات المسلّمة</span><span dir="ltr">{dayDetail.orders}</span></div>
              <div className="sum-row"><span>المبيعات</span><span dir="ltr">{dayDetail.sales} ج.م</span></div>
              <div className="sum-row"><span>الشحن</span><span dir="ltr">{dayDetail.shipping} ج.م</span></div>
              <div className="sum-row"><span>الملغي</span><span dir="ltr">{dayDetail.cancelled} طلب • {dayDetail.cancelledValue} ج.م</span></div>
            </div>
          )}
          <button type="button" className="tool-btn" onClick={() =>
            downloadCSV('sales.csv', ['التاريخ', 'الطلبات', 'المبيعات', 'الشحن', 'الملغي (عدد)', 'الملغي (قيمة)'],
              days.map((d) => [d.date, d.orders, d.sales, d.shipping, d.cancelled, d.cancelledValue]))}>
            تصدير CSV
          </button>
          <h2>تقسيم حسب المحافظة</h2>
          {govs.map((g) => (
            <div className="order-card" key={g.name}>
              <div><strong>{g.name}</strong></div>
              <div className="hint"><span dir="ltr">{g.orders}</span> طلب مسلّم • مبيعات <span dir="ltr">{g.sales} ج.م</span></div>
              <div className="hint">نسبة فشل التسليم: <span dir="ltr">{g.failRate}٪</span>{g.failRate >= 20 ? ' — راجع التأكيد في المحافظة دي، الـCOD فيها بيخسّر' : ''}</div>
            </div>
          ))}
        </>
      )}
    </AdminShell>
  )
}

// ---------- هـ٢ — الأعلى مبيعًا ----------

export function BestSellersPage() {
  const { from, to, controls } = usePeriod()
  const [cat, setCat] = useState('')
  const [tab, setTab] = useState<'sold' | 'unsold'>('sold')
  const orders = useMemo(() => inRange(sampleOrders, from, to), [from, to])
  const rows = useMemo(() => bestSellers(orders), [orders])
  const soldSlugs = new Set(rows.map((r) => r.slug))
  const unsold = products.filter((p) => !soldSlugs.has(p.slug))
  const filtered = rows.filter((r) => !cat || r.category === cat)

  return (
    <AdminShell title="الأعلى مبيعًا">
      {controls}
      <div className="chips-row">
        <button type="button" className={`chip${cat === '' ? ' on' : ''}`} onClick={() => setCat('')}>كل الأقسام</button>
        {categories.map((c) => (
          <button key={c.slug} type="button" className={`chip${cat === c.slug ? ' on' : ''}`} onClick={() => setCat(c.slug)}>{c.name}</button>
        ))}
      </div>
      <div className="tabs">
        <button type="button" className={tab === 'sold' ? 'chip on' : 'chip'} onClick={() => setTab('sold')}>باع في الفترة</button>
        <button type="button" className={tab === 'unsold' ? 'chip on' : 'chip'} onClick={() => setTab('unsold')}>ماباعتش</button>
      </div>
      {tab === 'sold' ? (
        filtered.length === 0 ? <Empty /> : filtered.map((r) => (
          <div className="order-card" key={r.slug}>
            <div><span aria-hidden>{r.emoji}</span> <strong>{r.name}</strong></div>
            <div className="hint"><span dir="ltr">{r.qty}</span> قطعة مباعة • إجمالي المبيعات <span dir="ltr">{r.sales} ج.م</span></div>
            <div className="hint">أعلى متغير مبيعًا: {r.topVariant}</div>
          </div>
        ))
      ) : (
        unsold.length === 0 ? <p className="empty">كل المنتجات باعت في الفترة دي</p> : unsold.map((p) => (
          <div className="order-card" key={p.slug}>
            <div><span aria-hidden>{p.emoji}</span> <strong>{p.name}</strong></div>
            <div className="hint">ماباعتش خالص في الفترة — فكّر تخفضه أو تخفيه</div>
          </div>
        ))
      )}
      <button type="button" className="tool-btn" onClick={() =>
        downloadCSV('best-sellers.csv', ['المنتج', 'القطع المباعة', 'إجمالي المبيعات', 'أعلى متغير'],
          filtered.map((r) => [r.name, r.qty, r.sales, r.topVariant]))}>
        تصدير CSV
      </button>
    </AdminShell>
  )
}

// ---------- هـ٣ — تقرير الكوبونات ----------

export function CouponsReportPage() {
  const { from, to, controls } = usePeriod()
  const orders = useMemo(() => inRange(sampleOrders, from, to), [from, to])
  const stats = useMemo(() => couponStats(orders, getCoupons()), [orders])

  return (
    <AdminShell title="تقرير الكوبونات">
      {controls}
      <p className="hint">متوسط قيمة الطلب مع الكود مقابل من غيره بيقيس الكود بيجيب طلبات جديدة ولا بيخصم من طلبات كانت هتيجي كده كده.</p>
      {stats.map((c) => (
        <div className="order-card" key={c.code}>
          <div>
            <strong dir="ltr">{c.code}</strong>{' '}
            <span className="badge badge-sale">{c.type === 'percent' ? `خصم ${c.value}٪` : `خصم ${c.value} ج.م`}</span>{' '}
            {c.unused && <span className="badge badge-out">مش مستخدم — اقتراح: وقّفه</span>}
            {couponStatus(c) === 'expired' && <span className="badge badge-out">منتهي</span>}
            {couponStatus(c) === 'paused' && <span className="badge badge-out">موقوف</span>}
          </div>
          <div className="hint">استخدم <span dir="ltr">{c.uses}</span> مرة • إجمالي الخصم المصروف <span dir="ltr">{c.discountTotal} ج.م</span></div>
          <div className="hint">مبيعات الطلبات اللي استخدمته: <span dir="ltr">{c.sales} ج.م</span></div>
          <div className="hint">متوسط الطلب مع الكود <span dir="ltr">{c.avgWith} ج.م</span> مقابل من غيره <span dir="ltr">{c.avgWithout} ج.م</span></div>
          <div className="hint">الحد الأدنى: <span dir="ltr">{c.minOrder} ج.م</span> • من {c.startsAt} لحد {c.endsAt}</div>
        </div>
      ))}
      <button type="button" className="tool-btn" onClick={() =>
        downloadCSV('coupons.csv', ['الكود', 'مرات الاستخدام', 'إجمالي الخصم', 'مبيعات مع الكود', 'متوسط مع الكود', 'متوسط من غيره'],
          stats.map((c) => [c.code, c.uses, c.discountTotal, c.sales, c.avgWith, c.avgWithout]))}>
        تصدير CSV
      </button>
      <p className="hint">إدارة الكوبونات (إنشاء/تعديل/إيقاف) من <a href="/admin/coupons">صفحة إدارة الكوبونات</a> — التقرير ده للقراءة والقرار.</p>
    </AdminShell>
  )
}

// ---------- هـ٤ — تقرير المخزون ----------

export function InventoryReportPage() {
  const [cat, setCat] = useState('')
  const [status, setStatus] = useState<'all' | 'out' | 'low' | 'ok'>('all')
  const [q, setQ] = useState('')
  const rows = useMemo(() => inventoryRows(sampleOrders), [])
  const filtered = rows.filter((r) =>
    (!cat || r.category === cat) &&
    (status === 'all' || r.status === status) &&
    (!q.trim() || r.name.includes(q.trim())),
  )
  const counts = {
    out: rows.filter((r) => r.status === 'out').length,
    low: rows.filter((r) => r.status === 'low').length,
    ok: rows.filter((r) => r.status === 'ok').length,
  }
  const section = (label: string, key: 'out' | 'low' | 'ok') => {
    const list = filtered.filter((r) => r.status === key)
    if (list.length === 0) return null
    return (
      <div key={key}>
        <h2>{label} (<span dir="ltr">{list.length}</span>)</h2>
        {list.map((r) => (
          <div className="order-card" key={`${r.slug}-${r.size}-${r.color}`}>
            <div><span aria-hidden>{r.emoji}</span> <strong>{r.name}</strong> — {r.size} / {r.color}</div>
            <div className="hint">المخزون الحالي: <span dir="ltr">{r.stock}</span> • آخر مرة اتباع: {r.lastSold ? fmtDay(r.lastSold) : 'ماباعتش خالص'}</div>
            <div><a className="tool-btn" href={`/product/${r.slug}`}>تحديث المخزون</a></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <AdminShell title="تقرير المخزون">
      <p className="hint">نافد <span dir="ltr">{counts.out}</span> • قليل <span dir="ltr">{counts.low}</span> • متاح <span dir="ltr">{counts.ok}</span> — التقرير للقراءة والقرار، والتعديل من صفحة المنتج (تعديل المتغيرات من لوحة التحكم لسه دفعة 5).</p>
      <div className="chips-row">
        <button type="button" className={`chip${cat === '' ? ' on' : ''}`} onClick={() => setCat('')}>كل الأقسام</button>
        {categories.map((c) => (
          <button key={c.slug} type="button" className={`chip${cat === c.slug ? ' on' : ''}`} onClick={() => setCat(c.slug)}>{c.name}</button>
        ))}
      </div>
      <div className="chips-row">
        {([['all', 'الكل'], ['out', 'نافد'], ['low', 'قليل'], ['ok', 'متاح']] as const).map(([v, l]) => (
          <button key={v} type="button" className={`chip${status === v ? ' on' : ''}`} onClick={() => setStatus(v)}>{l}</button>
        ))}
      </div>
      <input className="search big" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر باسم المنتج…" aria-label="بحث في المخزون" />
      {section('🔴 نافد', 'out')}
      {section('🟡 قليل', 'low')}
      {section('🟢 متاح', 'ok')}
      {filtered.length === 0 && <p className="empty">مفيش متغيرات مطابقة للفلتر ده</p>}
      <button type="button" className="tool-btn" onClick={() =>
        downloadCSV('inventory.csv', ['المنتج', 'المقاس', 'اللون', 'المخزون', 'آخر بيع'],
          filtered.map((r) => [r.name, r.size, r.color, r.stock, r.lastSold ? r.lastSold.slice(0, 10) : '—']))}>
        تصدير CSV
      </button>
    </AdminShell>
  )
}

// ---------- هـ٥ — تنبيهات إعادة الطلب ----------

export function ReorderAlertsPage() {
  const [decisions, setDecisions] = useState<Record<string, { action: string; at: string; reason?: string }>>(() => getReorderDecisions())
  const [reasonFor, setReasonFor] = useState<string | null>(null)
  const [reasonText, setReasonText] = useState('')
  const alerts = useMemo(() => reorderAlerts(sampleOrders), [decisions])
  const done = (key: string, action: 'ordered' | 'not_needed', reason?: string) => {
    setReorderDecision(key, { action, at: new Date().toISOString(), reason })
    setDecisions(getReorderDecisions())
    setReasonFor(null)
    setReasonText('')
  }

  return (
    <AdminShell title="تنبيهات إعادة الطلب">
      <p className="hint">قايمة تلقائية: أي متغير مخزونه ≤ حد إعادة الطلب اللي الأدمن حاطه للمنتج (افتراضي ٥) — مرتبة بالأخطر أولًا (النافد، ثم الأسرع مبيعًا). التنبيه مايختفيش من نفسه — لازم قرار أدمن موثّق.</p>
      {alerts.length === 0 ? (
        <p className="empty">مفيش متغيرات محتاجة إعادة طلب دلوقتي ✅</p>
      ) : alerts.map((r) => {
        const key = `${r.slug}|${r.size}|${r.color}`
        return (
          <div className="order-card" key={key}>
            <div><span aria-hidden>{r.emoji}</span> <strong>{r.name}</strong> — {r.size} / {r.color}</div>
            <div className="hint">المخزون: <span dir="ltr">{r.stock}</span> (الحد: <span dir="ltr">{r.threshold}</span>) • متوسط المبيعات اليومية: <span dir="ltr">{r.dailyAvg.toFixed(1)}</span> قطعة/يوم</div>
            <div className="hint">
              {r.daysLeft === null
                ? 'ماباعتش آخر ٣٠ يوم — راجع قبل ما تطلب'
                : r.daysLeft <= 0
                  ? 'نافد — اطلب فورًا'
                  : `الأيام المتبقية المتوقعة: ${r.daysLeft} يوم`}
            </div>
            {reasonFor === key ? (
              <div>
                <input className="search big" value={reasonText} onChange={(e) => setReasonText(e.target.value)} placeholder="سبب «مش محتاج» — إلزامي" />
                <div className="drawer-actions">
                  <button type="button" className="cta-btn" disabled={!reasonText.trim()} onClick={() => done(key, 'not_needed', reasonText.trim())}>تأكيد «مش محتاج»</button>
                  <button type="button" className="tool-btn" onClick={() => setReasonFor(null)}>إلغاء</button>
                </div>
              </div>
            ) : (
              <div className="drawer-actions">
                <button type="button" className="cta-btn" onClick={() => done(key, 'ordered')}>تم الطلب</button>
                <button type="button" className="tool-btn" onClick={() => setReasonFor(key)}>مش محتاج</button>
              </div>
            )}
          </div>
        )
      })}
      {Object.keys(decisions).length > 0 && (
        <>
          <h2>قرارات سابقة</h2>
          {Object.entries(decisions).map(([key, d]) => (
            <div className="order-card" key={key}>
              <div className="hint">{key.replaceAll('|', ' / ')} — {d.action === 'ordered' ? 'تم الطلب' : 'مش محتاج'} • {new Date(d.at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}{d.reason ? ` • السبب: ${d.reason}` : ''}</div>
            </div>
          ))}
        </>
      )}
    </AdminShell>
  )
}

export function ReportsIndexPage() {
  const alerts = reorderAlerts(sampleOrders).length
  return (
    <AdminShell title="التقارير">
      <div className="order-card">
        <div><strong>تنبيهات إعادة الطلب</strong> — <span dir="ltr">{alerts}</span> متغير محتاج قرارك دلوقتي</div>
        <div><a className="tool-btn" href="/admin/reports/reorder">افتح القايمة</a></div>
      </div>
      <p className="hint">كل التقارير بتتحسب من الطلبات المسلّمة بس، والشحن منفصل عن سعر المنتجات دايمًا.</p>
    </AdminShell>
  )
}
