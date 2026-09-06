-- View for tracking unanswered questions (continuous improvement loop)
CREATE OR REPLACE VIEW public.kb_unanswered_questions_view AS
SELECT 
    fl.id AS log_id,
    fl.question,
    cs.language,
    fl.created_at,
    cs.user_id,
    fl.session_id
FROM 
    public.fallback_logs fl
LEFT JOIN 
    public.chat_sessions cs ON fl.session_id = cs.id
ORDER BY 
    fl.created_at DESC;

-- Note: Ensure this view is accessible to the authenticated role if you plan to build an admin UI for it, 
-- or keep it restricted to service_role for internal use.
GRANT SELECT ON public.kb_unanswered_questions_view TO service_role;
