REVOKE SELECT (treatment_plan_id, session_intervention, session_objectives, target_exercises)
  ON TABLE public.appointments FROM authenticated;
REVOKE INSERT (treatment_plan_id, session_intervention, session_objectives, target_exercises)
  ON TABLE public.appointments FROM authenticated;
REVOKE UPDATE (treatment_plan_id, session_intervention, session_objectives, target_exercises)
  ON TABLE public.appointments FROM authenticated;