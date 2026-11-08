#!/usr/bin/env python3
"""
Builds the Arabic site (ar/index.html) from the English index.html.

The Arabic page is the same page as the English one, same sections, scripts,
animations and layout, with the text swapped from i18n/ar.json and the
document switched to right-to-left. Re-run after every change to index.html:

    python3 scripts/build-ar.py

Strings missing from i18n/ar.json are listed so they can be translated;
product names, code and console data are intentionally left in English.
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "index.html"
OUT = ROOT / "ar" / "index.html"
DICT = json.loads((ROOT / "i18n" / "ar.json").read_text(encoding="utf-8"))

SKIP = {"script", "style", "svg", "pre", "code"}
ATTRS = ("aria-label", "placeholder", "title", "alt")


def norm(t: str) -> str:
    return re.sub(r"\s+", " ", t).strip()


def tr(text: str):
    """Translate a raw (possibly entity-escaped) text chunk, keeping surrounding whitespace."""
    plain = html.unescape(text)
    key = norm(plain)
    if not key or key not in DICT:
        return None
    lead = re.match(r"^\s*", plain).group(0)
    trail = re.search(r"\s*$", plain).group(0)
    return lead + html.escape(DICT[key], quote=False) + trail


def translate_attrs(tag: str) -> str:
    def sub(m):
        name, val = m.group(1), m.group(2)
        key = norm(html.unescape(val))
        if key in DICT:
            return f'{name}="{html.escape(DICT[key], quote=True)}"'
        return m.group(0)
    return re.sub(r'\b(' + "|".join(ATTRS) + r')="([^"]*)"', sub, tag)


def translate_body(src: str):
    parts = re.split(r"(<[^>]+>)", src)
    out, stack, missing = [], [], set()
    for part in parts:
        if part.startswith("<"):
            m = re.match(r"<\s*(/)?\s*([a-zA-Z0-9-]+)", part)
            if m:
                closing, name = m.group(1), m.group(2).lower()
                self_closing = part.endswith("/>")
                if name in SKIP and not closing and not self_closing:
                    stack.append(name)
                elif name in SKIP and closing and stack and stack[-1] == name:
                    stack.pop()
            if not stack and not part.startswith("<!") and not part.startswith("</"):
                part = translate_attrs(part)
            out.append(part)
            continue
        if stack or not re.search(r"[A-Za-z]", part):
            out.append(part)
            continue
        t = tr(part)
        if t is None:
            missing.add(norm(html.unescape(part)))
            out.append(part)
        else:
            out.append(t)
    return "".join(out), missing


def head_fixes(s: str) -> str:
    s = s.replace('<html lang="en" dir="ltr"', '<html lang="ar" dir="rtl"', 1)
    s = s.replace('<link rel="canonical" href="https://elifai.pk/">', '<link rel="canonical" href="https://elifai.pk/ar/">', 1)
    s = s.replace('<meta property="og:url" content="https://elifai.pk/">', '<meta property="og:url" content="https://elifai.pk/ar/">', 1)
    s = s.replace('<meta property="og:locale" content="en_GB">', '<meta property="og:locale" content="ar_SA">', 1)
    s = s.replace('<meta property="og:locale:alternate" content="ar_SA">', '<meta property="og:locale:alternate" content="en_GB">', 1)
    # meta content strings
    for prop in ('name="description"', 'property="og:title"', 'property="og:description"'):
        m = re.search(r'<meta ' + re.escape(prop) + r' content="([^"]*)">', s)
        if m:
            key = norm(html.unescape(m.group(1)))
            if key in DICT:
                s = s.replace(m.group(0), f'<meta {prop} content="{html.escape(DICT[key], quote=True)}">', 1)
    # title
    m = re.search(r"<title>(.*?)</title>", s, re.S)
    if m and norm(html.unescape(m.group(1))) in DICT:
        s = s.replace(m.group(0), f"<title>{html.escape(DICT[norm(html.unescape(m.group(1)))], quote=False)}</title>", 1)
    # Arabic web font
    s = s.replace("family=Red+Hat+Display", "family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&amp;family=Red+Hat+Display", 1)
    return s


def jsonld_fixes(s: str) -> str:
    """Translate the FAQ schema to match the visible Arabic FAQ; drop the English service list."""
    def fix(m):
        try:
            data = json.loads(m.group(1))
        except json.JSONDecodeError:
            return m.group(0)
        t = data.get("@type")
        if t == "ItemList":
            return ""
        if t == "FAQPage":
            for q in data.get("mainEntity", []):
                q["name"] = DICT.get(q["name"], q["name"])
                a = q.get("acceptedAnswer", {})
                a["text"] = DICT.get(a.get("text", ""), a.get("text", ""))
            data["inLanguage"] = "ar"
        if t == "ProfessionalService":
            data["url"] = "https://elifai.pk/ar/"
            data["inLanguage"] = "ar"
        return '<script type="application/ld+json">\n  ' + json.dumps(data, ensure_ascii=False) + "\n  </script>"
    return re.sub(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', fix, s, flags=re.S)


def link_fixes(s: str) -> str:
    s = s.replace(
        '<a class="lang-link" href="/ar/" hreflang="ar" lang="ar" aria-label="النسخة العربية">عربي</a>',
        '<a class="lang-link" href="/" hreflang="en" lang="en" aria-label="English version">English</a>', 1)
    s = s.replace('<li><a href="/ar/" hreflang="ar" lang="ar">العربية</a></li>',
                  '<li><a href="/" hreflang="en" lang="en">English</a></li>', 1)
    # keep the brand link on the Arabic home
    s = s.replace('<a class="brand" href="/"', '<a class="brand" href="/ar/"')
    # form posts back to the Arabic page when JavaScript is off
    s = s.replace('action="/contact.php"', 'action="/contact.php?lang=ar"', 1)
    return s


def main():
    src = SRC.read_text(encoding="utf-8")
    head_end = src.index("</head>")
    head, body = src[:head_end], src[head_end:]
    head = jsonld_fixes(head_fixes(head))
    body, missing = translate_body(body)
    out = link_fixes(head + body)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(out, encoding="utf-8")
    keep_en = re.compile(r"^[\w.+#/:%·&()\-–, ]*$")
    real_missing = sorted(m for m in missing if m and not keep_en.match(m) or (m and " " in m and m[0].islower()))
    print(f"Wrote {OUT.relative_to(ROOT)}")
    if real_missing:
        print(f"{len(real_missing)} strings left in English (add to i18n/ar.json if they should be translated):")
        for m in real_missing:
            print("  -", m)


if __name__ == "__main__":
    sys.exit(main())
