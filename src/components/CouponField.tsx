import { useState } from 'react'
import { useCart } from '../store/cart'

// حقل «عندك كود خصم؟» — مشترك بين السلة والتشيك أوت (حزمة P1-أ)
export default function CouponField() {
  const cart = useCart()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (cart.couponCode && cart.couponDiscount > 0) {
    return (
      <div className="coupon-applied">
        <span>خصم كود <strong dir="ltr">{cart.couponCode}</strong>: <span dir="ltr">−{cart.couponDiscount} ج.م</span></span>
        <button type="button" className="link-btn danger" aria-label="إلغاء الكود" onClick={() => { cart.removeCoupon(); setError(null) }}>✕</button>
      </div>
    )
  }

  return (
    <div className="coupon-field">
      <label className="f-field">عندك كود خصم؟
        <span className="coupon-row">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="اكتب الكود" dir="ltr" />
          <button type="button" className="tool-btn" onClick={() => {
            const err = cart.applyCoupon(code)
            setError(err)
            if (!err) setCode('')
          }}>طبّق</button>
        </span>
      </label>
      {error && <div className="f-error">{error}</div>}
    </div>
  )
}
