-- متجر 3A — دفعة 2: السكيما و RLS وآلة حالات الطلب (حزم 1 و2 و4)
-- التطبيق على مشروع Supabase الجديد بيتم بعد إنشائه؛ الملف ده هو مصدر الحقيقة للسكيما.

create extension if not exists pgcrypto;

-- ========== الهوية والأدوار ==========
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
$$;

-- ========== الأقسام وجداول المقاسات ==========
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id),
  slug text not null unique,
  name_ar text not null,
  description text,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- جدول مقاسات القسم الافتراضي؛ المنتج يقدر يتجاوزه بجدوله الخاص (حزمة 3)
create table public.size_charts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id),
  product_id uuid, -- بيتعبّى بعد إنشاء products (FK تحت)
  size_label text not null,
  measurements jsonb not null, -- كل قياس رقم صحيح بالسم 10..300، مفيش قياس فاضي
  sort_order int not null default 0,
  check (measurements <> '{}'::jsonb)
);

-- ========== المنتجات والمتغيرات ==========
create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id),
  slug text not null unique,
  sku text unique,
  name_ar text not null check (char_length(name_ar) >= 3),
  description text not null check (char_length(description) >= 20),
  price numeric(10,2) not null check (price > 0),
  price_before numeric(10,2) check (price_before is null or price_before > price),
  material text not null,
  care_instructions text,
  model_height_cm int check (model_height_cm between 140 and 200),
  model_size text,
  is_visible boolean not null default true,
  sales_count int not null default 0, -- بيتحسب من الطلبات المسلّمة بس
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.size_charts
  add constraint size_charts_product_fk foreign key (product_id) references public.products (id);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null, -- WebP مضغوطة بس (سياسة الرفع في اللوحة)
  is_primary boolean not null default false,
  sort_order int not null default 0
);

-- متغير = مقاس × لون؛ لكل متغير سعره (اختياري، يورث المنتج) ومخزونه (حزم 1 و4)
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size_label text not null,
  color_name_ar text not null,
  color_hex text,
  price numeric(10,2) check (price is null or price > 0),
  stock int not null default 0 check (stock >= 0),
  unique (product_id, size_label, color_name_ar)
);

-- سجل حركات المخزون: أي تغيير مخزون من غير سطر سجل ممنوع (حزمة 4)
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id),
  delta int not null,
  reason text not null check (reason in ('order','cancel_return','returned_ok','returned_damaged','manual','initial')),
  order_id uuid,
  actor uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- ========== الشحن: 27 محافظة ==========
create table public.governorates (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null unique,
  shipping_fee numeric(10,2) not null default 0 check (shipping_fee >= 0), -- الأدمن بيظبطها قبل الإطلاق؛ ممنوع محافظة من غير صف
  delivery_days_min int,
  delivery_days_max int,
  sort_order int not null default 0
);
create table public.cities (
  id uuid primary key default gen_random_uuid(),
  governorate_id uuid not null references public.governorates (id),
  name_ar text not null,
  unique (governorate_id, name_ar)
);

create table public.store_settings (
  key text primary key,
  value jsonb not null
);
insert into public.store_settings (key, value) values
  ('free_shipping_threshold', '0'::jsonb),
  ('return_days', '14'::jsonb),
  ('whatsapp_number', 'null'::jsonb),
  ('order_confirmation_message', '"هنأكد طلبك تليفونيًا/واتساب قبل الشحن، والدفع كاش عند الاستلام"'::jsonb)
on conflict (key) do nothing;

insert into public.governorates (name_ar, sort_order) values
 ('القاهرة',1),('الجيزة',2),('الإسكندرية',3),('الدقهلية',4),('البحر الأحمر',5),
 ('البحيرة',6),('الفيوم',7),('الغربية',8),('الإسماعيلية',9),('المنوفية',10),
 ('المنيا',11),('القليوبية',12),('الوادي الجديد',13),('السويس',14),('أسوان',15),
 ('أسيوط',16),('بني سويف',17),('بورسعيد',18),('دمياط',19),('الشرقية',20),
 ('جنوب سيناء',21),('كفر الشيخ',22),('مطروح',23),('الأقصر',24),('قنا',25),
 ('شمال سيناء',26),('سوهاج',27)
on conflict (name_ar) do nothing;

-- ========== الطلبات (حزمة 2) ==========
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigserial unique,
  customer_id uuid references auth.users (id), -- الضيف بيكمل ضيف: null مسموح
  idempotency_key text unique, -- حماية تكرار الإرسال: نفس المفتاح يرجع نفس الطلب
  full_name text not null check (char_length(full_name) >= 3),
  phone text not null check (phone ~ '^01[0125][0-9]{8}$'), -- موبايل مصري 11 رقم
  phone_alt text check (phone_alt is null or phone_alt ~ '^01[0125][0-9]{8}$'),
  governorate_id uuid not null references public.governorates (id),
  city_id uuid not null references public.cities (id),
  address text not null check (char_length(address) >= 10),
  landmark text,
  notes text check (notes is null or char_length(notes) <= 500),
  subtotal numeric(10,2) not null, -- بيتحسب من الخادم وقت الإنشاء، مش من المتصفح
  shipping_fee numeric(10,2) not null,
  total numeric(10,2) not null,
  payment_method text not null default 'cod' check (payment_method = 'cod'),
  status text not null default 'new' check (status in
    ('new','confirmed','preparing','shipped','delivered','cancelled','returned','delivery_failed')),
  confirmed_with_customer boolean not null default false,
  confirmation_channel text check (confirmation_channel in ('phone','whatsapp')),
  cancel_reason_code text check (cancel_reason_code in
    ('customer_request','no_answer','wrong_number','duplicate','out_of_stock',
     'address_problem','shipping_disagreement','other')),
  cancel_reason_note text,
  contact_attempts int not null default 0,
  tracking_number text,
  shipping_company text,
  delivery_attempts int not null default 0,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id),
  variant_id uuid not null references public.product_variants (id),
  qty int not null check (qty >= 1),
  unit_price numeric(10,2) not null, -- سعر مجمّد وقت الطلب
  unique (order_id, variant_id)
);
alter table public.stock_movements
  add constraint stock_movements_order_fk foreign key (order_id) references public.orders (id);

-- سجل تغييرات: سطر لكل انتقال، مفيش تعديل ولا حذف أبدًا
create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor uuid references auth.users (id),
  actor_kind text not null default 'admin' check (actor_kind in ('admin','system','customer')),
  reason_code text,
  note text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ========== آلة الانتقالات: المفروضة في قاعدة البيانات، مش الواجهة بس ==========
create or replace function public.enforce_order_transition() returns trigger
language plpgsql as $$
declare allowed boolean;
begin
  if new.status = old.status then return new; end if;
  allowed :=
    (old.status='new'       and new.status in ('confirmed','cancelled')) or
    (old.status='confirmed' and new.status in ('preparing','cancelled')) or
    (old.status='preparing' and new.status in ('shipped','cancelled')) or
    (old.status='shipped'   and new.status in ('delivered','delivery_failed','returned')) or
    (old.status='delivery_failed' and new.status in ('shipped','returned','cancelled')
       and coalesce(old.delivery_attempts,0) < 2 or
     old.status='delivery_failed' and new.status in ('returned','cancelled')) or
    (old.status='delivered' and new.status = 'returned');
  if not allowed then
    raise exception 'مينفعش الطلب يتحرك من % إلى %', old.status, new.status;
  end if;
  -- بوابة التأكيد: مفيش تجهيز/شحن من غير تأكيد مع العميل
  if new.status in ('preparing','shipped') and not new.confirmed_with_customer then
    raise exception 'أكّد الطلب مع العميل الأول (تليفون/واتساب)';
  end if;
  -- الإلغاء بسبب مرمّز إلزامي؛ و«تاني» بنص حر 10 حروف على الأقل
  if new.status = 'cancelled' then
    if new.cancel_reason_code is null then raise exception 'اختار سبب الإلغاء الأول'; end if;
    if new.cancel_reason_code = 'other' and char_length(coalesce(new.cancel_reason_note,'')) < 10 then
      raise exception 'سبب الإلغاء «تاني» محتاج توضيح 10 حروف على الأقل';
    end if;
    if new.cancel_reason_code = 'no_answer' and new.contact_attempts < 3 then
      raise exception '«العميل مش بيرد» محتاجة 3 محاولات اتصال موثقة على الأقل';
    end if;
  end if;
  return new;
end $$;

create trigger orders_transition_guard
  before update of status on public.orders
  for each row execute function public.enforce_order_transition();

create or replace function public.log_order_transition() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status <> old.status then
    insert into public.order_status_history (order_id, from_status, to_status, actor, reason_code, note)
    values (new.id, old.status, new.status, auth.uid(), new.cancel_reason_code, new.cancel_reason_note);
  end if;
  return new;
end $$;

create trigger orders_transition_log
  after update of status on public.orders
  for each row execute function public.log_order_transition();

-- ========== RLS ==========
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.size_charts enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.stock_movements enable row level security;
alter table public.governorates enable row level security;
alter table public.cities enable row level security;
alter table public.store_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

-- قراءة عامة للكتالوج الظاهر بس
create policy catalog_read on public.categories for select using (is_visible or public.is_admin());
create policy products_read on public.products for select using (is_visible or public.is_admin());
create policy images_read on public.product_images for select using (true);
create policy variants_read on public.product_variants for select using (true);
create policy charts_read on public.size_charts for select using (true);
create policy geo_read on public.governorates for select using (true);
create policy cities_read on public.cities for select using (true);
create policy settings_read on public.store_settings for select using (true);

-- الكتابة للأدمن بس، على مستوى قاعدة البيانات
create policy admin_write_categories on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy admin_write_products on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy admin_write_images on public.product_images for all using (public.is_admin()) with check (public.is_admin());
create policy admin_write_variants on public.product_variants for all using (public.is_admin()) with check (public.is_admin());
create policy admin_write_charts on public.size_charts for all using (public.is_admin()) with check (public.is_admin());
create policy admin_write_geo on public.governorates for all using (public.is_admin()) with check (public.is_admin());
create policy admin_write_cities on public.cities for all using (public.is_admin()) with check (public.is_admin());
create policy admin_write_settings on public.store_settings for all using (public.is_admin()) with check (public.is_admin());
create policy admin_write_stock on public.stock_movements for insert with check (public.is_admin());

-- الطلبات: العميل المسجل يشوف طلباته، والأدمن يشوف الكل، والضيف بينشئ بس عبر دالة الخادم
create policy orders_read on public.orders for select
  using (public.is_admin() or (auth.uid() is not null and customer_id = auth.uid()));
create policy orders_admin_update on public.orders for update
  using (public.is_admin()) with check (public.is_admin());
create policy items_read on public.order_items for select
  using (public.is_admin() or exists (select 1 from public.orders o
    where o.id = order_id and o.customer_id = auth.uid()));
create policy history_read on public.order_status_history for select
  using (public.is_admin() or exists (select 1 from public.orders o
    where o.id = order_id and o.customer_id = auth.uid()));
create policy profiles_self on public.profiles for select
  using (id = auth.uid() or public.is_admin());
