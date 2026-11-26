create table public.mcp_image_links (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  screenshot_id uuid not null references public.screenshots(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index mcp_image_links_active_idx on public.mcp_image_links (token_hash, expires_at);

alter table public.mcp_image_links enable row level security;
