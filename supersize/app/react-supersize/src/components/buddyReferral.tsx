import { useBuddyState, BUDDY_MEMBER } from "buddy.link";
import React, { useCallback, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

interface ShareProps {
  baseUrl?: string;
  handleCreateClick: () => void;
}

const CopyLink: React.FC<ShareProps> = React.memo(
  ({ baseUrl = "https://supersize.gg", handleCreateClick }: ShareProps) => {
    const [member] = useBuddyState(BUDDY_MEMBER);
    const { publicKey } = useWallet();

    const [isCopying, setIsCopying] = useState(false); //Control loading state, prevent duplicate clicks
    const [textContet, setTextContent] = useState("Copy");
    const [isHovered, setIsHovered] = useState(false);
    const shareLink = useMemo(() => {
      const accountName = member?.[0]?.account?.name;

      if (typeof accountName !== "string") {
        // console.error('Expected a string but got', accountName);
        return baseUrl;
      }

      return `${baseUrl}?r=${accountName}`;
    }, [baseUrl, member]);

    const handleCopyLink = useCallback(() => {
      setIsCopying(true);
      try {
        if (typeof window !== "undefined") {
          // const textToCopy = shareBlink;
          navigator.clipboard
            .writeText(shareLink)
            .then(() => {
              setTextContent("Copied");
              setTimeout(() => {
                setTextContent("Copy");
              }, 1000);
              console.log("URL copied to clipboard");
            })
            .catch((err) => {
              console.error("Failed to copy URL", err);
            });
        }
      } catch {
        console.error("Failed to copy URL");
      } finally {
        setIsCopying(false);
      }
    }, [shareLink]);

    return (
      <>
        {member && member?.length > 0 ? (
          <div
            onClick={() => {
              if (!isCopying) {
                handleCopyLink();
              }
            }}
          >
            <div className="inline-flex items-center gap-2">{textContet}</div>
          </div>
        ) : (
          <span className="px-4" onClick={handleCreateClick}>
            {publicKey ? "Create Referral" : ""}
          </span>
        )}
      </>
    );
  },
);

CopyLink.displayName = "CopyLink";

export default CopyLink;
