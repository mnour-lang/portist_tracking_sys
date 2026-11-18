# Portist Lojistik — نظام الفواتير والشحنات

تطبيق HTML واحد (عربي RTL): الشحنات والحمولات، الفواتير، وصولات الاستلام والدفعات، دليل العملاء وكشوف الحساب،
تسليم الحمولات، التكاليف والربحية، المستخدمون والصلاحيات، نسخ احتياطي، وربط اختياري مع Google Sheets.

## الملفات
| الملف | الوظيفة |
|---|---|
| `portist_invoice.html` | التطبيق كاملاً (الملف الأساسي الذي يُعدَّل) |
| `Code.gs` | سيرفر Google Apps Script (اختياري، للربط مع Sheets) |
| `publish.sh` / `publish.bat` | يولّد `index.html` للاستضافة (غير محفوظ في Git) |
| `archive/` | نسخة «البراء» القديمة، للأرشيف فقط |

## التشغيل
افتح `portist_invoice.html` في المتصفح. البيانات تُحفظ في المتصفح (localStorage) على هذا الجهاز.

## النشر
1. شغّل `publish.sh` (أو `publish.bat` على ويندوز) لتوليد `index.html`.
2. ارفع `index.html` إلى الاستضافة.
3. عند تغيير `Code.gs` انسخه إلى Apps Script وأعد نشره (Deploy ← New version).

## سير العمل مع Git
- بعد كل تعديل: `git add -A && git commit -m "وصف التعديل"`
- للنسخ المستقرة: `git tag vNN` (آخر نسخة منشورة: v41)
- للرجوع لنسخة: `git checkout v41 -- portist_invoice.html`

## تنبيهات
- لا تضع في المخزن ملفات النسخ الاحتياطي المصدَّرة (`*.json`): فيها بيانات العملاء ورابط Sheets وكلمته.
- إن رفعت المخزن إلى GitHub فليكن **Private**.
- القفل والصلاحيات داخل الملف لا تمنع مستخدماً تقنياً؛ للحماية الفعلية فعّل Google Sheets.

## الاختبارات
`bash tests/run_all.sh` — يشغّل اختبارات السيرفر (محاكاة Code.gs) واختبارات المتصفح (Playwright) واختبار جهازين متصلين بالسيرفر المحاكى.
المتطلبات: node و python3 و `pip install playwright && playwright install chromium`. شغّلها قبل كل إصدار.

## النشر على Vercel
- المشروع صفحة ثابتة: الملف المنشور هو `public/index.html` (نسخة من `portist_invoice.html`، يولّدها `publish.sh`/`publish.bat`).
- إعدادات Vercel: Framework = Other، Build Command فارغ، Output Directory = `public` (مضبوطة في `vercel.json`).
- بعد كل تعديل: شغّل `sh publish.sh` ثم commit و push.

## قاعدة البيانات على Vercel (Postgres / Neon)
البنية: الواجهة ثابتة في `public/`، والخادم دالة واحدة `api/index.js` (منطقها في `lib/core.js`) فوق Postgres. نفس بروتوكول Code.gs، فلا تتغير الواجهة.

إعداد مرة واحدة:
1. في مشروع Vercel: Storage ← Create Database ← Neon (Postgres) ← اربطها بالمشروع. يضيف Vercel المتغير `DATABASE_URL` تلقائياً.
2. Settings ← Environment Variables ← أضف `APP_PASSWORD` بقيمة كلمة سر الربط (طويلة وعشوائية). اختيارياً `PEPPER` (نص سري طويل) وإلا يُولَّد ويُحفظ في القاعدة.
3. Redeploy. الجداول تُنشأ تلقائياً عند أول طلب.
4. افتح الموقع على جهاز: يُعبَّأ رابط الخادم `/api` تلقائياً. أنشئ حساب المدير واكتب كلمة سر الربط في قسم «جهاز جديد؟…» قبل الضغط على «إنشاء».
5. من أي جهاز آخر: افتح الموقع ← «جهاز جديد؟» ← كلمة سر الربط + اسم الدخول + كلمة السر.

تشغيل محلي للتجربة: `npm install` ثم `PORT=8790 APP_PASSWORD=k node tests/devserver.js` (قاعدة في الذاكرة).
