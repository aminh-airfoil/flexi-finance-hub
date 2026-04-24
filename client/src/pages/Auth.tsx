import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, TrendingUp, Shield, Users, CheckCircle2 } from "lucide-react";
import { SEOHead } from "@/components/shared/SEOHead";

/**
 * Sign-in only page.
 * Public sign-up is disabled — accounts are created by the owner via Team Settings.
 */
export default function AuthPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
    }
    // On success, Supabase redirects the browser — no need to setLoading(false)
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setResetSent(true);
    }
  };

  return (
    <>
      <SEOHead title="Sign In" description="Sign in to the Airfoil FinOps Hub." />
      <div className="min-h-screen bg-background flex">
        {/* Left branding panel */}
        <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative overflow-hidden flex-col justify-between p-10 bg-gradient-to-br from-primary via-primary/90 to-primary/70 rounded-r-[2.5rem]">
          <div>
            <h2 className="text-2xl font-black text-primary-foreground tracking-tight">
              Airfoil <span className="opacity-80">FinOps</span>
            </h2>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl xl:text-5xl font-black text-primary-foreground leading-tight">
              Your team's<br />financial command<br />centre.
            </h1>
            <p className="text-primary-foreground/80 text-lg max-w-sm">
              Shared visibility, role-based access, and real-time financial intelligence for your operations team.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3">
            {[
              { icon: TrendingUp, label: "Real-time Analytics" },
              { icon: Shield, label: "Role-Based Access" },
              { icon: Users, label: "Team Collaboration" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2 bg-primary-foreground/15 backdrop-blur-sm text-primary-foreground text-sm font-medium px-4 py-2 rounded-full"
              >
                <f.icon className="w-4 h-4" />
                {f.label}
              </div>
            ))}
          </div>

          {/* Access note */}
          <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-2xl p-5 max-w-md">
            <p className="text-primary-foreground/90 text-sm leading-relaxed">
              <strong className="text-primary-foreground">Invite-only access.</strong> This dashboard is restricted to authorised Airfoil team members. Contact your administrator to request access.
            </p>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md space-y-8">
            {/* Mobile logo */}
            <div className="lg:hidden text-center">
              <h2 className="text-2xl font-black text-foreground tracking-tight">
                Airfoil <span className="text-primary">FinOps</span>
              </h2>
            </div>

            <div>
              <h1 className="text-3xl font-black text-foreground">Welcome back</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Sign in with your team credentials to continue.
              </p>
            </div>

            {forgotMode ? (
              resetSent ? (
                <div className="text-center space-y-4 py-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <div>
                    <div className="font-bold text-foreground">Check your email</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      We sent a password reset link to <strong>{resetEmail}</strong>.
                      Click the link in the email to set a new password.
                    </p>
                  </div>
                  <button
                    onClick={() => { setForgotMode(false); setResetSent(false); }}
                    className="text-sm text-primary hover:underline"
                  >
                    Back to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div>
                    <div className="font-bold text-foreground mb-1">Reset your password</div>
                    <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <Input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className="h-12 bg-secondary border-border"
                      placeholder="you@airfoil.studio"
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 text-sm font-semibold" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setForgotMode(false)}
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Back to sign in
                  </button>
                </form>
              )
            ) : (
              <>
                {/* Google OAuth */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-sm font-semibold flex items-center gap-3 border-border bg-secondary hover:bg-secondary/80"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <span className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Continue with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or sign in with email</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 bg-secondary border-border"
                      placeholder="you@airfoil.studio"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">Password</Label>
                      <button
                        type="button"
                        onClick={() => setForgotMode(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-12 bg-secondary border-border pr-12"
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-12 text-sm font-semibold" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>

                <p className="text-center text-xs text-muted-foreground">
                  Don't have access?{" "}
                  <span className="text-foreground font-medium">Contact your team owner to be enrolled.</span>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
