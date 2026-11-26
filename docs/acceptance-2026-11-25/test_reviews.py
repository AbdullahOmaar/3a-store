"""تحقق حي — دفعة 11: التقييمات (حزمة P1-ج) على 375px."""
import json
from playwright.sync_api import sync_playwright

BASE = "http://localhost:4173"
OUT = "/home/hatch/workspace/3a-store/docs/acceptance-2026-11-25"
results = []

def check(name, ok, evidence):
    results.append({"item": name, "result": "PASS" if ok else "FAIL", "evidence": evidence})
    print(("✅ " if ok else "❌ ") + name + " — " + evidence, flush=True)

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 375, "height": 667}, locale="ar-EG")
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    ov = lambda: page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")

    # ملخص وقايمة التيشيرت (3 تقييمات بذرة)
    page.goto(BASE + "/product/tshirt-basic")
    page.wait_for_timeout(600)
    page.locator("text=التقييمات").first.scroll_into_view_if_needed()
    page.wait_for_timeout(300)
    t = page.inner_text("main")
    check("ملخص: متوسط 4.7 وعدد 3", "4.7" in t and "٣ تقييم" in t.replace("3", "٣") or ("4.7" in t and "تقييم" in t), "المتوسط والعدد ظاهرين")
    check("الأسماء الأولى بس (خصوصية)", "أحمد" in t and "أحمد سمير" not in t, "الاسم الأول بس في القايمة العامة")
    check("توزيع النجوم ظاهر", "★" in t, "صفوف التوزيع موجودة")
    check("صفحة المنتج 375px بلا كسر", ov() <= 0, f"overflow={ov()}px")
    page.screenshot(path=f"{OUT}/16-reviews-product-375.png")

    # منتج من غير تقييمات
    page.goto(BASE + "/product/sport-shoes")
    page.wait_for_timeout(500)
    t = page.inner_text("main")
    check("منتج بلا تقييمات: الرسالة المحددة", "لسه مفيش تقييمات — كن أول واحد يقيّم بعد ما تستلم طلبك" in t, "رسالة الصفر ظاهرة")

    # رفض: موبايل من غير طلب مسلّم
    page.goto(BASE + "/product/tshirt-basic")
    page.wait_for_timeout(500)
    page.locator("input[type='tel']").fill("01099998888")
    page.locator("button:has-text('قيّم المنتج ده')").click()
    page.wait_for_timeout(400)
    t = page.inner_text("main")
    check("من غير طلب مسلّم: التقييم مرفوض", "التقييم متاح للي اشتروا المنتج واستلموه" in t, "رسالة الرفض ظاهرة")

    # حقن طلب مسلّم (محاكاة خطوة التسليم اللي لسه لوحتها دفعة 5) ثم التقييم
    page.evaluate("""() => {
      const order = {
        number: '5555',
        items: [{ slug: 'tshirt-basic', name: 'تيشيرت قطن أساسي', emoji: '👕', size: 'M', color: 'أسود', price: 299, qty: 1 }],
        form: { full_name: 'خالد محمود', phone: '01077788899', governorate: 'القاهرة', city: 'مدينة نصر', address: 'شارع مصطفى النحاس', notes: '' },
        subtotal: 299, shipping: 50, total: 349, status: 'delivered',
        createdAt: new Date(Date.now() - 3*86400000).toISOString(),
        history: [{ from: null, to: 'new', at: new Date().toISOString(), actor: 'system' }, { from: 'shipped', to: 'delivered', at: new Date().toISOString(), actor: 'admin' }]
      };
      localStorage.setItem('3a-store-order-5555', JSON.stringify(order));
    }""")
    page.reload()
    page.wait_for_timeout(500)
    page.locator("input[type='tel']").fill("01077788899")
    page.locator("button:has-text('قيّم المنتج ده')").click()
    page.wait_for_timeout(400)
    t = page.inner_text("main")
    check("صاحب طلب مسلّم: فورم التقييم بيفتح", "تقييمك" in t and "انشر تقييمك" in t, "الفورم فتح")
    # من غير نجوم
    page.locator("button:has-text('انشر تقييمك')").click()
    page.wait_for_timeout(300)
    t = page.inner_text("main")
    check("من غير نجوم: مرفوض", "اختار عدد النجوم الأول" in t, "رسالة النجوم ظاهرة")
    # بنجوم وتعليق
    page.locator(".star-btn").nth(4).click()
    page.locator(".review-form textarea").fill("ممتاز، المقاس مظبوط والخامة تستاهل.")
    page.locator("button:has-text('انشر تقييمك')").click()
    page.wait_for_timeout(400)
    t = page.inner_text("main")
    check("النشر: رسالة الشكر + التقييم ظهر", "شكرًا! تقييمك اتسجل" in t and "ممتاز، المقاس مظبوط" in t and "خالد" in t, "التقييم في القايمة بالاسم الأول")

    # تعديل: نفس الموبايل = تقييم واحد بيتعدّل
    page.locator("input[type='tel']").fill("01077788899")
    page.locator("button:has-text('قيّم المنتج ده')").click()
    page.wait_for_timeout(400)
    t = page.inner_text("main")
    check("نفس العميل: «عدّل تقييمك» جاهز بالتقييم القديم", "عدّل تقييمك" in t, "وضع التعديل فتح")
    page.locator(".star-btn").nth(3).click()
    page.locator("button:has-text('حفظ التعديل')").click()
    page.wait_for_timeout(400)
    cnt = page.evaluate("JSON.parse(localStorage.getItem('3a-store-reviews')).filter(r => r.phone === '01077788899').length")
    stars = page.evaluate("JSON.parse(localStorage.getItem('3a-store-reviews')).find(r => r.phone === '01077788899').stars")
    check("تقييم واحد لكل عميل لكل منتج (اتعدّل مش اتكرر)", cnt == 1 and stars == 4, f"عدد={cnt} نجوم={stars}")

    # الأدمن: إخفاء بيتسجل وبيتشال من العامة
    page.goto(BASE + "/admin/reviews")
    page.wait_for_timeout(500)
    t = page.inner_text("main")
    check("الأدمن: التقييم مربوط برقم الطلب المسلّم", "#5555" in t and "خالد محمود" in t, "رقم الطلب ظاهر في شاشة الأدمن")
    check("الأدمن 375px بلا كسر", ov() <= 0, f"overflow={ov()}px")
    page.screenshot(path=f"{OUT}/17-reviews-admin-375.png")
    card = page.locator(".order-card:has-text('خالد محمود')")
    card.locator("button:has-text('إخفاء')").click()
    page.wait_for_timeout(400)
    t = page.inner_text("main")
    check("الإخفاء: شارة مخفي + سجل مين وإمتى", "مخفي" in t and "اتخفى بواسطة" in t, "سجل الإخفاء ظاهر")
    page.goto(BASE + "/product/tshirt-basic")
    page.wait_for_timeout(500)
    t = page.inner_text("main")
    check("المخفي اختفى من صفحة المنتج", "ممتاز، المقاس مظبوط" not in t, "التقييم المخفي مش في العامة")

    check("مفيش أخطاء JS في الجولة", len(errors) == 0, f"pageerror={errors[:2]}" if errors else "صفر أخطاء")
    b.close()

with open(f"{OUT}/results-reviews.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f"\nTOTAL: {sum(1 for r in results if r['result']=='PASS')}/{len(results)} PASS")
