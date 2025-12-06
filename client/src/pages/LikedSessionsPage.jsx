import { useEffect, useState } from "react";
import SessionCard from "../assets/sessiondiv.jsx";

export default function LikedSessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
    // Fetcht he liked sessions for the user from the server
  async function fetchLiked() {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions/liked/", {
        credentials: "include",
      });

      if (!res.ok) {
        console.error("Failed to fetch liked sessions", res.status);
        setSessions([]);
        return;
      }
        // this should never happen
      const body = await res.json();
      setSessions(body.sessions || []);
    } catch (err) {
      console.error("Error fetching liked sessions:", err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLiked();
  }, []);

  return (
    <main className="page">
      <header className="page-header">
        <h1>Liked Sessions</h1>
        <p>Astrophotography logs you&apos;ve hearted.</p>
      </header>

      {loading ? (
        <p>Loading liked sessions…</p>
      ) : sessions.length === 0 ? (
        <p>You haven&apos;t liked any sessions yet.</p>
      ) : (
        <div className="session-div-grid">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      )}
    </main>
  );
}
