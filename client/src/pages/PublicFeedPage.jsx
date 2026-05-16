import { useEffect, useState } from "react";
import SessionDiv from "../assets/sessiondiv.jsx";

export default function PublicFeedPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPublic() {
      try {
        const res = await fetch("/api/sessions/public/", { credentials: "include" });
        if (!res.ok) { setSessions([]); return; }
        const body = await res.json().catch(() => ({}));
        setSessions(body.sessions || []);
      } catch {
        setSessions([]);
      } finally {
        setLoading(false);
      }
    }
    fetchPublic();
  }, []);

  return (
    <div className="feed-page">
      <div className="page-heading">
        <h2>Public Feed</h2>
        <p className="page-subheading">Newest astrophotography sessions from the community</p>
      </div>

      {loading ? (
        <div className="loading-state">Loading sessions…</div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔭</div>
          <p>No public sessions yet. Be the first to share!</p>
        </div>
      ) : (
        <div className="session-div-grid">
          {sessions.map(s => <SessionDiv key={s.id} session={s} />)}
        </div>
      )}
    </div>
  );
}
