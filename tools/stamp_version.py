#!/usr/bin/env python3
"""Stamp a release across the site.

    python3 tools/stamp_version.py 1.4

Every stylesheet, script and image the pages ask for gets ?v=<version> on the
end, and the credits page's version line is set to match.

Why
---
GitHub Pages will not let us set cache headers, and it tells browsers an HTML
page is good for ten minutes. Scripts and stylesheets are fetched on their own
clocks, so for a while after every push a browser can be running one release's
page against another release's JavaScript. That has broken this site three
times, each time silently: a card that would not turn over, and nothing in the
console a reader would ever see.

A version on the URL makes each release's assets a different address, so a page
can only ever load the scripts it shipped with. It does not make a stale page
fresh — nothing we can do here will, short of moving off GitHub Pages — but it
does stop the halves from mixing, which is what actually breaks things.

The three font files are left alone on purpose: the stylesheet asks for them,
not the pages, and Inter 400/600/700 is always Inter 400/600/700. Stamping them
would re-download 72 KB on every release to get back the same bytes.

Run this before committing a release, then push.
"""
import datetime
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = sorted(ROOT.glob('*.html'))
VERSION_LINE = re.compile(r'(<p class="site-version[^>]*>)Version [^<·]+· [^<]+(</p>)')

# Local assets only: anything with a scheme, a fragment or a mailto is left be.
ASSET = re.compile(r'\b(src|href)="((?:assets|data)/[^"?#]+)(?:\?v=[^"#]*)?"')


def stamp(version):
    date = datetime.date.today().strftime('%-d %B %Y')
    touched = []
    for page in PAGES:
        text = original = page.read_text()
        text = ASSET.sub(lambda m: '%s="%s?v=%s"' % (m.group(1), m.group(2), version), text)
        text = VERSION_LINE.sub(r'\g<1>Version %s · %s\g<2>' % (version, date), text)
        if text != original:
            page.write_text(text)
            touched.append(page.name)
    return touched, date


def main():
    if len(sys.argv) != 2 or not re.match(r'^\d+\.\d+$', sys.argv[1]):
        sys.exit('usage: stamp_version.py <version>   e.g. 1.4')
    version = sys.argv[1]
    touched, date = stamp(version)
    print('stamped %s (%s) into: %s' % (version, date, ', '.join(touched) or 'nothing'))

    # Say plainly whether the credits page will show it, since that line is how
    # anyone tells a stale copy from a real bug.
    shown = [p.name for p in PAGES if ('Version %s ·' % version) in p.read_text()]
    print('version line shown on: %s' % (', '.join(shown) or 'no page — is .site-version still there?'))


if __name__ == '__main__':
    main()
