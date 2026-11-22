/**
 * Product stories shown on /about and /about/products/:slug.
 *
 * Each story walks through five stages of the product's journey: the people who
 * prepare it, how it is grown or made, who makes it, how it is exported and how
 * BeNa packs it. Every stage has its own image. Coffee and honey use media
 * supplied by the store owner; other stories use illustrative Wikimedia Commons
 * photography. Credits are shown on the story page.
 *
 * To add a product:
 * 1. Add one object to PRODUCT_STORIES with a unique `slug`.
 * 2. Fill in the copy for English, German and French, including every section.
 * 3. Add a live `productHandle`, or a `searchQuery` when the product is not
 *    currently published in the Shopify catalog.
 *
 * The About grid and the story route are generated from this list, so no page
 * component needs to change when another product story is added.
 */
export type ProductStoryLanguage = 'en' | 'de' | 'fr';
export type ProductStoryIcon = 'coffee' | 'honey' | 'fish' | 'beans';
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
  icon: ProductStoryIcon;
  productHandle?: string;
  searchQuery?: string;
  title: LocalizedText;
  summary: LocalizedText;
  body: LocalizedText;
  detail: LocalizedText;
  hero?: StoryImage;
  sections: readonly StorySection[];
  gallery?: readonly StoryImage[];
  videos?: readonly StoryVideo[];
}

const IMAGES = {
  beans: '/images/stories/beans',
  coffee: '/images/stories/coffee',
  fish: '/images/stories/fish',
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

const PACKING = {
  image: `${IMAGES.shared}/packing.webp`,
  alt: {
    en: 'A shipping label being stuck on a parcel',
    de: 'Ein Versandetikett wird auf ein Paket geklebt',
    fr: 'Une étiquette d’expédition est apposée sur un colis',
  },
  credit: 'Meanwell Packaging · CC BY 2.0',
  creditUrl: 'https://commons.wikimedia.org/wiki/File:Sticking_a_label_onto_a_parcel_for_shipping.jpg',
} as const;

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
      en: 'When the shop supplies a price per kilogram, it helps you compare the 250 g, 500 g and 1 kg options before choosing.',
      de: 'Wenn der Shop einen Preis pro Kilogramm liefert, kannst du die Optionen 250 g, 500 g und 1 kg vor dem Kauf vergleichen.',
      fr: 'Lorsque la boutique fournit un prix au kilogramme, il permet de comparer les options 250 g, 500 g et 1 kg avant de choisir.',
    },
    hero: {
      image: `${IMAGES.coffee}/feature.webp`,
      imageAlt: {
        en: 'Coffee beans ready for roasting',
        de: 'Kaffeebohnen, bereit zum Rösten',
        fr: 'Des grains de café prêts à être torréfiés',
      },
      ...BENA_MEDIA,
    },
    sections: [
      {
        key: 'people',
        body: {
          en: 'Rwandan coffee begins with smallholder farmers who grow Arabica on hillside plots. Ripe cherries are picked by hand, often by the families who tend the trees.',
          de: 'Ruandischer Kaffee beginnt bei Kleinbauern, die Arabica auf Hügelfeldern anbauen. Reife Kirschen werden von Hand gepflückt, oft von den Familien, die die Bäume pflegen.',
          fr: 'Le café rwandais commence avec de petits producteurs qui cultivent l’arabica sur les collines. Les cerises mûres sont cueillies à la main, souvent par les familles qui entretiennent les arbres.',
        },
        image: `${IMAGES.coffee}/farm-team.webp`,
        imageAlt: {
          en: 'People working together on a coffee farm',
          de: 'Menschen, die gemeinsam auf einer Kaffeefarm arbeiten',
          fr: 'Des personnes travaillant ensemble dans une plantation de café',
        },
        ...BENA_MEDIA,
      },
      {
        key: 'grown',
        body: {
          en: 'After picking, the cherries are pulped to remove the skin, washed, fermented and dried in the sun. The dried parchment is milled and graded, leaving the green beans that are ready to roast.',
          de: 'Nach der Ernte wird das Fruchtfleisch entfernt, die Kirschen werden gewaschen, fermentiert und in der Sonne getrocknet. Das getrocknete Pergament wird geschält und sortiert, übrig bleiben die grünen Bohnen zum Rösten.',
          fr: 'Après la récolte, les cerises sont dépulpées, lavées, fermentées puis séchées au soleil. Le parchemin séché est décortiqué et trié, laissant les grains verts prêts à être torréfiés.',
        },
        image: `${IMAGES.coffee}/harvesting.webp`,
        imageAlt: {
          en: 'Ripe coffee cherries being harvested',
          de: 'Reife Kaffeekirschen bei der Ernte',
          fr: 'Des cerises de café mûres en cours de récolte',
        },
        ...BENA_MEDIA,
      },
      {
        key: 'made',
        body: {
          en: 'Local washing stations and mills handle the cherries close to where they are grown. The green coffee is then roasted so the beans develop the flavour you find in the cup.',
          de: 'Lokale Waschanlagen und Mühlen verarbeiten die Kirschen in der Nähe des Anbaugebiets. Danach wird der grüne Kaffee geröstet, damit sich das Aroma in der Tasse entwickelt.',
          fr: 'Les stations de lavage et les moulins locaux traitent les cerises près des zones de culture. Le café vert est ensuite torréfié pour que les arômes se développent dans la tasse.',
        },
        image: `${IMAGES.coffee}/grains-in-hands.webp`,
        imageAlt: {
          en: 'Hands holding roasted coffee grains',
          de: 'Hände mit gerösteten Kaffeebohnen',
          fr: 'Des mains tenant des grains de café torréfiés',
        },
        ...BENA_MEDIA,
      },
      {
        key: 'exported',
        body: {
          en: 'Green or roasted coffee travels from the producing country in sealed sacks. It moves by container through regional ports and is imported into the European Union before it reaches our shelves.',
          de: 'Grüner oder gerösteter Kaffee reist in versiegelten Säcken aus dem Herkunftsland. Er geht per Container über regionale Häfen und wird in die Europäische Union eingeführt, bevor er in unser Regal kommt.',
          fr: 'Le café vert ou torréfié voyage depuis le pays producteur dans des sacs scellés. Il transite par conteneur via des ports régionaux et est importé dans l’Union européenne avant d’atteindre nos rayons.',
        },
        image: EXPORT.image,
        imageAlt: EXPORT.alt,
        credit: EXPORT.credit,
        creditUrl: EXPORT.creditUrl,
      },
      {
        key: 'packed',
        body: {
          en: 'In our Zierenberg store the roasted beans are portioned into 250 g, 500 g and 1 kg packs, sealed, labelled with the roast information and prepared for dispatch.',
          de: 'In unserem Store in Zierenberg werden die gerösteten Bohnen in 250-g-, 500-g- und 1-kg-Packungen abgeteilt, versiegelt, mit Röstinformationen etikettiert und für den Versand vorbereitet.',
          fr: 'Dans notre boutique de Zierenberg, les grains torréfiés sont portionnés en paquets de 250 g, 500 g et 1 kg, scellés, étiquetés avec les informations de torréfaction puis préparés pour l’expédition.',
        },
        image: PACKING.image,
        imageAlt: PACKING.alt,
        credit: PACKING.credit,
        creditUrl: PACKING.creditUrl,
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
          en: 'Coffee drying after harvest',
          de: 'Trocknender Kaffee nach der Ernte',
          fr: 'Du café en train de sécher après la récolte',
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
          en: 'At BeNa we check each jar, label it with the origin and best-before date and pack it securely for shipping from Zierenberg.',
          de: 'Bei BeNa prüfen wir jedes Glas, etikettieren es mit Herkunft und Mindesthaltbarkeitsdatum und verpacken es sicher für den Versand aus Zierenberg.',
          fr: 'Chez BeNa, nous vérifions chaque pot, l’étiquetons avec l’origine et la date de durabilité minimale, puis l’emballons soigneusement pour l’expédition depuis Zierenberg.',
        },
        image: PACKING.image,
        imageAlt: PACKING.alt,
        credit: PACKING.credit,
        creditUrl: PACKING.creditUrl,
      },
    ],
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
      en: 'Both are sold in 200 g packs. A price per kilogram is shown only when the shop supplies one; otherwise you see the pack price.',
      de: 'Beide gibt es in 200-g-Packungen. Ein Preis pro Kilogramm erscheint nur, wenn ihn der Shop liefert; sonst siehst du den Packungspreis.',
      fr: 'Les deux sont vendus en paquets de 200 g. Le prix au kilogramme n’est affiché que lorsque la boutique le fournit ; sinon, seul le prix du paquet est indiqué.',
    },
    sections: [
      {
        key: 'people',
        body: {
          en: 'Indagara is linked to fishing communities on the region’s great lakes. Small fish are caught with nets and landed close to the shore.',
          de: 'Indagara ist mit Fischergemeinschaften an den großen Seen der Region verbunden. Kleine Fische werden mit Netzen gefangen und nahe dem Ufer angelandet.',
          fr: 'L’indagara est lié aux communautés de pêcheurs des grands lacs de la région. Les petits poissons sont capturés au filet et débarqués près de la rive.',
        },
        image: `${IMAGES.fish}/people.webp`,
        imageAlt: {
          en: 'Fishermen on Lake Kivu',
          de: 'Fischer auf dem Kivuse',
          fr: 'Des pêcheurs sur le lac Kivu',
        },
        credit: 'Ukundamahoro8 · CC BY-SA 4.0',
        creditUrl: 'https://commons.wikimedia.org/wiki/File:Boat_and_fishermen_in_lake_kivu.jpg',
      },
      {
        key: 'grown',
        body: {
          en: 'The catch is cleaned and laid out to dry in the sun. Once dry, the fish is either packed whole or ground into Ifu Y’Indagara.',
          de: 'Der Fang wird gereinigt und zum Trocknen in der Sonne ausgelegt. Ist er trocken, wird der Fisch ganz verpackt oder zu Ifu Y’Indagara gemahlen.',
          fr: 'La pêche est nettoyée puis étalée au soleil pour sécher. Une fois sec, le poisson est emballé entier ou moulu en Ifu Y’Indagara.',
        },
        image: `${IMAGES.fish}/grown.webp`,
        imageAlt: {
          en: 'Fish drying in the sun',
          de: 'In der Sonne trocknende Fische',
          fr: 'Du poisson en train de sécher au soleil',
        },
        credit: 'Bernard Gagnon · CC0',
        creditUrl: 'https://commons.wikimedia.org/wiki/File:Drying_fish_at_Daepo_Port.jpg',
      },
      {
        key: 'made',
        body: {
          en: 'Drying and grinding happen close to the landing sites, so the fish can be stored and transported without refrigeration.',
          de: 'Trocknen und Mahlen finden in der Nähe der Anlandestellen statt, damit der Fisch ohne Kühlung gelagert und transportiert werden kann.',
          fr: 'Le séchage et le broyage sont effectués près des sites de débarquement, afin que le poisson puisse être stocké et transporté sans réfrigération.',
        },
        image: `${IMAGES.fish}/made.webp`,
        imageAlt: {
          en: 'Dried fish for sale',
          de: 'Getrocknete Fische im Verkauf',
          fr: 'Du poisson séché à la vente',
        },
        credit: 'Kritzolina · CC BY-SA 4.0',
        creditUrl: 'https://commons.wikimedia.org/wiki/File:Dried_fish_in_Chittagong_03.jpg',
      },
      {
        key: 'exported',
        body: {
          en: 'The dried fish is packed in moisture-resistant sacks and shipped in containers to Europe, where it enters under EU food-import controls.',
          de: 'Der getrocknete Fisch wird in feuchtigkeitsbeständige Säcke gepackt und in Containern nach Europa verschifft, wo er den EU-Lebensmitteleinfuhrkontrollen unterliegt.',
          fr: 'Le poisson séché est emballé dans des sacs résistants à l’humidité et expédié par conteneur vers l’Europe, où il est soumis aux contrôles alimentaires de l’UE.',
        },
        image: EXPORT.image,
        imageAlt: EXPORT.alt,
        credit: EXPORT.credit,
        creditUrl: EXPORT.creditUrl,
      },
      {
        key: 'packed',
        body: {
          en: 'At our Zierenberg store the whole fish and the ground version are portioned into 200 g packs, sealed and labelled for dispatch.',
          de: 'In unserem Store in Zierenberg werden der ganze Fisch und die gemahlene Variante in 200-g-Packungen abgeteilt, versiegelt und für den Versand etikettiert.',
          fr: 'Dans notre boutique de Zierenberg, le poisson entier et la version moulue sont portionnés en paquets de 200 g, scellés et étiquetés pour l’expédition.',
        },
        image: PACKING.image,
        imageAlt: PACKING.alt,
        credit: PACKING.credit,
        creditUrl: PACKING.creditUrl,
      },
    ],
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
    sections: [
      {
        key: 'people',
        body: {
          en: 'Ibishyimbo are grown by smallholder farming families. Beans are often planted alongside other crops and harvested by hand.',
          de: 'Ibishyimbo werden von Kleinbauernfamilien angebaut. Bohnen werden oft zusammen mit anderen Kulturen gepflanzt und von Hand geerntet.',
          fr: 'Les ibishyimbo sont cultivés par des familles de petits producteurs. Les haricots sont souvent plantés avec d’autres cultures et récoltés à la main.',
        },
        image: `${IMAGES.beans}/people.webp`,
        imageAlt: {
          en: 'A bean harvest on a farm',
          de: 'Eine Bohnenernte auf einem Bauernhof',
          fr: 'Une récolte de haricots dans une ferme',
        },
        credit: 'Deborah Tjituka · CC BY-SA 4.0',
        creditUrl: 'https://commons.wikimedia.org/wiki/File:Bean_harvest_at_Bobonong_farms.jpg',
      },
      {
        key: 'grown',
        body: {
          en: 'The pods are picked when the beans inside are mature. They are shelled, dried further and sorted so that damaged beans are removed.',
          de: 'Die Hülsen werden geerntet, wenn die Bohnen darin reif sind. Sie werden ausgelöst, weiter getrocknet und sortiert, damit beschädigte Bohnen entfernt werden.',
          fr: 'Les gousses sont récoltées lorsque les grains sont matures. Ils sont écossés, séchés davantage et triés pour éliminer les grains abîmés.',
        },
        image: `${IMAGES.beans}/grown.webp`,
        imageAlt: {
          en: 'Harvested beans drying',
          de: 'Geerntete Bohnen beim Trocknen',
          fr: 'Haricots récoltés en train de sécher',
        },
        credit: 'Mr. Snatch · CC BY-SA 4.0',
        creditUrl: 'https://commons.wikimedia.org/wiki/File:Harvest_of_Nutritious_Beans.jpg',
      },
      {
        key: 'made',
        body: {
          en: 'Local collection points and markets grade the dried beans before they are bagged. BeNa selects the lots that reach our catalog.',
          de: 'Lokale Sammelstellen und Märkte sortieren die getrockneten Bohnen, bevor sie in Säcke gefüllt werden. BeNa wählt die Partien aus, die in unseren Katalog kommen.',
          fr: 'Les points de collecte et les marchés locaux classent les haricots secs avant leur mise en sac. BeNa sélectionne les lots qui entrent dans notre catalogue.',
        },
        image: `${IMAGES.beans}/made.webp`,
        imageAlt: {
          en: 'Beans for sale at a market',
          de: 'Bohnen im Verkauf auf einem Markt',
          fr: 'Des haricots à la vente sur un marché',
        },
        credit: 'Yahuzaishat · CC BY-SA 4.0',
        creditUrl: 'https://commons.wikimedia.org/wiki/File:BEANS_IN_GOMBE_OLD_MARKET.jpg',
      },
      {
        key: 'exported',
        body: {
          en: 'The bagged beans travel by container to Europe. Like other plant foods, they are checked at import before they are allowed onto the market.',
          de: 'Die abgesackten Bohnen reisen per Container nach Europa. Wie andere pflanzliche Lebensmittel werden sie bei der Einfuhr geprüft, bevor sie in den Handel gelangen.',
          fr: 'Les haricots ensachés voyagent par conteneur vers l’Europe. Comme d’autres denrées végétales, ils sont contrôlés à l’importation avant d’être commercialisés.',
        },
        image: EXPORT.image,
        imageAlt: EXPORT.alt,
        credit: EXPORT.credit,
        creditUrl: EXPORT.creditUrl,
      },
      {
        key: 'packed',
        body: {
          en: 'From Zierenberg we send the beans out in sealed packs with a label that names the product, origin and best-before date.',
          de: 'Von Zierenberg aus versenden wir die Bohnen in versiegelten Packungen mit einem Etikett, das Produkt, Herkunft und Mindesthaltbarkeitsdatum nennt.',
          fr: 'Depuis Zierenberg, nous expédions les haricots dans des paquets scellés portant une étiquette avec le produit, l’origine et la date de durabilité minimale.',
        },
        image: PACKING.image,
        imageAlt: PACKING.alt,
        credit: PACKING.credit,
        creditUrl: PACKING.creditUrl,
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
