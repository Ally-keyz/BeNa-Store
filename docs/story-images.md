# Product story media

The product journey pages at `/about/products/:slug` describe five stages for
each story: the people who prepare it, how it is grown or made, who makes it,
how it is exported and how BeNa packs it. Every stage has an image. Coffee and
honey each also have their own logo and packaging image; coffee additionally has
a hero image, a photo gallery and two short process videos.

The About page now only contains the two products BeNa currently tells stories
about: `coffee` and `ubuki`. The old `indagara` and `ibishyimbo` stories were
removed from `PRODUCT_STORIES`, so their routes are no longer prerendered or
added to the sitemap.

## Folder structure

All media is local, so the storefront has no runtime dependency on a third-party
host.

```text
frontend/public/
  images/stories/
    coffee/   logo, packaging-1, packaging-2, feature, farm-team,
              harvesting, grains-in-hands, plant, tree, drying,
              in-sacks, sacks-detail
    honey/    logo, packaging, feature, people, grown, made
    shared/   export
    credits.json
  videos/stories/coffee/
    coffee-making-machine.mp4
    coffee-factory-operator.mp4
```

The original uploads are still in `new about us images and video contents/` at
the repository root. The newer brand files were supplied at the repository root
(`Logo-Final.webp`, `coffe packaging 1.jpeg`, `coffe packaging 2.jpeg` and
`BeNa_honey_logo.pdf`). They were converted to optimised WebP and placed in the
structure above:

- `coffee/logo.webp` comes from `Logo-Final.webp`.
- `coffee/packaging-1.webp` and `coffee/packaging-2.webp` come from the two
  `coffe packaging` photos. The first is used in the "Packed by BeNa Origins"
  step and as the story packaging image; the second appears in the gallery.
- `honey/logo.webp` comes from the single-page `BeNa_honey_logo.pdf`. The flat
  off-white page background was made transparent so the logo works on both
  light and white surfaces.
- `honey/packaging.webp` comes from `honey image2.jpeg`.

Owner-supplied photography and footage is credited on the page as
`Photo: BeNa Origins`. Licence and ownership of those uploads still need to be
confirmed by the store owner before publication.

The remaining illustrative stock photos come from Wikimedia Commons. Attribution
is shown under each image and full source details are in
`frontend/public/images/stories/credits.json`. The former `fish/` and `beans/`
folders were removed with their stories.

| Image | Source | Licence |
| --- | --- | --- |
| `honey/people.webp` | Beekeeper Inspecting the Hive | CC0 |
| `honey/grown.webp` | Beekeeping frame | Public domain |
| `honey/made.webp` | Honey jars | CC BY-SA 4.0 |
| `shared/export.webp` | Container ship at Hai Phong terminal | CC BY-SA 4.0 |

## Copy source

The coffee story copy is the verbatim text supplied by the owner from
`https://benaafricanshop.myshopify.com/pages/meet-your-coffee`. The seven
chapters are grouped into the five story stages without rewriting the wording:
the land and harvest, the women and community, the drying and scale, export,
and the closing "BeNa SheGrows Coffee" launch copy. The supplied image captions
are also used as alt text where they describe the local asset. Because the owner
asked for these exact texts, the coffee story copy is intentionally identical
in the English, German and French data slots.

The five required section keys remain in place because the About grid, story
route, build-time SEO and tests all depend on them. The two videos are still
labelled as process illustrations rather than verified footage of a named farm.
