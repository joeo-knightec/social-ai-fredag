### Social AI Fredag dashboard

The dashboard includes a timeline, office rankings, streaks and awards based on
recorded winning entries. Shared wins count for each winner; streaks and gaps use
numbered rounds. A gap between wins does not mean a person did not participate.
Year filters exclude entries without a known date. The CSV does not contain
losing entries, so vote margins and participation statistics are unavailable.

The recap can be downloaded as an image or copied as text. Achievement badges
use recorded wins, streaks and votes. The gallery currently contains 2026 images
matched by winner and competition date; older rounds may not have an image.
To add a winner image, first ensure the winner is already in
`public/Social_AI_Fredag.csv`, then run:

```sh
npm run add-winner-image -- --name "Winner Name" --date 2026-11-20 --image /path/to/image.png
```

The script requires Node.js 20.9 or newer.
The name and date must exactly match a single CSV row. The image can be in a
separate scraper directory; relative paths are resolved from the current working
directory. The script creates an optimized WebP in `public/winner-images/` and
adds it to `public/winner-gallery.json`. Existing gallery entries are not
overwritten; remove or update them manually if a replacement is needed.
Animated and multi-page images are not supported. The gallery only displays
entries matching a CSV winner. Files in `public/` are published with the site,
so review the image before deploying with `npm run build && npm run deploy`.

Run the dashboard tests with `node --test tests/*.test.mjs`.