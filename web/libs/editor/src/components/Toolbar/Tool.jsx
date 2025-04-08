import { isDefined } from "../../utils/utilities";
import { useContext, useEffect, useMemo, useState } from "react";
import { Fragment } from "react";
import { Hotkey } from "../../core/Hotkey";
import { ToolbarContext } from "./ToolbarContext";

const hotkeys = Hotkey("SegmentationToolbar", "Segmentation Tools");

const keysDictionary = {
  plus: "+",
  minus: "-",
};

export const Tool = ({
  active = false,
  disabled = false,
  smart = false,
  extra = null,
  tool = null,
  controlsOnHover = false,
  extraShortcuts = {},
  ariaLabel,
  controls,
  icon,
  label,
  shortcut,
  onClick,
}) => {
  let currentShortcut = shortcut;
  const dynamic = tool?.dynamic ?? false;
  const { expanded, alignment } = useContext(ToolbarContext);
  const [hovered, setHovered] = useState(false);

  const shortcutView = useMemo(() => {
    if (!isDefined(shortcut)) return null;

    const combos = shortcut.split(",").map((s) => s.trim());

    return (
      <div className="lsf-tool__shortcut">
        {combos.map((combo, index) => {
          const keys = combo.split("+");

          return (
            <Fragment key={`${keys.join("-")}-${index}`}>
              {keys.map((key) => {
                return (
                  <kbd className="lsf-tool__key" key={key}>
                    {keysDictionary[key] ?? key}
                  </kbd>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    );
  }, [shortcut]);

  useEffect(() => {
    const removeShortcut = () => {
      if (currentShortcut && hotkeys.hasKey(currentShortcut)) {
        hotkeys.removeKey(currentShortcut);
      }
    };

    removeShortcut();
    currentShortcut = shortcut;
    if (shortcut && !hotkeys.hasKey(shortcut)) {
      hotkeys.addKey(
        shortcut,
        () => {
          if (!tool?.disabled && !tool?.annotation?.isDrawing) {
            if (tool?.unselectRegionOnToolChange) {
              tool.annotation.unselectAreas();
            }
            onClick?.();
          }
        },
        label,
      );
    }

    return () => {
      removeShortcut();
    };
  }, [shortcut, tool?.annotation]);

  useEffect(() => {
    const removeShortcuts = () => {
      Object.keys(extraShortcuts).forEach((key) => {
        if (hotkeys.hasKey(key)) hotkeys.removeKey(key);
      });
    };

    const addShortcuts = () => {
      Object.entries(extraShortcuts).forEach(([key, [label, fn]]) => {
        if (!hotkeys.hasKey(key)) hotkeys.overwriteKey(key, fn, label);
      });
    };

    if (active) {
      addShortcuts();
    }

    return removeShortcuts;
  }, [extraShortcuts, active]);

  const extraContent = useMemo(() => {
    return smart && extra ? <div className="lsf-tool__extra">{extra}</div> : null;
  }, [smart, extra]);

  const showControls = dynamic === false && controls?.length && (active || (controlsOnHover && hovered));
  const isAnnotationDrawing = tool?.annotation?.isDrawing;
  const isDisabled = disabled || isAnnotationDrawing;

  const toolClasses = [
    "lsf-tool",
    active ? "lsf-tool_active" : "",
    isDisabled ? "lsf-tool_disabled" : "",
    alignment ? `lsf-tool_alignment_${alignment}` : "",
    expanded && !dynamic ? "lsf-tool_expanded" : "",
    dynamic || smart ? "lsf-tool_smart" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={toolClasses}
      aria-label={ariaLabel}
      onClick={(e) => {
        if (!disabled && !isAnnotationDrawing) {
          e.preventDefault();
          if (tool?.unselectRegionOnToolChange) {
            tool?.annotation?.unselectAreas?.();
          }
          onClick?.(e);
        }
      }}
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
    >
      <div className="lsf-tool__icon">{icon}</div>
      {dynamic === false &&
        controlsOnHover === false &&
        (expanded ? (
          <>
            <div className="lsf-tool__label">
              {extraContent}
              {label}
              {shortcutView}
            </div>
          </>
        ) : (
          (isDefined(label) || isDefined(shortcutView)) &&
          !showControls && (
            <div className={`lsf-tool__tooltip ${!!(smart && extra) ? "lsf-tool__tooltip_controlled" : ""}`}>
              <div className="lsf-tool__tooltip-body">
                {extraContent}
                {label}
                {shortcutView}
              </div>
            </div>
          )
        ))}
      {showControls && (
        <div className="lsf-tool__controls" onClickCapture={(e) => e.stopPropagation()}>
          <div className="lsf-tool__controls-body">{controls}</div>
        </div>
      )}
    </button>
  );
};
