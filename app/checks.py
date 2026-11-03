"""Data checks that run with every build (python3 app/build.py).

They never stop the build; they print warnings so a data sync (new website data, new catalog,
new model year) shows right away what the app's tools can't use yet.

Spoke calculator: its presets come straight from each bike's "Wheels" data (ERD per size group,
spoke count, hub PCD, flange distance/offset, Bombtrack's published spoke lengths). After a sync
this check recalculates every preset and compares it with Bombtrack's published lengths.
"""
import json, math, re

def nums(s):
    return [float(x) for x in re.findall(r"\d+(?:[.,]\d+)?", str(s or "").replace(",", "."))]

def groups(s):
    out = []
    for part in re.split(r"\s*\|\s*|\s+/\s+(?=[A-Z]{1,3}\b)", str(s or "")):
        m = re.match(r"^\s*([A-Z]{1,3}(?:\s*-\s*[A-Z]{1,3})?)?\s*(.*)$", part.strip())
        v = nums(m.group(2)) if m else []
        lab = (m.group(1) or "").replace(" ", "") if m else ""
        ab = lab.split("-")
        if len(ab) == 2 and ab[0] == ab[1]: lab = ab[0]
        if v: out.append((lab, v))
    return out

def spoke_len(erd, pcd, d, n, x, hole=2.4):
    a = math.radians(720 * x / n); r1, r2 = erd / 2, pcd / 2
    return math.sqrt(d * d + r1 * r1 + r2 * r2 - 2 * r1 * r2 * math.cos(a)) - hole / 2

def wheels(p):
    w = ((p.get("en") or {}).get("x") or {}).get("Wheels") or {}
    return {re.sub(r"[\s|]+", " ", k).replace("flangedistance", "flange distance"): v for k, v in w.items()}

def check_spokes(kb):
    warn, ok = [], 0
    for p in kb["products"]:
        if p.get("k") != "bike": continue
        w = wheels(p)
        if not w: continue
        if not w.get("ERD"):
            warn.append(f"{p['t']}: wheel data without ERD, not offered as spoke preset"); continue
        erd = groups(w["ERD"])
        if not erd:
            warn.append(f"{p['t']}: ERD '{w['ERD']}' could not be read"); continue
        cnt = nums(w.get("Spoke count (front / rear)") or "")
        for end, i in (("front", 0), ("rear", 1)):
            n = int(cnt[i] if len(cnt) > i else (cnt[0] if cnt else 32))
            pcd = nums(w.get(f"{end.capitalize()} hub PCD") or "")
            fl = nums(w.get(f"{end.capitalize()} hub flange distance / offset") or "")
            if not pcd or not fl:
                warn.append(f"{p['t']} {end}: hub PCD or flange distance missing, preset uses defaults"); continue
            cc, off = fl[0], (fl[1] if len(fl) > 1 else 0)
            dL, dR = cc / 2 + off, cc / 2 - off
            pub = groups(w.get(f"Spoke length {end} wheel") or "")
            for lab, v in erd:
                x = 2 if n <= 24 else 3
                e = v[i] if (len(erd) == 1 and not lab and len(v) == 2) else v[0]   # "380 mm / 563 mm" = front / rear
                calc = sorted([spoke_len(e, pcd[0], dL, n, x), spoke_len(e, pcd[0], dR, n, x)])
                pg = next((g for g in pub if g[0] == lab), None)
                if not pg:
                    if pub: warn.append(f"{p['t']} {end} {lab or 'all sizes'}: no published spoke length for this size group")
                    continue
                ps = sorted(pg[1])
                if len(ps) >= 2 and max(abs(calc[0] - ps[0]), abs(calc[1] - ps[-1])) > 3:
                    warn.append(f"{p['t']} {end} {lab}: calculated {calc[0]:.1f}/{calc[1]:.1f} mm vs published {'/'.join(f'{x:g}' for x in ps)} mm, check the data")
                else: ok += 1
    return ok, warn

def run(kb_text):
    try: kb = json.loads(kb_text)
    except Exception as e:
        print("checks: kb.json could not be read:", e); return
    ok, warn = check_spokes(kb)
    print(f"checks: spoke presets ok for {ok} wheel/size groups, {len(warn)} warning(s)")
    for w in warn[:40]: print("  ! " + w)
    if len(warn) > 40: print(f"  … and {len(warn) - 40} more")
