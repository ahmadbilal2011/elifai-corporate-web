#!/usr/bin/env python3
"""Lists every translatable string in index.html (text nodes and key attributes).
Usage: python3 scripts/i18n_extract.py > /tmp/strings.txt"""
import re, sys, json
from bs4 import BeautifulSoup, NavigableString, Comment

SKIP_TAGS = {"script", "style", "svg", "code", "pre"}
ATTRS = ["aria-label", "placeholder", "title", "alt"]

def norm(t):
    return re.sub(r"\s+", " ", t).strip()

def translatable(t):
    return bool(t) and re.search(r"[A-Za-z]", t) is not None

def strings(html):
    soup = BeautifulSoup(html, "html.parser")
    out = []
    for node in soup.find_all(string=True):
        if isinstance(node, Comment): continue
        if any(p.name in SKIP_TAGS for p in node.parents): continue
        if node.parent.name in ("title",) or True:
            t = norm(str(node))
            if translatable(t): out.append(t)
    for tag in soup.find_all(True):
        for a in ATTRS:
            v = tag.get(a)
            if v and translatable(norm(v)): out.append(norm(v))
    for m in soup.find_all("meta"):
        if m.get("name") in ("description",) or m.get("property") in ("og:title", "og:description"):
            out.append(norm(m.get("content", "")))
    seen, uniq = set(), []
    for s in out:
        if s not in seen: seen.add(s); uniq.append(s)
    return uniq

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "index.html"
    for s in strings(open(src, encoding="utf-8").read()):
        print(s)
