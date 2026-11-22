# Product story imagery and copy

The product journey pages at `/about/products/:slug` describe five stages for
each story: the people who prepare it, how it is grown or made, who makes it,
how it is exported and how BeNa packs it. Every stage has an image.

## Images

BeNa has no product photography in `frontend/public`, so the story images are
illustrative stock photos from Wikimedia Commons. They are stored locally at
`frontend/public/images/stories/*.webp` (optimised to 1100 px wide WebP) so the
storefront has no runtime dependency on a third-party image host.

Attribution is shown under each image on the story page. Full source details
are in `frontend/public/images/stories/credits.json`. Summary:

| Image | Source | Licence |
| --- | --- | --- |
| `coffee-people.webp` | Harvesting Ugandan coffee | CC BY-SA 4.0 |
| `coffee-grown.webp` | Women drying coffee | CC BY-SA 4.0 |
| `coffee-made.webp` | Coffee roasting machine at Cúcuta | CC0 |
| `honey-people.webp` | Beekeeper Inspecting the Hive | CC0 |
| `honey-grown.webp` | Beekeeping frame | Public domain |
| `honey-made.webp` | Honey jars | CC BY-SA 4.0 |
| `fish-people.webp` | Boat and fishermen in Lake Kivu | CC BY-SA 4.0 |
| `fish-grown.webp` | Drying fish at Daepo Port | CC0 |
| `fish-made.webp` | Dried fish in Chittagong | CC BY-SA 4.0 |
| `beans-people.webp` | Bean harvest at Bobonong farms | CC BY-SA 4.0 |
| `beans-grown.webp` | Harvest of Nutritious Beans | CC BY-SA 4.0 |
| `beans-made.webp` | Beans in Gombe old market | CC BY-SA 4.0 |
| `export.webp` | Container ship at Hai Phong terminal | CC BY-SA 4.0 |
| `packing.webp` | Sticking a label onto a parcel | CC BY 2.0 |

## Copy disclaimer

The process copy is deliberately general: it explains the typical steps for
each product type and does not name a specific farm, cooperative, exporter or
certification. The on-page introduction tells visitors that photos illustrate
the process and may show other origins or producers.

Before making specific provenance claims, replace the generic wording in
`frontend/src/content/productStories.ts` with owner-verified details and swap
in BeNa's own photos where available.
