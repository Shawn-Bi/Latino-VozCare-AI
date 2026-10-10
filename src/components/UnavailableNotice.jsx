import React from "react";

export default function UnavailableNotice({ title = "Service not connected", message = "This feature requires a connected service that has not been configured yet. Contact your admin to set it up.", children }) {
  return (
    <div className="empty-state" role="status">
      <span aria-hidden="true" style={{ fontSize: 24 }}>⚠</span>
      <h3>{title}</h3>
      <p>{message}</p>
      {children}
    </div>
  );
}