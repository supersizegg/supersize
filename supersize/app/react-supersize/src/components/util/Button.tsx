import * as React from "react";

import { Text } from "./Text";

import "./Button.scss";

export function Button({
  icon,
  text,
  className,
  onClick,
}: {
  icon?: string;
  text: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button className={className} onClick={onClick}>
      {icon ? <img className="icon" src={icon} /> : undefined}
      <Text value={text} />
    </button>
  );
}
