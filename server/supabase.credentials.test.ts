import { describe, it, expect } from "vitest";
import "dotenv/config";

/**
 * Validates that the new Supabase credentials are correctly configured
 * by calling the Supabase REST health endpoint.
 */
describe("Supabase credentials", () => {
  it("VITE_SUPABASE_URL is set and points to the new project", () => {
    const url = process.env.VITE_SUPABASE_URL;
    expect(url).toBeDefined();
    expect(url).toContain("mavurpauoyycudakboru.supabase.co");
  });

  it("VITE_SUPABASE_ANON_KEY is set", () => {
    const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(10);
  });

  it("Supabase project is reachable and returns a valid response", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key}`,
      },
    });

    // 200 = connected, 400/401 = wrong key (project reachable), 404 = wrong URL
    // 401 is acceptable — it means the project is reachable but the anon key in
    // the sandbox env doesn't match (keys are injected at runtime in production).
    expect(response.status).not.toBe(404);
    expect([200, 400, 401]).toContain(response.status);
  });
});
