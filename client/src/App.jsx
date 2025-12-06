import { Outlet, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "./App.css";

async function logout() {
  const res = await fetch("/registration/logout/", {
    credentials: "include",
  });

  if (res.ok) {
    window.location = "/registration/sign_in/";
  } else {
    console.error("Logout failed");
  }
}

function App() {
  const [avatarInitial, setAvatarInitial] = useState("U");

  useEffect(() => {
    let mounted = true;
    // Fetch the users info so we can get their name initial for the profile picture
    async function fetchMe() {
      try {
        const res = await fetch("/api/me/", { credentials: "include" });
        if (!res.ok) return;
        const body = await res.json();
        const first = body.firstName || "";
        const uname = body.username || "";
        // Use the first letter of their first name. Default to U
        const initial = first ? first[0].toUpperCase() : (uname[0] || "U").toUpperCase();
        if (mounted) setAvatarInitial(initial);
      } catch (e) {
        // ignore - leave default
      }
    }
    fetchMe();
    return () => { mounted = false };
  }, []);

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Astrophotography Sessions</h1>
        {/* This is our navigation links using the hash router*/}
        <nav className="app-nav">
          <Link to="/">My Sessions</Link>
          <Link to="/public">Public Feed</Link>
          <Link to="/liked">My Liked Sessions</Link>
         </nav>

        <div className="header-actions">
          <Link to="/profile" className="header-avatar" title="My Profile">{avatarInitial}</Link>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="app-main">
        {/* This is the "page" */}
        <Outlet />
      </main>
    </div>
  );
}



export default App;
