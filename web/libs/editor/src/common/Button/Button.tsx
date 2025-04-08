import type Keymaster from "keymaster";
import {
  type ButtonHTMLAttributes,
  cloneElement,
  type CSSProperties,
  type FC,
  forwardRef,
  type ForwardRefExoticComponent,
  useMemo,
  type ComponentClass,
  type FunctionComponent,
} from "react";
import { Hotkey } from "../../core/Hotkey";
import { useHotkey } from "../../hooks/useHotkey";
import { isDefined } from "../../utils/utilities";
import { Tooltip } from "@humansignal/ui";

// Define a type for component or tag name for backwards compatibility
type ComponentType = FC<any> | ComponentClass<unknown, unknown> | FunctionComponent<unknown>;
type TagNameType = keyof React.ReactHTML | keyof React.ReactSVG | string;
type CNTagName = ComponentType | TagNameType;

import "./Button.scss";

type HTMLButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">;

export interface ButtonProps extends HTMLButtonProps {
  type?: "text" | "link";
  href?: string;
  extra?: JSX.Element;
  className?: string;
  size?: "small" | "medium" | "compact" | "large";
  waiting?: boolean;
  icon?: JSX.Element;
  tag?: CNTagName;
  look?: "primary" | "danger" | "destructive" | "alt" | "outlined" | "active" | "disabled";
  primary?: boolean;
  danger?: boolean;
  style?: CSSProperties;
  hotkey?: keyof typeof Hotkey.keymap;
  hotkeyScope?: string;
  tooltip?: string;
  tooltipTheme?: "light" | "dark";
  nopadding?: boolean;
  // Block props
  // @todo can be imported/infered from Block
  mod?: Record<string, any>;
}

export interface ButtonGroupProps {
  className?: string;
  collapsed?: boolean;
}

export interface ButtonType<P> extends ForwardRefExoticComponent<P> {
  Group?: FC<ButtonGroupProps>;
}

export const Button: ButtonType<ButtonProps> = forwardRef(
  (
    {
      children,
      type,
      extra,
      className,
      size,
      waiting,
      icon,
      tag,
      look,
      primary,
      danger,
      hotkey,
      hotkeyScope,
      tooltip,
      tooltipTheme = "light",
      nopadding,
      ...rest
    },
    ref,
  ) => {
    const finalTag = tag ?? (rest.href ? "a" : "button");

    const mods = {
      size,
      waiting,
      type,
      danger,
      nopadding,
      look: look ?? [],
      withIcon: !!icon,
      withExtra: !!extra,
    };

    if (primary) {
      mods.look = "primary";
    }

    const iconElem = useMemo(() => {
      if (!icon) return null;
      if (isDefined(icon.props.size)) return icon;

      switch (size) {
        case "small":
          return cloneElement(icon, { ...icon.props, size: 12, width: 12, height: 12 });
        case "compact":
          return cloneElement(icon, { ...icon.props, size: 14, width: 14, height: 14 });
        default:
          return icon;
      }
    }, [icon, size]);

    useHotkey(hotkey, rest.onClick as unknown as Keymaster.KeyHandler, hotkeyScope);

    // Build class names based on modifiers
    const buttonClasses = ["dm-button"];

    // Add modifier classes
    if (mods.size) buttonClasses.push(`dm-button_size_${mods.size}`);
    if (mods.waiting) buttonClasses.push("dm-button_waiting");
    if (mods.type) buttonClasses.push(`dm-button_type_${mods.type}`);
    if (mods.danger) buttonClasses.push("dm-button_danger");
    if (mods.nopadding) buttonClasses.push("dm-button_nopadding");
    if (mods.withIcon) buttonClasses.push("dm-button_with-icon");
    if (mods.withExtra) buttonClasses.push("dm-button_with-extra");

    // Handle look modifier which can be an array or string
    if (Array.isArray(mods.look)) {
      mods.look.forEach((look) => buttonClasses.push(`dm-button_look_${look}`));
    } else if (mods.look) {
      buttonClasses.push(`dm-button_look_${mods.look}`);
    }

    // Add custom class names
    if (className) buttonClasses.push(className);

    const Tag = finalTag as any;

    const buttonBody = (
      <Tag className={buttonClasses.join(" ")} ref={ref} type={type} {...rest}>
        <>
          {iconElem && <span className="dm-button__icon">{iconElem}</span>}
          {iconElem && children ? <span>{children}</span> : children}
          {extra !== undefined ? <div className="dm-button__extra">{extra}</div> : null}
        </>
      </Tag>
    );

    if (hotkey && isDefined(Hotkey.keymap[hotkey])) {
      return (
        <Hotkey.Tooltip name={hotkey} title={tooltip}>
          {buttonBody}
        </Hotkey.Tooltip>
      );
    }

    if (tooltip) {
      return (
        <Tooltip title={tooltip} theme={tooltipTheme} ref={ref}>
          {buttonBody}
        </Tooltip>
      );
    }

    return buttonBody;
  },
);

Button.displayName = "Button";

const Group: FC<ButtonGroupProps> = ({ className, children, collapsed }) => {
  const groupClasses = ["dm-button-group"];

  if (collapsed) groupClasses.push("dm-button-group_collapsed");
  if (className) groupClasses.push(className);

  return <div className={groupClasses.join(" ")}>{children}</div>;
};

Button.Group = Group;
