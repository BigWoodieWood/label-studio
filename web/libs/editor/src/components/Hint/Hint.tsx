import type { CSSProperties, FC } from "react";
import "./Hint.scss";

interface HintProps {
  copy?: string;
  style?: CSSProperties;
  className?: string;
}

/**
 * Hint Component
 */
const Hint: FC<HintProps> = (props) => {
  // Combine classes
  const classes = ["dm-hint"];
  if (props.className) classes.push(props.className);

  return (
    <sup className={classes.join(" ")} data-copy={props.copy} style={props.style}>
      {props.children}
    </sup>
  );
};

export default Hint;
