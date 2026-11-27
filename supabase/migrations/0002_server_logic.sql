-- متجر 3A — دفعة 2ب: طبقة التنفيذ الخادمية (حزم P1 + إغلاق فجوات قبول الإطلاق)
-- create_order بتحسب كل حاجة من القاعدة (مش من المتصفح) وبتخصم المخزون ذريًا،
-- و adjust_stock بيحرّك المخزون بسجل، و submit_review بيربط التقييم بطلب مسلّم.
-- + جداول الكوبونات والتقييمات والسلال، وتريجر إنشاء البروفايل، وصلاحيات الجداول.

-- ========== تعديلات على الطلبات: الكوبون والخصم المتجمّد ==========
alter table public.orders
  add column if not exists coupon_code text,
  add column if not exists discount numeric(10,2) not null default 0 check (discount >= 0);

-- ========== الكوبونات (حزمة P1-أ) ==========
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{3,20}$'),
  type text not null check (type in ('percent','fixed')),
  value numeric(10,2) not null check (value > 0),
  min_order numeric(10,2) not null default 0 check (min_order >= 0),
  use_limit int check (use_limit is null or use_limit >= 1),
  per_customer_limit int not null default 1 check (per_customer_limit >= 1),
  starts_at date not null,
  ends_at date not null check (ends_at >= starts_at),
  status text not null default 'active' check (status in ('active','paused')),
  categories jsonb not null default '[]'::jsonb, -- slugs؛ فاضي = كل المنتجات
  created_at timestamptz not null default now()
);

create table if not exists public.coupon_uses (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id),
  phone text not null,
  order_id uuid references public.orders (id),
  created_at timestamptz not null default now()
);

-- ========== التقييمات (حزمة P1-ج) ==========
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id),
  order_id uuid not null references public.orders (id),
  customer_name text not null,
  phone text not null,
  stars int not null check (stars between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  hidden boolean not null default false,
  hidden_by uuid references auth.users (id),
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  unique (product_id, phone) -- تقييم واحد لكل عميل لكل منتج
);

-- ========== سلال المسجلين (تتبّع السلة المتروكة — حزمة P1-ب) ==========
create table if not exists public.carts (
  customer_id uuid primary key references auth.users (id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ========== بروفايل تلقائي عند التسجيل ==========
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== استرجاع المخزون عند الإلغاء قبل الشحن (ذري مع الانتقال) ==========
create or replace function public.restore_stock_on_cancel() returns trigger
language plpgsql security definer set search_path = public as $$
declare item record;
begin
  if new.status = 'cancelled' and old.status in ('new','confirmed','preparing') then
    for item in select * from public.order_items where order_id = new.id loop
      update public.product_variants set stock = stock + item.qty where id = item.variant_id;
      insert into public.stock_movements (variant_id, delta, reason, order_id, actor)
      values (item.variant_id, item.qty, 'cancel_return', new.id, auth.uid());
    end loop;
  end if;
  return new;
end $$;

drop trigger if exists orders_restore_stock on public.orders;
create trigger orders_restore_stock
  after update of status on public.orders
  for each row execute function public.restore_stock_on_cancel();

-- ========== create_order: إنشاء طلب بحساب خادمي كامل ==========
create or replace function public.create_order(
  p_full_name text,
  p_phone text,
  p_phone_alt text,
  p_governorate_id uuid,
  p_city_id uuid,
  p_address text,
  p_landmark text,
  p_notes text,
  p_items jsonb,           -- [{variant_id, qty}] — الأسعار بتتجاهل لو اتبعتت، الحساب من القاعدة
  p_coupon_code text,
  p_idempotency_key text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  existing public.orders;
  item jsonb;
  v record;
  v_subtotal numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_shipping numeric(10,2);
  v_threshold numeric(10,2);
  v_coupon public.coupons;
  v_order public.orders;
  v_uses int;
begin
  -- نفس المفتاح = نفس الطلب (ضغطة مزدوجة/إعادة إرسال)
  if p_idempotency_key is not null then
    select * into existing from public.orders where idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object('order_id', existing.id, 'order_number', existing.order_number,
        'subtotal', existing.subtotal, 'discount', existing.discount,
        'shipping_fee', existing.shipping_fee, 'total', existing.total, 'duplicate', true);
    end if;
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'السلة فاضية';
  end if;

  -- قفل صفوف المتغيرات لمنع بيع نفس القطعة مرتين تحت التزامن
  perform 1 from public.product_variants
    where id in (select (e ->> 'variant_id')::uuid from jsonb_array_elements(p_items) e)
    for update;

  -- الأسعار والمخزون من القاعدة بس
  for item in select * from jsonb_array_elements(p_items) loop
    select pv.*, p.price as product_price, p.is_visible, p.category_id
      into v
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.id = (item ->> 'variant_id')::uuid;
    if not found then raise exception 'فيه منتج مش موجود في سلتك'; end if;
    if not v.is_visible then raise exception 'فيه منتج مش متاح دلوقتي في سلتك'; end if;
    if (item ->> 'qty')::int < 1 then raise exception 'الكمية لازم تكون ١ على الأقل'; end if;
    if (item ->> 'qty')::int > v.stock then
      raise exception 'المخزون مش مكفي — المتاح % بس', v.stock;
    end if;
    v_subtotal := v_subtotal + coalesce(v.price, v.product_price) * (item ->> 'qty')::int;
  end loop;

  -- الكوبون: تحقق خادمي كامل (حالة/تواريخ/حدود/حد أدنى/نطاق/لكل عميل)
  if p_coupon_code is not null and p_coupon_code <> '' then
    select * into v_coupon from public.coupons where code = upper(p_coupon_code);
    if not found then raise exception 'الكود ده مش موجود — راجعه وكتبه تاني'; end if;
    if v_coupon.status = 'paused' then raise exception 'الكود ده مش شغال دلوقتي'; end if;
    if current_date > v_coupon.ends_at then raise exception 'الكود ده خلصت مدته'; end if;
    if current_date < v_coupon.starts_at then raise exception 'الكود ده مش شغال دلوقتي'; end if;
    if v_subtotal < v_coupon.min_order then
      raise exception 'الكود ده بيشتغل على طلبات من % جنيه وانت طلبك % جنيه', v_coupon.min_order, v_subtotal;
    end if;
    if v_coupon.use_limit is not null then
      select count(*) into v_uses from public.coupon_uses where coupon_id = v_coupon.id;
      if v_uses >= v_coupon.use_limit then raise exception 'الكود ده خلص عدد مرات استخدامه'; end if;
    end if;
    select count(*) into v_uses from public.coupon_uses
      where coupon_id = v_coupon.id and phone = p_phone;
    if v_uses >= v_coupon.per_customer_limit then raise exception 'الكود ده اتطبق قبل كده على طلبك'; end if;
    if jsonb_array_length(v_coupon.categories) > 0 and not exists (
      select 1 from jsonb_array_elements(p_items) e
      join public.product_variants pv on pv.id = (e ->> 'variant_id')::uuid
      join public.products p on p.id = pv.product_id
      join public.categories c on c.id = p.category_id
      where c.slug in (select jsonb_array_elements_text(v_coupon.categories))
    ) then
      raise exception 'الكود ده مش شغال على المنتجات اللي في سلتك';
    end if;
    v_discount := case when v_coupon.type = 'percent'
      then round(v_subtotal * v_coupon.value / 100, 2)
      else least(v_coupon.value, v_subtotal) end;
  end if;

  -- الشحن من جدول المحافظات، والمجاني فوق الحد من الإعدادات (٠ = الميزة مقفولة)
  select shipping_fee into v_shipping from public.governorates where id = p_governorate_id;
  if not found then raise exception 'اختار محافظتك عشان نحسبلك الشحن'; end if;
  select (value)::numeric into v_threshold from public.store_settings where key = 'free_shipping_threshold';
  if coalesce(v_threshold, 0) > 0 and (v_subtotal - v_discount) >= v_threshold then
    v_shipping := 0;
  end if;

  insert into public.orders (customer_id, idempotency_key, full_name, phone, phone_alt,
    governorate_id, city_id, address, landmark, notes, subtotal, shipping_fee, total,
    coupon_code, discount, status)
  values (auth.uid(), p_idempotency_key, p_full_name, p_phone, p_phone_alt,
    p_governorate_id, p_city_id, p_address, p_landmark, p_notes, v_subtotal, v_shipping,
    v_subtotal - v_discount + v_shipping,
    case when v_discount > 0 then upper(p_coupon_code) else null end, v_discount, 'new')
  returning * into v_order;

  for item in select * from jsonb_array_elements(p_items) loop
    select pv.*, p.price as product_price into v
      from public.product_variants pv join public.products p on p.id = pv.product_id
      where pv.id = (item ->> 'variant_id')::uuid;
    insert into public.order_items (order_id, product_id, variant_id, qty, unit_price)
    values (v_order.id, v.product_id, v.id, (item ->> 'qty')::int, coalesce(v.price, v.product_price));
    update public.product_variants set stock = stock - (item ->> 'qty')::int where id = v.id;
    insert into public.stock_movements (variant_id, delta, reason, order_id, actor)
    values (v.id, -(item ->> 'qty')::int, 'order', v_order.id, auth.uid());
  end loop;

  if v_discount > 0 then
    insert into public.coupon_uses (coupon_id, phone, order_id)
    values (v_coupon.id, p_phone, v_order.id);
  end if;

  insert into public.order_status_history (order_id, from_status, to_status, actor, actor_kind)
  values (v_order.id, null, 'new', auth.uid(), case when auth.uid() is null then 'system' else 'customer' end);

  return jsonb_build_object('order_id', v_order.id, 'order_number', v_order.order_number,
    'subtotal', v_order.subtotal, 'discount', v_order.discount,
    'shipping_fee', v_order.shipping_fee, 'total', v_order.total, 'duplicate', false);
end $$;

-- ========== adjust_stock: تحريك مخزون بسجل (أدمن بس، ذري) ==========
create or replace function public.adjust_stock(p_variant_id uuid, p_delta int, p_reason text)
returns int
language plpgsql security definer set search_path = public as $$
declare v_new int;
begin
  if not public.is_admin() then raise exception 'الصلاحية دي للأدمن بس'; end if;
  if p_reason not in ('manual','initial','returned_ok','returned_damaged') then
    raise exception 'سبب حركة مش معروف';
  end if;
  update public.product_variants set stock = stock + p_delta
    where id = p_variant_id returning stock into v_new;
  if not found then raise exception 'المتغير مش موجود'; end if;
  if v_new < 0 then raise exception 'المخزون ماينفعش يبقى بالسالب'; end if;
  insert into public.stock_movements (variant_id, delta, reason, actor)
  values (p_variant_id, p_delta, p_reason, auth.uid());
  return v_new;
end $$;

-- ========== submit_review: تقييم مربوط بطلب مسلّم (واحد لكل عميل لكل منتج) ==========
create or replace function public.submit_review(
  p_product_id uuid, p_phone text, p_stars int, p_comment text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_order public.orders; v_review public.reviews;
begin
  if p_stars is null or p_stars < 1 or p_stars > 5 then raise exception 'اختار عدد النجوم الأول'; end if;
  select o.* into v_order from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.phone = p_phone and o.status = 'delivered' and oi.product_id = p_product_id
    order by o.created_at desc limit 1;
  if not found then raise exception 'التقييم متاح للي اشتروا المنتج واستلموه'; end if;
  insert into public.reviews (product_id, order_id, customer_name, phone, stars, comment)
  values (p_product_id, v_order.id, v_order.full_name, p_phone, p_stars, nullif(p_comment, ''))
  on conflict (product_id, phone) do update
    set stars = excluded.stars, comment = excluded.comment, hidden = false,
        created_at = now()
  returning * into v_review;
  return jsonb_build_object('review_id', v_review.id, 'stars', v_review.stars);
end $$;

-- ========== RLS للجداول الجديدة ==========
alter table public.coupons enable row level security;
alter table public.coupon_uses enable row level security;
alter table public.reviews enable row level security;
alter table public.carts enable row level security;

-- الكوبونات: مفيش قراءة عامة (التحقق خادمي جوه create_order) — الأدمن بس
create policy coupons_admin on public.coupons for all
  using (public.is_admin()) with check (public.is_admin());
create policy coupon_uses_admin on public.coupon_uses for select using (public.is_admin());
-- التقييمات: العامة تقرأ الظاهر، والأدمن يدير الإخفاء
create policy reviews_read on public.reviews for select using (not hidden or public.is_admin());
create policy reviews_admin_update on public.reviews for update
  using (public.is_admin()) with check (public.is_admin());
-- السلال: صاحبها بس + قراءة أدمن
create policy carts_own on public.carts for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy carts_admin_read on public.carts for select using (public.is_admin());

-- سجل الحركات والحالة: لا تعديل ولا حذف من أي حد (إدخال التريجر/الدوال بس)
revoke update, delete on public.order_status_history from anon, authenticated;
revoke update, delete on public.stock_movements from anon, authenticated;

-- ========== صلاحيات الجداول (RLS بيحكم الصفوف؛ دي بوابة الجدول) ==========
grant select on public.categories, public.size_charts, public.products, public.product_images,
  public.product_variants, public.governorates, public.cities, public.store_settings,
  public.reviews to anon;
grant select, insert, update, delete on public.categories, public.size_charts, public.products,
  public.product_images, public.product_variants, public.governorates, public.cities,
  public.store_settings, public.coupons to authenticated;
grant select on public.orders, public.order_items, public.order_status_history,
  public.stock_movements, public.coupon_uses, public.profiles to authenticated;
grant update on public.orders, public.reviews to authenticated;
grant insert on public.stock_movements to authenticated;
grant select, insert, update, delete on public.carts to authenticated;
grant execute on function public.create_order(text, text, text, uuid, uuid, text, text, text, jsonb, text, text) to anon, authenticated;
grant execute on function public.submit_review(uuid, text, int, text) to anon, authenticated;
grant execute on function public.adjust_stock(uuid, int, text) to authenticated;
