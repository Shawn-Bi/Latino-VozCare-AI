import React, { useEffect, useState } from "react";
import { listUsers, approveDoctor, provisionDemoData } from "@/lib/vozcare-api";

export default function AdminPanel({ onProvisioned }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await listUsers();
      setUsers(list);
    } catch (err) {
      setError(err.message || "Could not load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleApprove = async (user) => {
    setBusy(user.id);
    setError("");
    try {
      await approveDoctor(user.id, user.email, user.full_name || user.email);
      await refresh();
    } catch (err) {
      setError(err.message || "Could not approve doctor.");
    } finally {
      setBusy(null);
    }
  };

  const handleProvision = async (user) => {
    setProvisioning(true);
    setProvisionResult("");
    setError("");
    try {
      const count = await provisionDemoData(user.id, user.email);
      setProvisionResult(`Created ${count} synthetic demo patients with visits and education drafts.`);
      onProvisioned();
    } catch (err) {
      setError(err.message || "Could not provision demo data.");
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <section className="panel" style={{ marginBottom: "var(--space-4)" }}>
      <div className="panel-heading">
        <div>
          <h2>Admin · Care-team management</h2>
          <p>Approve doctors and provision synthetic demo records. No real patient data is used.</p>
        </div>
        <button type="button" className="button secondary" onClick={refresh} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      {error && <p role="alert" style={{ padding: "var(--space-3)", color: "var(--red)" }}>{error}</p>}
      {provisionResult && <p role="status" style={{ padding: "var(--space-3)", color: "var(--green)" }}>{provisionResult}</p>}
      {loading ? (
        <p style={{ padding: "var(--space-4)", color: "var(--muted)" }}>Loading users…</p>
      ) : users.length === 0 ? (
        <p style={{ padding: "var(--space-4)", color: "var(--muted)" }}>No users found.</p>
      ) : (
        <div>
          {users.map((user) => (
            <div key={user.id} className="review-resource" style={{ borderBottom: "1px solid var(--line)" }}>
              <div>
                <small>{user.email}</small>
                <strong style={{ display: "block", marginTop: "var(--space-1)", color: "var(--navy-deep)" }}>
                  {user.full_name || user.email}
                </strong>
                <span className={`badge ${user.care_team_approved ? "success" : "warning"}`}>
                  <i />{user.care_team_approved ? "Approved" : "Pending"}
                </span>
                {user.role === "admin" && <span className="badge info" style={{ marginLeft: "var(--space-1)" }}><i />Admin</span>}
              </div>
              <div className="resource-actions">
                {!user.care_team_approved && (
                  <button
                    type="button"
                    onClick={() => handleApprove(user)}
                    disabled={busy === user.id}
                  >
                    {busy === user.id ? "Approving…" : "Approve doctor"}
                  </button>
                )}
                {user.care_team_approved && (
                  <button
                    type="button"
                    onClick={() => handleProvision(user)}
                    disabled={provisioning}
                  >
                    {provisioning ? "Provisioning…" : "Provision demo patients"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}