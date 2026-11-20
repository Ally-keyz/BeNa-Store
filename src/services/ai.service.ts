import type { Logger } from 'pino';
import type { AppConfig } from '../config/env';
import type { Product } from '../types/domain';
import type { AISuggestion, AISuggestedField } from '../types/domain';
import { AppError, featureDisabled, upstreamUnavailable } from '../utils/errors';

interface ChatCompletionRequest {
  model: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  temperature?: number;
  response_format?: { type: 'json_object' };
  max_completion_tokens: number;
}

interface ProviderErrorDetail {
  status: number;
  message?: string;
  raw?: string;
}

function oneLine(value: string, maxLength = 300): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface RawSuggestion {
  ingredients?: { value?: string; confidence?: number; rationale?: string };
  allergens?: { value?: string; confidence?: number; rationale?: string };
  nutrition?: { value?: string; confidence?: number; rationale?: string };
  origin?: { value?: string; confidence?: number; rationale?: string };
  preparation?: { value?: string; confidence?: number; rationale?: string };
}

interface CachedSuggestion {
  value: AISuggestion;
  expiresAt: number;
}

function clampConfidence(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function toSuggestedField(raw: RawSuggestion[keyof RawSuggestion] | undefined): AISuggestedField | null {
  if (!raw) return null;
  const value = typeof raw.value === 'string' && raw.value.trim().length > 0 ? raw.value.trim() : null;
  if (!value) return null;
  return {
    value,
    confidence: clampConfidence(raw.confidence),
    rationale:
      typeof raw.rationale === 'string' && raw.rationale.trim().length > 0
        ? raw.rationale.trim()
        : 'No rationale provided.',
  };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON object found in model response');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * Single-purpose AI service: advisory product facts only.
 * Uses one pretrained hosted model through an OpenAI-compatible API. No
 * training, no local runtime and no writes to Shopify. Outputs are marked as
 * unverified and must be checked against packaging before publication.
 */
export class AiService {
  private readonly cache = new Map<string, CachedSuggestion>();
  private readonly inFlight = new Map<string, Promise<AISuggestion>>();

  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger,
  ) {}

  async suggest(product: Product, options: { refresh?: boolean } = {}): Promise<AISuggestion> {
    const { apiKey, model, cacheTtlSeconds } = this.config.ai;
    if (!this.config.ai.enabled || !apiKey) {
      throw featureDisabled('AI suggestions are disabled. Set AI_API_KEY to enable them.');
    }

    const key = `${model}:${product.handle}`;
    const cached = this.cache.get(key);
    if (!options.refresh && cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const running = this.inFlight.get(key);
    if (running) return running;

    const task = this.generate(product)
      .then((suggestion) => {
        if (cacheTtlSeconds > 0) {
          this.cache.set(key, {
            value: suggestion,
            expiresAt: Date.now() + cacheTtlSeconds * 1000,
          });
        }
        return suggestion;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, task);
    return task;
  }

  private async generate(product: Product): Promise<AISuggestion> {
    let content: string;
    try {
      content = await this.callProvider(this.buildPrompt(product));
    } catch (err) {
      if (err instanceof AppError) throw err;
      this.logger.warn({ err, handle: product.handle }, 'AI provider request failed');
      throw upstreamUnavailable('AI provider is unreachable. Please try again later.');
    }

    let parsed: RawSuggestion;
    try {
      parsed = extractJson(content) as RawSuggestion;
    } catch (err) {
      this.logger.warn(
        { err, handle: product.handle, response: content.slice(0, 500) },
        'Failed to parse AI JSON',
      );
      throw upstreamUnavailable('The AI model returned an unparseable response. Try again.');
    }

    const disclaimer =
      'AI-generated suggestion — not a verified fact. Ingredients and allergens are ' +
      'suggestions only and must be checked against the product packaging before ' +
      'being published. This service does not modify Shopify data.';

    return {
      productId: product.id,
      handle: product.handle,
      title: product.title,
      verified: false,
      needsReview: true,
      suggestedAt: new Date().toISOString(),
      model: this.config.ai.model,
      ingredients: toSuggestedField(parsed.ingredients),
      allergens: toSuggestedField(parsed.allergens),
      nutrition: toSuggestedField(parsed.nutrition),
      origin: toSuggestedField(parsed.origin),
      preparation: toSuggestedField(parsed.preparation),
      disclaimer,
    };
  }

  private buildPrompt(product: Product): string {
    const fields: string[] = [];
    const meta = product.metafields;
    if (meta.ingredients) fields.push(`Existing ingredients: ${meta.ingredients.value}`);
    if (meta.allergens) fields.push(`Existing allergens: ${meta.allergens.value}`);
    if (meta.nutrition) fields.push(`Existing nutrition: ${meta.nutrition.value}`);
    if (meta.origin) fields.push(`Existing origin: ${meta.origin.value}`);
    if (meta.preparation) fields.push(`Existing preparation: ${meta.preparation.value}`);
    const existing = fields.length > 0 ? fields.join('\n') : 'No existing metafield values found.';

    return `Suggest food-label values for the product below.

Product title: ${product.title}
Product handle: ${product.handle}
Product description: ${product.description}

Existing metafield values (may be empty or incomplete):
${existing}

Rules:
- Suggest values only from what is plausible for this type of product. Do not invent brands or batch codes.
- For allergens, be conservative: list only major allergens plausibly present (milk, eggs, nuts, gluten, soy, sesame, sulphites). When unsure, use "unspecified".
- confidence must be a number between 0 and 1.
- rationale must be one short sentence.
- Return ONLY a single JSON object, no markdown fences, no extra text.

Required JSON shape:
{
  "ingredients": { "value": "string or null", "confidence": 0.0-1.0, "rationale": "string" },
  "allergens": { "value": "string or null", "confidence": 0.0-1.0, "rationale": "string" },
  "nutrition": { "value": "string or null", "confidence": 0.0-1.0, "rationale": "string" },
  "origin": { "value": "string or null", "confidence": 0.0-1.0, "rationale": "string" },
  "preparation": { "value": "string or null", "confidence": 0.0-1.0, "rationale": "string" }
}`;
  }

  private buildRequests(prompt: string): ChatCompletionRequest[] {
    const { model, temperature } = this.config.ai;
    const systemInstruction =
      'You are a careful food-label assistant. You only output the requested JSON object. ' +
      'You never claim that a suggestion is a verified fact.';
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: prompt },
    ];
    const fallbackMessages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'user', content: `${systemInstruction}\n\n${prompt}` },
    ];

    return [
      {
        model,
        temperature,
        response_format: { type: 'json_object' },
        max_completion_tokens: 800,
        messages,
      },
      {
        model,
        max_completion_tokens: 800,
        messages: fallbackMessages,
      },
    ];
  }

  private async readProviderError(res: Response): Promise<ProviderErrorDetail> {
    let raw = '';
    try {
      raw = await res.text();
    } catch {
      raw = '';
    }

    let message: string | undefined;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          error?: { message?: unknown };
          message?: unknown;
        };
        const candidate = parsed.error?.message ?? parsed.message;
        if (typeof candidate === 'string' && candidate.trim()) {
          message = oneLine(candidate);
        }
      } catch {
        message = undefined;
      }
    }

    return {
      status: res.status,
      message,
      raw: raw ? oneLine(raw, 1000) : undefined,
    };
  }

  private providerFailure(detail: ProviderErrorDetail): AppError {
    const suffix = detail.message ? `: ${detail.message}` : '';
    if (detail.status === 401 || detail.status === 403) {
      return upstreamUnavailable(`AI API key was rejected. Check AI_API_KEY.${suffix}`);
    }
    if (detail.status === 429) {
      return upstreamUnavailable(`AI provider rate limit reached. Please try again later.${suffix}`);
    }
    return upstreamUnavailable(`AI provider returned ${detail.status}${suffix}`);
  }

  private async callProvider(prompt: string): Promise<string> {
    const { apiKey, baseUrl } = this.config.ai;
    if (!apiKey) {
      throw featureDisabled('AI suggestions are disabled. Set AI_API_KEY to enable them.');
    }

    let lastError: ProviderErrorDetail | undefined;
    for (const [attempt, body] of this.buildRequests(prompt).entries()) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });

      if (res.ok) {
        const data = (await res.json()) as ChatCompletionResponse;
        const content = data.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || !content.trim()) {
          throw new Error('AI provider returned no content');
        }
        return content;
      }

      lastError = await this.readProviderError(res);
      this.logger.warn(
        {
          status: lastError.status,
          attempt: attempt + 1,
          model: body.model,
          endpoint: baseUrl,
          providerMessage: lastError.message,
          providerResponse: lastError.raw,
        },
        'AI provider rejected chat completion request',
      );

      if (lastError.status !== 400) {
        throw this.providerFailure(lastError);
      }
    }

    throw this.providerFailure(lastError ?? { status: 400 });
  }
}
