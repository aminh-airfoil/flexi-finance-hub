/**
 * Team management API routes.
 * All routes verify the caller's Supabase JWT and enforce role-based access.
 * Uses the service role key server-side only — never exposed to the frontend.
 *
 * Permission matrix:
 *   owner: enroll (admin|member), change roles, remove anyone (except self)
 *   admin: enroll (member only), remove members only (not admins/owners)
 *   member: read-only, no team management
 */
import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Verify the Bearer JWT from the request and return the caller's Supabase user ID */
async function verifyJwt(req: Request): Promise<{ userId: string; email: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const admin = getAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return { userId: data.user.id, email: data.user.email ?? "" };
}

/** Get the caller's role from public.profiles */
async function getCallerRole(userId: string): Promise<string | null> {
  const admin = getAdminClient();
  const { data } = await admin.from("profiles").select("role").eq("id", userId).single();
  return data?.role ?? null;
}

export function registerTeamRoutes(app: import("express").Express) {
  const teamRouter = Router();
  teamRouter.use(express.json());

  /**
   * GET /api/team/me
   * Returns the current user's profile (id, email, name, role).
   */
  teamRouter.get("/me", async (req: Request, res: Response) => {
    const caller = await verifyJwt(req);
    if (!caller) return res.status(401).json({ error: "Unauthorized" });

    const admin = getAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id, email, name, role, created_at")
      .eq("id", caller.userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Profile not found" });
    }
    return res.json(data);
  });

  /**
   * GET /api/team/members
   * Returns all team members. Owner and admin only.
   */
  teamRouter.get("/members", async (req: Request, res: Response) => {
    const caller = await verifyJwt(req);
    if (!caller) return res.status(401).json({ error: "Unauthorized" });

    const role = await getCallerRole(caller.userId);
    if (!role || !["owner", "admin"].includes(role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const admin = getAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id, email, name, role, created_at")
      .order("created_at", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data ?? []);
  });

  /**
   * POST /api/team/enroll
   * Enroll a new member.
   * - Owner: can enroll admin or member
   * - Admin: can only enroll member
   * Body: { email, password, name, role: 'admin' | 'member' }
   */
  teamRouter.post("/enroll", async (req: Request, res: Response) => {
    const caller = await verifyJwt(req);
    if (!caller) return res.status(401).json({ error: "Unauthorized" });

    const callerRole = await getCallerRole(caller.userId);
    if (!callerRole || !["owner", "admin"].includes(callerRole)) {
      return res.status(403).json({ error: "Only owners and admins can enroll members" });
    }

    const { email, password, name, role } = req.body as {
      email: string;
      password: string;
      name: string;
      role: "admin" | "member";
    };

    if (!email || !password || !["admin", "member"].includes(role)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    // Admin can only enroll members, not admins
    if (callerRole === "admin" && role !== "member") {
      return res.status(403).json({ error: "Admins can only enroll members" });
    }

    const admin = getAdminClient();

    // Create auth user (auto-confirmed, no email verification required)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (authError) return res.status(400).json({ error: authError.message });

    const userId = authData.user.id;

    // Upsert profile row
    const { error: profileError } = await admin.from("profiles").upsert({
      id: userId,
      email,
      name: name || null,
      role,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      // Rollback auth user
      await admin.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: profileError.message });
    }

    return res.status(201).json({ success: true, userId, email, name, role });
  });

  /**
   * PATCH /api/team/members/:userId/role
   * Update a member's role. Owner only. Cannot change own role or owner row.
   * Body: { role: 'admin' | 'member' }
   */
  teamRouter.patch("/members/:userId/role", async (req: Request, res: Response) => {
    const caller = await verifyJwt(req);
    if (!caller) return res.status(401).json({ error: "Unauthorized" });

    const callerRole = await getCallerRole(caller.userId);
    if (callerRole !== "owner") {
      return res.status(403).json({ error: "Only the owner can change roles" });
    }

    const { userId } = req.params;
    if (userId === caller.userId) {
      return res.status(400).json({ error: "Cannot change your own role" });
    }

    const { role } = req.body as { role: "admin" | "member" };
    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const admin = getAdminClient();

    // Verify target is not owner
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (targetProfile?.role === "owner") {
      return res.status(403).json({ error: "Cannot change the owner's role" });
    }

    const { error } = await admin
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  });

  /**
   * DELETE /api/team/members/:userId
   * Remove a member.
   * - Owner: can remove anyone except themselves and other owners
   * - Admin: can only remove members (not admins or owners)
   */
  teamRouter.delete("/members/:userId", async (req: Request, res: Response) => {
    const caller = await verifyJwt(req);
    if (!caller) return res.status(401).json({ error: "Unauthorized" });

    const callerRole = await getCallerRole(caller.userId);
    if (!callerRole || !["owner", "admin"].includes(callerRole)) {
      return res.status(403).json({ error: "Only owners and admins can remove members" });
    }

    const { userId } = req.params;
    if (userId === caller.userId) {
      return res.status(400).json({ error: "Cannot remove yourself" });
    }

    const admin = getAdminClient();

    // Get target member's role to enforce restrictions
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!targetProfile) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Owner cannot be removed by anyone
    if (targetProfile.role === "owner") {
      return res.status(403).json({ error: "Cannot remove the owner" });
    }

    // Admin can only remove members, not admins
    if (callerRole === "admin" && targetProfile.role !== "member") {
      return res.status(403).json({ error: "Admins can only remove members, not admins or owners" });
    }

    // Delete profile first
    const { error: profileError } = await admin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) return res.status(500).json({ error: profileError.message });

    // Delete auth user
    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) return res.status(500).json({ error: authError.message });

    return res.json({ success: true });
  });

  app.use("/api/team", teamRouter);
}
