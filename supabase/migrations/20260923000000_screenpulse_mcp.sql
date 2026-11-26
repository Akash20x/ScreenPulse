alter table public.screenshots
  add column if not exists analysis_description text,
  add column if not exists analysis_provider text check (analysis_provider in ('CODEX_MCP')),
  add column if not exists analysis_status text check (analysis_status in ('COMPLETED')),
  add column if not exists analyzed_at timestamptz;

create table public.mcp_oauth_clients (
  client_id text primary key,
  client_name text,
  redirect_uris text[] not null,
  created_at timestamptz not null default now()
);

create table public.mcp_oauth_authorization_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null references public.mcp_oauth_clients(client_id) on delete cascade,
  redirect_uri text not null,
  scopes text[] not null,
  resource text not null,
  code_challenge text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.mcp_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  token_type text not null check (token_type in ('access', 'refresh')),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null references public.mcp_oauth_clients(client_id) on delete cascade,
  scopes text[] not null,
  resource text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index mcp_oauth_codes_active_idx on public.mcp_oauth_authorization_codes (code_hash, expires_at) where used_at is null;
create index mcp_oauth_tokens_active_idx on public.mcp_oauth_tokens (token_hash, expires_at) where revoked_at is null;

alter table public.mcp_oauth_clients enable row level security;
alter table public.mcp_oauth_authorization_codes enable row level security;
alter table public.mcp_oauth_tokens enable row level security;
