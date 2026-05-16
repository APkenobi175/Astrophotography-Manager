import { Outlet, Link } from "react-router-dom";
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

  function closeMenu() { setMenuOpen(false); }

  const profilePath = currentUsername ? `/profile/${currentUsername}` : "/";

  return (
    <div className="app-root">
      <header className="app-header">
        {/* Title — clicking goes to the public feed */}
        <Link to="/public" className="app-title-link">
          <h1 className="app-title">Astrophotography Sessions</h1>
        </Link>

        {/* Centered nav — desktop only */}
        <nav className="app-nav desktop-only">
          <Link to="/">My Sessions</Link>
          <Link to="/public">Public Feed</Link>
          <Link to="/liked">Liked Sessions</Link>
        </nav>

        {/* Right side: avatar + logout (desktop) / hamburger (mobile) */}
        <div className="app-header-right" ref={navRef}>
          {/* Hamburger — mobile only */}
          <button
            className="hamburger-btn mobile-only"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(o => !o)}
          >
            <span className={`hamburger-icon ${menuOpen ? "open" : ""}`}>
              <span /><span /><span />
            </span>
          </button>

          {/* Mobile dropdown nav */}
          {menuOpen && (
            <nav className="mobile-nav-dropdown">
              <Link to="/" onClick={closeMenu}>My Sessions</Link>
              <Link to="/public" onClick={closeMenu}>Public Feed</Link>
              <Link to="/liked" onClick={closeMenu}>Liked Sessions</Link>
              <Link to={profilePath} onClick={closeMenu}>My Profile</Link>
              <button className="nav-logout-btn" onClick={() => { closeMenu(); logout(); }}>
                Logout
              </button>
            </nav>
          )}

          {/* Desktop avatar + logout */}
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
