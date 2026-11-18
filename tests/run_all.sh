#!/usr/bin/env bash
# تشغيل كل الاختبارات:  bash tests/run_all.sh
# المتطلبات: node, python3 + playwright (pip install playwright && playwright install chromium)
cd "$(dirname "$0")"; fail=0
echo "== server (Code.gs mock)"; node gstest.js | grep -E "FAIL" && fail=1
echo "== API Postgres (PGlite)"; node api.test.js | grep -E "FAIL" && fail=1
for t in a7 a8 t13 t14 t17 t18 t19 t20 t21 t24 t25 t26; do echo "== $t"; python3 $t.py 2>&1 | tee /tmp/_t.log | grep -E "FAIL|Traceback|Error" && fail=1; done
node gsrv.js >/dev/null 2>&1 & S=$!; sleep 1
for t in e1 e2; do echo "== $t (cloud, two devices)"; python3 $t.py 2>&1 | tee /tmp/_t.log | grep -E "FAIL|Traceback|Error" && fail=1; pkill -f gsrv.js; node gsrv.js >/dev/null 2>&1 & S=$!; sleep 1; done
kill $S 2>/dev/null
PORT=8790 APP_PASSWORD=k node devserver.js >/dev/null 2>&1 & D=$!; sleep 3
echo "== e3 (Postgres, two browsers)"; python3 e3.py 2>&1 | tee /tmp/_t.log | grep -E "FAIL|Traceback|Error" && fail=1
kill $D 2>/dev/null
[ $fail = 0 ] && echo "ALL OK" || { echo "SOME FAILED"; exit 1; }
