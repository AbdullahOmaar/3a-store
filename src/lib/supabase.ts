import { createClient } from '@supabase/supabase-js'

// مفاتيح جديدة فقط: publishable في المتصفح، والـ secret مايتحطش هنا أبدًا.
// القيم بتيجي من متغيرات بيئة Vercel / .env.local — مفيش قيمة حقيقية في الكود.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined

export const supabase =
  url && publishableKey ? createClient(url, publishableKey) : null
