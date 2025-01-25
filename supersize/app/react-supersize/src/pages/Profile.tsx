import React, { useState } from "react";
import { MenuBar } from "@components/menu/MenuBar";
import { MenuSession } from "@components/menu/MenuSession";
import FooterLink from "@components/Footer";
import "./Profile.scss";

export default function Profile() {
  const [activeTab, setActiveTab] = useState<"general" | "quests" | "admin">("general");

  return (
    <div className="profile-page main-container">
      <MenuBar />
      <div className="profile-container">
        <div className="profile-tabs">
          <button className={activeTab === "general" ? "active" : ""} onClick={() => setActiveTab("general")}>
            General
          </button>
          <button className={activeTab === "quests" ? "active" : ""} onClick={() => setActiveTab("quests")}>
            Quests
          </button>
          <button className={activeTab === "admin" ? "active" : ""} onClick={() => setActiveTab("admin")}>
            Admin panel
          </button>
        </div>

        <div className="profile-content">
          {activeTab === "general" && <GeneralTab />}
          {activeTab === "quests" && <QuestsTab />}
          {activeTab === "admin" && <AdminTab />}
        </div>
      </div>

      <FooterLink />
    </div>
  );
}

function GeneralTab() {
  return (
    <div className="general-tab">
      <MenuSession />

      <hr className="divider" />

      <div className="row-inline">
        <input type="text" placeholder="Username" />
        <button className="btn-save">Save</button>
      </div>

      <div className="row-inline referral-row">
        <label>Referral code</label>
        <input type="text" readOnly value="ABC123" />
        <button className="btn-copy">Copy</button>
      </div>

      <button className="btn-create-referral">Create referral link</button>
    </div>
  );
}

function QuestsTab() {
  return (
    <div className="quests-tab">
      <div className="quest-item">
        <span>Follow us on X | 5xp</span>
        <button>Link twitter</button>
      </div>
      <div className="quest-item">
        <span>Join telegram | 5xp</span>
        <button>Link telegram</button>
      </div>
      <div className="quest-item">
        <span>Wager $10 USDC | 10xp</span>
        <button disabled>Complete</button>
      </div>
      <div className="quest-item">
        <span>Play for 5 minutes | 10xp</span>
        <button disabled>Complete</button>
      </div>
      <div className="quest-item">
        <span>Mint NFT | 250xp</span>
        <button>Mint page</button>
      </div>
    </div>
  );
}

function AdminTab() {
  return (
    <div className="admin-tab">
      <p>You have no games</p>
    </div>
  );
}
