import { productTotalStock, type Product } from '../data/sample'

export function discountPct(p: Product): number | null {
  if (!p.priceBefore) return null
  return Math.round((1 - p.price / p.priceBefore) * 100)
}

// كارت موحّد (حزمة 5): صورة 4:5، اسم سطرين، سعر + قديم مشطوب، شارة خصم/جديد/نفد
export default function ProductCard({ p }: { p: Product }) {
  const pct = discountPct(p)
  const out = productTotalStock(p) === 0
  return (
    <a className="card" href={`/product/${p.slug}`}>
      <div className="card-img">
        <span className="card-emoji" aria-hidden>{p.emoji}</span>
        {out ? (
          <span className="badge badge-out">نفد</span>
        ) : pct ? (
          <span className="badge badge-sale">خصم {pct}٪</span>
        ) : p.isNew ? (
          <span className="badge badge-new">جديد</span>
        ) : null}
      </div>
      <div className="card-body">
        <div className="card-name">{p.name}</div>
        <div className="card-price">
          <span className="price-now" dir="ltr">{p.price} ج.م</span>
          {p.priceBefore && <span className="price-old" dir="ltr">{p.priceBefore} ج.م</span>}
        </div>
      </div>
    </a>
  )
}
