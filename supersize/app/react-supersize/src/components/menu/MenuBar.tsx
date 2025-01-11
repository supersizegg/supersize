import * as React from "react";
import { Link, NavLink } from "react-router-dom";
import { MenuWallet } from "./MenuWallet";
import "./MenuBar.scss";

export function MenuBar() {
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
        <MenuWallet />
      </div>
    </header>
  );
}
