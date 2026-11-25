import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

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

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(items))
  }, [items])

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

  return (
    <Ctx.Provider value={{ items, add, setQty, remove, subtotal, count, open, setOpen }}>
      {children}
    </Ctx.Provider>
  )
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCart outside provider')
  return ctx
}
