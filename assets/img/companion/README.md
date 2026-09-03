# The study buddy

Pictures that turn up in the corner when someone has been staring at one
question for a while. **Drop them in one of the two folders here** — nothing
else needs changing, and the site picks them up on its own.

## Which folder

| | |
|---|---|
| **`with-text/`** | The picture already says something — a meme with writing across it. It turns up on its own, with no speech bubble, because the picture *is* the message and two lines of text side by side is two jokes fighting. |
| **`no-text/`** | Just a picture. The buddy gets to speak, so one of its lines appears in a bubble beside it. |

If `no-text/` is empty the buddy has nowhere to put a line, so the drawn cat
turns up for the one message worth keeping — the reminder that you can flag a
question and come back to it.

## Naming

Number them in order **within each folder**, starting at 1:

```
with-text/companion-1.jpg    no-text/companion-1.jpg
with-text/companion-2.jpg    no-text/companion-2.jpg
```

`.png`, `.jpeg` and `.webp` work too. The site looks for `companion-1`, then
`companion-2`, and so on until it finds a gap, so **do not skip a number**:
`companion-1` and `companion-3` with no `-2` means only the first is used. The
two folders number separately — both start at 1.

A random one from either folder turns up each time. With both folders empty,
the site falls back to the drawn cat, so the feature never breaks.

## What makes a good one

- **The whole picture is shown**, never cropped, so writing across the middle of
  a meme survives. Tall ones and wide ones both work — it keeps its own shape
  and just gets smaller.
- **At least 800px wide.** It arrives filling the screen before it shrinks into
  the corner, so a small file will look soft during the entrance.
- **Readable small.** In the corner it settles at about 130px across, so one big
  line of text reads and a paragraph does not.
- A few hundred KB each. They are only downloaded when the buddy is actually
  due, so nobody who works straight through ever pays for them.

Anyone whose face is in one of these should be happy to be there — it appears to
everyone who uses the site.
