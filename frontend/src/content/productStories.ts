/**
 * Product stories shown on /about and /about/products/:slug.
 *
 * To add a product:
 * 1. Add one object to PRODUCT_STORIES with a unique `slug`.
 * 2. Fill in the copy for English, German and French.
 * 3. Add a live `productHandle`, or a `searchQuery` when the product is not
 *    currently published in the Shopify catalog.
 *
 * The About grid and the story route are generated from this list, so no page
 * component needs to change when another product story is added.
 */
export type ProductStoryLanguage = 'en' | 'de' | 'fr';
export type ProductStoryIcon = 'coffee' | 'honey' | 'fish' | 'beans';

export type LocalizedText = Record<ProductStoryLanguage, string>;

export interface ProductStory {
  slug: string;
  icon: ProductStoryIcon;
  productHandle?: string;
  searchQuery?: string;
  title: LocalizedText;
  summary: LocalizedText;
  body: LocalizedText;
  detail: LocalizedText;
}

export const PRODUCT_STORIES: readonly ProductStory[] = [
  {
    slug: 'coffee',
    icon: 'coffee',
    productHandle: 'premium-rwandan-arabica-coffee-freshly-roasted',
    title: {
      en: 'Coffee',
      de: 'Kaffee',
      fr: 'Café',
    },
    summary: {
      en: 'Rwandan Arabica, freshly roasted in 250 g, 500 g and 1 kg packs.',
      de: 'Ruandischer Arabica, frisch geröstet in 250-g-, 500-g- und 1-kg-Packungen.',
      fr: 'Arabica rwandais, fraîchement torréfié en paquets de 250 g, 500 g et 1 kg.',
    },
    body: {
      en: 'Coffee is where BeNa Origins started. Our current range is Rwandan Arabica, roasted for a clean cup and sold in three pack sizes.',
      de: 'Kaffee steht am Anfang von BeNa Origins. Unser aktuelles Sortiment ist ruandischer Arabica, geröstet für eine klare Tasse und in drei Packungsgrößen erhältlich.',
      fr: 'Le café est le point de départ de BeNa Origins. Notre gamme actuelle est un Arabica rwandais, torréfié pour une tasse nette et proposé en trois formats.',
    },
    detail: {
      en: 'Each pack shows its price per kilogram, so you can compare the 250 g, 500 g and 1 kg options before choosing.',
      de: 'Jede Packung zeigt den Preis pro Kilogramm, damit du 250 g, 500 g und 1 kg vor dem Kauf vergleichen kannst.',
      fr: 'Chaque paquet affiche son prix au kilogramme, pour comparer facilement les options de 250 g, 500 g et 1 kg avant de choisir.',
    },
  },
  {
    slug: 'ubuki',
    icon: 'honey',
    productHandle: '🍯-natural-honey-from-rwanda-500g',
    title: {
      en: 'Ubuki — honey',
      de: 'Ubuki — Honig',
      fr: 'Ubuki — miel',
    },
    summary: {
      en: 'A pantry staple with a long place in African kitchens.',
      de: 'Ein Grundnahrungsmittel mit einem festen Platz in afrikanischen Küchen.',
      fr: 'Un produit de base bien installé dans les cuisines africaines.',
    },
    body: {
      en: 'Ubuki is the Kinyarwanda word for honey. Our honey comes in a 500 g jar and works as a natural sweetener for tea, porridge and baking.',
      de: 'Ubuki ist das kinyarwandische Wort für Honig. Unser Honig kommt in einem 500-g-Glas und eignet sich als natürliche Süße für Tee, Porridge und Backwaren.',
      fr: 'Ubuki est le mot kinyarwanda pour le miel. Notre miel est proposé en pot de 500 g et sert de douceur naturelle pour le thé, les bouillies et la pâtisserie.',
    },
    detail: {
      en: 'When it is out of stock, the product page says so clearly. The story stays here, ready for the next harvest.',
      de: 'Wenn er ausverkauft ist, zeigt die Produktseite das deutlich. Die Geschichte bleibt hier und wartet auf die nächste Ernte.',
      fr: 'Lorsqu’il est épuisé, la fiche produit l’indique clairement. L’histoire reste ici, prête pour la prochaine récolte.',
    },
  },
  {
    slug: 'indagara',
    icon: 'fish',
    productHandle: 'ifu-y-indagara-200g',
    searchQuery: 'indagara',
    title: {
      en: 'Indagara',
      de: 'Indagara',
      fr: 'Indagara',
    },
    summary: {
      en: 'Small dried fish, sold whole or ground as Ifu Y’Indagara.',
      de: 'Kleine getrocknete Fische, ganz oder gemahlen als Ifu Y’Indagara.',
      fr: 'Petits poissons séchés, vendus entiers ou moulus en Ifu Y’Indagara.',
    },
    body: {
      en: 'Indagara is a traditional ingredient in Rwandan cooking. We stock whole dried indagara and Ifu Y’Indagara, the ground version used to build savoury sauces.',
      de: 'Indagara ist eine traditionelle Zutat der ruandischen Küche. Wir führen ganzen getrockneten Indagara und Ifu Y’Indagara, die gemahlene Variante für herzhafte Saucen.',
      fr: 'L’indagara est un ingrédient traditionnel de la cuisine rwandaise. Nous proposons de l’indagara séché entier et de l’Ifu Y’Indagara, la version moulue utilisée pour les sauces salées.',
    },
    detail: {
      en: 'Both are sold in 200 g packs, with the price per kilogram shown alongside the pack price.',
      de: 'Beide gibt es in 200-g-Packungen, mit dem Preis pro Kilogramm neben dem Packungspreis.',
      fr: 'Les deux sont vendus en paquets de 200 g, avec le prix au kilogramme affiché à côté du prix du paquet.',
    },
  },
  {
    slug: 'ibishyimbo',
    icon: 'beans',
    searchQuery: 'beans',
    title: {
      en: 'Ibishyimbo — beans',
      de: 'Ibishyimbo — Bohnen',
      fr: 'Ibishyimbo — haricots',
    },
    summary: {
      en: 'An everyday staple of East African cooking.',
      de: 'Ein Alltagsgrundnahrungsmittel der ostafrikanischen Küche.',
      fr: 'Un aliment de base du quotidien en Afrique de l’Est.',
    },
    body: {
      en: 'Ibishyimbo means beans. They belong in the everyday pantry we want to make easier to find in Europe, alongside flours, spices and sauces.',
      de: 'Ibishyimbo bedeutet Bohnen. Sie gehören zu der Alltagsküche, die wir in Europa leichter zugänglich machen wollen — zusammen mit Mehlen, Gewürzen und Saucen.',
      fr: 'Ibishyimbo signifie haricots. Ils font partie du garde-manger quotidien que nous voulons rendre plus facile à trouver en Europe, avec les farines, les épices et les sauces.',
    },
    detail: {
      en: 'When beans are in stock, the catalog and search show the live product and its current price. This page keeps the story in one place as the range grows.',
      de: 'Wenn Bohnen verfügbar sind, zeigen Katalog und Suche das aktuelle Produkt und seinen Preis. Diese Seite hält die Geschichte an einem Ort fest, während das Sortiment wächst.',
      fr: 'Lorsque les haricots sont disponibles, le catalogue et la recherche affichent le produit et son prix actuel. Cette page garde l’histoire au même endroit à mesure que la gamme s’agrandit.',
    },
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
