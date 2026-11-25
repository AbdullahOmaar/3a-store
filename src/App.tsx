import { useState } from 'react'
import { categories } from './data/sample'
import { CartProvider, useCart } from './store/cart'
import CartDrawer from './components/CartDrawer'
import { HomePage, CategoryPage, SearchPage } from './pages/Shop'
import ProductPage from './pages/Product'

function Shell() {
  const cart = useCart()
  const [search, setSearch] = useState('')
  const path = location.pathname
  const params = new URLSearchParams(location.search)

  let page: React.ReactNode
  if (path === '/' || path === '') page = <HomePage />
  else if (path.startsWith('/category/')) page = <CategoryPage slug={path.split('/')[2] ?? ''} />
  else if (path === '/search') page = <SearchPage query={params.get('q') ?? ''} />
  else if (path.startsWith('/product/')) page = <ProductPage slug={path.split('/')[2] ?? ''} />
  else if (path === '/checkout')
    page = (
      <main className="empty">
        <p>صفحة إتمام الطلب جاية في الدفعة الجاية (حزمة ٢) — سلتك محفوظة.</p>
        <a className="cta" href="/">ارجع للمتجر</a>
      </main>
    )
  else
    page = (
      <main className="empty">
        <p>الصفحة دي مش موجودة</p>
        <a className="cta" href="/">ارجع للرئيسية</a>
      </main>
    )

  return (
    <div className="page">
      <header className="header">
        <div className="header-row">
          <a className="logo" href="/">المتجر</a>
          <button className="cart-btn" type="button" onClick={() => cart.setOpen(true)}>
            السلة <span className="cart-count" dir="ltr">{cart.count}</span>
          </button>
        </div>
        <form
          className="header-row"
          onSubmit={(e) => {
            e.preventDefault()
            location.href = `/search?q=${encodeURIComponent(search)}`
          }}
        >
          <input className="search" type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="دوّر على منتج…" aria-label="بحث" />
        </form>
        <nav className="header-cats" aria-label="الأقسام">
          {categories.map((c) => (
            <a key={c.slug} href={`/category/${c.slug}`}>{c.name}</a>
          ))}
        </nav>
      </header>

      {page}

      <footer className="footer">
        <div>الأقسام: {categories.map((c) => c.name).join(' • ')}</div>
        <div>سياسة الاستبدال والاسترجاع • الشحن والتوصيل • تواصل معانا واتساب</div>
      </footer>
      <CartDrawer />
    </div>
  )
}

export default function App() {
  return (
    <CartProvider>
      <Shell />
    </CartProvider>
  )
}
