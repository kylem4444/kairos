import { GALLERY_MIGRATION_SQL } from "./gallery-migration-sql";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";

export { GALLERY_MIGRATION_SQL };

export type MigrationResult =
  | { ok: true; alreadyApplied?: boolean; method: string }
  | { ok: false; error: string; sql: string };

async function tryPgQuery(sql: string): Promise<{ ok: boolean; detail: string }> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) {
    return { ok: false, detail: "Supabase is not configured" };
  }

  const endpoints = [`${base}/pg/query`, `${base}/pg`];
  const errors: string[] = [];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      });
      const text = await res.text();
      if (res.ok) {
        return { ok: true, detail: `Applied via ${url}` };
      }
      errors.push(`${url} → ${res.status} ${text.slice(0, 200)}`);
    } catch (error) {
      errors.push(
        `${url} → ${error instanceof Error ? error.message : "network error"}`,
      );
    }
  }

  return { ok: false, detail: errors.join("; ") };
}

/** Probe whether is_test is readable on artworks. */
export async function isGalleryMigrationApplied(): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  const db = getSupabaseAdmin();
  const { error } = await db.from("artworks").select("id, is_test").limit(1);
  if (!error) return true;
  return !/is_test|column/i.test(error.message);
}

/**
 * Apply gallery columns. Prefers Supabase pg-meta HTTP; verifies with a select.
 */
export async function applyGalleryMigration(): Promise<MigrationResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Supabase is not configured on this deployment.",
      sql: GALLERY_MIGRATION_SQL,
    };
  }

  if (await isGalleryMigrationApplied()) {
    return { ok: true, alreadyApplied: true, method: "verify" };
  }

  const attempt = await tryPgQuery(GALLERY_MIGRATION_SQL);
  if (attempt.ok) {
    if (await isGalleryMigrationApplied()) {
      return { ok: true, method: "pg-query" };
    }
    return {
      ok: false,
      error:
        "Migration request succeeded but is_test is still missing. Paste the SQL into Supabase → SQL Editor.",
      sql: GALLERY_MIGRATION_SQL,
    };
  }

  return {
    ok: false,
    error: `Could not apply migration automatically (${attempt.detail}). Open Supabase → SQL → New query, paste the SQL below, and click Run.`,
    sql: GALLERY_MIGRATION_SQL,
  };
}
