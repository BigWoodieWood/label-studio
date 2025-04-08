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

    const labelClasses = ["lsf-label"];
    if (empty) labelClasses.push("lsf-label_empty");
    if (hidden) labelClasses.push("lsf-label_hidden");
    if (selected) labelClasses.push("lsf-label_selected");
    if (onClick) labelClasses.push("lsf-label_clickable");
    if (margins) labelClasses.push("lsf-label_margins");
    if (className) labelClasses.push(className);

    return (
      <span ref={ref} className={labelClasses.join(" ")} style={styles} onClick={onClick} {...rest}>
        <span className="lsf-label__text">{children}</span>
        {hotkey ? <span className="lsf-label__hotkey">{hotkey}</span> : null}
      </span>
    );
  },
);
