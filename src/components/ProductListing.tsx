import { useMemo, useState } from 'react'
import { productTotalStock, type Product } from '../data/sample'
import ProductCard from './ProductCard'

export type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'best' | 'discount'

export interface Filters {
  sizes: string[]
  colors: string[]
  min: string
  max: string
  availableOnly: boolean
  offersOnly: boolean
  sub: string | null
}

export const emptyFilters: Filters = {
  sizes: [], colors: [], min: '', max: '', availableOnly: true, offersOnly: false, sub: null,
}

export function applyFilters(list: Product[], f: Filters, sort: SortKey): Product[] {
  let out = list.filter((p) => {
    if (f.sub && p.subcategory !== f.sub) return false
    if (f.availableOnly && productTotalStock(p) === 0) return false
    if (f.offersOnly && !p.priceBefore) return false
    if (f.sizes.length && !p.variants.some((v) => f.sizes.includes(v.size) && v.stock > 0)) return false
    if (f.colors.length && !p.variants.some((v) => f.colors.includes(v.color) && v.stock > 0)) return false
    if (f.min && p.price < Number(f.min)) return false
    if (f.max && p.price > Number(f.max)) return false
    return true
  })
  out = [...out].sort((a, b) => {
    switch (sort) {
      case 'price-asc': return a.price - b.price
      case 'price-desc': return b.price - a.price
      case 'best': return b.sales - a.sales
      case 'discount':
        return (b.priceBefore ? 1 - b.price / b.priceBefore : 0) - (a.priceBefore ? 1 - a.price / a.priceBefore : 0)
      default: return b.createdAt.localeCompare(a.createdAt)
    }
  })
  return out
}

// شبكة + شريط أدوات + درج فلاتر (حزمة 5): الفلاتر بتتطبق بـ«عرض النتائج» بس،
// والعدد حي، والفلاتر المطبقة تشيبس قابلة للمسح الفردي.
export default function ProductListing({
  list, subs, basePath,
}: {
  list: Product[]
  subs?: string[]
  basePath: string
}) {
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [draft, setDraft] = useState<Filters>(emptyFilters)
  const [sort, setSort] = useState<SortKey>('newest')
  const [drawer, setDrawer] = useState(false)
  const [shown, setShown] = useState(20)
  const [priceError, setPriceError] = useState<string | null>(null)

  const allSizes = useMemo(
    () => [...new Set(list.flatMap((p) => p.variants.filter((v) => v.stock > 0).map((v) => v.size)))],
    [list],
  )
  const allColors = useMemo(
    () => [...new Set(list.flatMap((p) => p.variants.filter((v) => v.stock > 0).map((v) => v.color)))],
    [list],
  )
  const draftCount = useMemo(() => applyFilters(list, draft, sort).length, [list, draft, sort])
  const results = useMemo(() => applyFilters(list, filters, sort), [list, filters, sort])

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]

  const applyDraft = () => {
    if (draft.min && draft.max && Number(draft.max) <= Number(draft.min)) {
      setPriceError('الحد الأقصى لازم يكون أكبر من الأدنى')
      return
    }
    if ((draft.min && isNaN(Number(draft.min))) || (draft.max && isNaN(Number(draft.max)))) {
      setPriceError('اكتب أرقام بس')
      return
    }
    setPriceError(null)
    setFilters(draft)
    setShown(20)
    setDrawer(false)
    const params = new URLSearchParams()
    if (draft.sizes.length) params.set('sizes', draft.sizes.join(','))
    if (draft.colors.length) params.set('colors', draft.colors.join(','))
    if (draft.min) params.set('min', draft.min)
    if (draft.max) params.set('max', draft.max)
    history.replaceState(null, '', `${basePath}${params.toString() ? `?${params}` : ''}`)
  }

  const chips: { label: string; clear: () => void }[] = [
    ...filters.sizes.map((s) => ({
      label: `مقاس ${s}`,
      clear: () => setFilters({ ...filters, sizes: filters.sizes.filter((x) => x !== s) }),
    })),
    ...filters.colors.map((c) => ({
      label: c,
      clear: () => setFilters({ ...filters, colors: filters.colors.filter((x) => x !== c) }),
    })),
    ...(filters.offersOnly ? [{ label: 'عروض بس', clear: () => setFilters({ ...filters, offersOnly: false }) }] : []),
  ]

  return (
    <div>
      {subs && subs.length > 0 && (
        <div className="sub-row">
          <button type="button" className={!filters.sub ? 'chip on' : 'chip'}
            onClick={() => setFilters({ ...filters, sub: null })}>الكل</button>
          {subs.map((s) => (
            <button key={s} type="button" className={filters.sub === s ? 'chip on' : 'chip'}
              onClick={() => setFilters({ ...filters, sub: s })}>{s}</button>
          ))}
        </div>
      )}

      <div className="toolbar">
        <button type="button" className="tool-btn" onClick={() => { setDraft(filters); setDrawer(true) }}>
          فلترة
        </button>
        <label className="sort-label">
          ترتيب:
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="newest">الأحدث</option>
            <option value="price-asc">السعر من الأقل</option>
            <option value="price-desc">السعر من الأعلى</option>
            <option value="best">الأكثر مبيعًا</option>
            <option value="discount">الأعلى خصمًا</option>
          </select>
        </label>
        <span className="count" dir="ltr">{results.length} منتج</span>
      </div>

      {chips.length > 0 && (
        <div className="chips-row">
          {chips.map((c) => (
            <button key={c.label} type="button" className="chip on" onClick={c.clear}>{c.label} ✕</button>
          ))}
          <button type="button" className="chip" onClick={() => { setFilters(emptyFilters); setDraft(emptyFilters) }}>
            مسح الكل
          </button>
        </div>
      )}

      {results.length === 0 ? (
        <div className="empty">
          <p>مفيش منتجات بالمواصفات دي — شيل فلتر أو اتنين</p>
          <button type="button" className="tool-btn" onClick={() => { setFilters(emptyFilters); setDraft(emptyFilters) }}>
            مسح كل الفلاتر
          </button>
        </div>
      ) : (
        <>
          <div className="grid">
            {results.slice(0, shown).map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
          {shown < results.length && (
            <button type="button" className="load-more" onClick={() => setShown((s) => s + 20)}>
              حمّل المزيد
            </button>
          )}
        </>
      )}

      {drawer && (
        <div className="drawer-backdrop" onClick={() => setDrawer(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="الفلاتر">
            <h3>فلترة</h3>
            <div className="f-group">
              <div className="f-title">المقاس</div>
              <div className="f-opts">
                {allSizes.map((s) => (
                  <button key={s} type="button" className={draft.sizes.includes(s) ? 'chip on' : 'chip'}
                    onClick={() => setDraft({ ...draft, sizes: toggle(draft.sizes, s) })}>{s}</button>
                ))}
              </div>
            </div>
            <div className="f-group">
              <div className="f-title">اللون</div>
              <div className="f-opts">
                {allColors.map((c) => (
                  <button key={c} type="button" className={draft.colors.includes(c) ? 'chip on' : 'chip'}
                    onClick={() => setDraft({ ...draft, colors: toggle(draft.colors, c) })}>{c}</button>
                ))}
              </div>
            </div>
            <div className="f-group">
              <div className="f-title">السعر (ج.م)</div>
              <div className="f-price">
                <input inputMode="numeric" dir="ltr" placeholder="من" value={draft.min}
                  onChange={(e) => setDraft({ ...draft, min: e.target.value })} />
                <input inputMode="numeric" dir="ltr" placeholder="لحد" value={draft.max}
                  onChange={(e) => setDraft({ ...draft, max: e.target.value })} />
              </div>
              {priceError && <div className="f-error">{priceError}</div>}
            </div>
            <label className="f-check">
              <input type="checkbox" checked={draft.availableOnly}
                onChange={(e) => setDraft({ ...draft, availableOnly: e.target.checked })} />
              المتاح بس
            </label>
            <label className="f-check">
              <input type="checkbox" checked={draft.offersOnly}
                onChange={(e) => setDraft({ ...draft, offersOnly: e.target.checked })} />
              عروض بس
            </label>
            <div className="drawer-actions">
              <button type="button" className="cta-btn" onClick={applyDraft}>
                عرض النتائج (<span dir="ltr">{draftCount}</span> منتج)
              </button>
              <button type="button" className="tool-btn" onClick={() => setDraft(emptyFilters)}>مسح الكل</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
