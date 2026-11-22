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
      en: 'Meet Your Coffee',
      de: 'Meet Your Coffee',
      fr: 'Meet Your Coffee',
    },
    summary: {
      en: 'From Her Hands, to Your Cup.',
      de: 'From Her Hands, to Your Cup.',
      fr: 'From Her Hands, to Your Cup.',
    },
    body: {
      en: 'Handpicked in Rwanda. Crafted for the World.',
      de: 'Handpicked in Rwanda. Crafted for the World.',
      fr: 'Handpicked in Rwanda. Crafted for the World.',
    },
    detail: {
      en: 'Chapter 7 — The Cup This Is What It All Becomes. After the highlands, the harvest, the sorting, and the drying — it arrives here. A perfect cup. BeNa SheGrows Coffee delivers bright citrus and berry notes on the first sip, followed by a delicate floral warmth and a smooth, clean finish that lingers without bitterness. This is what specialty coffee tastes like when nothing is compromised from farm to cup. This is Rwanda in your hands.',
      de: 'Chapter 7 — The Cup This Is What It All Becomes. After the highlands, the harvest, the sorting, and the drying — it arrives here. A perfect cup. BeNa SheGrows Coffee delivers bright citrus and berry notes on the first sip, followed by a delicate floral warmth and a smooth, clean finish that lingers without bitterness. This is what specialty coffee tastes like when nothing is compromised from farm to cup. This is Rwanda in your hands.',
      fr: 'Chapter 7 — The Cup This Is What It All Becomes. After the highlands, the harvest, the sorting, and the drying — it arrives here. A perfect cup. BeNa SheGrows Coffee delivers bright citrus and berry notes on the first sip, followed by a delicate floral warmth and a smooth, clean finish that lingers without bitterness. This is what specialty coffee tastes like when nothing is compromised from farm to cup. This is Rwanda in your hands.',
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
          en: 'Chapter 3 — The Women SheGrows. She Sorts. She Leads. These women are not background figures. They are the heart of BeNa SheGrows Coffee. Here, they sort through freshly dried beans with focused hands and sharp eyes, removing any imperfect bean before it moves forward. This level of care — done entirely by hand — is what separates specialty coffee from everything else. Every bag you receive has passed through their hands. That is not a detail. That is the product. Chapter 4 — The Community More Than Coffee. A Movement. When women work together, knowledge is shared, standards rise, and communities grow stronger. What you see here is not just a sorting station — it is an economic engine. These women earn fair wages, build skills, and support their families through the coffee they grow. Buying BeNa SheGrows Coffee is a direct investment in their future. No middlemen. No vague promises. Real impact, traceable to this table.',
          de: 'Chapter 3 — The Women SheGrows. She Sorts. She Leads. These women are not background figures. They are the heart of BeNa SheGrows Coffee. Here, they sort through freshly dried beans with focused hands and sharp eyes, removing any imperfect bean before it moves forward. This level of care — done entirely by hand — is what separates specialty coffee from everything else. Every bag you receive has passed through their hands. That is not a detail. That is the product. Chapter 4 — The Community More Than Coffee. A Movement. When women work together, knowledge is shared, standards rise, and communities grow stronger. What you see here is not just a sorting station — it is an economic engine. These women earn fair wages, build skills, and support their families through the coffee they grow. Buying BeNa SheGrows Coffee is a direct investment in their future. No middlemen. No vague promises. Real impact, traceable to this table.',
          fr: 'Chapter 3 — The Women SheGrows. She Sorts. She Leads. These women are not background figures. They are the heart of BeNa SheGrows Coffee. Here, they sort through freshly dried beans with focused hands and sharp eyes, removing any imperfect bean before it moves forward. This level of care — done entirely by hand — is what separates specialty coffee from everything else. Every bag you receive has passed through their hands. That is not a detail. That is the product. Chapter 4 — The Community More Than Coffee. A Movement. When women work together, knowledge is shared, standards rise, and communities grow stronger. What you see here is not just a sorting station — it is an economic engine. These women earn fair wages, build skills, and support their families through the coffee they grow. Buying BeNa SheGrows Coffee is a direct investment in their future. No middlemen. No vague promises. Real impact, traceable to this table.',
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
          en: 'Chapter 1 — The Land Rwanda’s Highlands: Where It All Begins This is the view from our farm. Rows of drying beds stretch across the hillside, filled with thousands of hand-sorted coffee cherries, each one placed with intention. Behind them, Rwanda’s lush green valleys roll endlessly into the horizon. At over 1,500 metres above sea level, the air is cool, the soil is volcanic, and the conditions are extraordinary. This is not just a landscape — it is the reason our coffee tastes the way it does. Chapter 2 — The Harvest Only the Ripest. Only by Hand. Look at the colour of these cherries — a deep, vivid red that only comes from perfect ripeness. Each one was selected by hand, one by one, by women who know this crop intimately. No machines. No guessing. Just experienced hands and an uncompromising standard. This is the moment where quality is decided — long before the roaster, long before your cup.',
          de: 'Chapter 1 — The Land Rwanda’s Highlands: Where It All Begins This is the view from our farm. Rows of drying beds stretch across the hillside, filled with thousands of hand-sorted coffee cherries, each one placed with intention. Behind them, Rwanda’s lush green valleys roll endlessly into the horizon. At over 1,500 metres above sea level, the air is cool, the soil is volcanic, and the conditions are extraordinary. This is not just a landscape — it is the reason our coffee tastes the way it does. Chapter 2 — The Harvest Only the Ripest. Only by Hand. Look at the colour of these cherries — a deep, vivid red that only comes from perfect ripeness. Each one was selected by hand, one by one, by women who know this crop intimately. No machines. No guessing. Just experienced hands and an uncompromising standard. This is the moment where quality is decided — long before the roaster, long before your cup.',
          fr: 'Chapter 1 — The Land Rwanda’s Highlands: Where It All Begins This is the view from our farm. Rows of drying beds stretch across the hillside, filled with thousands of hand-sorted coffee cherries, each one placed with intention. Behind them, Rwanda’s lush green valleys roll endlessly into the horizon. At over 1,500 metres above sea level, the air is cool, the soil is volcanic, and the conditions are extraordinary. This is not just a landscape — it is the reason our coffee tastes the way it does. Chapter 2 — The Harvest Only the Ripest. Only by Hand. Look at the colour of these cherries — a deep, vivid red that only comes from perfect ripeness. Each one was selected by hand, one by one, by women who know this crop intimately. No machines. No guessing. Just experienced hands and an uncompromising standard. This is the moment where quality is decided — long before the roaster, long before your cup.',
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
          en: 'Chapter 5 — The Drying Patience Is an Ingredient. High above the valley, on raised wooden drying beds, the cherries rest under the open sky. A worker tends to them carefully — turning, checking, ensuring even drying across every layer. This process takes weeks. It cannot be rushed. The slow, natural drying under Rwanda’s highland sun is what develops the complex fruit and floral notes that make this coffee exceptional. You cannot taste shortcuts. But you can always taste patience. Chapter 6 — The Scale Hundreds of Hands. One Standard. Across the full width of the drying station, women work in unison — each responsible for her section, each upholding the same standard. This is not a factory. There is no conveyor belt. Every movement is human, every decision is made by someone who takes pride in what they produce. The scale of this operation is a testament to what women-led agriculture can achieve when given the right support and recognition.',
          de: 'Chapter 5 — The Drying Patience Is an Ingredient. High above the valley, on raised wooden drying beds, the cherries rest under the open sky. A worker tends to them carefully — turning, checking, ensuring even drying across every layer. This process takes weeks. It cannot be rushed. The slow, natural drying under Rwanda’s highland sun is what develops the complex fruit and floral notes that make this coffee exceptional. You cannot taste shortcuts. But you can always taste patience. Chapter 6 — The Scale Hundreds of Hands. One Standard. Across the full width of the drying station, women work in unison — each responsible for her section, each upholding the same standard. This is not a factory. There is no conveyor belt. Every movement is human, every decision is made by someone who takes pride in what they produce. The scale of this operation is a testament to what women-led agriculture can achieve when given the right support and recognition.',
          fr: 'Chapter 5 — The Drying Patience Is an Ingredient. High above the valley, on raised wooden drying beds, the cherries rest under the open sky. A worker tends to them carefully — turning, checking, ensuring even drying across every layer. This process takes weeks. It cannot be rushed. The slow, natural drying under Rwanda’s highland sun is what develops the complex fruit and floral notes that make this coffee exceptional. You cannot taste shortcuts. But you can always taste patience. Chapter 6 — The Scale Hundreds of Hands. One Standard. Across the full width of the drying station, women work in unison — each responsible for her section, each upholding the same standard. This is not a factory. There is no conveyor belt. Every movement is human, every decision is made by someone who takes pride in what they produce. The scale of this operation is a testament to what women-led agriculture can achieve when given the right support and recognition.',
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
          en: 'BeNa SheGrows Coffee Handpicked in Rwanda. Crafted for the World. This is the coffee. This is the story. And soon, it will be in your cup. Join us for the launch and be among the first to experience BeNa SheGrows Coffee.',
          de: 'BeNa SheGrows Coffee Handpicked in Rwanda. Crafted for the World. This is the coffee. This is the story. And soon, it will be in your cup. Join us for the launch and be among the first to experience BeNa SheGrows Coffee.',
          fr: 'BeNa SheGrows Coffee Handpicked in Rwanda. Crafted for the World. This is the coffee. This is the story. And soon, it will be in your cup. Join us for the launch and be among the first to experience BeNa SheGrows Coffee.',
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
