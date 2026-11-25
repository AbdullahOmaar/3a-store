import { useState } from 'react'
import { useCart } from '../store/cart'
import CouponField from './CouponField'

// درج السلة بيفتح من الشمال (جهة النهاية في RTL — حزمة 1)
export default function CartDrawer() {
  const cart = useCart()
  const [msg, setMsg] = useState<string | null>(null)
  if (!cart.open) return null
  return (
    <div className="drawer-backdrop" onClick={() => cart.setOpen(false)}>
      <div className="drawer cart" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="السلة">
        <div className="drawer-head">
          <h3>سلتك</h3>
          <button type="button" className="tool-btn" onClick={() => cart.setOpen(false)}>✕ إغلاق</button>
        </div>
        {cart.items.length === 0 ? (
          <div className="empty">
            <p>سلتك فاضية</p>
            <button type="button" className="cta-btn" onClick={() => cart.setOpen(false)}>كمّل تسوّق</button>
          </div>
        ) : (
          <>
            {cart.items.map((i) => (
              <div className="cart-line" key={i.key}>
                <span aria-hidden>{i.emoji}</span>
                <div className="cart-line-main">
                  <div>{i.name}</div>
                  <div className="hint">مقاس {i.size} • {i.color}</div>
                  <div className="qty-row small">
                    <button type="button" className="tool-btn"
                      onClick={() => setMsg(cart.setQty(i.key, i.qty - 1))}>−</button>
                    <span dir="ltr">{i.qty}</span>
                    <button type="button" className="tool-btn"
                      onClick={() => setMsg(cart.setQty(i.key, i.qty + 1))}>+</button>
                    <button type="button" className="link-btn danger" onClick={() => cart.remove(i.key)}>حذف</button>
                  </div>
                </div>
                <span dir="ltr">{i.price * i.qty} ج.م</span>
              </div>
            ))}
            {msg && <div className="f-error">{msg}</div>}
            <div className="cart-total">
              الإجمالي الفرعي: <strong dir="ltr">{cart.subtotal} ج.م</strong>
            </div>
            <CouponField />
            <p className="hint">الشحن بيتحسب على حسب محافظتك في الخطوة الجاية.</p>
            <a className="cta-btn block" href="/checkout">إتمام الطلب</a>
            <button type="button" className="tool-btn block" onClick={() => cart.setOpen(false)}>
              كمّل تسوّق
            </button>
          </>
        )}
      </div>
    </div>
  )
}
