#!/usr/bin/env bash
# تشغيل كل الاختبارات:  bash tests/run_all.sh
# المتطلبات: node, python3 + playwright (pip install playwright && playwright install chromium)
cd "$(dirname "$0")"; fail=0
echo "== build (المصادر ↔ الملف المبني)"; node ../tools/build.js --check || fail=1
echo "== server (Code.gs mock)"; node gstest.js | grep -E "FAIL" && fail=1
echo "== API Postgres (PGlite)"; node api.test.js | grep -E "FAIL" && fail=1
for t in a7 a8 t13 t14 t17 t18 t19 t20 t21 t24 t25 t26 t27 t28 t29 t30 t31 t32 t33 t34 t35 t36 t37 t38 t39 t40 t41 t42 t43 t44 t45 t46; do echo "== $t"; python3 $t.py 2>&1 | tee /tmp/_t.log | grep -E "FAIL|Traceback|Error" && fail=1; done
node gsrv.js >/dev/null 2>&1 & S=$!; sleep 1
for t in e1 e2; do echo "== $t (cloud, two devices)"; python3 $t.py 2>&1 | tee /tmp/_t.log | grep -E "FAIL|Traceback|Error" && fail=1; pkill -f gsrv.js; node gsrv.js >/dev/null 2>&1 & S=$!; sleep 1; done
kill $S 2>/dev/null; pkill -f gsrv.js; sleep 1
PORT=8790 APP_PASSWORD=k node devserver.js >/dev/null 2>&1 & D=$!; sleep 3
echo "== e3 (Postgres, two browsers)"; python3 e3.py 2>&1 | tee /tmp/_t.log | grep -E "FAIL|Traceback|Error" && fail=1
kill $D 2>/dev/null
PORT=8790 APP_PASSWORD=k node devserver.js >/dev/null 2>&1 & D=$!; sleep 3
echo "== t47 (photos)"; python3 t47.py 2>&1 | tee /tmp/_t.log | grep -E "FAIL|Traceback|Error" && fail=1
kill $D 2>/dev/null
PORT=8790 APP_PASSWORD=k node devserver.js >/dev/null 2>&1 & D=$!; sleep 3
echo "== t48 (export stock)"; python3 t48.py 2>&1 | tee /tmp/_t.log | grep -E "FAIL|Traceback|Error" && fail=1
kill $D 2>/dev/null
PORT=8790 APP_PASSWORD=k node devserver.js >/dev/null 2>&1 & D=$!; sleep 3
echo "== t49 (export stock in backup)"; python3 t49.py 2>&1 | tee /tmp/_t.log | grep -E "FAIL|Traceback|Error" && fail=1
kill $D 2>/dev/null
PORT=8790 APP_PASSWORD=k node devserver.js >/dev/null 2>&1 & D=$!; sleep 3
echo "== t50 (save conflicts)"; python3 t50.py 2>&1 | tee /tmp/_t.log | grep -E "FAIL|Traceback|Error" && fail=1
kill $D 2>/dev/null
[ $fail = 0 ] && echo "ALL OK" || { echo "SOME FAILED"; exit 1; }
