import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const returnTo = safeReturnTo();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = returnTo;
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", returnTo);
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to your care-team account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}>
            Create one
          </Link>
        </>
      }
    >
      <button type="button" className="google-button" onClick={handleGoogle}>
        <GoogleIcon className="w-5 h-5" />
        Continue with Google
      </button>
      <div className="auth-divider">or</div>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" autoFocus placeholder="you@example.com" className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="auth-field">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
            <label htmlFor="password" style={{ margin: 0 }}>Password</label>
            <Link to="/forgot-password" style={{ fontSize: "var(--text-meta)", color: "var(--teal-deep)", textDecoration: "underline" }}>Forgot password?</Link>
          </div>
          <input id="password" type="password" autoComplete="current-password" placeholder="••••••••" className="auth-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="button" style={{ width: "100%" }} disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthLayout>
  );
}