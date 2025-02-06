import * as React from "react";
import { Link, NavLink } from "react-router-dom";
import { MenuWallet } from "./MenuWallet";
import "./MenuBar.scss";

export function MenuBar() {
  const [isMobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const toggleMobileMenu = () => setMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="menu-bar">
      <div className="menu-bar-left">
        <Link to="/" className="logo">
          <img src="/token.png" alt="Supersize" />
          <span>Supersize</span>
        </Link>
      </div>

      <div className="menu-bar-right">
        <nav className="nav-links">
          <NavLink to="/" end>
            Lobby
          </NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>

        <button className="burger-menu" onClick={toggleMobileMenu} aria-label="Toggle navigation">
          <img src="/icons/bars-solid.svg" alt="Menu" />
        </button>

        <MenuWallet />
      </div>

      <div className={`mobile-nav-backdrop ${isMobileMenuOpen ? "open" : ""}`} onClick={closeMobileMenu}>
        <nav className={`mobile-nav ${isMobileMenuOpen ? "open" : ""}`} onClick={(e) => e.stopPropagation()}>
          <NavLink to="/" end onClick={closeMobileMenu}>
            Lobby
          </NavLink>
          <NavLink to="/about" onClick={closeMobileMenu}>
            About Supersize
          </NavLink>
          <NavLink to="/leaderboard" onClick={closeMobileMenu}>
            Leaderboard
          </NavLink>
          <NavLink to="/profile" style={{ display: "none" }} onClick={closeMobileMenu}>
            Profile
          </NavLink>
          <a href="https://x.com/SUPERSIZEgg" target="_blank" rel="noreferrer">
            ⎋ Follow on X
          </a>
        </nav>
      </div>
    </header>
  );
}
