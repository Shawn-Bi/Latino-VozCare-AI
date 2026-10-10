import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import AuthLayout from "@/components/AuthLayout";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken: resetToken, newPassword: password });
      window.location.href = "/login";
    } catch (err) {
      setError(err.message || "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <AuthLayout
        title="Invalid reset link"
        subtitle="The reset link is missing or invalid"
        footer={<Link to="/forgot-password">Request a new link</Link>}
      >
        <p style={{ color: "var(--muted)", fontSize: "var(--text-body)" }}>
          This link doesn't include a valid reset token. Request a new password reset link and try again.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Enter your new password below"
      footer={<Link to="/login">Back to login</Link>}
    >
      {error && <div className="auth-error" role="alert">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="password">New password</label>
          <input id="password" type="password" autoComplete="new-password" autoFocus placeholder="••••••••" className="auth-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="auth-field">
          <label htmlFor="confirm">Confirm password</label>
          <input id="confirm" type="password" autoComplete="new-password" placeholder="••••••••" className="auth-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <button type="submit" className="button" style={{ width: "100%" }} disabled={loading}>
          {loading ? "Resetting…" : "Reset password"}
        </button>
      </form>
    </AuthLayout>
  );
}