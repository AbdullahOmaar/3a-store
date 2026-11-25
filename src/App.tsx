import { useState } from 'react'
import { categories } from './data/sample'
import { CartProvider, useCart } from './store/cart'
import CartDrawer from './components/CartDrawer'
import { HomePage, CategoryPage, SearchPage } from './pages/Shop'
import ProductPage from './pages/Product'
import CheckoutPage from './pages/Checkout'
import { ContactPage, MyOrdersPage, ReturnsPage, ShippingPage, TrackPage } from './pages/Trust'
import { BestSellersPage, CouponsReportPage, InventoryReportPage, ReorderAlertsPage, ReportsIndexPage, SalesReportPage } from './pages/Reports'
import CouponsAdminPage from './pages/Coupons'

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
  else if (path === '/checkout') page = <CheckoutPage />
  else if (path === '/returns') page = <ReturnsPage />
  else if (path === '/shipping') page = <ShippingPage />
  else if (path === '/contact') page = <ContactPage />
  else if (path === '/track') page = <TrackPage presetNumber={params.get('number') ?? undefined} />
  else if (path === '/my-orders') page = <MyOrdersPage />
  else if (path === '/admin/reports') page = <ReportsIndexPage />
  else if (path === '/admin/reports/sales') page = <SalesReportPage />
  else if (path === '/admin/reports/best-sellers') page = <BestSellersPage />
  else if (path === '/admin/reports/coupons') page = <CouponsReportPage />
  else if (path === '/admin/reports/inventory') page = <InventoryReportPage />
  else if (path === '/admin/reports/reorder') page = <ReorderAlertsPage />
  else if (path === '/admin/coupons') page = <CouponsAdminPage />
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
        <div>
          <a href="/returns">سياسة الاستبدال والاسترجاع</a> •{' '}
          <a href="/shipping">الشحن والتوصيل</a> •{' '}
          <a href="/contact">تواصل معانا</a> •{' '}
          <a href="/track">تتبّع طلبك</a> •{' '}
          <a href="/my-orders">طلباتي</a> •{' '}
          <a href="/admin/reports">تقارير المتجر</a>
        </div>
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
