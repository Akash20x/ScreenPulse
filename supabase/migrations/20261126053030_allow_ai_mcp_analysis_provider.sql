alter table public.screenshots
  drop constraint if exists screenshots_analysis_provider_check;

alter table public.screenshots
  add constraint screenshots_analysis_provider_check
  check (analysis_provider in ('CODEX_MCP', 'AI_MCP'));
