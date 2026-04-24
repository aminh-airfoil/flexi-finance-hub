import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase sends the recovery token as a hash fragment.
  // onAuthStateChange fires with event = "PASSWORD_RECOVERY" once the token is consumed.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setSessionReady(true);
      }
    });

    // Also check if there's already an active session (user navigated here while logged in)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setDone(true);
      toast.success("Password updated successfully!");
      setTimeout(() => navigate("/"), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-2xl font-black text-foreground tracking-tight">
            <span className="text-primary">Airfoil</span> FinOps
          </div>
          <div className="text-sm text-muted-foreground mt-1">Set your new password</div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
              <div className="text-lg font-bold text-foreground mb-2">Password updated!</div>
              <div className="text-sm text-muted-foreground">Redirecting you to the dashboard…</div>
            </div>
          ) : !sessionReady ? (
            <div className="text-center py-4">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <div className="text-sm text-muted-foreground">Verifying reset link…</div>
              <div className="text-xs text-muted-foreground mt-3">
                If this takes too long, the link may have expired.{" "}
                <button
                  onClick={() => navigate("/auth")}
                  className="text-primary underline"
                >
                  Go back to sign in
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    minLength={8}
                    className="w-full pl-9 pr-10 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    className="w-full pl-9 pr-10 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {confirm && password !== confirm && (
                  <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || password !== confirm || password.length < 8}
                className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating…" : "Set New Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
