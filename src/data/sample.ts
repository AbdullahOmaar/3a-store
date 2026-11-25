// بيانات عرض مؤقتة لحد ما تتوصل قاعدة البيانات (دفعة 2) —
// الشكل مطابق لسكيما المنتجات والمتغيرات في supabase/migrations.
export interface SampleProduct {
  id: string
  slug: string
  name: string
  category: string
  price: number
  priceBefore?: number
  badge?: 'جديد' | 'نفد'
  emoji: string
}

export const categories = [
  { slug: 'women', name: 'حريمي', emoji: '👗' },
  { slug: 'men', name: 'رجالي', emoji: '👔' },
  { slug: 'kids', name: 'أطفال', emoji: '🧒' },
  { slug: 'sports', name: 'رياضة', emoji: '🏃' },
  { slug: 'bags', name: 'شنط', emoji: '👜' },
]

export const products: SampleProduct[] = [
  { id: '1', slug: 'tshirt-basic', name: 'تيشيرت قطن أساسي', category: 'رجالي', price: 299, priceBefore: 399, emoji: '👕' },
  { id: '2', slug: 'dress-summer', name: 'فستان صيفي خفيف', category: 'حريمي', price: 649, badge: 'جديد', emoji: '👗' },
  { id: '3', slug: 'kids-set', name: 'طقم أطفال قطعتين', category: 'أطفال', price: 449, emoji: '🧒' },
  { id: '4', slug: 'sport-shoes', name: 'حذاء رياضي مريح', category: 'رياضة', price: 899, priceBefore: 1099, emoji: '👟' },
  { id: '5', slug: 'bag-everyday', name: 'شنطة يومية عملية', category: 'شنط', price: 549, emoji: '👜' },
  { id: '6', slug: 'hoodie-winter', name: 'هودي شتوي تقيل', category: 'رجالي', price: 599, badge: 'جديد', emoji: '🧥' },
  { id: '7', slug: 'abaya-simple', name: 'عباية بسيطة أنيقة', category: 'حريمي', price: 799, emoji: '🖤' },
  { id: '8', slug: 'pants-jeans', name: 'بنطلون جينز كلاسيك', category: 'رجالي', price: 699, priceBefore: 799, emoji: '👖' },
]
