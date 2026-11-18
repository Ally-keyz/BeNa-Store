import type { CommerceClient, PolicySet, ShopPolicy } from '../types/domain';
import { extractBusinessNames, extractEmails, stripHtml, truncate } from '../utils/html';

const LEGAL_NOTICE_HANDLES = new Set([
  'impressum',
  'legal-notice',
  'legal_notice',
  'imprint',
  'mentions-legales',
  'aviso-legal',
  'note-legali',
]);

const POLICY_QUERY =
  'handle:impressum OR handle:legal-notice OR handle:imprint OR handle:legal_notice';

/**
 * Store policies are read from Shopify. The legal notice ("Impressum") is not
 * part of Shopify's shop policies, so it is looked up as a store page and the
 * gap is reported explicitly when it cannot be found.
 */
export class PoliciesService {
  constructor(private readonly client: CommerceClient) {}

  async get(): Promise<PolicySet> {
    const bundle = await this.client.getPolicies();
    const gaps = [...bundle.gaps];
    let legalNotice: ShopPolicy | null = bundle.policies.legalNotice;

    if (!legalNotice) {
      try {
        const pages = await this.client.getPages(POLICY_QUERY, 10);
        const page = pages.find((entry) => LEGAL_NOTICE_HANDLES.has(entry.handle.toLowerCase()));
        if (page) {
          legalNotice = {
            id: page.id,
            title: page.title,
            handle: page.handle,
            url: page.url,
            body: page.body,
          };
        }
      } catch {
        // Pages can be unavailable without a token or due to content scope.
        // The gap is reported below; this must not break the policies endpoint.
      }
    }

    if (!legalNotice) {
      try {
        // Fallback: list pages and match the handle client-side, because the
        // Storefront search syntax does not guarantee `handle:` filters.
        const pages = await this.client.getPages('', 50);
        const page = pages.find((entry) => LEGAL_NOTICE_HANDLES.has(entry.handle.toLowerCase()));
        if (page) {
          legalNotice = {
            id: page.id,
            title: page.title,
            handle: page.handle,
            url: page.url,
            body: page.body,
          };
        }
      } catch {
        // Keep the reported gap.
      }
    }

    if (legalNotice) {
      const gapIndex = gaps.indexOf('legalNotice');
      if (gapIndex >= 0) gaps.splice(gapIndex, 1);
    }

    const policies: PolicySet['policies'] = { ...bundle.policies, legalNotice };
    const allBodies = Object.values(policies)
      .filter((policy): policy is ShopPolicy => Boolean(policy))
      .map((policy) => policy.body);
    const emails = [...new Set(allBodies.flatMap((body) => extractEmails(body)))].sort();
    const businessNames = [...new Set(allBodies.flatMap((body) => extractBusinessNames(body)))];

    const inconsistentEmails = emails.length > 1;
    const inconsistentBusinessNames = businessNames.length > 1;

    const findings: string[] = [];
    if (inconsistentEmails) {
      findings.push(
        `Inconsistent contact emails across policies/legal pages (audit #6): ${emails.join(', ')}`,
      );
    }
    if (inconsistentBusinessNames) {
      findings.push(
        `Multiple business-name candidates across policies/legal pages (audit #6): ${businessNames.join(' | ')}`,
      );
    }

    for (const [key, policy] of Object.entries(policies) as Array<[keyof PolicySet['policies'], ShopPolicy | null]>) {
      if (!policy) {
        gaps.push(`${key}: not available from the Storefront API/public pages`);
      } else if (truncate(stripHtml(policy.body), 40).length === 0) {
        gaps.push(`${key}: policy body is empty`);
      }
    }

    // Audit #1: withdrawal function is a RISK FLAG, not a legal conclusion.
    const refundBody = stripHtml(policies.refund?.body ?? '');
    if (/widerruf|withdraw/i.test(refundBody)) {
      const hasElectronic = /(button|online form|electronic|elektronisch|online-widerruf)/i.test(
        refundBody,
      );
      if (!hasElectronic) {
        findings.push(
          'RISK FLAG (audit #1, not a legal conclusion): the refund policy describes withdrawal by email or post; no electronic withdrawal function is evident in the policy text. Verify against German rules (EVZ) before launch.',
        );
      }
    }

    return {
      shopName: bundle.shopName,
      updatedAt: new Date().toISOString(),
      policies,
      identity: {
        emails,
        businessNames,
        inconsistentEmails,
        inconsistentBusinessNames,
        findings,
      },
      gaps: [...new Set(gaps)],
    };
  }
}
