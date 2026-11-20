import type { Logger } from 'pino';
import type { AppConfig } from '../config/env';
import type { Product } from '../types/domain';
import type { AISuggestion, AISuggestedField } from '../types/domain';
import { featureDisabled, upstreamUnavailable } from '../utils/errors';

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream: boolean;
  temperature: number;
  format?: 'json';
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

interface RawSuggestion {
  ingredients?: { value?: string; confidence?: number; rationale?: string };
  allergens?: { value?: string; confidence?: number; rationale?: string };
  nutrition?: { value?: string; confidence?: number; rationale?: string };
  origin?: { value?: string; confidence?: number; rationale?: string };
  preparation?: { value?: string; confidence?: number; rationale?: string };
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
    rationale: typeof raw.rationale === 'string' && raw.rationale.trim().length > 0 ? raw.rationale.trim() : 'No rationale provided.',
  };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  // Strip markdown fences if present.
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
 * AI ingredient/allergen suggestion service.
 *
 * Uses a free local Ollama model — no external API calls and no per-request cost.
 * Outputs are suggestions only: `verified` is false, `needsReview` is true, and
 * nothing is written to Shopify automatically. Allergen suggestions require
 * extra caution and must be reviewed by an owner before being trusted.
 */
export class AiService {
  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger,
  ) {}

  async suggest(product: Product): Promise<AISuggestion> {
    if (!this.config.ai.enabled) {
      throw featureDisabled(
        'AI suggestions are disabled. Set AI_ENABLED=true and ensure Ollama is running.',
      );
    }

    const prompt = this.buildPrompt(product);
    let raw: unknown;
    try {
      raw = await this.callOllama(prompt);
    } catch (err) {
      this.logger.warn({ err, productId: product.id }, 'Ollama suggestion failed');
      if (err instanceof Error && err.message.includes('Ollama returned')) {
        throw upstreamUnavailable(err.message);
      }
      throw upstreamUnavailable('Ollama is unreachable. Start Ollama and ensure the model is pulled.');
    }

    let parsed: RawSuggestion;
    try {
      parsed = extractJson(typeof raw === 'string' ? raw : JSON.stringify(raw)) as RawSuggestion;
    } catch (err) {
      this.logger.warn({ err, productId: product.id, raw }, 'Failed to parse Ollama JSON');
      throw upstreamUnavailable('The model returned an unparseable response. Try again.');
    }

    const now = new Date().toISOString();
    const model = this.config.ai.ollama.model;

    const ingredients = toSuggestedField(parsed.ingredients);
    const allergens = toSuggestedField(parsed.allergens);
    const nutrition = toSuggestedField(parsed.nutrition);
    const origin = toSuggestedField(parsed.origin);
    const preparation = toSuggestedField(parsed.preparation);

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
      suggestedAt: now,
      model,
      ingredients,
      allergens,
      nutrition,
      origin,
      preparation,
      disclaimer,
    };
  }

  private buildPrompt(product: Product): string {
    const fields: string[] = [];
    const meta = product.metafields;
    if (meta.ingredients) fields.push(`Existing ingredients: ${meta.ingredients.value}`);
    if (meta.allergens) fields.push(`Existing allergens: ${meta.allergens.value}`);
    if (meta.nutrition) fields.push(`Existing nutrition: ${meta.nutrition.value}`);
    if (meta.origin) fields.push(`Existing origin: ${meta.origin}`);
    if (meta.preparation) fields.push(`Existing preparation: ${meta.preparation}`);
    const existing = fields.length > 0 ? fields.join('\n') : 'No existing metafield values found.';

    return `You are a careful food-label assistant. Suggest ingredient, allergen, nutrition, origin, and preparation values for the product below.

Product title: ${product.title}
Product handle: ${product.handle}

Existing metafield values (may be empty or incomplete):
${existing}

Rules:
- Suggest values only from what is plausible for this type of product. Do not invent specific brands or batch codes.
- For allergens, be conservative: only list major allergens that are plausibly present (e.g. milk, eggs, nuts, gluten, soy, sesame, sulphites). When unsure, list "unspecified" rather than guessing.
- confidence must be a number between 0 and 1.
- rationale must be a short sentence explaining the suggestion.
- Output ONLY a single JSON object, no markdown fences, no extra text.

Required JSON shape:
{
  "ingredients": { "value": "string or null", "confidence": 0.0-1.0, "rationale": "string" },
  "allergens": { "value": "string or null", "confidence": 0.0-1.0, "rationale": "string" },
  "nutrition": { "value": "string or null", "confidence": 0.0-1.0, "rationale": "string" },
  "origin": { "value": "string or null", "confidence": 0.0-1.0, "rationale": "string" },
  "preparation": { "value": "string or null", "confidence": 0.0-1.0, "rationale": "string" }
}`;
  }

  private async callOllama(prompt: string): Promise<string> {
    const baseUrl = this.config.ai.ollama.baseUrl;
    const model = this.config.ai.ollama.model;
    const temperature = this.config.ai.ollama.temperature;

    const body: OllamaGenerateRequest = {
      model,
      prompt,
      stream: false,
      temperature,
      format: 'json',
    };

    this.logger.debug({ model, baseUrl }, 'calling ollama generate');

    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      throw new Error(`Ollama returned ${res.status}`);
    }

    const data: OllamaGenerateResponse = (await res.json()) as OllamaGenerateResponse;
    return data.response;
  }
}
