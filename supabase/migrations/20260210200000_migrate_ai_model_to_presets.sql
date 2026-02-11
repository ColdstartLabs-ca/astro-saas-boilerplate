-- Migrate campaigns.ai_model from raw OpenRouter model IDs to preset keys
-- This supports the new centralized preset system where preset keys (budget, balanced, auto, ultra)
-- are used instead of raw model IDs (openai/gpt-4o, openrouter/auto, etc.)

-- Convert known model IDs to preset keys
UPDATE campaigns SET ai_model = 'budget' WHERE ai_model IN ('openai/gpt-4o-mini', 'google/gemini-2.0-flash');
UPDATE campaigns SET ai_model = 'balanced' WHERE ai_model = 'openai/gpt-4o';
UPDATE campaigns SET ai_model = 'auto' WHERE ai_model IN ('openrouter/auto', 'auto');
UPDATE campaigns SET ai_model = 'ultra' WHERE ai_model = 'anthropic/claude-sonnet-4-5';

-- Any remaining unknown model IDs → balanced (safe default)
UPDATE campaigns SET ai_model = 'balanced'
  WHERE ai_model NOT IN ('budget', 'balanced', 'auto', 'ultra')
    AND ai_model IS NOT NULL;

-- Also migrate articles.ai_model_used for historical records
UPDATE articles SET ai_model_used = 'budget' WHERE ai_model_used IN ('openai/gpt-4o-mini', 'google/gemini-2.0-flash');
UPDATE articles SET ai_model_used = 'balanced' WHERE ai_model_used = 'openai/gpt-4o';
UPDATE articles SET ai_model_used = 'auto' WHERE ai_model_used IN ('openrouter/auto', 'auto');
UPDATE articles SET ai_model_used = 'ultra' WHERE ai_model_used = 'anthropic/claude-sonnet-4-5';
