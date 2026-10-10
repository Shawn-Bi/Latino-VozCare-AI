import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import AuthLayout from "@/components/AuthLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch {
      // Always show generic success — the API hides whether the email exists
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll send a reset link to your email"
      footer={<Link to="/login">Back to login</Link>}
    >
      {sent ? (
        <p style={{ color: "var(--muted)", fontSize: "var(--text-body)", lineHeight: "var(--leading-body)" }}>
          If an account exists for {email || "that address"}, a reset link has been sent. Check your inbox and follow the link to set a new password.
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" autoFocus placeholder="you@example.com" className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button type="submit" className="button" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}