import React from "react";

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark"><span /><span /><span /></div>
          <div className="brand-name"><strong>VozCare</strong><small>AI</small></div>
        </div>
        <div className="auth-header">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children}
        {footer && <p className="auth-footer">{footer}</p>}
      </div>
    </div>
  );
}