import * as React from "react";

import { useNavigate } from "react-router-dom";

import { MenuWallet } from "./MenuWallet";
import { MenuSession } from "./MenuSession";

import "./MenuBar.scss";
import CopyLink from "../buddyReferral";
import Invite from "../buddyInvite";
import TweetLink from "../buddyTweet";
import LeaderboardButton from "@components/LeaderboardButton";

export function MenuBar() {
  const navigate = useNavigate();

  return (
    <div className="MenuBar backdrop-blur-[10px]">
      <button
        className="TopBar"
        onClick={() => {
          navigate("/");
        }}
      >
        <div className="Text">Supersize</div>
      </button>
      <div className="KeysBar">
        <LeaderboardButton
            handleLeaderboadClick={() => navigate("/leaderboard")}
        />
        <MenuSession />
        <div className="Separator"></div>
        <MenuWallet />
      </div>
      <div
          className="text-white font-[terminus] h-[6vh] mt-[13vh] cursor-pointer absolute right-[1vw] w-fit z-10 text-right"
          >
          <TweetLink />
          <CopyLink handleCreateClick={() => {}}/>
          </div>
    </div>
  );
}
