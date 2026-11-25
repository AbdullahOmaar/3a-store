import { categories, products, type SampleProduct } from './data/sample'

function discountPct(p: SampleProduct): number | null {
  if (!p.priceBefore) return null
  return Math.round((1 - p.price / p.priceBefore) * 100)
}

// كارت منتج موحّد في كل مكان (حزمة 5): صورة 4:5، اسم سطرين كحد أقصى،
// سعر حالي + قديم مشطوب، شارة خصم/جديد/نفد. الضغطة على الكارت كله.
function ProductCard({ p }: { p: SampleProduct }) {
  const pct = discountPct(p)
  return (
    <a className="card" href={`/product/${p.slug}`}>
      <div className="card-img">
        <span className="card-emoji" aria-hidden>{p.emoji}</span>
        {pct && <span className="badge badge-sale">خصم {pct}٪</span>}
        {p.badge && <span className="badge badge-new">{p.badge}</span>}
      </div>
      <div className="card-body">
        <div className="card-name">{p.name}</div>
        <div className="card-price">
          <span className="price-now" dir="ltr">{p.price} ج.م</span>
          {p.priceBefore && (
            <span className="price-old" dir="ltr">{p.priceBefore} ج.م</span>
          )}
        </div>
      </div>
    </a>
  )
}

export default function App() {
  const bestSellers = products.slice(0, 8)
  const offers = products.filter((p) => p.priceBefore)
  return (
    <div className="page">
      <header className="header">
        <div className="header-row">
          <div className="logo">المتجر</div>
          <button className="cart-btn" type="button">
            السلة <span className="cart-count" dir="ltr">0</span>
          </button>
        </div>
        <div className="header-row">
          <input
            className="search"
            type="search"
            placeholder="دوّر على منتج… (تيشيرت، فستان، شنطة)"
            aria-label="بحث"
          />
        </div>
        <nav className="header-cats" aria-label="الأقسام">
          {categories.map((c) => (
            <a key={c.slug} href={`/category/${c.slug}`}>{c.name}</a>
          ))}
        </nav>
      </header>

      <main>
        <section className="banner">
          <h1>لبس يومي بأسعار على قد الإيد</h1>
          <p>الدفع عند الاستلام — شحن لكل المحافظات — استبدال خلال ١٤ يوم</p>
          <a className="cta" href="#new">تسوّق دلوقتي</a>
        </section>

        <section className="cats-row" aria-label="تسوق حسب القسم">
          {categories.map((c) => (
            <a key={c.slug} className="cat-circle" href={`/category/${c.slug}`}>
              <span className="cat-emoji" aria-hidden>{c.emoji}</span>
              <span>{c.name}</span>
            </a>
          ))}
        </section>

        <section>
          <h2>الأكثر مبيعًا</h2>
          <div className="hscroll">
            {bestSellers.map((p) => (
              <div className="hscroll-item" key={p.id}>
                <ProductCard p={p} />
              </div>
            ))}
          </div>
        </section>

        <section id="new">
          <h2>وصل حديثًا</h2>
          <div className="grid">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>

        {offers.length > 0 && (
          <section>
            <h2>عروض وخصومات</h2>
            <div className="grid">
              {offers.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          </section>
        )}

        <section className="trust">
          <div>💵 الدفع عند الاستلام</div>
          <div>🚚 شحن لكل المحافظات</div>
          <div>🔁 استبدال واسترجاع خلال ١٤ يوم</div>
          <div>💬 واتساب للاستفسار</div>
        </section>
      </main>

      <footer className="footer">
        <div>الأقسام: {categories.map((c) => c.name).join(' • ')}</div>
        <div>سياسة الاستبدال والاسترجاع • الشحن والتوصيل • تواصل معانا واتساب</div>
      </footer>
    </div>
  )
}
