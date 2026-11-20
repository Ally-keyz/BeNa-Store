import type { MarketContext } from '../../types/domain';

export const IMAGE_FRAGMENT = /* GraphQL */ `
  fragment ImageFields on Image {
    url
    altText
    width
    height
  }
`;

export const MONEY_FRAGMENT = /* GraphQL */ `
  fragment MoneyFields on MoneyV2 {
    amount
    currencyCode
  }
`;

export function buildProductFragment(options: {
  tokenFields: boolean;
  includeMetafields: boolean;
}): string {
  const tags = options.tokenFields ? 'tags' : '';
  const quantity = options.tokenFields ? 'quantityAvailable' : '';
  const metafields = options.includeMetafields
    ? 'metafields(identifiers: $metafields) { namespace key type value }'
    : '';

  return /* GraphQL */ `
    fragment ProductFields on Product {
      id
      handle
      title
      description
      descriptionHtml
      vendor
      productType
      ${tags}
      availableForSale
      createdAt
      updatedAt
      publishedAt
      onlineStoreUrl
      seo {
        title
        description
      }
      priceRange {
        minVariantPrice { ...MoneyFields }
        maxVariantPrice { ...MoneyFields }
      }
      compareAtPriceRange {
        minVariantPrice { ...MoneyFields }
        maxVariantPrice { ...MoneyFields }
      }
      featuredImage { ...ImageFields }
      images(first: 20) {
        edges {
          node { ...ImageFields }
        }
      }
      options {
        id
        name
        values
      }
      variants(first: 100) {
        edges {
          node {
            id
            title
            sku
            availableForSale
            ${quantity}
            price { ...MoneyFields }
            compareAtPrice { ...MoneyFields }
            unitPrice { ...MoneyFields }
            unitPriceMeasurement {
              measuredType
              quantityUnit
              quantityValue
              referenceUnit
              referenceValue
            }
            requiresShipping
            selectedOptions {
              name
              value
            }
            image { ...ImageFields }
          }
        }
      }
      ${metafields}
    }
  `;
}

export const COLLECTION_FRAGMENT = /* GraphQL */ `
  fragment CollectionFields on Collection {
    id
    handle
    title
    description
    updatedAt
    image { ...ImageFields }
    seo {
      title
      description
    }
  }
`;

export const CART_FRAGMENT = /* GraphQL */ `
  fragment CartFields on Cart {
    id
    totalQuantity
    checkoutUrl
    createdAt
    updatedAt
    cost {
      subtotalAmount { ...MoneyFields }
      totalAmount { ...MoneyFields }
      totalTaxAmount { ...MoneyFields }
      totalDutyAmount { ...MoneyFields }
    }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          cost {
            amountPerQuantity { ...MoneyFields }
            subtotalAmount { ...MoneyFields }
            totalAmount { ...MoneyFields }
          }
          merchandise {
            ... on ProductVariant {
              id
              title
              sku
              availableForSale
              price { ...MoneyFields }
              image { ...ImageFields }
              selectedOptions {
                name
                value
              }
              product {
                id
                handle
                title
                description
                onlineStoreUrl
              }
            }
          }
        }
      }
    }
    discountCodes {
      code
      applicable
    }
    buyerIdentity {
      email
      phone
      countryCode
    }
    deliveryGroups(first: 5) {
      edges {
        node {
          id
          groupType
          deliveryOptions {
            handle
            title
            code
            deliveryMethodType
            estimatedCost { ...MoneyFields }
          }
          selectedDeliveryOption {
            handle
            title
            code
            deliveryMethodType
            estimatedCost { ...MoneyFields }
          }
        }
      }
    }
  }
`;

/**
 * Build the optional @inContext directive + variable definitions.
 * Shopify rejects `@inContext(country: null)`, so only include provided values.
 */
export function buildContext(ctx?: MarketContext): {
  directive: string;
  variableDefinitions: string[];
  variables: Record<string, unknown>;
} {
  const args: string[] = [];
  const variableDefinitions: string[] = [];
  const variables: Record<string, unknown> = {};
  if (ctx?.country) {
    variableDefinitions.push('$country: CountryCode');
    args.push('country: $country');
    variables.country = ctx.country;
  }
  if (ctx?.language) {
    variableDefinitions.push('$language: LanguageCode');
    args.push('language: $language');
    variables.language = ctx.language;
  }
  return {
    directive: args.length > 0 ? ` @inContext(${args.join(', ')})` : '',
    variableDefinitions,
    variables,
  };
}
