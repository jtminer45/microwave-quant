import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LeafMark } from "@/components/brand/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth, ApiError } from "@/lib/auth-context";

export function LoginPage() {
  const { username, isLoading, login, signup } = useAuth();

  if (!isLoading && username) return <Navigate to="/" replace />;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <LeafMark size={48} />
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-[0.14em] text-ink uppercase">
              Longon <span className="text-primary">Capital</span>
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Nigerian Exchange quantitative analytics &amp; AI-powered insight
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-5">
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Log In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <LoginForm onSubmit={login} />
              </TabsContent>
              <TabsContent value="signup">
                <SignupForm onSubmit={signup} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-ink-dim">
          Delayed market data. Not investment advice.
        </p>
      </motion.div>
    </div>
  );
}

function LoginForm({ onSubmit }: { onSubmit: (u: string, p: string) => Promise<void> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(username, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Username</label>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. johnny"
          autoComplete="username"
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Password</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          autoComplete="current-password"
          required
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting ? "Logging in…" : "Log In"}
      </Button>
    </form>
  );
}

function SignupForm({ onSubmit }: { onSubmit: (u: string, p: string) => Promise<void> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Those passwords don't match — please try again.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(username, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Choose a username</label>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="3-20 characters, letters/numbers/underscore"
          autoComplete="username"
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Choose a password</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          autoComplete="new-password"
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Confirm password</label>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Type it again"
          autoComplete="new-password"
          required
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting ? "Creating account…" : "Create Account"}
      </Button>
      <p className="text-center text-xs text-ink-dim">No email required — just a username and password.</p>
    </form>
  );
}
