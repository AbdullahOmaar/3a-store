import { useMemo, useState } from 'react'
import { products, sizeCharts, variantPrice, type Product } from '../data/sample'
import ProductCard from '../components/ProductCard'
import ReviewsSection from '../components/ReviewsSection'
import { useCart } from '../store/cart'

function SizeGuide({ product, onPick }: { product: Product; onPick: (size: string) => void }) {
  const chart = sizeCharts[product.categorySlug]
  const [tab, setTab] = useState<'chart' | 'fit'>('chart')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [fitError, setFitError] = useState<string | null>(null)
  const [fitResult, setFitResult] = useState<string | null>(null)

  const calcFit = () => {
    const h = Number(height)
    const w = Number(weight)
    if (!height) return setFitError('اكتب طولك بالسنتيمتر')
    if (isNaN(h) || isNaN(w)) return setFitError('اكتب أرقام بس')
    if (h < 120 || h > 220) return setFitError('الطول لازم يكون بين ١٢٠ و٢٢٠ سم — راجعه')
    if (!weight) return setFitError('اكتب وزنك بالكيلو')
    if (w < 30 || w > 200) return setFitError('الوزن لازم يكون بين ٣٠ و٢٠٠ كجم')
    setFitError(null)
    // اقتراح تقريبي من الطول والوزن — جدول المقاسات هو الأدق (حزمة 3)
    const bmi = w / ((h / 100) * (h / 100))
    const sizes = [...new Set(product.variants.map((v) => v.size))]
    const letters = ['S', 'M', 'L', 'XL', '2XL'].filter((s) => sizes.includes(s))
    if (!letters.length) {
      setFitResult('__whatsapp__')
      return
    }
    const pick = bmi < 20 ? letters[0] : bmi < 25 ? letters[Math.min(1, letters.length - 1)]
      : bmi < 30 ? letters[Math.min(2, letters.length - 1)] : letters[letters.length - 1]
    setFitResult(pick)
  }

  return (
    <div className="drawer-backdrop">
      <div className="drawer full" role="dialog" aria-label="جدول المقاسات">
        <div className="drawer-head">
          <h3>المقاسات</h3>
          <button type="button" className="tool-btn" onClick={() => onPick('')}>✕ إغلاق</button>
        </div>
        <div className="tabs">
          <button type="button" className={tab === 'chart' ? 'chip on' : 'chip'} onClick={() => setTab('chart')}>
            جدول المقاسات
          </button>
          <button type="button" className={tab === 'fit' ? 'chip on' : 'chip'} onClick={() => setTab('fit')}>
            اعرف مقاسك
          </button>
        </div>
        {tab === 'chart' ? (
          chart ? (
            <div>
              <div className="table-scroll">
                <table className="size-table">
                  <thead>
                    <tr>{Object.keys(chart.rows[0]).map((k) => <th key={k}>{k}</th>)}</tr>
                  </thead>
                  <tbody>
                    {chart.rows.map((r, i) => (
                      <tr key={i}>{Object.values(r).map((v, j) => <td key={j} dir="ltr">{v}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="hint">{chart.note}</p>
              <p className="hint">المقاسات دي للقطعة نفسها مش لجسمك — لو بين مقاسين، اختار الأكبر.</p>
            </div>
          ) : (
            <p className="hint">جدول مقاسات القسم ده هيتضاف من لوحة التحكم.</p>
          )
        ) : (
          <div>
            <label className="f-field">الطول (سم)
              <input inputMode="numeric" dir="ltr" value={height} onChange={(e) => setHeight(e.target.value)} />
            </label>
            <label className="f-field">الوزن (كجم)
              <input inputMode="numeric" dir="ltr" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </label>
            {fitError && <div className="f-error">{fitError}</div>}
            <button type="button" className="cta-btn" onClick={calcFit}>احسب مقاسي</button>
            {fitResult === '__whatsapp__' ? (
              <p className="hint">مقاساتنا مش مغطية الأرقام دي — كلّمنا واتساب وهنساعدك.</p>
            ) : fitResult ? (
              <div className="fit-result">
                <p>مقاسك المقترح: <strong>{fitResult}</strong></p>
                <p className="hint">ده اقتراح تقريبي من طولك ووزنك — جدول المقاسات فوق هو الأدق، ولو بين مقاسين اختار الأكبر.</p>
                <button type="button" className="cta-btn" onClick={() => onPick(fitResult)}>اختار المقاس ده</button>
              </div>
            ) : null}
            <p className="hint">بياناتك دي مابتتحفظش — بتتحسب في جهازك بس.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProductPage({ slug }: { slug: string }) {
  const product = products.find((p) => p.slug === slug)
  const cart = useCart()
  const [color, setColor] = useState<string | null>(null)
  const [size, setSize] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [guide, setGuide] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)

  const similar = useMemo(
    () => (product ? products.filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id).slice(0, 4) : []),
    [product],
  )

  if (!product) {
    return (
      <main className="empty">
        <p>المنتج ده مش موجود أو اتشال</p>
        <a className="cta" href="/">ارجع للرئيسية</a>
      </main>
    )
  }

  const sizesForColor = color
    ? product.variants.filter((v) => v.color === color)
    : product.variants
  const selected = color && size
    ? product.variants.find((v) => v.color === color && v.size === size)
    : undefined
  const price = selected ? variantPrice(product, selected) : product.price
  const allOut = product.variants.every((v) => v.stock === 0)
  const gallery = [product.emoji, '🧵', '📦']

  const tryAdd = (goCheckout: boolean) => {
    if (!color) {
      setError('اختار اللون الأول')
      return
    }
    if (!size) {
      setError('اختار المقاس الأول')
      document.getElementById('sizes')?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    if (!selected || selected.stock === 0) {
      setError('المقاس ده خلص من لحظات، اختار مقاس تاني')
      return
    }
    if (qty > selected.stock) {
      setError('ده كل المتاح من المقاس ده دلوقتي')
      return
    }
    setError(null)
    cart.add({
      slug: product.slug, name: product.name, emoji: product.emoji,
      size, color, price: variantPrice(product, selected), qty, max: selected.stock,
    })
    if (goCheckout) location.href = '/checkout'
  }

  return (
    <main className="product-page">
      <div className="gallery">
        <div className="gallery-main">
          <span className="gallery-emoji" aria-hidden>{gallery[imgIdx]}</span>
          {product.priceBefore && <span className="badge badge-sale">خصم</span>}
          {allOut && <span className="badge badge-out">نفد</span>}
          <span className="gallery-count" dir="ltr">{imgIdx + 1} / {gallery.length}</span>
        </div>
        <div className="gallery-dots">
          {gallery.map((_, i) => (
            <button key={i} type="button" aria-label={`صورة ${i + 1}`}
              className={i === imgIdx ? 'dot on' : 'dot'} onClick={() => setImgIdx(i)} />
          ))}
        </div>
      </div>

      <h1 className="page-title">{product.name}</h1>
      <div className="card-price big">
        <span className="price-now" dir="ltr">{price} ج.م</span>
        {product.priceBefore && <span className="price-old" dir="ltr">{product.priceBefore} ج.م</span>}
      </div>
      <p className="page-sub">
        {product.categorySlug} • كود المنتج: <span dir="ltr">{product.sku}</span>
      </p>

      <div className="f-group">
        <div className="f-title">اللون</div>
        <div className="f-opts">
          {product.colors.map((c) => (
            <button key={c.name} type="button"
              className={color === c.name ? 'chip on' : 'chip'}
              onClick={() => { setColor(c.name); setSize(null); setError(null) }}>
              <span className="swatch" style={{ background: c.hex }} /> {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="f-group" id="sizes">
        <div className="f-title">
          المقاس{' '}
          <button type="button" className="link-btn" onClick={() => setGuide(true)}>جدول المقاسات</button>
        </div>
        <div className="f-opts">
          {[...new Set(sizesForColor.map((v) => v.size))].map((s) => {
            const v = sizesForColor.find((x) => x.size === s)
            const out = !v || v.stock === 0
            return (
              <button key={s} type="button" disabled={out}
                className={size === s ? 'chip on' : 'chip'}
                onClick={() => { setSize(s); setError(null) }}>
                <span className={out ? 'strike' : ''}>{s}</span>
              </button>
            )
          })}
        </div>
        {!color && <p className="hint">اختار اللون الأول عشان تظهر المقاسات المتاحة ليه.</p>}
      </div>

      <div className="f-group">
        <div className="f-title">الكمية</div>
        <div className="qty-row">
          <button type="button" className="tool-btn" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
          <span dir="ltr">{qty}</span>
          <button type="button" className="tool-btn"
            onClick={() => {
              if (selected && qty >= selected.stock) setError('ده كل المتاح من المقاس ده دلوقتي')
              else setQty((q) => q + 1)
            }}>+</button>
        </div>
        {selected && (
          <p className="hint">
            {selected.stock === 0 ? 'نفد' : selected.stock <= 5 ? `باقي ${selected.stock} قطع بس من المقاس ده` : 'متاح'}
          </p>
        )}
      </div>

      {error && <div className="f-error">{error}</div>}

      <section className="trust mini">
        <div>🧵 الخامة: {product.material}</div>
        <div>🚚 يوصل خلال ٢–٤ أيام حسب محافظتك</div>
        <div>🔁 استبدال واسترجاع خلال ١٤ يوم</div>
        <div>💵 الدفع عند الاستلام — كاش</div>
      </section>

      <section>
        <h2>التفاصيل</h2>
        <p>{product.description}</p>
        <p>الخامة: {product.material} • طريقة الغسيل: {product.care}</p>
        <p>الموديل طوله/ها <span dir="ltr">{product.modelHeight}</span> سم ولابس/ة مقاس {product.modelSize}</p>
      </section>

      <ReviewsSection slug={product.slug} productName={product.name} />

      {similar.length > 0 && (
        <section>
          <h2>ممكن يعجبك كمان</h2>
          <div className="hscroll">
            {similar.map((p) => (
              <div className="hscroll-item" key={p.id}><ProductCard p={p} /></div>
            ))}
          </div>
        </section>
      )}

      <div className="sticky-buy">
        <button type="button" className="cta-btn" disabled={allOut} onClick={() => tryAdd(false)}>
          {allOut ? 'نفد' : 'أضف للسلة'}
        </button>
        <button type="button" className="tool-btn grow" disabled={allOut} onClick={() => tryAdd(true)}>
          اطلب دلوقتي
        </button>
      </div>

      {guide && (
        <SizeGuide
          product={product}
          onPick={(s) => {
            if (s) setSize(s)
            setGuide(false)
          }}
        />
      )}
    </main>
  )
}
