#!/usr/bin/env python3
"""Wire GA4 route tracking and ecommerce events into the Rossi storefront.

Every edit asserts its anchor matches exactly once. Idempotent: re-running
after a successful run exits cleanly with nothing to do.
"""

import os
import sys

edits = []
skipped = []


def patch(path, old, new, label):
    if not os.path.exists(path):
        sys.exit(f"ABORT [{label}]: {path} not found")
    src = open(path).read()
    if new in src:
        skipped.append(f"{label} (already applied)")
        return
    n = src.count(old)
    if n != 1:
        sys.exit(f"ABORT [{label}]: anchor matched {n} times in {path}, expected 1")
    open(path, "w").write(src.replace(old, new))
    edits.append(label)


patch(
    "index.html",
    "    gtag('config', 'G-65W15WY07V');",
    "    gtag('config', 'G-65W15WY07V', { send_page_view: false });",
    "index.html/manual-pageviews",
)

patch(
    "src/App.jsx",
    "import OrderSuccess from './pages/OrderSuccess'",
    "import OrderSuccess from './pages/OrderSuccess'\nimport RouteTracker from './components/RouteTracker'",
    "App.jsx/import",
)

patch(
    "src/App.jsx",
    "      <BrowserRouter>\n        <Routes>",
    "      <BrowserRouter>\n        <RouteTracker />\n        <Routes>",
    "App.jsx/mount",
)

patch(
    "src/context/CartContext.jsx",
    "import { createContext, useContext, useState, useEffect } from 'react'",
    "import { createContext, useContext, useState, useEffect } from 'react'\nimport { trackAddToCart } from '../lib/analytics'",
    "CartContext/import",
)

patch(
    "src/context/CartContext.jsx",
    """  function addItem(product, size = null) {
    setItems(prev => {""",
    """  function addItem(product, size = null) {
    trackAddToCart(product, size)
    setItems(prev => {""",
    "CartContext/add_to_cart",
)

patch(
    "src/components/CartDrawer.jsx",
    "import { useCart } from '../context/CartContext'",
    "import { useCart } from '../context/CartContext'\nimport { trackBeginCheckout } from '../lib/analytics'",
    "CartDrawer/import",
)

patch(
    "src/components/CartDrawer.jsx",
    """    if (!items.length) return
    setSubmitting(true)
    setError(null)""",
    """    if (!items.length) return
    setSubmitting(true)
    setError(null)
    trackBeginCheckout(items, total)""",
    "CartDrawer/begin_checkout",
)

patch(
    "src/pages/OrderSuccess.jsx",
    "import { useEffect, useState } from 'react'",
    "import { useEffect, useState } from 'react'\nimport { trackPurchase } from '../lib/analytics'",
    "OrderSuccess/import",
)

patch(
    "src/pages/OrderSuccess.jsx",
    """                        if (data?.status === 'paid') {
                            setStatus('confirmed')
                            return
                        }""",
    """                        if (data?.status === 'paid') {
                            trackPurchase(data)
                            setStatus('confirmed')
                            return
                        }""",
    "OrderSuccess/purchase",
)

if edits:
    print(f"{len(edits)} edits applied:")
    for e in edits:
        print(f"  ok  {e}")
if skipped:
    print(f"{len(skipped)} skipped:")
    for s in skipped:
        print(f"  --  {s}")
if not edits and not skipped:
    print("nothing to do")
