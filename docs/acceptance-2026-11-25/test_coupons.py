"""تحقق حي — دفعة 9: الكوبونات (حزمة P1-أ) على 375px."""
import json, os
from playwright.sync_api import sync_playwright

BASE = "http://localhost:4173"
OUT = "/home/hatch/workspace/3a-store/docs/acceptance-2026-11-25"
results = []

def check(name, ok, evidence):
    results.append({"item": name, "result": "PASS" if ok else "FAIL", "evidence": evidence})
    print(("✅ " if ok else "❌ ") + name + " — " + evidence, flush=True)

def add_tshirt(page, qty=1):
    page.goto(BASE + "/product/tshirt-basic")
    page.wait_for_timeout(500)
    page.get_by_role("button", name="أسود").click()
    page.locator("#sizes .f-opts button:not(:disabled)").first.click()
    for _ in range(qty - 1):
        page.locator("button:has-text('+')").first.click()
    page.locator("button:has-text('أضف للسلة')").click()
    page.wait_for_timeout(400)

def apply_in_cart(page, code):
    page.locator(".coupon-field input").fill(code)
    page.locator("button:has-text('طبّق')").click()
    page.wait_for_timeout(300)

def fill_checkout(page, phone="01012345678"):
    page.locator("a:has-text('إتمام الطلب')").click()
    page.wait_for_timeout(500)
    page.locator("main input").nth(0).fill("أحمد محمد")
    page.locator("main input[type='tel']").first.fill(phone)
    page.locator("main select").first.select_option(index=1)
    page.wait_for_timeout(200)
    page.locator("main select").nth(1).select_option(index=1)
    page.locator("main input").nth(3).fill("شارع التحرير، عمارة 5، الدور الثالث")

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 375, "height": 667}, locale="ar-EG")
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    ov = lambda: page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")

    # أ: أقل من الحد الأدنى (299 < 300)
    add_tshirt(page, 1)
    apply_in_cart(page, "WELCOME10")
    t = page.inner_text("body")
    check("كود تحت الحد الأدنى مرفوض بالرسالة الصح", "بيشتغل على طلبات من 300 جنيه وانت طلبك 299 جنيه" in t, "رسالة الحد الأدنى ظاهرة")

    # ب: كود مش موجود
    apply_in_cart(page, "BADCODE")
    t = page.inner_text("body")
    check("كود مش موجود مرفوض", "الكود ده مش موجود" in t, "رسالة «مش موجود» ظاهرة")

    # ج: تطبيق صحيح — خصم 10% من 598 = 60
    page.locator(".drawer button:has-text('+')").first.click()  # كمية 2 → 598 (مقصور على الدرج، مش زر الكمية بتاع صفحة المنتج اللي تحته)
    page.wait_for_timeout(200)
    apply_in_cart(page, "WELCOME10")
    t = page.inner_text("body")
    check("تطبيق WELCOME10: سطر خصم −60 ج", "خصم كود WELCOME10" in t and "60" in t, "سطر الخصم ظاهر في السلة")
    page.screenshot(path=f"{OUT}/12-coupon-cart-375.png")

    # د: التشيك أوت بالكود — الخصم متجمد في الطلب
    fill_checkout(page)
    t = page.inner_text("main")
    check("التشيك أوت: سطر خصم الكود ظاهر", "خصم الكود" in t or "خصم كود" in t, "سطر الخصم في ملخص التشيك أوت")
    page.locator("button:has-text('أكّد الطلب')").click()
    page.wait_for_timeout(900)
    t = page.inner_text("main")
    import re
    m = re.search(r"#(\d+)", t)
    num = m.group(1) if m else "؟"
    check("الطلب اتعمل بالكود", "اتعمل طلبك" in t and bool(m), f"رقم الطلب=#{num}")
    saved = page.evaluate(f"JSON.parse(localStorage.getItem('3a-store-order-{num}') || 'null')")
    check("الخصم متجمّد في الطلب (كود + قيمة)", saved and saved.get("couponCode") == "WELCOME10" and saved.get("discount") == 60, f"couponCode={saved.get('couponCode') if saved else '؟'} discount={saved.get('discount') if saved else '؟'}")
    uses = page.evaluate("JSON.parse(localStorage.getItem('3a-store-coupon-uses') || '[]')")
    check("استخدام الكود اتسجّل", len([u for u in uses if u.get("code") == "WELCOME10"]) == 1, f"uses={len(uses)}")

    # هـ: نفس الموبايل + نفس الكود مرة تانية = مرفوض عند التأكيد
    add_tshirt(page, 2)
    apply_in_cart(page, "WELCOME10")
    fill_checkout(page, "01012345678")
    page.locator("button:has-text('أكّد الطلب')").click()
    page.wait_for_timeout(600)
    t = page.inner_text("main")
    check("كود مطبق قبل كده على نفس الموبايل = مرفوض عند التأكيد", "اتطبق قبل كده على طلبك" in t, "رسالة حد العميل ظاهرة والطلب ماتعملش")

    # و: الأدمن — قايمة + أخطاء إنشاء + إنشاء صحيح + إيقاف
    page.goto(BASE + "/admin/coupons")
    page.wait_for_timeout(500)
    t = page.inner_text("main")
    check("الأدمن: قايمة الكوبونات (3 أكواد)", "WELCOME10" in t and "SALE15" in t and "OLD5" in t, "الأكواد التلاتة ظاهرة")
    check("الأدمن 375px بلا كسر", ov() <= 0, f"overflow={ov()}px")
    page.screenshot(path=f"{OUT}/13-coupons-admin-375.png")
    # كود مكرر
    page.locator("main input").nth(0).fill("WELCOME10")
    page.locator("button:has-text('إنشاء الكود')").click()
    page.wait_for_timeout(300)
    t = page.inner_text("main")
    check("الأدمن: كود مكرر مرفوض", "الكود ده موجود قبل كده" in t, "رسالة التكرار ظاهرة")
    # نسبة 95
    page.locator("main input").nth(0).fill("NEW20")
    page.locator("main input[type='number']").nth(0).fill("95")
    page.locator("button:has-text('إنشاء الكود')").click()
    page.wait_for_timeout(300)
    t = page.inner_text("main")
    check("الأدمن: نسبة 95٪ مرفوضة", "النسبة لازم تكون بين ١ و٩٠٪" in t, "رسالة النسبة ظاهرة")
    # إنشاء صحيح
    page.locator("main input[type='number']").nth(0).fill("20")
    page.locator("button:has-text('إنشاء الكود')").click()
    page.wait_for_timeout(400)
    t = page.inner_text("main")
    check("الأدمن: إنشاء NEW20 ناجح وظهر في القايمة", "NEW20" in t and "اتحفظ الكود" in t, "الكود الجديد في القايمة")
    # إيقاف SALE15 ثم تطبيقه كعميل
    page.locator(".order-card:has-text('SALE15') button:has-text('إيقاف')").click()
    page.wait_for_timeout(300)
    t = page.inner_text("main")
    check("الأدمن: إيقاف SALE15 غيّر حالته لموقوف", "موقوف" in t, "شارة موقوف ظاهرة")
    add_tshirt(page, 2)
    # الكود السابق (WELCOME10) لسه مطبق من خطوة هـ — لازم يتلغي الأول عشان حقل الإدخال يظهر
    if page.locator("button[aria-label='إلغاء الكود']").count():
        page.locator("button[aria-label='إلغاء الكود']").click()
        page.wait_for_timeout(300)
    apply_in_cart(page, "SALE15")
    t = page.inner_text("body")
    check("كود موقوف مرفوض عند العميل", "مش شغال دلوقتي" in t, "رسالة الإيقاف ظاهرة")

    check("مفيش أخطاء JS في الجولة", len(errors) == 0, f"pageerror={errors[:2]}" if errors else "صفر أخطاء")
    b.close()

with open(f"{OUT}/results-coupons.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f"\nTOTAL: {sum(1 for r in results if r['result']=='PASS')}/{len(results)} PASS")
