#!/bin/sh
# ينسخ الملف الأساسي إلى public/index.html (المجلد الذي تنشره Vercel)
mkdir -p public && cp portist_invoice.html public/index.html && echo "تم تحديث public/index.html — اعمل commit و push وVercel ينشر تلقائياً"
