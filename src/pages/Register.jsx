import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [resending, setResending] = useState(false);
  const returnTo = safeReturnTo();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setOtpSent(true);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await base44.auth.verifyOtp({ email, otpCode: otp });
      if (res?.access_token) {
        base44.auth.setToken(res.access_token);
        window.location.href = returnTo;
      } else {
        await base44.auth.loginViaEmailPassword(email, password);
        window.location.href = returnTo;
      }
    } catch (err) {
      setError(err.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      await base44.auth.resendOtp(email);
    } catch (err) {
      setError(err.message || "Could not resend code");
    } finally {
      setResending(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", returnTo);
  };

  if (otpSent) {
    return (
      <AuthLayout
        title="Verify your email"
        subtitle={`Enter the 6-digit code sent to ${email}`}
        footer={<Link to="/login">Back to login</Link>}
      >
        {error && <div className="auth-error" role="alert">{error}</div>}
        <form onSubmit={handleVerify}>
          <div className="auth-field">
            <label htmlFor="otp">Verification code</label>
            <input id="otp" type="text" inputMode="numeric" autoFocus maxLength={6} className="auth-otp-input" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} required />
          </div>
          <button type="submit" className="button" style={{ width: "100%" }} disabled={loading || otp.length !== 6}>
            {loading ? "Verifying…" : "Verify and continue"}
          </button>
        </form>
        <button type="button" onClick={handleResend} disabled={resending} style={{ width: "100%", marginTop: "var(--space-3)", border: 0, background: "none", color: "var(--teal-deep)", fontSize: "var(--text-label)", cursor: "pointer" }}>
          {resending ? "Resending…" : "Resend code"}
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Register for a care-team account"
      footer={
        <>
          Already have an account?{" "}
          <Link to={"/login" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}>
            Log in
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
      <form onSubmit={handleRegister}>
        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" autoFocus placeholder="you@example.com" className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="auth-field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="new-password" placeholder="••••••••" className="auth-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="auth-field">
          <label htmlFor="confirm">Confirm password</label>
          <input id="confirm" type="password" autoComplete="new-password" placeholder="••••••••" className="auth-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <button type="submit" className="button" style={{ width: "100%" }} disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}