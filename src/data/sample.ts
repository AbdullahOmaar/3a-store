// بيانات عرض مؤقتة بنفس شكل السكيما (supabase/migrations/0001_schema.sql)
// هتتبدل بقراءة Supabase أول ما المهاجرة تتطبق على المشروع الحي.
export interface Variant {
  size: string
  color: string
  price?: number
  stock: number
}
export interface Product {
  id: string
  slug: string
  sku: string
  name: string
  categorySlug: string
  subcategory?: string
  price: number
  priceBefore?: number
  isNew?: boolean
  sales: number
  description: string
  material: string
  care: string
  modelHeight: number
  modelSize: string
  emoji: string
  colors: { name: string; hex: string }[]
  variants: Variant[]
  createdAt: string
}

export const categories = [
  { slug: 'women', name: 'حريمي', emoji: '👗', subs: ['فساتين', 'عبايات', 'بلوزات'] },
  { slug: 'men', name: 'رجالي', emoji: '👔', subs: ['تيشيرتات', 'بنطلونات', 'هودي'] },
  { slug: 'kids', name: 'أطفال', emoji: '🧒', subs: ['أولادي', 'بناتي'] },
  { slug: 'sports', name: 'رياضة', emoji: '🏃', subs: ['أحذية', 'ملابس رياضية'] },
  { slug: 'bags', name: 'شنط', emoji: '👜', subs: ['شنط يد', 'شنط ظهر'] },
]

const C = {
  black: { name: 'أسود', hex: '#111827' },
  white: { name: 'أبيض', hex: '#f9fafb' },
  beige: { name: 'بيج', hex: '#d6c7a8' },
  navy: { name: 'كحلي', hex: '#1e3a5f' },
  red: { name: 'أحمر', hex: '#b91c1c' },
}

function vars(sizes: string[], colors: { name: string }[], stock = 8): Variant[] {
  const out: Variant[] = []
  for (const c of colors)
    for (const s of sizes)
      out.push({ size: s, color: c.name, stock: s === 'XL' && c.name === 'أسود' ? 0 : stock })
  return out
}

export const products: Product[] = [
  {
    id: '1', slug: 'tshirt-basic', sku: 'TS-001', name: 'تيشيرت قطن أساسي', categorySlug: 'men',
    subcategory: 'تيشيرتات', price: 299, priceBefore: 399, sales: 120, createdAt: '2026-11-20',
    description: 'تيشيرت يومي مريح بخامة بتتنفس، مناسب للشغل والخروجات ومبيتكرمش بسرعة.',
    material: 'قطن ١٠٠٪', care: 'غسيل بارد، ميتعصرش جامد', modelHeight: 178, modelSize: 'L',
    emoji: '👕', colors: [C.black, C.white, C.navy], variants: vars(['M', 'L', 'XL'], [C.black, C.white, C.navy]),
  },
  {
    id: '2', slug: 'dress-summer', sku: 'DR-002', name: 'فستان صيفي خفيف', categorySlug: 'women',
    subcategory: 'فساتين', price: 649, isNew: true, sales: 86, createdAt: '2026-11-23',
    description: 'فستان صيفي خفيف بقصّة مريحة وطول مناسب، بيتلبس لوحده أو مع جاكيت خفيف.',
    material: 'فيسكوز', care: 'غسيل يدوي أو برنامج حساس', modelHeight: 170, modelSize: 'M',
    emoji: '👗', colors: [C.red, C.beige], variants: vars(['S', 'M', 'L'], [C.red, C.beige]),
  },
  {
    id: '3', slug: 'kids-set', sku: 'KD-003', name: 'طقم أطفال قطعتين', categorySlug: 'kids',
    subcategory: 'أولادي', price: 449, sales: 64, createdAt: '2026-11-18',
    description: 'طقم عملي للعب والخروج، خامة طرية على بشرة الأطفال وثبات لون كويس.',
    material: 'قطن ممشط', care: 'غسيل عادي ٣٠ درجة', modelHeight: 120, modelSize: '6 سنوات',
    emoji: '🧒', colors: [C.navy, C.red], variants: vars(['4 سنوات', '6 سنوات', '8 سنوات'], [C.navy, C.red]),
  },
  {
    id: '4', slug: 'sport-shoes', sku: 'SP-004', name: 'حذاء رياضي مريح', categorySlug: 'sports',
    subcategory: 'أحذية', price: 899, priceBefore: 1099, sales: 150, createdAt: '2026-11-15',
    description: 'نعل مريح للمشي الطويل والجري الخفيف، خفيف ومبيزحلقش.',
    material: 'شبك هوائي + نعل EVA', care: 'يتنضف بفرشة ناشفة', modelHeight: 180, modelSize: '42',
    emoji: '👟', colors: [C.black, C.white], variants: vars(['41', '42', '43', '44'], [C.black, C.white]),
  },
  {
    id: '5', slug: 'bag-everyday', sku: 'BG-005', name: 'شنطة يومية عملية', categorySlug: 'bags',
    subcategory: 'شنط يد', price: 549, sales: 73, createdAt: '2026-11-21',
    description: 'شنطة تشيل أساسيات اليوم كله بجيوب منظمة وحزام مريح.',
    material: 'جلد صناعي مقاوم للمية', care: 'تتمسح بقماشة مبلولة', modelHeight: 168, modelSize: '—',
    emoji: '👜', colors: [C.black, C.beige], variants: [{ size: 'مقاس واحد', color: 'أسود', stock: 9 }, { size: 'مقاس واحد', color: 'بيج', stock: 4 }],
  },
  {
    id: '6', slug: 'hoodie-winter', sku: 'HD-006', name: 'هودي شتوي تقيل', categorySlug: 'men',
    subcategory: 'هودي', price: 599, isNew: true, sales: 41, createdAt: '2026-11-24',
    description: 'هودي تقيل ببطانة دافية وكابيشو عملي، أساسي لأيام الشتا.',
    material: 'ميلتون قطن مبطّن', care: 'غسيل بارد على الضهر', modelHeight: 176, modelSize: 'XL',
    emoji: '🧥', colors: [C.black, C.navy], variants: vars(['L', 'XL', '2XL'], [C.black, C.navy]),
  },
  {
    id: '7', slug: 'abaya-simple', sku: 'AB-007', name: 'عباية بسيطة أنيقة', categorySlug: 'women',
    subcategory: 'عبايات', price: 799, sales: 58, createdAt: '2026-11-19',
    description: 'عباية بقصّة انسيابية وخامة مابتتجعدش بسرعة، مناسبة يوميًا وللمناسبات.',
    material: 'كريب', care: 'غسيل حساس أو تنضيف جاف', modelHeight: 170, modelSize: 'M',
    emoji: '🖤', colors: [C.black], variants: vars(['S', 'M', 'L', 'XL'], [C.black]),
  },
  {
    id: '8', slug: 'pants-jeans', sku: 'JN-008', name: 'بنطلون جينز كلاسيك', categorySlug: 'men',
    subcategory: 'بنطلونات', price: 699, priceBefore: 799, sales: 97, createdAt: '2026-11-16',
    description: 'جينز بقصّة مستقيمة وخامة تقيلة تعيش، بيليق على كل حاجة.',
    material: 'دنيم قطن', care: 'غسيل بارد مقلوب', modelHeight: 179, modelSize: '34',
    emoji: '👖', colors: [C.navy, C.black], variants: vars(['32', '34', '36'], [C.navy, C.black]),
  },
]

export function productTotalStock(p: Product): number {
  return p.variants.reduce((a, v) => a + v.stock, 0)
}
export function variantPrice(p: Product, v: Variant): number {
  return v.price ?? p.price
}

// جداول مقاسات افتراضية لكل قسم (حزمة 3) — المنتج يقدر يتجاوزها في القاعدة
export const sizeCharts: Record<string, { note: string; rows: Record<string, string>[] }> = {
  men: {
    note: 'قيس الصدر من تحت الإبط وانت واقف طبيعي، والمازورة ماتكونش مشدودة.',
    rows: [
      { 'المقاس': 'M', 'الصدر (سم)': '96', 'الوسط (سم)': '82', 'الطول (سم)': '70' },
      { 'المقاس': 'L', 'الصدر (سم)': '102', 'الوسط (سم)': '88', 'الطول (سم)': '72' },
      { 'المقاس': 'XL', 'الصدر (سم)': '108', 'الوسط (سم)': '94', 'الطول (سم)': '74' },
      { 'المقاس': '2XL', 'الصدر (سم)': '114', 'الوسط (سم)': '100', 'الطول (سم)': '76' },
    ],
  },
  women: {
    note: 'قيسي الصدر من أوسع نقطة، والوسط من أضيق نقطة طبيعية.',
    rows: [
      { 'المقاس': 'S', 'الصدر (سم)': '84', 'الوسط (سم)': '66', 'الطول (سم)': '95' },
      { 'المقاس': 'M', 'الصدر (سم)': '90', 'الوسط (سم)': '72', 'الطول (سم)': '97' },
      { 'المقاس': 'L', 'الصدر (سم)': '96', 'الوسط (سم)': '78', 'الطول (سم)': '99' },
      { 'المقاس': 'XL', 'الصدر (سم)': '102', 'الوسط (سم)': '84', 'الطول (سم)': '101' },
    ],
  },
  kids: {
    note: 'مقاسات الأطفال بالعمر تقريبية — الطول بالسم هو الأدق.',
    rows: [
      { 'المقاس': '4 سنوات', 'الطول (سم)': '104', 'الصدر (سم)': '58' },
      { 'المقاس': '6 سنوات', 'الطول (سم)': '116', 'الصدر (سم)': '62' },
      { 'المقاس': '8 سنوات', 'الطول (سم)': '128', 'الصدر (سم)': '66' },
    ],
  },
}
