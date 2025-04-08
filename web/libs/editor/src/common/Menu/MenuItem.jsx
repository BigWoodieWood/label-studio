import React from "react";
import { useMemo } from "react";
import { MenuContext } from "./MenuContext";

export const MenuItem = ({
  name,
  children,
  label,
  icon,
  to,
  className,
  href,
  danger,
  exact = false,
  forceReload = false,
  active = false,
  onClick,
  ...rest
}) => {
  const { selected, allowClickSelected } = React.useContext(MenuContext);
  const isActive = (() => {
    const pathname = window.location.pathname.replace(/\/$/, "");
    const url = to ?? href;

    if (selected.has(name)) {
      return true;
    }
    if (exact) {
      return pathname === url;
    }
    return pathname.includes(url);
  })();

  const linkContent = useMemo(
    () => (
      <>
        {icon && <span className="dm-menu__item-icon">{icon}</span>}
        {children ?? label}
      </>
    ),
    [children, label, icon],
  );

  const getClassName = () => {
    const classes = ["dm-menu__item"];

    if (isActive || active) classes.push("dm-menu__item_active");
    if (danger) classes.push("dm-menu__item_look_danger");
    if (allowClickSelected) classes.push("dm-menu__item_clickable");
    if (className) classes.push(className);

    return classes.join(" ");
  };

  const linkAttributes = {
    className: getClassName(),
    onClick,
    ...rest,
  };

  if (forceReload) {
    linkAttributes.onClick = () => (window.location.href = to ?? href);
  }

  return (
    <li>
      {href ? (
        <a href={href ?? "#"} {...linkAttributes}>
          {linkContent}
        </a>
      ) : (
        <div {...linkAttributes}>{linkContent}</div>
      )}
    </li>
  );
};
