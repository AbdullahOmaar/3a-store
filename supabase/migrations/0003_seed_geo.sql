-- متجر 3A — دفعة 2ج: بذرة بداية للشحن والمدن (نفس قيم الواجهة المحلية)
-- قيم بداية للعرض فقط — الأدمن بيظبط الأسعار النهائية من لوحة التحكم قبل البيع الفعلي.

update public.governorates set shipping_fee = 50, delivery_days_min = 1, delivery_days_max = 2 where name_ar = 'القاهرة';
update public.governorates set shipping_fee = 50, delivery_days_min = 1, delivery_days_max = 2 where name_ar = 'الجيزة';
update public.governorates set shipping_fee = 60, delivery_days_min = 2, delivery_days_max = 3 where name_ar = 'الإسكندرية';
update public.governorates set shipping_fee = 65, delivery_days_min = 2, delivery_days_max = 4 where name_ar = 'الدقهلية';
update public.governorates set shipping_fee = 90, delivery_days_min = 3, delivery_days_max = 5 where name_ar = 'البحر الأحمر';
update public.governorates set shipping_fee = 65, delivery_days_min = 2, delivery_days_max = 4 where name_ar = 'البحيرة';
update public.governorates set shipping_fee = 70, delivery_days_min = 2, delivery_days_max = 4 where name_ar = 'الفيوم';
update public.governorates set shipping_fee = 65, delivery_days_min = 2, delivery_days_max = 4 where name_ar = 'الغربية';
update public.governorates set shipping_fee = 70, delivery_days_min = 2, delivery_days_max = 4 where name_ar = 'الإسماعيلية';
update public.governorates set shipping_fee = 65, delivery_days_min = 2, delivery_days_max = 4 where name_ar = 'المنوفية';
update public.governorates set shipping_fee = 75, delivery_days_min = 3, delivery_days_max = 5 where name_ar = 'المنيا';
update public.governorates set shipping_fee = 55, delivery_days_min = 1, delivery_days_max = 3 where name_ar = 'القليوبية';
update public.governorates set shipping_fee = 110, delivery_days_min = 4, delivery_days_max = 6 where name_ar = 'الوادي الجديد';
update public.governorates set shipping_fee = 70, delivery_days_min = 2, delivery_days_max = 4 where name_ar = 'السويس';
update public.governorates set shipping_fee = 95, delivery_days_min = 3, delivery_days_max = 5 where name_ar = 'أسوان';
update public.governorates set shipping_fee = 80, delivery_days_min = 3, delivery_days_max = 5 where name_ar = 'أسيوط';
update public.governorates set shipping_fee = 70, delivery_days_min = 2, delivery_days_max = 4 where name_ar = 'بني سويف';
update public.governorates set shipping_fee = 70, delivery_days_min = 2, delivery_days_max = 4 where name_ar = 'بورسعيد';
update public.governorates set shipping_fee = 70, delivery_days_min = 2, delivery_days_max = 4 where name_ar = 'دمياط';
update public.governorates set shipping_fee = 65, delivery_days_min = 2, delivery_days_max = 4 where name_ar = 'الشرقية';
update public.governorates set shipping_fee = 100, delivery_days_min = 3, delivery_days_max = 5 where name_ar = 'جنوب سيناء';
update public.governorates set shipping_fee = 65, delivery_days_min = 2, delivery_days_max = 4 where name_ar = 'كفر الشيخ';
update public.governorates set shipping_fee = 95, delivery_days_min = 3, delivery_days_max = 5 where name_ar = 'مطروح';
update public.governorates set shipping_fee = 90, delivery_days_min = 3, delivery_days_max = 5 where name_ar = 'الأقصر';
update public.governorates set shipping_fee = 85, delivery_days_min = 3, delivery_days_max = 5 where name_ar = 'قنا';
update public.governorates set shipping_fee = 100, delivery_days_min = 3, delivery_days_max = 5 where name_ar = 'شمال سيناء';
update public.governorates set shipping_fee = 85, delivery_days_min = 3, delivery_days_max = 5 where name_ar = 'سوهاج';

insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'القاهرة'), 'مدينة نصر'),
  ((select id from public.governorates where name_ar = 'القاهرة'), 'مصر الجديدة'),
  ((select id from public.governorates where name_ar = 'القاهرة'), 'المعادي'),
  ((select id from public.governorates where name_ar = 'القاهرة'), 'شبرا'),
  ((select id from public.governorates where name_ar = 'القاهرة'), 'حلوان'),
  ((select id from public.governorates where name_ar = 'القاهرة'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'الجيزة'), 'الدقي'),
  ((select id from public.governorates where name_ar = 'الجيزة'), 'المهندسين'),
  ((select id from public.governorates where name_ar = 'الجيزة'), 'الهرم'),
  ((select id from public.governorates where name_ar = 'الجيزة'), 'فيصل'),
  ((select id from public.governorates where name_ar = 'الجيزة'), '٦ أكتوبر'),
  ((select id from public.governorates where name_ar = 'الجيزة'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'الإسكندرية'), 'سموحة'),
  ((select id from public.governorates where name_ar = 'الإسكندرية'), 'المنتزه'),
  ((select id from public.governorates where name_ar = 'الإسكندرية'), 'محرم بك'),
  ((select id from public.governorates where name_ar = 'الإسكندرية'), 'العجمي'),
  ((select id from public.governorates where name_ar = 'الإسكندرية'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'الدقهلية'), 'المنصورة'),
  ((select id from public.governorates where name_ar = 'الدقهلية'), 'طلخا'),
  ((select id from public.governorates where name_ar = 'الدقهلية'), 'ميت غمر'),
  ((select id from public.governorates where name_ar = 'الدقهلية'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'البحر الأحمر'), 'الغردقة'),
  ((select id from public.governorates where name_ar = 'البحر الأحمر'), 'سفاجا'),
  ((select id from public.governorates where name_ar = 'البحر الأحمر'), 'القصير'),
  ((select id from public.governorates where name_ar = 'البحر الأحمر'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'البحيرة'), 'دمنهور'),
  ((select id from public.governorates where name_ar = 'البحيرة'), 'كفر الدوار'),
  ((select id from public.governorates where name_ar = 'البحيرة'), 'رشيد'),
  ((select id from public.governorates where name_ar = 'البحيرة'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'الفيوم'), 'الفيوم'),
  ((select id from public.governorates where name_ar = 'الفيوم'), 'سنورس'),
  ((select id from public.governorates where name_ar = 'الفيوم'), 'إطسا'),
  ((select id from public.governorates where name_ar = 'الفيوم'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'الغربية'), 'طنطا'),
  ((select id from public.governorates where name_ar = 'الغربية'), 'المحلة الكبرى'),
  ((select id from public.governorates where name_ar = 'الغربية'), 'زفتى'),
  ((select id from public.governorates where name_ar = 'الغربية'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'الإسماعيلية'), 'الإسماعيلية'),
  ((select id from public.governorates where name_ar = 'الإسماعيلية'), 'فايد'),
  ((select id from public.governorates where name_ar = 'الإسماعيلية'), 'القنطرة'),
  ((select id from public.governorates where name_ar = 'الإسماعيلية'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'المنوفية'), 'شبين الكوم'),
  ((select id from public.governorates where name_ar = 'المنوفية'), 'منوف'),
  ((select id from public.governorates where name_ar = 'المنوفية'), 'أشمون'),
  ((select id from public.governorates where name_ar = 'المنوفية'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'المنيا'), 'المنيا'),
  ((select id from public.governorates where name_ar = 'المنيا'), 'ملوي'),
  ((select id from public.governorates where name_ar = 'المنيا'), 'سمالوط'),
  ((select id from public.governorates where name_ar = 'المنيا'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'القليوبية'), 'بنها'),
  ((select id from public.governorates where name_ar = 'القليوبية'), 'شبرا الخيمة'),
  ((select id from public.governorates where name_ar = 'القليوبية'), 'قليوب'),
  ((select id from public.governorates where name_ar = 'القليوبية'), 'العبور'),
  ((select id from public.governorates where name_ar = 'القليوبية'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'الوادي الجديد'), 'الخارجة'),
  ((select id from public.governorates where name_ar = 'الوادي الجديد'), 'الداخلة'),
  ((select id from public.governorates where name_ar = 'الوادي الجديد'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'السويس'), 'السويس'),
  ((select id from public.governorates where name_ar = 'السويس'), 'الأربعين'),
  ((select id from public.governorates where name_ar = 'السويس'), 'فيصل'),
  ((select id from public.governorates where name_ar = 'السويس'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'أسوان'), 'أسوان'),
  ((select id from public.governorates where name_ar = 'أسوان'), 'كوم أمبو'),
  ((select id from public.governorates where name_ar = 'أسوان'), 'إدفو'),
  ((select id from public.governorates where name_ar = 'أسوان'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'أسيوط'), 'أسيوط'),
  ((select id from public.governorates where name_ar = 'أسيوط'), 'ديروط'),
  ((select id from public.governorates where name_ar = 'أسيوط'), 'منفلوط'),
  ((select id from public.governorates where name_ar = 'أسيوط'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'بني سويف'), 'بني سويف'),
  ((select id from public.governorates where name_ar = 'بني سويف'), 'الواسطى'),
  ((select id from public.governorates where name_ar = 'بني سويف'), 'ناصر'),
  ((select id from public.governorates where name_ar = 'بني سويف'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'بورسعيد'), 'بورسعيد'),
  ((select id from public.governorates where name_ar = 'بورسعيد'), 'بورفؤاد'),
  ((select id from public.governorates where name_ar = 'بورسعيد'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'دمياط'), 'دمياط'),
  ((select id from public.governorates where name_ar = 'دمياط'), 'دمياط الجديدة'),
  ((select id from public.governorates where name_ar = 'دمياط'), 'رأس البر'),
  ((select id from public.governorates where name_ar = 'دمياط'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'الشرقية'), 'الزقازيق'),
  ((select id from public.governorates where name_ar = 'الشرقية'), 'العاشر من رمضان'),
  ((select id from public.governorates where name_ar = 'الشرقية'), 'بلبيس'),
  ((select id from public.governorates where name_ar = 'الشرقية'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'جنوب سيناء'), 'شرم الشيخ'),
  ((select id from public.governorates where name_ar = 'جنوب سيناء'), 'دهب'),
  ((select id from public.governorates where name_ar = 'جنوب سيناء'), 'الطور'),
  ((select id from public.governorates where name_ar = 'جنوب سيناء'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'كفر الشيخ'), 'كفر الشيخ'),
  ((select id from public.governorates where name_ar = 'كفر الشيخ'), 'دسوق'),
  ((select id from public.governorates where name_ar = 'كفر الشيخ'), 'بلطيم'),
  ((select id from public.governorates where name_ar = 'كفر الشيخ'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'مطروح'), 'مرسى مطروح'),
  ((select id from public.governorates where name_ar = 'مطروح'), 'العلمين'),
  ((select id from public.governorates where name_ar = 'مطروح'), 'الحمام'),
  ((select id from public.governorates where name_ar = 'مطروح'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'الأقصر'), 'الأقصر'),
  ((select id from public.governorates where name_ar = 'الأقصر'), 'إسنا'),
  ((select id from public.governorates where name_ar = 'الأقصر'), 'أرمنت'),
  ((select id from public.governorates where name_ar = 'الأقصر'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'قنا'), 'قنا'),
  ((select id from public.governorates where name_ar = 'قنا'), 'نجع حمادي'),
  ((select id from public.governorates where name_ar = 'قنا'), 'قفط'),
  ((select id from public.governorates where name_ar = 'قنا'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'شمال سيناء'), 'العريش'),
  ((select id from public.governorates where name_ar = 'شمال سيناء'), 'الشيخ زويد'),
  ((select id from public.governorates where name_ar = 'شمال سيناء'), 'بئر العبد'),
  ((select id from public.governorates where name_ar = 'شمال سيناء'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;
insert into public.cities (governorate_id, name_ar) values
  ((select id from public.governorates where name_ar = 'سوهاج'), 'سوهاج'),
  ((select id from public.governorates where name_ar = 'سوهاج'), 'أخميم'),
  ((select id from public.governorates where name_ar = 'سوهاج'), 'جرجا'),
  ((select id from public.governorates where name_ar = 'سوهاج'), 'أخرى')
on conflict (governorate_id, name_ar) do nothing;

update public.store_settings set value = '1000'::jsonb where key = 'free_shipping_threshold';
