import { Outlet, Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import "./App.css";

async function logout() {
  const res = await fetch("/registration/logout/", { credentials: "include" });
  if (res.ok) {
    window.location = "/registration/sign_in/";
  } else {
    console.error("Logout failed");
  }
}

function App() {
  const [avatarInitial, setAvatarInitial] = useState("U");
  const [avatarPic, setAvatarPic] = useState(null);
  const [currentUsername, setCurrentUsername] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function fetchMe() {
      try {
        const res = await fetch("/api/me/", { credentials: "include" });
        if (!res.ok) return;
        const body = await res.json();
        if (!mounted) return;
        const first = body.firstName || "";
        const uname = body.username || "";
        setAvatarInitial(first ? first[0].toUpperCase() : (uname[0] || "U").toUpperCase());
        setCurrentUsername(uname);
        if (body.profilePicture) setAvatarPic(body.profilePicture);
      } catch {
        // ignore
      }
    }
    fetchMe();
    return () => { mounted = false; };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuOpen && navRef.current && !navRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  const profilePath = currentUsername ? `/profile/${currentUsername}` : "/";

  return (
    <div className="app-root">
      <header className="app-header">
        <h1 className="app-title">Astrophotography Sessions</h1>

        <div className="app-header-right" ref={navRef}>
          {/* Hamburger button — visible only on mobile */}
          <button
            className="hamburger-btn"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(o => !o)}
          >
            <span className={`hamburger-icon ${menuOpen ? "open" : ""}`}>
              <span /><span /><span />
            </span>
          </button>

          {/* Nav links */}
          <nav className={`app-nav ${menuOpen ? "nav-open" : ""}`}>
            <Link to="/" onClick={closeMenu}>My Sessions</Link>
            <Link to="/public" onClick={closeMenu}>Public Feed</Link>
            <Link to="/liked" onClick={closeMenu}>Liked Sessions</Link>
            <Link to={profilePath} onClick={closeMenu}>My Profile</Link>
            <button className="nav-logout-btn" onClick={() => { closeMenu(); logout(); }}>
              Logout
            </button>
          </nav>

          {/* Avatar — desktop only (hidden on mobile, logout moves into nav) */}
          <Link to={profilePath} className="header-avatar desktop-only" title="My Profile">
            {avatarPic ? (
              <img src={avatarPic} alt="avatar" className="header-avatar-img" />
            ) : (
              avatarInitial
            )}
          </Link>
          <button className="desktop-only logout-desktop" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
