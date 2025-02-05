import { useBuddyState, BUDDY_MEMBER } from "buddy.link";
import React, { useCallback, useMemo, useState } from "react";

interface ShareProps {
  baseUrl?: string;
  message?: string;
  buttonLabel?: string;
  forceShareState?: boolean;
}

const TweetLink: React.FC<ShareProps> = React.memo(
  ({
    baseUrl = "https%3A%2F%2Fsupersize.gg",
    message = "Try%20out%20onchain%20gaming%20with%20me%20on%20Supersize!",
    buttonLabel = "Share ref link on X",
    forceShareState = false,
  }: ShareProps) => {
    const [member] = useBuddyState(BUDDY_MEMBER);
    const [isTweeting, setIsTweeting] = useState(false); //Control loading state, prevent duplicate clicks

    const shareLink = useMemo(() => {
      const accountName = member?.[0]?.account?.name;

      if (typeof accountName !== "string") {
        // console.error('Expected a string but got', accountName);

        return baseUrl;
      }

      const doubleEncodedUrl = `${baseUrl}${baseUrl.match("%3F") ? "%26" : "%3f"}ref=${accountName}`;
      return doubleEncodedUrl;

      // return `${baseUrl}${baseUrl.match('%3F') ? '%26' : '%3f'}ref=${accountName}`
    }, [baseUrl, member]);

    const handleTweetLink = useCallback(() => {
      setIsTweeting(true);
      try {
        window.open(`https://x.com/intent/tweet?text=${message}%20${shareLink}`);
      } catch {
        console.error("Failed to copy URL");
      } finally {
        setIsTweeting(false);
      }
    }, [shareLink, message]);

    return (
      <>
        {(member && member?.length > 0) || forceShareState ? (
          <div
            className={`post-on-x-button`}
            onClick={() => {
              if (!isTweeting) {
                handleTweetLink();
              }
            }}
          >
            <img src="/coin.png" width="24" />
            <span>{buttonLabel}</span>
          </div>
        ) : null}
      </>
    );
  },
);

TweetLink.displayName = "TweetLink";

export default TweetLink;
