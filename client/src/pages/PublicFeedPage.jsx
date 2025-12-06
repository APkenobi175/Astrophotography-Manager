import { useEffect, useState } from "react";
import SessionDiv from "../assets/sessiondiv.jsx";

export default function PublicFeedPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPublic() {
        // Fetch all the public sessions
      try {
        const res = await fetch("/api/sessions/public/", { credentials: "include" });

        if (!res.ok) {
          console.error("Failed to fetch public sessions", res.status);
          setSessions([]);
          setLoading(false);
          return;
        }

        const body = await res.json().catch(() => ({}));
        setSessions(body.sessions || []);
      } catch (err) {
        console.error("Error fetching public sessions:", err);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    }
    fetchPublic();
  }, []);
  // Leading means we are waiting for the fetch to complete
  if (loading) return <div className="card">Loading…</div>;
  // If there are no sessions then show a message. This will only happen like one time 
  if (sessions.length === 0)
    return (
      <div className="card">
        <h2>Public Sessions</h2>
        <p>No public sessions yet.</p>
      </div>
    );
    // Otherwise, show the public sessions
  return (
    <div className="div">
      <h2>Public Sessions</h2>
      <p className="subtle">Newest public astrophotography logs</p>

      <div className="session-div-grid">
        {sessions.map((s) => (
          <SessionDiv key={s.id} session={s} />
        ))}
      </div>
    </div>
  );
}
