"""تحقق حي — دفعة 5: لوحة التحكم (حزمة 4) على 375px."""
import json
from playwright.sync_api import sync_playwright

BASE = "http://localhost:4173"
OUT = "/home/hatch/workspace/3a-store/docs/acceptance-2026-11-25"
results = []

def check(name, ok, evidence):
    results.append({"item": name, "result": "PASS" if ok else "FAIL", "evidence": evidence})
    print(("✅ " if ok else "❌ ") + name + " — " + evidence, flush=True)

def order_js(num):
    import datetime
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    o = {
        "number": num,
        "items": [{"slug": "tshirt-basic", "name": "تيشيرت قطن أساسي", "emoji": "👕", "size": "M", "color": "أسود", "price": 299, "qty": 1}],
        "form": {"full_name": "عميل لوحة", "phone": "01077788899", "governorate": "القاهرة", "city": "مدينة نصر", "address": "شارع مصطفى النحاس ١٢", "notes": ""},
        "subtotal": 299, "shipping": 50, "total": 349, "status": "new",
        "createdAt": now,
        "history": [{"from": None, "to": "new", "at": now, "actor": "system"}],
    }
    return f"localStorage.setItem('3a-store-order-{num}', {json.dumps(json.dumps(o, ensure_ascii=False))})"

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 375, "height": 667}, locale="ar-EG")
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    ov = lambda: page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")

    page.goto(BASE + "/")
    page.wait_for_timeout(400)
    page.evaluate(order_js("7001"))
    page.evaluate(order_js("7002"))

    # الداشبورد
    page.goto(BASE + "/admin")
    page.wait_for_timeout(500)
    t = page.inner_text("main")
    check("داشبورد: أرقام + محتاج شغلك", "طلبات النهاردة" in t and "محتاج شغلك دلوقتي" in t and "7001" in t, "الكروت والقايمة ظاهرة")
    check("داشبورد 375px بلا كسر", ov() <= 0, f"overflow={ov()}px")
    page.screenshot(path=f"{OUT}/18-admin-home-375.png")

    # قايمة الطلبات
    page.goto(BASE + "/admin/orders")
    page.wait_for_timeout(500)
    t = page.inner_text("main")
    check("قايمة الطلبات: عدّاد الجديد + الطلبات", "طلبات جديدة محتاجة تأكيد" in t and "#7001" in t and "#1001" in t, "العدّاد والطلبات موجودة")
    page.locator("main input[type='search']").fill("7002")
    page.wait_for_timeout(300)
    t = page.inner_text("main")
    check("بحث برقم الطلب", "#7002" in t and "#7001" not in t, "الفلترة بالبحث شغالة")

    # تفاصيل: بوابة التأكيد
    page.goto(BASE + "/admin/orders/7001")
    page.wait_for_timeout(500)
    t = page.inner_text("main")
    check("تفاصيل: منتجات وعميل ونسخ شحن", "تيشيرت قطن أساسي" in t and "عميل لوحة" in t and "انسخ بيانات الشحن" in t, "الأقسام موجودة")
    btn = page.locator("button:has-text('تم التأكيد')").last
    check("زرار «تم التأكيد» مقفول قبل توثيق التأكيد", btn.is_disabled(), "البوابة شغالة")
    page.locator("button:has-text('تم التأكيد واتساب')").click()
    page.wait_for_timeout(300)
    check("بعد التوثيق الزرار اتفتح", not page.locator("button:has-text('تم التأكيد')").last.is_disabled(), "التوثيق فك القفل")
    page.locator("button:has-text('تم التأكيد')").last.click()
    page.wait_for_timeout(300)
    t = page.inner_text("main")
    check("الانتقال لتم التأكيد اتسجل", "بيجهّز" in t, "الخطوة الجاية ظهرت")
    page.locator("button:has-text('بيجهّز')").click()
    page.wait_for_timeout(300)
    page.locator("input[placeholder='رقم الشحنة']").fill("TRK-7001")
    page.locator("button:has-text('اتشحن')").click()
    page.wait_for_timeout(300)
    t = page.inner_text("main")
    check("شحن برقم شحنة + سجل تغييرات", "تم التسليم" in t and "سجل التغييرات" in t and "TRK-7001" in t, "الشحن والسجل تمام")
    page.locator("button:has-text('تم التسليم')").click()
    page.wait_for_timeout(300)
    has_return = page.locator("button:text-is('مرتجع')").count() == 1
    has_ship = page.locator("button:text-is('اتشحن')").count() == 0
    has_prep = page.locator("button:text-is('بيجهّز')").count() == 0
    check("بعد التسليم: الحركة الوحيدة الباقية هي الاسترجاع", has_return and has_ship and has_prep, "delivered شبه نهائية — استرجاع بس")
    page.screenshot(path=f"{OUT}/19-admin-order-375.png")

    # إلغاء: من غير سبب يترفض، وبسبب بيعدي
    page.goto(BASE + "/admin/orders/7002")
    page.wait_for_timeout(500)
    page.locator("button:has-text('إلغاء الطلب')").click()
    page.wait_for_timeout(300)
    page.locator("button:has-text('أكّد الإلغاء')").click()
    page.wait_for_timeout(300)
    t = page.inner_text("main")
    check("إلغاء من غير سبب بيترفض", "اختار سبب الإلغاء الأول" in t, "رسالة السبب ظاهرة")
    page.locator(".modal select").select_option("customer_request")
    page.locator("button:has-text('أكّد الإلغاء')").click()
    page.wait_for_timeout(300)
    t = page.inner_text("main")
    check("إلغاء بسبب «طلب العميل» بيعدي وبيتسجل", "ملغي" in t and "طلب العميل" in t, "الحالة والسجل اتحدثوا")
    check("تفاصيل الطلب 375px بلا كسر", ov() <= 0, f"overflow={ov()}px")

    # المنتجات: تحقق الفورم + المتغيرات
    page.goto(BASE + "/admin/products")
    page.wait_for_timeout(500)
    page.locator("button:has-text('حفظ المنتج')").click()
    page.wait_for_timeout(300)
    t = page.inner_text("main")
    check("فورم منتج فاضي بيترفض", "اسم المنتج لازم يكون ٣ حروف على الأقل" in t, "رسالة التحقق ظاهرة")
    page.locator("button:has-text('المتغيرات والمخزون')").first.click()
    page.wait_for_timeout(300)
    t = page.inner_text("main")
    check("مصفوفة المتغيرات والمخزون", "M / أسود" in t and "سجل الحركات" in t, "الصفوف والسجل موجودين")
    page.screenshot(path=f"{OUT}/20-admin-products-375.png")

    # الإعدادات: مصدر واحد — تعديل بيسمع في صفحة الشحن والاسترجاع
    page.goto(BASE + "/admin/settings")
    page.wait_for_timeout(500)
    fee = page.locator("input[aria-label='رسم القاهرة']")
    fee.fill("55")
    days_input = page.locator("label:has-text('أيام الاسترجاع') input")
    days_input.fill("10")
    page.locator("button:has-text('حفظ الإعدادات')").click()
    page.wait_for_timeout(300)
    page.goto(BASE + "/shipping")
    page.wait_for_timeout(400)
    t = page.inner_text("main")
    check("رسم القاهرة الجديد (55) ظهر في صفحة الشحن", "55" in t, "مصدر واحد للأرقام")
    page.goto(BASE + "/returns")
    page.wait_for_timeout(400)
    t = page.inner_text("main")
    check("أيام الاسترجاع الجديدة (10) ظهرت في صفحة الاسترجاع", "10" in t, "الإعداد بيسمع في صفحات الثقة")
    page.goto(BASE + "/admin/settings")
    page.wait_for_timeout(400)
    check("إعدادات 375px بلا كسر", ov() <= 0, f"overflow={ov()}px")

    check("مفيش أخطاء JS في الجولة", len(errors) == 0, f"pageerror={errors[:2]}" if errors else "صفر أخطاء")
    b.close()

with open(f"{OUT}/results-admin.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f"\nTOTAL: {sum(1 for r in results if r['result']=='PASS')}/{len(results)} PASS")
