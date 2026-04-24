/**
 * Tests for the team management API (server/team.ts).
 *
 * Permission matrix being tested:
 *   owner: enroll (admin|member), change roles, remove anyone (except self/owner)
 *   admin: enroll (member only), remove members only (not admins/owners)
 *   member: no team management
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// ─── Mock Supabase ────────────────────────────────────────────────────────────
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockAdminCreateUser = vi.fn();
const mockAdminDeleteUser = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      admin: {
        createUser: mockAdminCreateUser,
        deleteUser: mockAdminDeleteUser,
      },
    },
    from: mockFrom,
  }),
}));

const { registerTeamRoutes } = await import("./team");

// ─── Test helpers ─────────────────────────────────────────────────────────────
function buildApp() {
  const app = express();
  app.use(express.json());
  registerTeamRoutes(app);
  return app;
}

function mockAuthUser(userId: string, email: string) {
  mockGetUser.mockResolvedValue({ data: { user: { id: userId, email } }, error: null });
}

function mockCallerRole(role: string) {
  mockFrom.mockReturnValueOnce({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: { role }, error: null }),
      }),
    }),
  });
}

// ─── GET /api/team/me ─────────────────────────────────────────────────────────
describe("GET /api/team/me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no Authorization header", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/team/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 when JWT is invalid", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid" } });
    const app = buildApp();
    const res = await request(app).get("/api/team/me").set("Authorization", "Bearer bad-token");
    expect(res.status).toBe(401);
  });

  it("returns profile when JWT is valid", async () => {
    const userId = "user-123";
    mockAuthUser(userId, "owner@test.com");
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { id: userId, email: "owner@test.com", name: "Owner", role: "owner", created_at: "2024-01-01" },
              error: null,
            }),
        }),
      }),
    });
    const app = buildApp();
    const res = await request(app).get("/api/team/me").set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("owner");
  });
});

// ─── GET /api/team/members ────────────────────────────────────────────────────
describe("GET /api/team/members", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for member role", async () => {
    mockAuthUser("member-1", "member@test.com");
    mockCallerRole("member");
    const app = buildApp();
    const res = await request(app).get("/api/team/members").set("Authorization", "Bearer token");
    expect(res.status).toBe(403);
  });

  it("returns members list for admin role", async () => {
    mockAuthUser("admin-1", "admin@test.com");
    mockCallerRole("admin");
    mockFrom.mockReturnValueOnce({
      select: () => ({
        order: () =>
          Promise.resolve({
            data: [
              { id: "owner-1", email: "owner@test.com", name: "Owner", role: "owner", created_at: "2024-01-01" },
              { id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin", created_at: "2024-01-02" },
            ],
            error: null,
          }),
      }),
    });
    const app = buildApp();
    const res = await request(app).get("/api/team/members").set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("returns members list for owner role", async () => {
    mockAuthUser("owner-1", "owner@test.com");
    mockCallerRole("owner");
    mockFrom.mockReturnValueOnce({
      select: () => ({
        order: () =>
          Promise.resolve({
            data: [
              { id: "owner-1", email: "owner@test.com", name: "Owner", role: "owner", created_at: "2024-01-01" },
            ],
            error: null,
          }),
      }),
    });
    const app = buildApp();
    const res = await request(app).get("/api/team/members").set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

// ─── POST /api/team/enroll ────────────────────────────────────────────────────
describe("POST /api/team/enroll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for member role", async () => {
    mockAuthUser("member-1", "member@test.com");
    mockCallerRole("member");
    const app = buildApp();
    const res = await request(app)
      .post("/api/team/enroll")
      .set("Authorization", "Bearer token")
      .send({ email: "new@test.com", password: "pass123", name: "New", role: "member" });
    expect(res.status).toBe(403);
  });

  it("admin can enroll a member", async () => {
    const newUserId = "new-user-uuid";
    mockAuthUser("admin-1", "admin@test.com");
    mockCallerRole("admin");
    mockFrom.mockReturnValueOnce({
      upsert: () => Promise.resolve({ error: null }),
    });
    mockAdminCreateUser.mockResolvedValue({ data: { user: { id: newUserId } }, error: null });
    const app = buildApp();
    const res = await request(app)
      .post("/api/team/enroll")
      .set("Authorization", "Bearer token")
      .send({ email: "new@test.com", password: "pass123", name: "New User", role: "member" });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe("member");
  });

  it("admin cannot enroll an admin", async () => {
    mockAuthUser("admin-1", "admin@test.com");
    mockCallerRole("admin");
    const app = buildApp();
    const res = await request(app)
      .post("/api/team/enroll")
      .set("Authorization", "Bearer token")
      .send({ email: "new@test.com", password: "pass123", name: "New Admin", role: "admin" });
    expect(res.status).toBe(403);
  });

  it("owner can enroll an admin", async () => {
    const newUserId = "new-admin-uuid";
    mockAuthUser("owner-1", "owner@test.com");
    mockCallerRole("owner");
    mockFrom.mockReturnValueOnce({
      upsert: () => Promise.resolve({ error: null }),
    });
    mockAdminCreateUser.mockResolvedValue({ data: { user: { id: newUserId } }, error: null });
    const app = buildApp();
    const res = await request(app)
      .post("/api/team/enroll")
      .set("Authorization", "Bearer token")
      .send({ email: "newadmin@test.com", password: "pass123", name: "New Admin", role: "admin" });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe("admin");
  });
});

// ─── PATCH /api/team/members/:userId/role ─────────────────────────────────────
describe("PATCH /api/team/members/:userId/role", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for admin role", async () => {
    mockAuthUser("admin-1", "admin@test.com");
    mockCallerRole("admin");
    const app = buildApp();
    const res = await request(app)
      .patch("/api/team/members/other-user/role")
      .set("Authorization", "Bearer token")
      .send({ role: "admin" });
    expect(res.status).toBe(403);
  });

  it("returns 403 for member role", async () => {
    mockAuthUser("member-1", "member@test.com");
    mockCallerRole("member");
    const app = buildApp();
    const res = await request(app)
      .patch("/api/team/members/other-user/role")
      .set("Authorization", "Bearer token")
      .send({ role: "admin" });
    expect(res.status).toBe(403);
  });

  it("returns 400 when owner tries to change own role", async () => {
    const userId = "owner-1";
    mockAuthUser(userId, "owner@test.com");
    mockCallerRole("owner");
    const app = buildApp();
    const res = await request(app)
      .patch(`/api/team/members/${userId}/role`)
      .set("Authorization", "Bearer token")
      .send({ role: "admin" });
    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/team/members/:userId ────────────────────────────────────────
describe("DELETE /api/team/members/:userId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for member role", async () => {
    mockAuthUser("member-1", "member@test.com");
    mockCallerRole("member");
    const app = buildApp();
    const res = await request(app)
      .delete("/api/team/members/other-user")
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(403);
  });

  it("returns 400 when trying to remove self", async () => {
    const userId = "owner-1";
    mockAuthUser(userId, "owner@test.com");
    mockCallerRole("owner");
    const app = buildApp();
    const res = await request(app)
      .delete(`/api/team/members/${userId}`)
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(400);
  });

  it("admin can remove a member", async () => {
    mockAuthUser("admin-1", "admin@test.com");
    mockCallerRole("admin");
    // Target profile: member
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { role: "member" }, error: null }),
        }),
      }),
    });
    // Delete profile
    mockFrom.mockReturnValueOnce({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    });
    mockAdminDeleteUser.mockResolvedValue({ error: null });
    const app = buildApp();
    const res = await request(app)
      .delete("/api/team/members/member-to-remove")
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("admin cannot remove another admin", async () => {
    mockAuthUser("admin-1", "admin@test.com");
    mockCallerRole("admin");
    // Target profile: admin
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { role: "admin" }, error: null }),
        }),
      }),
    });
    const app = buildApp();
    const res = await request(app)
      .delete("/api/team/members/another-admin")
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(403);
  });

  it("owner removes member successfully", async () => {
    mockAuthUser("owner-1", "owner@test.com");
    mockCallerRole("owner");
    // Target profile: member
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { role: "member" }, error: null }),
        }),
      }),
    });
    // Delete profile
    mockFrom.mockReturnValueOnce({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    });
    mockAdminDeleteUser.mockResolvedValue({ error: null });
    const app = buildApp();
    const res = await request(app)
      .delete("/api/team/members/member-to-remove")
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
