CREATE OR REPLACE FUNCTION increment_quota(
  p_date text,
  p_model_name text,
  p_input_tokens int,
  p_output_tokens int
) RETURNS void AS $$
BEGIN
  INSERT INTO gemini_quota_tracking (date, model_name, requests, input_tokens, output_tokens)
  VALUES (p_date, p_model_name, 1, p_input_tokens, p_output_tokens)
  ON CONFLICT (date, model_name)
  DO UPDATE SET
    requests = gemini_quota_tracking.requests + 1,
    input_tokens = gemini_quota_tracking.input_tokens + EXCLUDED.input_tokens,
    output_tokens = gemini_quota_tracking.output_tokens + EXCLUDED.output_tokens;
END;
$$ LANGUAGE plpgsql;
