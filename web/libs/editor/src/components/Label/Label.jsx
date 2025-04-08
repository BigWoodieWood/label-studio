import chroma from "chroma-js";
import React, { useMemo } from "react";
import { asVars } from "../../utils/styles";

import "./Label.scss";

export const Label = React.forwardRef(
  (
    {
      className,
      style,
      color,
      empty = false,
      hidden = false,
      selected = false,
      margins = false,
      onClick,
      children,
      hotkey,
      ...rest
    },
    ref,
  ) => {
    const styles = useMemo(() => {
      if (!color) return null;
      const background = chroma(color).alpha(0.15);

      return {
        ...(style ?? {}),
        ...asVars({
          color,
          background,
        }),
      };
    }, [color]);

    const labelClasses = ["dm-label"];
    if (empty) labelClasses.push("dm-label_empty");
    if (hidden) labelClasses.push("dm-label_hidden");
    if (selected) labelClasses.push("dm-label_selected");
    if (onClick) labelClasses.push("dm-label_clickable");
    if (margins) labelClasses.push("dm-label_margins");
    if (className) labelClasses.push(className);

    return (
      <span ref={ref} className={labelClasses.join(" ")} style={styles} onClick={onClick} {...rest}>
        <span className="dm-label__text">{children}</span>
        {hotkey ? <span className="dm-label__hotkey">{hotkey}</span> : null}
      </span>
    );
  },
);
