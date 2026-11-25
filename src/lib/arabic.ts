// تطبيع عربي للبحث: تجاهل التشكيل والهمزات والتاء المربوطة والألف المقصورة
export function normalizeArabic(s: string): string {
  return s
    .replace(/[\u064B-\u0652]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function matchesQuery(haystack: string, query: string): boolean {
  const h = normalizeArabic(haystack)
  const q = normalizeArabic(query)
  if (!q) return true
  // «تي شيرت» و«تيشيرت» نفس النتيجة: بنقارن كمان من غير مسافات
  return h.includes(q) || h.replace(/ /g, '').includes(q.replace(/ /g, ''))
}

// تحقق وتنظيف الموبايل المصري (حزمة 2): بيتنضف من +20 و0020 والمسافات
export function cleanEgyptPhone(raw: string): string {
  let p = raw.replace(/[\s-]/g, '')
  if (p.startsWith('+20')) p = '0' + p.slice(3)
  else if (p.startsWith('0020')) p = '0' + p.slice(4)
  else if (p.startsWith('20') && p.length === 12) p = '0' + p.slice(2)
  return p
}

export function egyptPhoneError(raw: string): string | null {
  const p = cleanEgyptPhone(raw)
  if (!p) return 'اكتب رقم موبايلك عشان نقدر نأكد الطلب'
  if (!/^[0-9]+$/.test(p) || p.length !== 11) return 'رقم الموبايل لازم يكون ١١ رقم'
  if (!/^01[0125][0-9]{8}$/.test(p)) return 'ده مش رقم موبايل مصري صح، راجعه وكتبه تاني'
  return null
}
