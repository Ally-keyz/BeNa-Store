/**
 * Product stories shown on /about and /about/products/:slug.
 *
 * Each story walks through five stages of the product's journey: the people who
 * prepare it, how it is grown or made, who makes it, how it is exported and how
 * BeNa packs it. Every stage has its own image. Each product also has its own
 * logo and packaging image, supplied by the store owner. Credits are shown on
 * the story page.
 *
 * To add a product:
 * 1. Add one object to PRODUCT_STORIES with a unique `slug`.
 * 2. Fill in the copy for English, German and French, including every section.
 * 3. Add local `logo` and `packaging` images plus a live `productHandle`, or a
 *    `searchQuery` when the product is not currently published in the catalog.
 *
 * The About grid and the story route are generated from this list, so no page
 * component needs to change when another product story is added.
 */
export type ProductStoryLanguage = 'en' | 'de' | 'fr';
export type StorySectionKey = 'people' | 'grown' | 'made' | 'exported' | 'packed';

export type LocalizedText = Record<ProductStoryLanguage, string>;

export interface StoryImage {
  /** Local asset under /public/images/stories. */
  image: string;
  imageAlt: LocalizedText;
  /** Visible attribution, e.g. "Photographer · CC BY-SA 4.0". */
  credit: string;
  /** Omitted for imagery supplied by BeNa. */
  creditUrl?: string;
}

export interface StoryVideo {
  src: string;
  poster: string;
  posterAlt: LocalizedText;
  credit: string;
  creditUrl?: string;
}

export interface StorySection extends StoryImage {
  key: StorySectionKey;
  body: LocalizedText;
}

export interface ProductStory {
  slug: string;
  productHandle?: string;
  searchQuery?: string;
  title: LocalizedText;
  summary: LocalizedText;
  body: LocalizedText;
  detail: LocalizedText;
  /** Product logo, used wherever a small decorative icon used to appear. */
  logo: StoryImage;
  /** The BeNa packaging this product is sold in. */
  packaging: StoryImage;
  hero?: StoryImage;
  sections: readonly StorySection[];
  gallery?: readonly StoryImage[];
  videos?: readonly StoryVideo[];
}

const IMAGES = {
  coffee: '/images/stories/coffee',
  honey: '/images/stories/honey',
  shared: '/images/stories/shared',
} as const;

const VIDEOS = {
  coffee: '/videos/stories/coffee',
} as const;

/** Attribution for photography and footage supplied by the store owner. */
const BENA_MEDIA = {
  credit: 'BeNa Origins',
} as const;

const EXPORT = {
  image: `${IMAGES.shared}/export.webp`,
  alt: {
    en: 'Container ship at a port',
    de: 'Containerschiff im Hafen',
    fr: 'Navire porte-conteneurs dans un port',
  },
  credit: 'Nathan.cima · CC BY-SA 4.0',
  creditUrl:
    'https://commons.wikimedia.org/wiki/File:Container_Ship_at_the_Hai_Phong_International_Container_Terminal_01.jpg',
} as const;

export const PRODUCT_STORIES: readonly ProductStory[] = [
  {
    slug: 'coffee',
    productHandle: 'premium-rwandan-arabica-coffee-freshly-roasted',
    title: {
      en: 'BeNa SheGrows Coffee',
      de: 'BeNa SheGrows Coffee',
      fr: 'BeNa SheGrows Coffee',
    },
    summary: {
      en: 'Rwandan coffee from women-led farms, hand-sorted with care.',
      de: 'Ruandischer Kaffee aus frauengeführten Farmen, sorgfältig von Hand sortiert.',
      fr: 'Café rwandais issu de fermes dirigées par des femmes, trié avec soin à la main.',
    },
    body: {
      en: 'Rwandan coffee, hand-sorted and roasted for a bright, clean cup.',
      de: 'Ruandischer Kaffee, von Hand sortiert und für eine klare, fruchtige Tasse geröstet.',
      fr: 'Café rwandais, trié à la main et torréfié pour une tasse claire et fruitée.',
    },
    detail: {
      en: 'After the highlands, the harvest, the hand sorting and the drying, the beans reach the cup. BeNa SheGrows Coffee opens with bright citrus and berry notes, then soft floral warmth and a smooth, clean finish. It is specialty coffee made with care from farm to cup.',
      de: 'Nach dem Anbau in den Hochlagen, der Ernte, der Handsortierung und dem Trocknen landen die Bohnen in der Tasse. BeNa SheGrows Coffee beginnt mit hellen Zitrus- und Beerennoten, gefolgt von sanfter Blumenwärme und einem glatten, klaren Abgang. Es ist Spezialitätenkaffee, der mit Sorgfalt von der Farm bis in die Tasse entsteht.',
      fr: 'Après la culture en altitude, la récolte, le tri manuel et le séchage, les grains arrivent dans la tasse. BeNa SheGrows Coffee s’ouvre sur des notes vives d’agrumes et de fruits rouges, puis une douce chaleur florale et une finale lisse et nette. C’est un café de spécialité préparé avec soin, de la ferme à la tasse.',
    },
    logo: {
      image: `${IMAGES.coffee}/logo.webp`,
      imageAlt: {
        en: 'BeNa SheGrows Coffee logo',
        de: 'Logo von BeNa SheGrows Kaffee',
        fr: 'Logo du café BeNa SheGrows',
      },
      ...BENA_MEDIA,
    },
    packaging: {
      image: `${IMAGES.coffee}/packaging-1.webp`,
      imageAlt: {
        en: 'BeNa SheGrows Coffee packaging',
        de: 'Verpackung von BeNa SheGrows Kaffee',
        fr: 'Emballage du café BeNa SheGrows',
      },
      ...BENA_MEDIA,
    },
    hero: {
      image: `${IMAGES.coffee}/feature.webp`,
      imageAlt: {
        en: 'Coffee drying beds overlooking Rwanda hills',
        de: 'Coffee drying beds overlooking Rwanda hills',
        fr: 'Coffee drying beds overlooking Rwanda hills',
      },
      ...BENA_MEDIA,
    },
    sections: [
      {
        key: 'people',
        body: {
          en: 'The women of SheGrows sort the dried beans by hand, removing every imperfect bean before the coffee moves on. Their care shapes the quality of each bag. Their work also supports the community: shared knowledge, fair wages and skills that help families. Buying BeNa SheGrows Coffee supports this work directly.',
          de: 'Die Frauen von SheGrows sortieren die getrockneten Bohnen von Hand und entfernen jede unvollkommene Bohne, bevor der Kaffee weitergeht. Ihre Sorgfalt bestimmt die Qualität jeder Tüte. Ihre Arbeit stärkt auch die Gemeinschaft: geteiltes Wissen, faire Löhne und Fähigkeiten, die Familien unterstützen. Mit dem Kauf von BeNa SheGrows Coffee unterstützt du diese Arbeit direkt.',
          fr: 'Les femmes de SheGrows trient les grains séchés à la main et retirent chaque grain imparfait avant la suite du processus. Leur soin façonne la qualité de chaque sachet. Leur travail soutient aussi la communauté : partage des savoirs, salaires équitables et compétences qui aident les familles. Acheter BeNa SheGrows Coffee soutient directement ce travail.',
        },
        image: `${IMAGES.coffee}/farm-team.webp`,
        imageAlt: {
          en: 'Women carefully sorting coffee beans by hand',
          de: 'Women carefully sorting coffee beans by hand',
          fr: 'Women carefully sorting coffee beans by hand',
        },
        ...BENA_MEDIA,
      },
      {
        key: 'grown',
        body: {
          en: 'Our farm sits in Rwanda’s highlands, more than 1,500 metres above sea level. Cool air, volcanic soil and green valleys create the conditions for this coffee. The cherries are picked only when fully ripe, then selected by hand one by one. This careful selection decides the quality long before roasting.',
          de: 'Unsere Farm liegt im ruandischen Hochland, mehr als 1.500 Meter über dem Meeresspiegel. Kühle Luft, vulkanischer Boden und grüne Täler schaffen die Bedingungen für diesen Kaffee. Die Kirschen werden erst bei voller Reife geerntet und dann eine nach der anderen von Hand ausgewählt. Diese Sorgfalt entscheidet über die Qualität, lange vor dem Rösten.',
          fr: 'Notre ferme se trouve dans les hauts plateaux rwandais, à plus de 1 500 mètres d’altitude. L’air frais, le sol volcanique et les vallées verdoyantes créent les conditions de ce café. Les cerises sont récoltées à pleine maturité, puis sélectionnées une par une à la main. Ce soin détermine la qualité bien avant la torréfaction.',
        },
        image: `${IMAGES.coffee}/harvesting.webp`,
        imageAlt: {
          en: 'Freshly harvested red coffee cherries spread on drying nets',
          de: 'Freshly harvested red coffee cherries spread on drying nets',
          fr: 'Freshly harvested red coffee cherries spread on drying nets',
        },
        ...BENA_MEDIA,
      },
      {
        key: 'made',
        body: {
          en: 'The cherries dry slowly on raised beds under the highland sun. Workers turn and check them so every layer dries evenly. This takes weeks and cannot be rushed; the slow drying builds the fruit and floral notes in the cup. Across the station, women work section by section to the same standard, without a conveyor belt or shortcuts.',
          de: 'Die Kirschen trocknen langsam auf erhöhten Betten unter der Hochlandsonne. Die Arbeiterinnen wenden und prüfen sie, damit jede Schicht gleichmäßig trocknet. Das dauert Wochen und lässt sich nicht beschleunigen; durch das langsame Trocknen entstehen die Frucht- und Blumennoten in der Tasse. An der gesamten Trockenstation arbeiten Frauen Abschnitt für Abschnitt nach demselben Standard, ohne Fließband und ohne Abkürzungen.',
          fr: 'Les cerises sèchent lentement sur des lits surélevés sous le soleil des hauts plateaux. Les travailleuses les retournent et les vérifient pour que chaque couche sèche uniformément. Cela prend des semaines et ne peut pas être accéléré ; ce séchage lent développe les notes fruitées et florales dans la tasse. Sur toute la station, les femmes travaillent section par section selon le même standard, sans convoyeur ni raccourci.',
        },
        image: `${IMAGES.coffee}/drying.webp`,
        imageAlt: {
          en: 'Worker tending coffee cherries on elevated drying beds with mountain view',
          de: 'Worker tending coffee cherries on elevated drying beds with mountain view',
          fr: 'Worker tending coffee cherries on elevated drying beds with mountain view',
        },
        ...BENA_MEDIA,
      },
      {
        key: 'exported',
        body: {
          en: 'Once the green coffee leaves Rwanda, it travels in sealed sacks by container to Europe. It is imported into the European Union before it reaches our store in Zierenberg.',
          de: 'Sobald der grüne Kaffee Ruanda verlässt, reist er in versiegelten Säcken per Container nach Europa. Bevor er unseren Store in Zierenberg erreicht, wird er in die Europäische Union eingeführt.',
          fr: 'Une fois le café vert parti du Rwanda, il voyage en sacs scellés par conteneur vers l’Europe. Il est importé dans l’Union européenne avant d’atteindre notre boutique à Zierenberg.',
        },
        image: EXPORT.image,
        imageAlt: EXPORT.alt,
        credit: EXPORT.credit,
        creditUrl: EXPORT.creditUrl,
      },
      {
        key: 'packed',
        body: {
          en: 'BeNa SheGrows Coffee is grown and hand-sorted in Rwanda, then packed by BeNa Origins for delivery across Europe. This is the coffee from the people and places shown above, ready for your cup.',
          de: 'BeNa SheGrows Coffee wird in Ruanda angebaut und von Hand sortiert, dann von BeNa Origins für die Lieferung in ganz Europa verpackt. Das ist der Kaffee aus den Menschen und Orten oben – bereit für deine Tasse.',
          fr: 'BeNa SheGrows Coffee est cultivé et trié à la main au Rwanda, puis emballé par BeNa Origins pour la livraison dans toute l’Europe. Voici le café des personnes et des lieux présentés ci-dessus, prêt pour votre tasse.',
        },
        image: `${IMAGES.coffee}/packaging-1.webp`,
        imageAlt: {
          en: 'BeNa SheGrows Coffee packaging',
          de: 'BeNa SheGrows Coffee packaging',
          fr: 'BeNa SheGrows Coffee packaging',
        },
        ...BENA_MEDIA,
      },
    ],
    gallery: [
      {
        image: `${IMAGES.coffee}/plant.webp`,
        imageAlt: {
          en: 'A young coffee plant',
          de: 'Eine junge Kaffeepflanze',
          fr: 'Un jeune plant de café',
        },
        ...BENA_MEDIA,
      },
      {
        image: `${IMAGES.coffee}/tree.webp`,
        imageAlt: {
          en: 'A coffee tree with cherries',
          de: 'Ein Kaffeebaum mit Kirschen',
          fr: 'Un caféier avec des cerises',
        },
        ...BENA_MEDIA,
      },
      {
        image: `${IMAGES.coffee}/drying.webp`,
        imageAlt: {
          en: 'Women working across rows of coffee drying beds',
          de: 'Women working across rows of coffee drying beds',
          fr: 'Women working across rows of coffee drying beds',
        },
        ...BENA_MEDIA,
      },
      {
        image: `${IMAGES.coffee}/in-sacks.webp`,
        imageAlt: {
          en: 'Coffee beans in sacks',
          de: 'Kaffeebohnen in Säcken',
          fr: 'Des grains de café dans des sacs',
        },
        ...BENA_MEDIA,
      },
      {
        image: `${IMAGES.coffee}/sacks-detail.webp`,
        imageAlt: {
          en: 'A close-up of coffee in a sack',
          de: 'Eine Nahaufnahme von Kaffee in einem Sack',
          fr: 'Gros plan sur du café dans un sac',
        },
        ...BENA_MEDIA,
      },
      {
        image: `${IMAGES.coffee}/packaging-2.webp`,
        imageAlt: {
          en: 'Another view of the BeNa SheGrows Coffee packaging',
          de: 'Eine weitere Ansicht der Verpackung von BeNa SheGrows Kaffee',
          fr: 'Une autre vue de l’emballage du café BeNa SheGrows',
        },
        ...BENA_MEDIA,
      },
    ],
    videos: [
      {
        src: `${VIDEOS.coffee}/coffee-making-machine.mp4`,
        poster: `${IMAGES.coffee}/feature.webp`,
        posterAlt: {
          en: 'A coffee-making machine in operation',
          de: 'Eine Kaffeemaschine im Betrieb',
          fr: 'Une machine à café en fonctionnement',
        },
        ...BENA_MEDIA,
      },
      {
        src: `${VIDEOS.coffee}/coffee-factory-operator.mp4`,
        poster: `${IMAGES.coffee}/grains-in-hands.webp`,
        posterAlt: {
          en: 'A worker operating coffee-making equipment',
          de: 'Eine Person bedient eine Kaffeemaschine',
          fr: 'Une personne utilise un équipement de préparation du café',
        },
        ...BENA_MEDIA,
      },
    ],
  },
  {
    slug: 'ubuki',
    productHandle: '🍯-natural-honey-from-rwanda-500g',
    title: {
      en: 'Ubuki — BeNa Pure Honey',
      de: 'Ubuki — BeNa Pure Honey',
      fr: 'Ubuki — BeNa Pure Honey',
    },
    summary: {
      en: 'Rwandan honey in a 500 g jar, sold under the BeNa Pure Honey label.',
      de: 'Ruandischer Honig im 500-g-Glas, verkauft unter der Marke BeNa Pure Honey.',
      fr: 'Du miel rwandais en pot de 500 g, vendu sous l’étiquette BeNa Pure Honey.',
    },
    body: {
      en: 'Ubuki is the Kinyarwanda word for honey. Our honey comes from Rwandan beekeepers and works as a natural sweetener for tea, porridge and baking.',
      de: 'Ubuki ist das kinyarwandische Wort für Honig. Unser Honig stammt von ruandischen Imkern und eignet sich als natürliche Süße für Tee, Porridge und Backwaren.',
      fr: 'Ubuki est le mot kinyarwanda pour le miel. Notre miel provient d’apiculteurs rwandais et sert d’édulcorant naturel pour le thé, les bouillies et la pâtisserie.',
    },
    detail: {
      en: 'When it is out of stock, the product page says so clearly. The story stays here, ready for the next harvest.',
      de: 'Wenn er ausverkauft ist, zeigt die Produktseite das deutlich. Die Geschichte bleibt hier und wartet auf die nächste Ernte.',
      fr: 'Lorsqu’il est épuisé, la fiche produit l’indique clairement. L’histoire reste ici, prête pour la prochaine récolte.',
    },
    logo: {
      image: `${IMAGES.honey}/logo.webp`,
      imageAlt: {
        en: 'BeNa Pure Honey logo',
        de: 'Logo von BeNa Pure Honey',
        fr: 'Logo de BeNa Pure Honey',
      },
      ...BENA_MEDIA,
    },
    packaging: {
      image: `${IMAGES.honey}/packaging.webp`,
      imageAlt: {
        en: 'A jar of BeNa Pure Honey',
        de: 'Ein Glas BeNa Pure Honey',
        fr: 'Un pot de BeNa Pure Honey',
      },
      ...BENA_MEDIA,
    },
    hero: {
      image: `${IMAGES.honey}/feature.webp`,
      imageAlt: {
        en: 'A jar of golden Rwandan honey',
        de: 'Ein Glas goldener ruandischer Honig',
        fr: 'Un pot de miel rwandais doré',
      },
      ...BENA_MEDIA,
    },
    sections: [
      {
        key: 'people',
        body: {
          en: 'Ubuki starts with beekeepers who look after the hives and collect the honey once the bees have filled the combs.',
          de: 'Ubuki beginnt bei Imkern, die die Bienenstöcke pflegen und den Honig ernten, wenn die Bienen die Waben gefüllt haben.',
          fr: 'L’ubuki commence avec les apiculteurs qui entretiennent les ruches et récoltent le miel lorsque les abeilles ont rempli les rayons.',
        },
        image: `${IMAGES.honey}/people.webp`,
        imageAlt: {
          en: 'A beekeeper inspecting a hive',
          de: 'Ein Imker prüft einen Bienenstock',
          fr: 'Un apiculteur inspecte une ruche',
        },
        credit: 'Alabama Extension · CC0',
        creditUrl: 'https://commons.wikimedia.org/wiki/File:Beekeeper_Inspecting_the_Hive_-_51014819065.jpg',
      },
      {
        key: 'grown',
        body: {
          en: 'Bees gather nectar and store it in the comb as honey. The beekeeper lifts out the full frames and separates the honey from the wax before it is bottled.',
          de: 'Die Bienen sammeln Nektar und lagern ihn als Honig in den Waben. Der Imker entnimmt die vollen Rahmen und trennt den Honig vom Wachs, bevor er abgefüllt wird.',
          fr: 'Les abeilles butinent le nectar et le stockent dans les rayons sous forme de miel. L’apiculteur retire les cadres pleins et sépare le miel de la cire avant la mise en pot.',
        },
        image: `${IMAGES.honey}/grown.webp`,
        imageAlt: {
          en: 'A honeycomb frame from a hive',
          de: 'Eine Wabe aus einem Bienenstock',
          fr: 'Un cadre de rayon de miel issu d’une ruche',
        },
        credit: 'Encyclopedia Britannica · Public domain',
        creditUrl: 'https://commons.wikimedia.org/wiki/File:Beekeeping_frame.jpg',
      },
      {
        key: 'made',
        body: {
          en: 'The honey is strained to remove wax and particles, then filled into jars. Crystallisation is natural and can be reversed by gently warming the jar.',
          de: 'Der Honig wird gefiltert, um Wachs und Partikel zu entfernen, und dann in Gläser gefüllt. Kristallisation ist natürlich und lässt sich durch sanftes Erwärmen des Glases lösen.',
          fr: 'Le miel est filtré pour retirer la cire et les particules, puis mis en pots. La cristallisation est naturelle et peut être dissipée en réchauffant doucement le pot.',
        },
        image: `${IMAGES.honey}/made.webp`,
        imageAlt: {
          en: 'Jars of honey',
          de: 'Gläser mit Honig',
          fr: 'Pots de miel',
        },
        credit: 'Deerpeter · CC BY-SA 4.0',
        creditUrl: 'https://commons.wikimedia.org/wiki/File:Honey_jars.jpg',
      },
      {
        key: 'exported',
        body: {
          en: 'Sealed jars are packed in cartons and shipped to Europe under the food-import rules that apply to bee products.',
          de: 'Versiegelte Gläser werden in Kartons gepackt und unter den für Bienenprodukte geltenden Lebensmitteleinfuhrregeln nach Europa versandt.',
          fr: 'Les pots scellés sont emballés dans des cartons et expédiés vers l’Europe selon les règles d’importation alimentaire applicables aux produits apicoles.',
        },
        image: EXPORT.image,
        imageAlt: EXPORT.alt,
        credit: EXPORT.credit,
        creditUrl: EXPORT.creditUrl,
      },
      {
        key: 'packed',
        body: {
          en: 'At BeNa we check each jar, seal it under the BeNa Pure Honey label with origin and best-before date, and pack it securely for shipping from Zierenberg.',
          de: 'Bei BeNa prüfen wir jedes Glas, verschließen es mit dem BeNa-Pure-Honey-Etikett mit Herkunft und Mindesthaltbarkeitsdatum und verpacken es sicher für den Versand aus Zierenberg.',
          fr: 'Chez BeNa, nous vérifions chaque pot, le scellons sous l’étiquette BeNa Pure Honey avec l’origine et la date de durabilité minimale, puis l’emballons soigneusement pour l’expédition depuis Zierenberg.',
        },
        image: `${IMAGES.honey}/packaging.webp`,
        imageAlt: {
          en: 'A jar of BeNa Pure Honey ready for dispatch',
          de: 'Ein Glas BeNa Pure Honey, bereit zum Versand',
          fr: 'Un pot de BeNa Pure Honey prêt à être expédié',
        },
        ...BENA_MEDIA,
      },
    ],
  },
];

export function localizedText(text: LocalizedText, language: string): string {
  if (language === 'de' || language === 'fr') return text[language];
  return text.en;
}

export function getProductStory(slug: string): ProductStory | undefined {
  return PRODUCT_STORIES.find((story) => story.slug === slug);
}

/** Primary shop link for a story: a live product, or a catalog search fallback. */
export function getProductStoryHref(story: ProductStory): string | null {
  if (story.productHandle) return `/products/${story.productHandle}`;
  if (story.searchQuery) return `/search?q=${encodeURIComponent(story.searchQuery)}`;
  return null;
}
