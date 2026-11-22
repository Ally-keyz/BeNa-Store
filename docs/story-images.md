# Product story media

The product journey pages at `/about/products/:slug` describe five stages for
each story: the people who prepare it, how it is grown or made, who makes it,
how it is exported and how BeNa packs it. Every stage has an image. Coffee also
has a hero image, a photo gallery and two short process videos; honey has a hero
image.

## Folder structure

All media is local, so the storefront has no runtime dependency on a third-party
host.

```text
frontend/public/
  images/stories/
    beans/    people, grown, made
    coffee/   feature, farm-team, harvesting, grains-in-hands,
              plant, tree, drying, in-sacks, sacks-detail
    fish/     people, grown, made
    honey/    feature, people, grown, made
    shared/   export, packing
    credits.json
  videos/stories/coffee/
    coffee-making-machine.mp4
    coffee-factory-operator.mp4
```

The original uploads are still in `new about us images and video contents/` at
the repository root. They were copied into the structure above, converted to
optimised WebP (max 1400 px, quality 82) and renamed to clear, consistent
kebab-case names. Two uploaded files (`coffe making vid2.mp4` and
`person working in coffe factory operating a coffe machine.mp4`) were byte-for-byte
duplicates, so only one copy is included as `coffee-factory-operator.mp4`.

## Attribution

Owner-supplied coffee and honey media is credited on the page as
`Photo: BeNa Origins`. Licence and ownership of those uploads still need to be
confirmed by the store owner before publication.

The remaining illustrative stock photos come from Wikimedia Commons. Attribution
is shown under each image and full source details are in
`frontend/public/images/stories/credits.json`. The old flat
`coffee-people.webp`, `coffee-grown.webp` and `coffee-made.webp` placeholders
were removed because the supplied coffee photos replaced them.

| Image | Source | Licence |
| --- | --- | --- |
| `honey/people.webp` | Beekeeper Inspecting the Hive | CC0 |
| `honey/grown.webp` | Beekeeping frame | Public domain |
| `honey/made.webp` | Honey jars | CC BY-SA 4.0 |
| `fish/people.webp` | Boat and fishermen in Lake Kivu | CC BY-SA 4.0 |
| `fish/grown.webp` | Drying fish at Daepo Port | CC0 |
| `fish/made.webp` | Dried fish in Chittagong | CC BY-SA 4.0 |
| `beans/people.webp` | Bean harvest at Bobonong farms | CC BY-SA 4.0 |
| `beans/grown.webp` | Harvest of Nutritious Beans | CC BY-SA 4.0 |
| `beans/made.webp` | Beans in Gombe old market | CC BY-SA 4.0 |
| `shared/export.webp` | Container ship at Hai Phong terminal | CC BY-SA 4.0 |
| `shared/packing.webp` | Sticking a label onto a parcel | CC BY 2.0 |

## Copy disclaimer

The process copy is deliberately general: it explains the typical steps for
each product type and does not name a specific farm, cooperative, exporter or
certification. The on-page introduction tells visitors that photos and videos
illustrate the process and may show other origins or producers.

The supplied filenames describe their contents, but they do not verify that the
footage shows BeNa's own producers or facility. Before making specific
provenance claims, replace the generic wording in
`frontend/src/content/productStories.ts` with owner-verified details.
