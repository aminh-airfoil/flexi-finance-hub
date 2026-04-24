import { useState, useEffect, useCallback } from "react";
import { useAuth, TeamMember, UserRole } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Crown, ShieldCheck, Eye, Trash2, RefreshCw } from "lucide-react";

// ─── Role metadata ────────────────────────────────────────────────────────────
const ROLE_META: Record<
  UserRole,
  {
    label: string;
    icon: React.ElementType;
    badgeClass: string;
    iconColorClass: string;
    bullets: string[];
  }
> = {
  owner: {
    label: "Owner",
    icon: Crown,
    badgeClass: "bg-amber-500/15 text-amber-500 border border-amber-500/30",
    iconColorClass: "text-amber-500",
    bullets: ["Full system access", "Manage team & roles", "Delete records"],
  },
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    badgeClass: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    iconColorClass: "text-blue-400",
    bullets: ["View & edit all data", "Enroll / remove members", "Cannot delete or change roles"],
  },
  member: {
    label: "Member",
    icon: Eye,
    badgeClass: "bg-muted text-muted-foreground border border-border",
    iconColorClass: "text-muted-foreground",
    bullets: ["View all shared data", "Cannot create or edit", "Cannot manage team"],
  },
};

// ─── Role badge pill ──────────────────────────────────────────────────────────
function RolePill({ role }: { role: UserRole }) {
  const meta = ROLE_META[role];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${meta.badgeClass}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {meta.label}
    </span>
  );
}

// ─── Team API helpers ─────────────────────────────────────────────────────────
async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function apiFetch(path: string, options?: RequestInit) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`/api/team${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? "Request failed");
  }
  return res.json();
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TeamSettings() {
  const { profile, isOwner, isAdmin } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Enroll form
  const [enrollEmail, setEnrollEmail] = useState("");
  const [enrollPassword, setEnrollPassword] = useState("");
  const [enrollName, setEnrollName] = useState("");
  const [enrollRole, setEnrollRole] = useState<"admin" | "member">("member");
  const [enrollLoading, setEnrollLoading] = useState(false);

  // Remove dialog
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const data = await apiFetch("/members");
      setMembers(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner || isAdmin) fetchMembers();
  }, [isOwner, isAdmin, fetchMembers]);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner && !isAdmin) return;
    const role = isOwner ? enrollRole : "member";
    setEnrollLoading(true);
    try {
      await apiFetch("/enroll", {
        method: "POST",
        body: JSON.stringify({ email: enrollEmail, password: enrollPassword, name: enrollName, role }),
      });
      toast.success(`${enrollName || enrollEmail} enrolled as ${role}`);
      setEnrollEmail("");
      setEnrollPassword("");
      setEnrollName("");
      setEnrollRole("member");
      await fetchMembers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: "admin" | "member") => {
    if (!isOwner) return;
    try {
      await apiFetch(`/members/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      toast.success("Role updated");
      setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, role: newRole } : m)));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget || (!isOwner && !isAdmin)) return;
    if (isAdmin && removeTarget.role !== "member") {
      toast.error("Admins can only remove members");
      setRemoveTarget(null);
      return;
    }
    setRemoveLoading(true);
    try {
      await apiFetch(`/members/${removeTarget.id}`, { method: "DELETE" });
      toast.success(`${removeTarget.name ?? removeTarget.email} removed`);
      setMembers((prev) => prev.filter((m) => m.id !== removeTarget.id));
      setRemoveTarget(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRemoveLoading(false);
    }
  };

  // ─── Access guard ───────────────────────────────────────────────────────────
  if (!isOwner && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center gap-4">
        <ShieldCheck className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground max-w-sm">
          Team Settings is only available to owners and admins.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto py-6 px-4 space-y-4" style={{ maxWidth: '1100px' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Team Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Role definitions and team member access management</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMembers} disabled={loadingMembers}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingMembers ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Section 1: Role cards — compact 3-column ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
        {(["owner", "admin", "member"] as UserRole[]).map((r) => {
          const meta = ROLE_META[r];
          const Icon = meta.icon;
          const isCurrentRole = profile?.role === r;
          return (
            <div
              key={r}
              className={`rounded-lg border bg-card p-3 ${
                isCurrentRole ? "ring-1 ring-primary border-primary/40" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${meta.iconColorClass}`} />
                  <span className="text-sm font-semibold text-foreground">{meta.label}</span>
                </div>
                {isCurrentRole && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                    Your role
                  </span>
                )}
              </div>
              <ul className="space-y-0.5">
                {meta.bullets.map((b) => (
                  <li key={b} className="text-[11px] text-muted-foreground leading-snug">
                    · {b}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* ── Section 2: Enroll New Member ── */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Enroll New Member</h2>
        </div>
        <div className="px-4 py-4">
          <form onSubmit={handleEnroll}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Row 1: Name | Email */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input
                  value={enrollName}
                  onChange={(e) => setEnrollName(e.target.value)}
                  placeholder="Jane Doe"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="email"
                  value={enrollEmail}
                  onChange={(e) => setEnrollEmail(e.target.value)}
                  placeholder="jane@company.com"
                  required
                  className="h-8 text-sm"
                />
              </div>
              {/* Row 2: Password | Role */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="password"
                  value={enrollPassword}
                  onChange={(e) => setEnrollPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  minLength={6}
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Role</Label>
                {isOwner ? (
                  <Select value={enrollRole} onValueChange={(v) => setEnrollRole(v as "admin" | "member")}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-8 flex items-center px-3 rounded-md border border-border bg-muted text-xs text-muted-foreground">
                    Member <span className="ml-1.5 opacity-60">(admin can only enroll members)</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={enrollLoading}>
                {enrollLoading ? "Enrolling…" : "Enroll Member"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Section 3: Member Table ── */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Team Members</h2>
          <span className="text-xs text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""}</span>
        </div>

        {loadingMembers ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : members.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No team members yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2 uppercase tracking-wide">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2 uppercase tracking-wide">Email</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2 uppercase tracking-wide w-36">Role</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((member) => {
                const isSelf = member.id === profile?.id;
                const isOwnerRow = member.role === "owner";
                const adminCanRemove = isAdmin && !isOwner && member.role === "member" && !isSelf;
                const ownerCanRemove = isOwner && !isSelf && !isOwnerRow;
                const canRemove = ownerCanRemove || adminCanRemove;
                const canChangeRole = isOwner && !isSelf && !isOwnerRow;

                return (
                  <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                    {/* Name */}
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                      {member.name ?? "—"}
                      {isSelf && (
                        <span className="ml-1.5 text-xs text-muted-foreground font-normal">(you)</span>
                      )}
                    </td>
                    {/* Email */}
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {member.email}
                    </td>
                    {/* Role */}
                    <td className="px-4 py-3">
                      {canChangeRole ? (
                        <Select
                          value={member.role}
                          onValueChange={(v) => handleRoleChange(member.id, v as "admin" | "member")}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <RolePill role={member.role} />
                      )}
                    </td>
                    {/* Actions */}
                    <td className="px-2 py-3 text-center">
                      {canRemove ? (
                        <button
                          onClick={() => setRemoveTarget(member)}
                          className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors mx-auto"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="w-7 h-7 block" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Remove confirmation dialog ── */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <strong>{removeTarget?.name ?? removeTarget?.email}</strong> from the team and delete
              their account. They will no longer be able to sign in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removeLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeLoading ? "Removing…" : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
