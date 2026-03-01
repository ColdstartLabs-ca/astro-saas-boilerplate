/**
 * Shared parser for preset environment variables.
 *
 * Format: "key(model-id),key2(model-id2),key3"
 * - "key(model-id)" → preset key with custom model override
 * - "key" → preset key with default model
 * - empty string → all presets with default models
 *
 * Used by both writer presets (ai-models.config.ts) and image presets (image-models.config.ts).
 */

export interface IPresetEnvEntry {
  key: string;
  model: string | null; // null = use default
}

/**
 * Parse a preset env value into entries.
 *
 * @example
 * parsePresetEnvRaw("budget(openai/gpt-4o-mini),balanced,ultra(anthropic/claude-sonnet-4-6)")
 * // → [
 * //   { key: "budget", model: "openai/gpt-4o-mini" },
 * //   { key: "balanced", model: null },
 * //   { key: "ultra", model: "anthropic/claude-sonnet-4-6" },
 * // ]
 */
export function parsePresetEnvRaw(envValue: string): IPresetEnvEntry[] {
  if (!envValue.trim()) return [];

  return envValue
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(entry => {
      const match = entry.match(/^([^(]+)\(([^)]+)\)$/);
      if (match) {
        return { key: match[1].trim(), model: match[2].trim() };
      }
      return { key: entry.trim(), model: null };
    });
}

/**
 * Parse preset env value and resolve model IDs against defaults.
 *
 * @param envValue - The raw env string (e.g., "budget(custom/model),balanced")
 * @param validKeys - Set of valid preset keys
 * @param defaults - Map of key → default model ID
 * @returns Map of key → resolved model ID (filtered to valid keys only)
 *
 * Behavior:
 * - Empty envValue → all valid keys with their default models
 * - Non-empty → only listed keys, with model override if provided
 * - Invalid keys are silently skipped
 */
export function parsePresetEnv(
  envValue: string,
  validKeys: ReadonlySet<string>,
  defaults: ReadonlyMap<string, string>
): Map<string, string> {
  const entries = parsePresetEnvRaw(envValue);
  const result = new Map<string, string>();

  // Empty = all presets with defaults
  if (entries.length === 0) {
    for (const key of validKeys) {
      const defaultModel = defaults.get(key);
      if (defaultModel) {
        result.set(key, defaultModel);
      }
    }
    return result;
  }

  // Resolve each entry
  for (const { key, model } of entries) {
    if (!validKeys.has(key)) {
      console.warn(`[PresetParser] Unknown preset key: "${key}", skipping`);
      continue;
    }
    const resolved = model ?? defaults.get(key);
    if (resolved) {
      result.set(key, resolved);
    }
  }

  return result;
}
