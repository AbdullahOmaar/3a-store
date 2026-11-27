#!/usr/bin/env python3
"""حزمة اختبارات الصلاحيات والأمان للمتجر — تُشغَّل ضد مشروع Supabase حي.

Usage: authz_suite.py <project_ref>
المفاتيح بتتقرأ من Management API برمجيًا (مش بتتطبع)، وكلمات سر مستخدمي
الاختبار عشوائية وبتعيش جوه العملية بس. كل اختبار بيطبع PASS/FAIL بدليله،
والخروج بكود غير صفري لو أي اختبار فشل.
"""
import json
import secrets
import sys
import urllib.request
import urllib.error

sys.path.insert(0, "/home/hatch/workspace/custom-connectors/custom.supabase/bin")
from supabase_api import call as mgmt

REF = sys.argv[1] if len(sys.argv) > 1 else ""
if not REF:
    print("usage: authz_suite.py <project_ref>")
    sys.exit(2)
BASE = f"https://{REF}.supabase.co"

keys = mgmt("GET", f"/v1/projects/{REF}/api-keys")
PUB = next((k["api_key"] for k in keys if k["api_key"].startswith("sb_publishable")), None) \
    or next((k["api_key"] for k in keys if k.get("name") == "anon"), None)
SEC = next((k["api_key"] for k in keys if k["api_key"].startswith("sb_secret")), None) \
    or next((k["api_key"] for k in keys if k.get("name") == "service_role"), None)
assert PUB and SEC, "keys not found"

results = []
def check(name, ok, evidence=""):
    results.append((name, ok))
    print(("✅ " if ok else "❌ ") + name + (f" — {evidence}" if evidence else ""), flush=True)

def req(method, path, key, token=None, body=None, expect=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    r.add_header("apikey", key)
    r.add_header("Authorization", "Bearer " + (token or key))
    if data is not None:
        r.add_header("Content-Type", "application/json")
    r.add_header("Prefer", "return=representation")
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode() or "null")
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(raw or "null")
        except json.JSONDecodeError:
            return e.code, {"raw": raw}

def sql(query):
    return mgmt("POST", f"/v1/projects/{REF}/database/query", {"query": query})

def one(rows, **kw):
    for row in rows or []:
        if all(str(row.get(k)) == str(v) for k, v in kw.items()):
            return row
    return None

# ============ الإعداد: بيانات اختبار + مستخدمون ============
sql("""
insert into public.categories (slug, name_ar) values ('test-cat', 'قسم اختبار')
on conflict (slug) do nothing;
insert into public.products (category_id, slug, sku, name_ar, description, price, material)
select id, 'test-a', 'TEST-A', 'منتج اختبار أ', 'وصف اختبار طويل بما يكفي للتحقق من الشروط', 299, 'قطن'
from public.categories where slug = 'test-cat'
on conflict (slug) do nothing;
insert into public.products (category_id, slug, sku, name_ar, description, price, material)
select id, 'test-b', 'TEST-B', 'منتج اختبار ب', 'وصف اختبار طويل بما يكفي للتحقق من الشروط', 100, 'قطن'
from public.categories where slug = 'test-cat'
on conflict (slug) do nothing;
insert into public.products (category_id, slug, sku, name_ar, description, price, material)
select id, 'test-c', 'TEST-C', 'منتج اختبار ج', 'وصف اختبار طويل بما يكفي للتحقق من الشروط', 600, 'قطن'
from public.categories where slug = 'test-cat'
on conflict (slug) do nothing;
insert into public.product_variants (product_id, size_label, color_name_ar, stock)
select id, 'M', 'أسود', 5 from public.products where slug = 'test-a'
on conflict (product_id, size_label, color_name_ar) do update set stock = 5;
insert into public.product_variants (product_id, size_label, color_name_ar, stock)
select id, 'مقاس واحد', 'أبيض', 2 from public.products where slug = 'test-b'
on conflict (product_id, size_label, color_name_ar) do update set stock = 2;
insert into public.product_variants (product_id, size_label, color_name_ar, stock)
select id, 'L', 'أزرق', 10 from public.products where slug = 'test-c'
on conflict (product_id, size_label, color_name_ar) do update set stock = 10;
update public.governorates set shipping_fee = 50 where name_ar = 'القاهرة';
insert into public.cities (governorate_id, name_ar)
select id, 'مدينة نصر' from public.governorates where name_ar = 'القاهرة'
on conflict (governorate_id, name_ar) do nothing;
update public.store_settings set value = '1000'::jsonb where key = 'free_shipping_threshold';
insert into public.coupons (code, type, value, min_order, starts_at, ends_at, status)
values ('TEST10', 'percent', 10, 0, '2020-01-01', '2030-01-01', 'active')
on conflict (code) do update set status = 'active';
""")
ids = {r["slug"]: r for r in sql("""
select p.slug, p.id as product_id, v.id as variant_id,
  (select id from public.governorates where name_ar = 'القاهرة') as gov_id,
  (select id from public.cities where name_ar = 'مدينة نصر' limit 1) as city_id
from public.products p join public.product_variants v on v.product_id = p.id
where p.slug in ('test-a','test-b','test-c')""")}
A, B, C = ids["test-a"], ids["test-b"], ids["test-c"]
GOV, CITY = A["gov_id"], A["city_id"]

def make_user(email):
    pw = secrets.token_urlsafe(18)
    st, u = req("POST", "/auth/v1/admin/users", SEC, body={
        "email": email, "password": pw, "email_confirm": True})
    assert st in (200, 201), f"user create failed: {st} {u}"
    st, sess = req("POST", "/auth/v1/token?grant_type=password", PUB,
                   body={"email": email, "password": pw})
    assert st == 200, f"login failed: {st} {sess}"
    return u["id"], sess["access_token"]

c1_id, c1 = make_user("test-customer1@3a-store.test")
c2_id, c2 = make_user("test-customer2@3a-store.test")
admin_id, admin = make_user("test-admin@3a-store.test")
sql(f"update public.profiles set role = 'admin' where id = '{admin_id}';")

def order_body(phone, items, key=None, coupon=None):
    return {"p_full_name": "عميل اختبار", "p_phone": phone, "p_phone_alt": None,
            "p_governorate_id": GOV, "p_city_id": CITY,
            "p_address": "شارع اختبار رقم ١٢", "p_landmark": None, "p_notes": None,
            "p_items": items, "p_coupon_code": coupon,
            "p_idempotency_key": key or secrets.token_hex(8)}

def create_order(token, body):
    return req("POST", "/rest/v1/rpc/create_order", PUB, token=token, body=body)

def stock_of(variant_id):
    rows = sql(f"select stock from public.product_variants where id = '{variant_id}'")
    return rows[0]["stock"]

# ============ 1) الضيف (anon): قراءات وحدود ============
st, rows = req("GET", "/rest/v1/products?select=slug&slug=eq.test-a", PUB)
check("ضيف يقرأ منتج ظاهر", st == 200 and len(rows) == 1, f"rows={len(rows or [])}")
st, rows = req("GET", "/rest/v1/orders?select=id", PUB)
check("ضيف مايشوفش أي طلبات", st == 200 and rows == [], f"rows={rows}")
st, rows = req("GET", "/rest/v1/stock_movements?select=id", PUB)
check("ضيف مايشوفش حركات المخزون", st == 200 and rows == [], f"rows={rows}")
st, rows = req("GET", "/rest/v1/coupons?select=code", PUB)
check("ضيف مايشوفش الكوبونات", st == 200 and rows == [], f"rows={rows}")
st, r = req("POST", "/rest/v1/products", PUB, body={
    "category_id": A["product_id"], "slug": "hack", "name_ar": "اختراق",
    "description": "وصف اختراق طويل بما يكفي للشروط", "price": 1, "material": "x"})
check("ضيف مايقدرش يضيف منتج", st in (401, 403), f"status={st}")
st, r = req("PATCH", "/rest/v1/store_settings?key=eq.return_days", PUB, body={"value": "999"})
val = sql("select value from public.store_settings where key = 'return_days'")[0]["value"]
check("ضيف مايقدرش يعدّل الإعدادات", str(val) != "999", f"return_days={val}")

# ============ 2) عملاء: العزل بين الحسابات ============
st, rows = req("GET", "/rest/v1/profiles?select=id", PUB, token=c1)
check("عميل يشوف بروفايله بس", st == 200 and len(rows) == 1 and rows[0]["id"] == c1_id,
      f"rows={len(rows or [])}")
st, r = req("PATCH", f"/rest/v1/products?slug=eq.test-a", PUB, token=c1, body={"price": 1})
price = sql("select price from public.products where slug = 'test-a'")[0]["price"]
check("عميل عادي مايقدرش يعدّل سعر منتج", float(price) == 299.0, f"price={price}")

# ============ 3) create_order: حساب خادمي ومخزون ============
st, o1 = create_order(c1, order_body("01011111111", [{"variant_id": A["variant_id"], "qty": 2}], key="suite-o1"))
check("طلب عميل مسجل بيتنشئ", st == 200 and o1 and not o1.get("duplicate"), f"status={st} resp={o1}")
check("الإجمالي من الخادم (598+50=648)",
      o1 and float(o1["subtotal"]) == 598 and float(o1["shipping_fee"]) == 50 and float(o1["total"]) == 648,
      f"subtotal={o1 and o1.get('subtotal')} total={o1 and o1.get('total')}")
check("المخزون اتخصم فورًا (5→3)", stock_of(A["variant_id"]) == 3, f"stock={stock_of(A['variant_id'])}")

st, r = create_order(None, order_body("01022222222", [{"variant_id": B["variant_id"], "qty": 3}]))
check("طلب أكبر من المخزون بيترفض", st >= 400 and "المخزون مش مكفي" in json.dumps(r, ensure_ascii=False),
      f"status={st}")
check("المخزون زي ما هو بعد الرفض", stock_of(B["variant_id"]) == 2, f"stock={stock_of(B['variant_id'])}")

st, o2 = create_order(None, order_body("01022222222", [{"variant_id": A["variant_id"], "qty": 1}], key="suite-idem"))
st, o2b = create_order(None, order_body("01022222222", [{"variant_id": A["variant_id"], "qty": 1}], key="suite-idem"))
check("ضغطة مزدوجة = طلب واحد بنفس الرقم",
      o2 and o2b and o2["order_number"] == o2b["order_number"] and o2b.get("duplicate") is True,
      f"n1={o2 and o2.get('order_number')} n2={o2b and o2b.get('order_number')}")
check("الخصم مرة واحدة بس (3→2)", stock_of(A["variant_id"]) == 2, f"stock={stock_of(A['variant_id'])}")

st, o3 = create_order(None, order_body("01022222222",
                      [{"variant_id": A["variant_id"], "qty": 1, "price": 1}], key="suite-bogus"))
check("سعر مزيف من المتصفح بيتجاهل (299 مش 1)",
      o3 and float(o3["subtotal"]) == 299, f"subtotal={o3 and o3.get('subtotal')}")

st, r = create_order(None, order_body("12345", [{"variant_id": A["variant_id"], "qty": 1}]))
check("موبايل غلط بيترفض", st >= 400, f"status={st}")

st, oc = create_order(None, order_body("01033333333", [{"variant_id": A["variant_id"], "qty": 1}],
                                       key="suite-coupon", coupon="TEST10"))
check("كوبون 10% بيخصم من المنتجات بس (خصم 29.9)",
      oc and abs(float(oc["discount"]) - 29.9) < 0.01 and abs(float(oc["total"]) - 319.1) < 0.01,
      f"discount={oc and oc.get('discount')} total={oc and oc.get('total')}")
st, r = create_order(None, order_body("01033333333", [{"variant_id": B["variant_id"], "qty": 1}],
                                      coupon="TEST10"))
check("نفس العميل مايستخدمش الكوبون مرتين", st >= 400 and "اتطبق قبل كده" in json.dumps(r, ensure_ascii=False),
      f"status={st}")

st, of = create_order(c2, order_body("01044444444", [{"variant_id": C["variant_id"], "qty": 2}], key="suite-free"))
check("شحن مجاني فوق الحد (1200 ≥ 1000)", of and float(of["shipping_fee"]) == 0 and float(of["total"]) == 1200,
      f"shipping={of and of.get('shipping_fee')}")

st, rows = req("GET", "/rest/v1/orders?select=id,customer_id", PUB, token=c2)
check("عميل 2 يشوف طلبه بس", st == 200 and len(rows) == 1, f"rows={len(rows or [])}")
st, rows = req("GET", "/rest/v1/orders?select=id", PUB, token=c1)
check("عميل 1 مايشوفش طلبات غيره", st == 200 and len(rows) == 1, f"rows={len(rows or [])}")

# ============ 4) آلة الحالات + بوابة التأكيد + الإلغاء ============
oid = o1["order_id"]
def patch_order(body, token=admin):
    return req("PATCH", f"/rest/v1/orders?id=eq.{oid}", PUB, token=token, body=body)

st, r = patch_order({"status": "shipped"})
check("قفز من جديد لشحن بيترفض", st >= 400 and "مينفعش الطلب يتحرك" in json.dumps(r, ensure_ascii=False), f"status={st}")
st, r = patch_order({"status": "confirmed"})
check("جديد → تم التأكيد بيعدي", st == 200, f"status={st}")
st, r = patch_order({"status": "preparing"})
check("تجهيز من غير تأكيد عميل بيترفض", st >= 400 and "أكّد الطلب مع العميل" in json.dumps(r, ensure_ascii=False), f"status={st}")
st, r = patch_order({"confirmed_with_customer": True, "confirmation_channel": "whatsapp", "status": "preparing"})
check("بعد توثيق التأكيد التجهيز بيعدي", st == 200, f"status={st}")
st, r = patch_order({"status": "shipped", "tracking_number": "TRK-SUITE-1"})
check("تجهيز → شحن بيعدي", st == 200, f"status={st}")
st, r = patch_order({"status": "delivered"})
check("شحن → تسليم بيعدي", st == 200, f"status={st}")
hist = sql(f"select count(*) as n from public.order_status_history where order_id = '{oid}'")
check("كل انتقال متسجل في سجل التغييرات", hist[0]["n"] >= 5, f"rows={hist[0]['n']}")
st, r = req("POST", "/rest/v1/order_status_history", PUB, token=c1,
            body={"order_id": oid, "to_status": "new"})
check("ممنوع كتابة سجل التغييرات يدويًا", st in (401, 403) or (st < 300 and False), f"status={st}")

# إلغاء بيرجع المخزون
st, o4 = create_order(None, order_body("01055555555", [{"variant_id": C["variant_id"], "qty": 1}], key="suite-cancel"))
before = stock_of(C["variant_id"])
oid4 = o4["order_id"]
st, r = req("PATCH", f"/rest/v1/orders?id=eq.{oid4}", PUB, token=admin, body={"status": "cancelled"})
check("إلغاء من غير سبب بيترفض", st >= 400 and "اختار سبب الإلغاء" in json.dumps(r, ensure_ascii=False), f"status={st}")
st, r = req("PATCH", f"/rest/v1/orders?id=eq.{oid4}", PUB, token=admin,
            body={"status": "cancelled", "cancel_reason_code": "customer_request"})
check("إلغاء بسبب مرمّز بيعدي", st == 200, f"status={st}")
check("مخزون الإلغاء رجع (قبل الشحن)", stock_of(C["variant_id"]) == before + 1,
      f"stock={stock_of(C['variant_id'])} expected={before + 1}")
mv = sql(f"select count(*) as n from public.stock_movements where order_id = '{oid4}' and reason = 'cancel_return'")
check("حركة استرجاع المخزون متسجلة", mv[0]["n"] == 1, f"rows={mv[0]['n']}")

# ============ 5) التقييمات مربوطة بطلب مسلّم ============
st, r = req("POST", "/rest/v1/rpc/submit_review", PUB,
            body={"p_product_id": A["product_id"], "p_phone": "01099999999", "p_stars": 5, "p_comment": "x"})
check("تقييم من غير طلب مسلّم بيترفض", st >= 400 and "التقييم متاح للي اشتروا" in json.dumps(r, ensure_ascii=False), f"status={st}")
st, r = req("POST", "/rest/v1/rpc/submit_review", PUB,
            body={"p_product_id": A["product_id"], "p_phone": "01011111111", "p_stars": 5, "p_comment": "ممتاز"})
check("تقييم صاحب الطلب المسلّم بيعدي", st == 200, f"status={st} resp={r}")
st, r = req("POST", "/rest/v1/rpc/submit_review", PUB,
            body={"p_product_id": A["product_id"], "p_phone": "01011111111", "p_stars": 4, "p_comment": "كويس"})
n = sql(f"select count(*) as n from public.reviews where product_id = '{A['product_id']}' and phone = '01011111111'")[0]["n"]
check("تقييم واحد لكل عميل لكل منتج (بيتعدّل)", n == 1, f"rows={n}")
st, rows = req("GET", f"/rest/v1/reviews?select=id&product_id=eq.{A['product_id']}", PUB)
check("التقييم الظاهر بيبان للعامة", st == 200 and len(rows) == 1, f"rows={len(rows or [])}")
rid = rows[0]["id"]
st, r = req("PATCH", f"/rest/v1/reviews?id=eq.{rid}", PUB, token=admin, body={"hidden": True})
st, rows = req("GET", f"/rest/v1/reviews?select=id&product_id=eq.{A['product_id']}", PUB)
check("المخفي بيختفي من العامة", st == 200 and rows == [], f"rows={rows}")

# ============ 6) صلاحيات الأدمن ============
st, r = req("PATCH", "/rest/v1/store_settings?key=eq.return_days", PUB, token=admin, body={"value": "14"})
check("الأدمن يعدّل الإعدادات", st == 200, f"status={st}")
st, r = req("POST", "/rest/v1/rpc/adjust_stock", PUB, token=c1,
            body={"p_variant_id": B["variant_id"], "p_delta": 5, "p_reason": "manual"})
check("adjust_stock للأدمن بس", st >= 400, f"status={st}")
st, r = req("POST", "/rest/v1/rpc/adjust_stock", PUB, token=admin,
            body={"p_variant_id": B["variant_id"], "p_delta": 5, "p_reason": "manual"})
check("الأدمن يحرّك المخزون بسجل", st == 200 and stock_of(B["variant_id"]) == 7,
      f"status={st} stock={stock_of(B['variant_id'])}")

failed = [n for n, ok in results if not ok]
print(f"\nTOTAL: {len(results) - len(failed)}/{len(results)} PASS")
if failed:
    print("FAILED:", " | ".join(failed))
    sys.exit(1)
