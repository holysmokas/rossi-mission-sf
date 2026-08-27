#!/usr/bin/env python3
"""Restore the missing gtag.js loader and tag analytics scripts.

The 11 August restore inserted the inline gtag config but not the loader
that actually transmits, so window.gtag exists as a stub and nothing is
sent. Everything downstream of it no-ops silently.

Also adds data-analytics attributes so functions/_middleware.js can strip
the tags for datacenter traffic.
"""

import sys

PATH = "index.html"
src = open(PATH).read()

if "googletagmanager.com/gtag/js" in src:
    sys.exit("gtag.js loader already present — nothing to do")

OLD_ADS = """  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2379517169183719"
    crossorigin="anonymous"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());

    gtag('config', 'G-65W15WY07V', { send_page_view: false });
  </script>"""

NEW = """  <script async data-analytics
    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2379517169183719"
    crossorigin="anonymous"></script>

  <script async data-analytics
    src="https://www.googletagmanager.com/gtag/js?id=G-65W15WY07V"></script>
  <script data-analytics>
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());

    gtag('config', 'G-65W15WY07V', { send_page_view: false });
  </script>"""

n = src.count(OLD_ADS)
if n != 1:
    sys.exit(f"ABORT: anchor matched {n} times, expected 1")

open(PATH, "w").write(src.replace(OLD_ADS, NEW))
print("ok  gtag.js loader restored")
print("ok  data-analytics attributes added")
