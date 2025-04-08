import { Fragment, useEffect, useState } from "react";
import { Hotkey } from "../../core/Hotkey";

const hotkeys = Hotkey("SegmentationToolbar", "Segmentation Tools");

const keysDictionary = {
  plus: "+",
  minus: "-",
};

const shortcutView = (shortcut) => {
  if (!shortcut) return null;

  const combos = shortcut.split(",").map((s) => s.trim());

  return (
    <div className="lsf-flyoutmenu__shortcut">
      {combos.map((combo, index) => {
        const keys = combo.split("+");

        return (
          <Fragment key={`${keys.join("-")}-${index}`}>
            {keys.map((key) => {
              return (
                <kbd className="lsf-flyoutmenu__key" key={key}>
                  {keysDictionary[key] ?? key}
                </kbd>
              );
            })}
          </Fragment>
        );
      })}
    </div>
  );
};

export const FlyoutMenu = ({ items, icon }) => {
  const [isClicked, setClicked] = useState(false);

  useEffect(() => {
    const removeShortcuts = () => {
      items.forEach((menuItem) => {
        const currentShortcut = menuItem.shortcut;

        if (currentShortcut && hotkeys.hasKey(currentShortcut)) {
          hotkeys.removeKey(currentShortcut);
        }
      });
    };
    const addShortcuts = () => {
      items.forEach((menuItem) => {
        const currentShortcut = menuItem.shortcut;

        if (currentShortcut && !hotkeys.hasKey(currentShortcut)) {
          hotkeys.addKey(
            currentShortcut,
            () => {
              menuItem?.onClick?.();
              setClicked(false);
            },
            menuItem.label,
          );
        }
      });
    };

    removeShortcuts();
    addShortcuts();

    return () => {
      removeShortcuts();
    };
  }, [items]);

  useEffect(() => {
    const windowClickHandler = () => {
      if (isClicked) {
        setClicked(false);
      }
    };

    window.addEventListener("click", windowClickHandler);
    return () => {
      window.removeEventListener("click", windowClickHandler);
    };
  });

  return (
    <div
      className={`lsf-flyoutmenu ${isClicked ? "hovered" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        setClicked(!isClicked);
      }}
    >
      <div
        className={`lsf-flyoutmenu__icon ${isClicked ? "isClicked" : ""}`}
        title="Zoom presets (click to see options)"
      >
        {icon}
      </div>
      <div className="lsf-tooltips">
        {items.map((childItem, index) => (
          <div
            className="lsf-tooltips__tooltip"
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              childItem?.onClick?.();
              setClicked(false);
            }}
          >
            <div className="lsf-tooltips__tooltip-body">
              <div className="lsf-tooltips__label">{childItem.label}</div>
              {shortcutView(childItem.shortcut)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
