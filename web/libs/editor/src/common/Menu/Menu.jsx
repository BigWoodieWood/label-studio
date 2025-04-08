import { forwardRef, useCallback, useMemo } from "react";
import { useDropdown } from "../Dropdown/DropdownTrigger";
import "./Menu.scss";
import { MenuContext } from "./MenuContext";
import { MenuItem } from "./MenuItem";

export const Menu = forwardRef(
  ({ children, className, style, size, selectedKeys, closeDropdownOnItemClick, allowClickSelected }, ref) => {
    const dropdown = useDropdown();

    const selected = useMemo(() => {
      return new Set(selectedKeys ?? []);
    }, [selectedKeys]);

    const clickHandler = useCallback(
      (e) => {
        const elem = e.target.closest(".dm-menu__item");

        if (dropdown && elem && closeDropdownOnItemClick !== false) {
          dropdown.close();
        }
      },
      [dropdown],
    );

    const collapsed = useMemo(() => {
      return !!dropdown;
    }, [dropdown]);

    const contextValue = useMemo(() => {
      return { selected, allowClickSelected };
    }, [selected, allowClickSelected]);

    const menuClasses = ["dm-menu"];
    if (size) menuClasses.push(`dm-menu_size_${size}`);
    if (collapsed) menuClasses.push("dm-menu_collapsed");
    if (className) menuClasses.push(className);

    return (
      <MenuContext.Provider value={contextValue}>
        <ul ref={ref} className={menuClasses.join(" ")} style={style} onClick={clickHandler}>
          {children}
        </ul>
      </MenuContext.Provider>
    );
  },
);

Menu.Item = MenuItem;
Menu.Spacer = () => <li className="dm-menu__spacer" />;
Menu.Divider = () => <li className="dm-menu__divider" />;
Menu.Builder = (url, menuItems) => {
  return (menuItems ?? []).map((item, index) => {
    if (item === "SPACER") return <Menu.Spacer key={index} />;
    if (item === "DIVIDER") return <Menu.Divider key={index} />;

    const [path, label] = item;
    const location = `${url}${path}`.replace(/([/]+)/g, "/");

    return (
      <Menu.Item key={index} to={location} exact>
        {label}
      </Menu.Item>
    );
  });
};

Menu.Group = ({ children, title, className, style }) => {
  const classes = ["dm-menu-group"];
  if (className) classes.push(className);

  return (
    <li className={classes.join(" ")} style={style}>
      <div className="dm-menu-group__title">{title}</div>
      <ul className="dm-menu-group__list">{children}</ul>
    </li>
  );
};
