import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EditSessionModal from "../assets/EditSessionModal.jsx";
import { getCookie } from "../assets/csrfhelper.js";

function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [currentUsername, setCurrentUsername] = useState(null);
  const [editing, setEditing] = useState(false);

  async function fetchSession() {
    try {
      const res = await fetch(`/api/sessions/${id}/`, { credentials: "include" });
      if (res.status === 404) { setSession(null); setLoading(false); return; }
      if (!res.ok) { console.error("Failed to fetch session", res.status); setSession(null); setLoading(false); return; }
      const body = await res.json();
      setSession(body);
    } catch (err) {
      console.error("Error fetching session:", err);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSession();
    fetch("/api/me/", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(body => { if (body) setCurrentUsername(body.username); })
      .catch(() => {});
  }, [id]);

  async function handleDelete() {
    if (!window.confirm("Delete this session? This cannot be undone.")) return;
    const res = await fetch(`/api/sessions/${id}/`, {
      method: "DELETE",
      credentials: "include",
      headers: { "X-CSRFToken": getCookie("csrftoken") },
    });
    if (res.ok) {
      navigate("/");
    } else {
      console.error("Delete failed", res.status);
    }
  }

  async function handleSaveEdit(sessionId, payload) {
    const res = await fetch(`/api/sessions/${sessionId}/`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Save failed");
    }
    const updated = await res.json();
    setSession(prev => ({ ...prev, ...updated }));
    setEditing(false);
  }

  if (loading) return <p>Loading session…</p>;

  if (!session) {
    return (
      <div>
        <p>Session not found.</p>
        <button onClick={() => navigate("/")}>Back to My Sessions</button>
      </div>
    );
  }

  const isOwner = currentUsername && session.ownerUsername === currentUsername;
  const totalIntegrationSeconds = (session.lightFrames || 0) * (session.lightExposureSeconds || 0);
  const totalIntegrationHours = (totalIntegrationSeconds / 3600).toFixed(2);

  return (
    <div className="sessions-list-section">
      <div className="session-div">
        <button className="back-button" onClick={() => navigate(-1)}>← Back</button>

        <h2>{session.title}</h2>

        {isOwner && (
          <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
            <button className="session-action-btn edit-btn" onClick={() => setEditing(true)}>Edit</button>
            <button className="session-action-btn delete-btn" onClick={handleDelete}>Delete</button>
          </div>
        )}

        {session.caption && <p className="session-div-caption">{session.caption}</p>}
        <p><strong>Target:</strong> {session.target}</p>

        {session.images && session.images.length > 0 && (
          <div className="detail-images">
            {session.images.map((img, i) => (
              <img
                key={img}
                src={img}
                alt={`session-${session.id}-${i}`}
                onClick={() => setPreviewUrl(img)}
                className="detail-thumb"
              />
            ))}
          </div>
        )}

        <p><strong>Location:</strong> {session.locationName}</p>
        <p><strong>Camera:</strong> {session.cameraModel}</p>
        <p><strong>Telescope/Lens:</strong> {session.telescopeOrLens}</p>
        <p><strong>Light Frames:</strong> {session.lightFrames} x {session.lightExposureSeconds}s</p>
        <p><strong>Total Integration:</strong> {totalIntegrationSeconds} s ({totalIntegrationHours} h)</p>
        <p><strong>ISO:</strong> {session.iso ?? "N/A"}</p>
        <p><strong>Public:</strong> {session.isPublic ? "Yes" : "No"}</p>

        {previewUrl && (
          <div
            className="image-preview-overlay"
            onClick={() => setPreviewUrl(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
          >
            <img
              src={previewUrl}
              alt="preview"
              style={{ maxWidth: "90%", maxHeight: "90%", boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}
      </div>

      {editing && (
        <EditSessionModal
          session={session}
          onSave={handleSaveEdit}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

export default SessionDetailPage;
