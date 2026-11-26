"""تحقق حي — دفعة 10: السلة المتروكة (حزمة P1-ب) على 375px."""
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
    ctx = b.new_context(viewport={"width": 375, "height": 667}, locale="ar-EG")
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    ov = lambda: page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")

    page.goto(BASE + "/admin/abandoned")
    page.wait_for_timeout(600)
    t = page.inner_text("main")
    check("القايمة: 5 سلال بأسماء العملاء", all(x in t for x in ["سارة أحمد", "محمد علي", "نورهان سامي", "منى حسن", "كريم وليد"]), "الخمسة ظاهرين")
    check("المدة بالمصري «من ٣ ساعات»", "من ٣ ساعات" in t, "مدة أول سلة ظاهرة")
    check("سلة 8 أيام = مقفولة تلقائيًا", "مقفولة" in t and "٧ أيام" in t, "شارة + سبب الإغلاق التلقائي")
    check("سلة محوّلة = «رجعت واشترت»", "رجعت واشترت" in t, "شارة التحويل ظاهرة")
    check("إجمالي كل سلة ظاهر", "إجمالي السلة" in t and "848" in t, "إجمالي أول سلة 848 ج")
    check("375px بلا كسر", ov() <= 0, f"overflow={ov()}px")
    page.screenshot(path=f"{OUT}/15-abandoned-375.png")

    # رابط التذكير: wa.me + نص جاهز باسم العميلة
    link = page.locator("a:has-text('ذكّرها واتساب')").first
    href = link.get_attribute("href")
    import urllib.parse
    decoded = urllib.parse.unquote(href or "")
    check("رابط واتساب دولي + رسالة جاهزة بالاسم", href.startswith("https://wa.me/201098765432") and "سارة أحمد" in decoded and "سلتك لسه مستنياك" in decoded, f"href={href[:60]}…")

    # الضغط على التذكير = بيتسجل وبيتقفل
    with ctx.expect_page() as new_page_info:
        link.click()
    new_page = new_page_info.value
    new_page.wait_for_timeout(500)
    new_page.close()
    page.wait_for_timeout(400)
    t = page.inner_text("main")
    check("بعد التذكير: الحالة «اتبعت تذكير» والزرار اختفى", "اتبعت تذكير" in t and "الزرار مقفول" in t, "أول سلة اتقفل تذكيرها")

    # الاستمرارية بعد إعادة التحميل
    page.reload()
    page.wait_for_timeout(500)
    t = page.inner_text("main")
    check("التذكير محفوظ بعد إعادة التحميل", "اتبعت تذكير" in t, "الحالة ثابتة من التخزين المحلي")
    n_links = page.locator("a:has-text('ذكّرها واتساب')").count()
    check("زرار التذكير فاضل للسلال الجديدة بس", n_links == 2, f"أزرار باقية={n_links} (محمد + نورهان)")

    # فلتر الحالات
    page.locator("button:has-text('مقفولة')").click()
    page.wait_for_timeout(300)
    t = page.inner_text("main")
    check("فلتر «مقفولة» بيوري المقفولة بس", "كريم وليد" in t and "سارة أحمد" not in t, "الفلتر شغال")

    check("مفيش أخطاء JS في الجولة", len(errors) == 0, f"pageerror={errors[:2]}" if errors else "صفر أخطاء")
    b.close()

with open(f"{OUT}/results-abandoned.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f"\nTOTAL: {sum(1 for r in results if r['result']=='PASS')}/{len(results)} PASS")
