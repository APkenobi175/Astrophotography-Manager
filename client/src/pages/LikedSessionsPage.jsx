import { useEffect, useState } from "react";
import SessionDiv from "../assets/sessiondiv.jsx";

export default function LikedSessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLiked() {
      try {
        const res = await fetch("/api/sessions/liked/", { credentials: "include" });
        if (!res.ok) { setSessions([]); return; }
        const body = await res.json();
        setSessions(body.sessions || []);
      } catch {
        setSessions([]);
      } finally {
        setLoading(false);
      }
    }
    fetchLiked();
  }, []);

  return (
    <div className="feed-page">
      <div className="page-heading">
        <h2>Liked Sessions</h2>
        <p className="page-subheading">Astrophotography logs you've hearted</p>
      </div>

      {loading ? (
        <div className="loading-state">Loading…</div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">♡</div>
          <p>You haven't liked any sessions yet.</p>
        </div>
      ) : (
        <div className="session-div-grid">
          {sessions.map(s => <SessionDiv key={s.id} session={s} />)}
        </div>
      )}
    </div>
  );
}
