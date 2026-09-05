# The faces behind the name cards

Tap anyone's card on the credits page seven times in a row and it turns over to
a photo of them. **Drop the photos in this folder** — nothing else needs
changing.

## Naming

Name each file after the person, then a number, starting at 1:

```
day-1.jpg     mew-1.jpg     dunk-1.jpg
day-2.jpg     mew-2.jpg     am-1.jpg
```

The names the site looks for are the nicknames in lower case, as they appear in
`data-egg` on each card in `credit.html`:

| Card | Files |
|---|---|
| Mew | `mew-1.jpg`, `mew-2.jpg`, … |
| Dunk | `dunk-1.jpg`, … |
| Am | `am-1.jpg`, … |
| Rami | `rami-1.jpg`, … |
| Bam | `bam-1.jpg`, … |
| Pie | `pie-1.jpg`, … |
| Day | `day-1.jpg`, … |

`.png`, `.jpeg` and `.webp` work too. The search stops at the first missing
number, so **do not skip one**: `day-1` and `day-3` with no `day-2` means only
the first is used. With several for one person, a random one turns up each time.

**A card with no photo does nothing at all** — no half-flip, no broken picture.
So people can be added one at a time, and until then their card simply sits
there.

## What makes a good one

- **The card is a wide, short letterbox** — about 2:1 — so the photo is cropped
  to a band across it, a little above centre. **A landscape close-up of a face
  is what fits.** A tall phone selfie loses everything but a strip: shot
  portrait, a whole face is four times taller than the band, so what survives is
  usually hair and a forehead. Crop it to a wide strip around the face before
  dropping it in, and what you cropped is exactly what shows.
- **At least 700px wide.** The card is about 340px across on a big screen, so
  twice that keeps it sharp on a retina one.
- A few hundred KB each. Nothing here is fetched until somebody has actually
  earned the flip, and then only the one picture being shown.

Anyone whose face is in here should be happy to be there — it appears to
everyone who uses the site.
