import React from "react";
import { base44 } from "@/api/base44Client";

export default function UserNotRegisteredError() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark"><span /><span /><span /></div>
          <div className="brand-name"><strong>VozCare</strong><small>AI</small></div>
        </div>
        <h1>Access pending</h1>
        <p>Your account is not yet registered as a care-team member.</p>
        <p>An app admin must approve your access before you can review patient records.</p>
        <button className="button secondary" onClick={() => base44.auth.logout("/")}>
          Sign out
        </button>
      </div>
    </div>
  );
}