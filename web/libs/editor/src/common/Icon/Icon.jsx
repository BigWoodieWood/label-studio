import React from "react";
import "./Icon.scss";

export const Icon = React.forwardRef(({ icon, ...props }, ref) => {
  return (
    <span className="dm-icon" ref={ref}>
      {React.createElement(icon, props)}
    </span>
  );
});
