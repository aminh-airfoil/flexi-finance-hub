import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, User, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AccountSettingsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    // Re-authenticate with current password first
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: currentPw,
    });

    if (signInErr) {
      toast.error("Current password is incorrect");
      setLoading(false);
      return;
    }

    // Update to new password
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
    setLoading(false);

    if (updateErr) {
      toast.error(updateErr.message);
    } else {
      toast.success("Password changed successfully!");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    }
  };

  const roleBadgeColor: Record<string, string> = {
    owner: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    admin: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    member: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <h1 className="text-2xl font-black text-foreground tracking-tight mb-6">Account Settings</h1>

        {/* Profile card */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User size={22} className="text-primary" />
            </div>
            <div>
              <div className="font-bold text-foreground">{profile?.name || user?.email?.split("@")[0]}</div>
              <div className="text-sm text-muted-foreground">{user?.email}</div>
              {profile?.role && (
                <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${roleBadgeColor[profile.role] || ""}`}>
                  {profile.role}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Change password form */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock size={16} className="text-primary" />
            <h2 className="font-bold text-foreground">Change Password</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current password */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  placeholder="Enter your current password"
                  required
                  className="w-full px-3 pr-10 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                  className="w-full px-3 pr-10 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  className="w-full px-3 pr-10 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirmPw && newPw !== confirmPw && (
                <p className="text-xs text-destructive mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !currentPw || newPw.length < 8 || newPw !== confirmPw}
              className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Updating…" : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
