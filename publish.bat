@echo off
if not exist public mkdir public
copy /Y portist_invoice.html public\index.html
echo تم تحديث public\index.html - اعمل commit و push
