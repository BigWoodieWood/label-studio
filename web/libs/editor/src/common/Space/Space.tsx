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
  const spaceClasses = ["dm-space"];

  // Add all modifier classes
  if (direction) spaceClasses.push(`dm-space_direction_${direction}`);
  if (size) spaceClasses.push(`dm-space_size_${size}`);
  if (spread) spaceClasses.push("dm-space_spread");
  if (stretch) spaceClasses.push("dm-space_stretch");
  if (align) spaceClasses.push(`dm-space_align_${align}`);
  if (collapsed) spaceClasses.push("dm-space_collapsed");
  if (truncated) spaceClasses.push("dm-space_truncated");

  // Add custom class name if provided
  if (className) spaceClasses.push(className);

  return (
    <div className={spaceClasses.join(" ")} style={style} {...rest}>
      {children}
    </div>
  );
};
