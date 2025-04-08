import color from "chroma-js";
import type { CSSProperties, FC } from "react";
import { colors } from "../../utils/namedColors";
import "./Tag.scss";

type ColorName = keyof typeof colors;

const prepareColor = (colorString: string, solid: boolean) => {
  const baseColor = color(colorString);

  return solid
    ? {
        color: color.contrast(baseColor, "#fff") > 4.5 ? "#fff" : "#000",
        background: baseColor,
        "shadow-color": baseColor.darken(0.22),
      }
    : {
        color: baseColor,
        background: baseColor.desaturate(2).brighten(2.2),
        "shadow-color": baseColor.desaturate(1).brighten(1.22),
      };
};

const getColor = (colorString: string | ColorName) => {
  if (colorString) {
    return colors[colorString as ColorName] ?? colorString;
  }
  return colors.blue;
};

interface TagProps {
  color: string | ColorName;
  className?: string;
  style?: CSSProperties;
  size?: "small" | "compact";
  solid?: boolean;
  children?: React.ReactNode;
}

export const Tag: FC<TagProps> = ({ className, style, size, color, solid = false, children }) => {
  const preparedColor = prepareColor(getColor(color), solid);

  const finalColor = Object.entries(preparedColor).reduce((res, [key, color]) => ({ ...res, [`--${key}`]: color }), {});

  const styles = { ...(style ?? {}), ...finalColor };

  const classes = ["lsf-tag"];

  // Add size modifier if present
  if (size) classes.push(`lsf-tag_size_${size}`);

  // Add custom class if provided
  if (className) classes.push(className);

  return (
    <span className={classes.join(" ")} style={styles}>
      {children}
    </span>
  );
};
