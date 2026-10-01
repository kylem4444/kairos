/** Fixed DDL shown in the dashboard and applied by /api/admin/migrate. */
export const GALLERY_MIGRATION_SQL = `
alter table public.artworks
  add column if not exists is_test boolean not null default false;

alter table public.artworks
  add column if not exists destroyed_image_urls text[] not null default '{}';

create index if not exists artworks_is_test_idx
  on public.artworks (is_test);

create index if not exists artworks_gallery_idx
  on public.artworks (status, settled_at desc)
  where status in ('purchased', 'destroyed', 'auto_destroyed')
    and is_test = false;
`.trim();
