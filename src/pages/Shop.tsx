import { useMemo, useState } from 'react'
import { categories, products } from '../data/sample'
import ProductCard from '../components/ProductCard'
import ProductListing from '../components/ProductListing'
import { matchesQuery } from '../lib/arabic'
import VersionLine from '../components/VersionLine'

export function HomePage() {
  const best = useMemo(() => [...products].sort((a, b) => b.sales - a.sales).slice(0, 8), [])
  const fresh = useMemo(
    () => [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8), [])
  const offers = useMemo(
    () =>
      products
        .filter((p) => p.priceBefore)
        .sort((a, b) => (1 - b.price / (b.priceBefore ?? b.price)) - (1 - a.price / (a.priceBefore ?? a.price))),
    [],
  )
  const visibleCats = categories.filter((c) => products.some((p) => p.categorySlug === c.slug))
  return (
    <main>
      <section className="banner">
        <h1>لبس يومي بأسعار على قد الإيد</h1>
        <p>الدفع عند الاستلام — شحن لكل المحافظات — استبدال خلال ١٤ يوم</p>
        <a className="cta" href="#new">تسوّق دلوقتي</a>
        <VersionLine />
      </section>

      <section className="cats-row" aria-label="تسوق حسب القسم">
        {visibleCats.map((c) => (
          <a key={c.slug} className="cat-circle" href={`/category/${c.slug}`}>
            <span className="cat-emoji" aria-hidden>{c.emoji}</span>
            <span>{c.name}</span>
          </a>
        ))}
      </section>

      <section>
        <h2>الأكثر مبيعًا</h2>
        <div className="hscroll">
          {best.map((p) => (
            <div className="hscroll-item" key={p.id}><ProductCard p={p} /></div>
          ))}
        </div>
      </section>

      <section id="new">
        <h2>وصل حديثًا</h2>
        <div className="grid">{fresh.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </section>

      {offers.length > 0 && (
        <section>
          <h2>عروض وخصومات</h2>
          <div className="grid">{offers.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}

      <section className="trust">
        <div>💵 الدفع عند الاستلام</div>
        <div>🚚 شحن لكل المحافظات</div>
        <div>🔁 استبدال واسترجاع خلال ١٤ يوم</div>
        <div>💬 واتساب للاستفسار</div>
      </section>
    </main>
  )
}

export function CategoryPage({ slug }: { slug: string }) {
  const cat = categories.find((c) => c.slug === slug)
  if (!cat) return <main className="empty"><p>القسم ده مش موجود</p><a href="/">ارجع للرئيسية</a></main>
  const list = products.filter((p) => p.categorySlug === slug)
  return (
    <main>
      <h1 className="page-title">{cat.name}</h1>
      <p className="page-sub"><span dir="ltr">{list.length}</span> منتج</p>
      {list.length === 0 ? (
        <div className="empty">
          <p>لسه مفيش منتجات هنا — جرّب قسم تاني</p>
          <div className="sub-row">
            {categories.filter((c) => c.slug !== slug).map((c) => (
              <a key={c.slug} className="chip" href={`/category/${c.slug}`}>{c.name}</a>
            ))}
          </div>
        </div>
      ) : (
        <ProductListing list={list} subs={cat.subs} basePath={`/category/${slug}`} />
      )}
    </main>
  )
}

export function SearchPage({ query }: { query: string }) {
  const [q, setQ] = useState(query)
  const tooShort = q.trim().length === 1
  const results = useMemo(() => {
    if (q.trim().length < 2) return []
    return products.filter(
      (p) => matchesQuery(p.name, q) || matchesQuery(p.description, q) || matchesQuery(p.sku, q),
    )
  }, [q])
  const suggestions = useMemo(() => {
    if (q.trim().length < 2) return []
    return products.filter((p) => matchesQuery(p.name, q)).slice(0, 6)
  }, [q])
  const best = useMemo(() => [...products].sort((a, b) => b.sales - a.sales).slice(0, 4), [])

  return (
    <main>
      <h1 className="page-title">البحث</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          history.pushState(null, '', `/search?q=${encodeURIComponent(q)}`)
        }}
      >
        <input className="search big" type="search" value={q} autoFocus
          onChange={(e) => setQ(e.target.value)} placeholder="دوّر على منتج أو كود…" aria-label="بحث" />
      </form>
      {suggestions.length > 0 && q.trim() !== query && (
        <div className="suggest">
          {suggestions.map((p) => (
            <a key={p.id} href={`/product/${p.slug}`}>{p.emoji} {p.name}</a>
          ))}
        </div>
      )}
      {tooShort ? (
        <p className="empty">اكتب كلمتين على الأقل عشان ندوّر صح</p>
      ) : q.trim().length >= 2 && results.length === 0 ? (
        <div className="empty">
          <p>مفيش نتيجة لـ«{q}» — جرّب كلمة تانية أو شوف الأقسام دي</p>
          <h2>الأكثر مبيعًا</h2>
          <div className="grid">{best.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </div>
      ) : q.trim().length >= 2 ? (
        <ProductListing list={results} basePath={`/search?q=${encodeURIComponent(q)}`} />
      ) : null}
    </main>
  )
}
