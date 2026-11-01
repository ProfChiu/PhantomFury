#!/usr/bin/env python3
"""fw_live.py — drive a framework page in headless Chromium and report errors.

Every table app opens from disk over file://, so this wraps the parts that are
fiddly by hand: catching console and page errors from the first paint, clicking
by CSS selector, evaluating JS against the page's globals, and taking a
screenshot at the authored 1920x1080.

Library:
    from fw_live import Page
    with Page() as p:
        p.open("examples/clash/index.html")          # repo-relative or absolute
        p.click(".ct-card[data-uid='you1']")          # click-then-click, the accessible path
        p.click("[data-zone='you.play']")
        n = p.eval("ClashApp.session.state.turn")
        p.screenshot("/tmp/clash.png")
        assert p.errors == []

CLI:
    python3 fw_live.py PAGE [--click SEL]... [--eval JS]... [--wait MS] [--shot PATH] [--seed X]
Exits nonzero if any console error or page error was seen.
"""
import argparse
import os
import sys
import time

from playwright.sync_api import sync_playwright


class Page:
    def __init__(self, width=1920, height=1080, headless=True):
        self.width, self.height, self.headless = width, height, headless
        self.errors = []
        self.console = []

    def __enter__(self):
        self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.launch(headless=self.headless)
        self.page = self._browser.new_page(viewport={"width": self.width, "height": self.height})
        self.page.on("console", self._on_console)
        self.page.on("pageerror", lambda e: self.errors.append("pageerror: %s" % e))
        return self

    def __exit__(self, *a):
        self._browser.close()
        self._pw.stop()

    def _on_console(self, msg):
        line = "%s: %s" % (msg.type, msg.text)
        self.console.append(line)
        if msg.type == "error":
            self.errors.append(line)

    def open(self, path, query=""):
        path = os.path.abspath(path)
        url = "file://" + path + (("?" + query) if query else "")
        self.page.goto(url)
        self.page.wait_for_timeout(300)
        return self

    def click(self, selector, wait=250, position=None):
        """position=(x, y) clicks at an offset inside the element — use it for a
        zone that already holds a card, since the card sits at the centre."""
        if position:
            self.page.click(selector, position={"x": position[0], "y": position[1]})
        else:
            self.page.click(selector)
        self.page.wait_for_timeout(wait)
        return self

    def eval(self, js):
        return self.page.evaluate(js)

    def wait(self, ms):
        self.page.wait_for_timeout(ms)
        return self

    def screenshot(self, out):
        self.page.screenshot(path=out)
        return out


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("page")
    ap.add_argument("--click", action="append", default=[])
    ap.add_argument("--eval", action="append", default=[])
    ap.add_argument("--wait", type=int, default=0)
    ap.add_argument("--shot")
    ap.add_argument("--query", default="")
    a = ap.parse_args(argv)
    with Page() as p:
        p.open(a.page, a.query)
        for sel in a.click:
            p.click(sel)
        if a.wait:
            p.wait(a.wait)
        for js in a.eval:
            print("eval %s -> %r" % (js, p.eval(js)))
        if a.shot:
            p.screenshot(a.shot)
            print("screenshot " + a.shot)
        for line in p.console:
            print("  " + line)
        if p.errors:
            print("ERRORS:")
            for e in p.errors:
                print("  " + e)
            return 1
        print("no console or page errors")
        return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
