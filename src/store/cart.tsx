import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { validateCoupon } from '../data/coupons'

export interface CartItem {
  key: string // productSlug + size + color — سطر واحد لكل متغير (حزمة 2)
  slug: string
  name: string
  emoji: string
  size: string
  color: string
  price: number
  qty: number
  max: number
}

interface CartCtx {
  items: CartItem[]
  add: (item: Omit<CartItem, 'key'>) => void
  setQty: (key: string, qty: number) => string | null
  remove: (key: string) => void
  subtotal: number
  count: number
  open: boolean
  setOpen: (v: boolean) => void
  // الكوبون — كود واحد بس لكل طلب، والخصم على إجمالي المنتجات بس مش الشحن (حزمة P1-أ)
  couponCode: string | null
  couponDiscount: number
  applyCoupon: (code: string) => string | null // بيرجع رسالة الخطأ أو null عند النجاح
  removeCoupon: () => void
  clearCart: () => void
}

const Ctx = createContext<CartCtx | null>(null)
const LS_KEY = '3a-store-cart-v1'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as CartItem[]
    } catch {
      return []
    }
  })
  const [open, setOpen] = useState(false)
  const [couponCode, setCouponCode] = useState<string | null>(() => {
    try {
      return localStorage.getItem('3a-store-coupon') || null
    } catch {
      return null
    }
  })

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    if (couponCode) localStorage.setItem('3a-store-coupon', couponCode)
    else localStorage.removeItem('3a-store-coupon')
  }, [couponCode])

  const add: CartCtx['add'] = (item) => {
    const key = `${item.slug}|${item.size}|${item.color}`
    setItems((prev) => {
      const found = prev.find((i) => i.key === key)
      if (found)
        return prev.map((i) =>
          i.key === key ? { ...i, qty: Math.min(i.qty + item.qty, i.max), price: item.price } : i,
        )
      return [...prev, { ...item, key }]
    })
    setOpen(true)
  }

  const setQty: CartCtx['setQty'] = (key, qty) => {
    const item = items.find((i) => i.key === key)
    if (!item) return null
    if (qty > item.max) return 'ده كل المتاح من المقاس ده دلوقتي'
    setItems((prev) =>
      qty < 1 ? prev.filter((i) => i.key !== key) : prev.map((i) => (i.key === key ? { ...i, qty } : i)),
    )
    return null
  }

  const remove = (key: string) => setItems((prev) => prev.filter((i) => i.key !== key))
  const subtotal = useMemo(() => items.reduce((a, i) => a + i.price * i.qty, 0), [items])
  const count = useMemo(() => items.reduce((a, i) => a + i.qty, 0), [items])

  // الخصم بيتحسب من جديد كل مرة من الكود المخزن — لو السلة اتغيرت وبقى الكود مش صالح، الخصم بيبقى صفر
  const couponDiscount = useMemo(() => {
    if (!couponCode) return 0
    const r = validateCoupon(couponCode, subtotal, items.map((i) => i.slug))
    return r.ok ? r.discount : 0
  }, [couponCode, subtotal, items])

  const applyCoupon = (code: string): string | null => {
    const r = validateCoupon(code, subtotal, items.map((i) => i.slug))
    if (!r.ok) return r.error
    setCouponCode(r.coupon.code)
    return null
  }
  const removeCoupon = () => setCouponCode(null)
  const clearCart = () => {
    setItems([])
    setCouponCode(null)
  }

  return (
    <Ctx.Provider value={{ items, add, setQty, remove, subtotal, count, open, setOpen, couponCode, couponDiscount, applyCoupon, removeCoupon, clearCart }}>
      {children}
    </Ctx.Provider>
  )
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCart outside provider')
  return ctx
}
