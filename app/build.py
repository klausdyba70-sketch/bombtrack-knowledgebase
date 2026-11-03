"""Builds the app into one HTML file.

  python3 app/build.py            -> public/index.html  (Cloudflare version, uses src/shim.js)
  python3 app/build.py --claude   -> dist/claude.html   (Claude artifact version, no shim)
"""
import os, sys, subprocess, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = lambda *p: os.path.join(ROOT, *p)
read = lambda p: open(A(p), encoding="utf-8").read()

def version():
    try: h = subprocess.check_output(["git", "-C", ROOT, "rev-parse", "--short", "HEAD"], text=True).strip()
    except Exception: h = "local"
    t = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=1))).strftime("%d.%m.%Y %H:%M")
    return f"v {h} · {t}"
VERSION = os.environ.get("APP_VERSION") or version()

sys.path.insert(0, A("app")); import checks
checks.run(read("app/kb.json"))
kb = read("app/kb.json").replace("</", "<\\/")
body = (read("app/template.html")
        .replace("/*__ACADEMY__*/", read("app/academy.js"))
        .replace("/*__KB__*/{}", kb)
        .replace("/*__PASS__*/", "")
        .replace("/*__FONTS__*/", read("app/fonts.css"))
        .replace("/*__VERSION__*/", VERSION))

if "--claude" in sys.argv:
    os.makedirs(A("dist"), exist_ok=True)
    out, html = A("dist", "claude.html"), body
else:
    os.makedirs(A("public"), exist_ok=True)
    out = A("public", "index.html")
    html = ("<!doctype html><html lang=\"de\"><head><meta charset=\"utf-8\">"
            "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">"
            "<style>:root{box-sizing:border-box}*,*::before,*::after{box-sizing:inherit}"
            "body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>"
            "<script>" + read("src/shim.js") + "</script></head><body>" + body + "</body></html>")

open(out, "w", encoding="utf-8").write(html)
print(f"{out}: {len(html)//1024} KB")
