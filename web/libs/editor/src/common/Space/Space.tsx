import type { CSSProperties, FC } from "react";
import "./Space.scss";

export interface SpaceProps {
  direction?: "horizontal" | "vertical";
  size?: "small" | "medium" | "large" | "none";
  style?: CSSProperties;
  spread?: boolean;
  stretch?: boolean;
  align?: "start" | "end";
  collapsed?: boolean;
  truncated?: boolean;
  className?: string;
}

export const Space: FC<SpaceProps> = ({
  direction = "horizontal",
  size,
  className,
  style,
  children,
  spread,
  stretch,
  align,
  collapsed,
  truncated,
  ...rest
}) => {
  const spaceClasses = ["lsf-space"];

  // Add all modifier classes
  if (direction) spaceClasses.push(`lsf-space_direction_${direction}`);
  if (size) spaceClasses.push(`lsf-space_size_${size}`);
  if (spread) spaceClasses.push("lsf-space_spread");
  if (stretch) spaceClasses.push("lsf-space_stretch");
  if (align) spaceClasses.push(`lsf-space_align_${align}`);
  if (collapsed) spaceClasses.push("lsf-space_collapsed");
  if (truncated) spaceClasses.push("lsf-space_truncated");

  // Add custom class name if provided
  if (className) spaceClasses.push(className);

  return (
    <div className={spaceClasses.join(" ")} style={style} {...rest}>
      {children}
    </div>
  );
};
