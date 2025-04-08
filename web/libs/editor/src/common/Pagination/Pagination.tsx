import { type ChangeEvent, type FC, forwardRef, type KeyboardEvent, useCallback, useState } from "react";
import { Hotkey } from "../../core/Hotkey";
import { useHotkey } from "../../hooks/useHotkey";
import "./Pagination.scss";

interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  pageSizeOptions?: [];
  pageSizeSelectable: boolean;
  outline?: boolean;
  align?: "left" | "right";
  size?: "small" | "medium" | "large";
  noPadding?: boolean;
  hotkey?: {
    prev?: string;
    next?: string;
  };
  disabled?: boolean;
  onChange?: (pageNumber: number, maxPerPage?: number | string) => void;
}

const isSystemEvent = (e: KeyboardEvent<HTMLInputElement>): boolean => {
  return (
    e.code.match(/arrow/i) !== null ||
    (e.shiftKey && e.code.match(/arrow/i) !== null) ||
    e.metaKey ||
    e.ctrlKey ||
    e.code === "Backspace"
  );
};

export const Pagination: FC<PaginationProps> = forwardRef<any, PaginationProps>(
  (
    {
      size = "medium",
      pageSizeOptions = [1, 25, 50, 100],
      currentPage,
      pageSize,
      totalPages,
      outline = true,
      align = "right",
      noPadding = false,
      pageSizeSelectable = true,
      hotkey,
      disabled,
      onChange,
    },
    _ref,
  ) => {
    const [inputMode, setInputMode] = useState(false);

    const handleChangeSelect = (e: ChangeEvent<HTMLSelectElement>) => {
      onChange?.(1, e.currentTarget.value);
    };

    const renderOptions = () => {
      return pageSizeOptions.map((obj: number, index: number) => {
        return (
          <option value={obj} key={index}>
            {obj} per page
          </option>
        );
      });
    };

    // Build class names for pagination component
    const paginationClasses = ["lsf-pagination"];

    // Add modifier classes
    if (size) paginationClasses.push(`lsf-pagination_size_${size}`);
    if (outline) paginationClasses.push("lsf-pagination_outline");
    if (align) paginationClasses.push(`lsf-pagination_align_${align}`);
    if (noPadding) paginationClasses.push("lsf-pagination_no-padding");
    if (disabled) paginationClasses.push("lsf-pagination_disabled");

    return (
      <div className={paginationClasses.join(" ")}>
        <div className="lsf-pagination__navigation">
          <>
            <NavigationButton
              mod={["arrow-left", "arrow-left-double"]}
              onClick={() => onChange?.(1)}
              disabled={currentPage === 1 || disabled}
            />
            <div className="lsf-pagination__divider" />
          </>
          <NavigationButton
            mod={["arrow-left"]}
            onClick={() => onChange?.(currentPage - 1)}
            hotkey={hotkey?.prev}
            disabled={currentPage === 1 || disabled}
          />
          <div className="lsf-pagination__input">
            {inputMode ? (
              <input
                type="text"
                autoFocus
                defaultValue={currentPage}
                pattern="[0-9]"
                onKeyDown={(e) => {
                  const _value = Number.parseFloat(e.currentTarget.value);

                  if (e.code === "Escape") {
                    setInputMode(false);
                  } else if (e.code === "Enter") {
                    if (_value <= totalPages && _value >= 1) {
                      onChange?.(_value);
                    }

                    setInputMode(false);
                  } else if (e.code.match(/[0-9]/) === null && !isSystemEvent(e)) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                onBlur={(e) => {
                  const _value = Number.parseFloat(e.currentTarget.value);

                  if (_value <= totalPages && _value >= 1) {
                    onChange?.(_value);
                  }

                  setInputMode(false);
                }}
              />
            ) : (
              <div
                className="lsf-pagination__page-indicator"
                onClick={() => {
                  setInputMode(true);
                }}
              >
                {currentPage} <span>of {totalPages}</span>
                <div
                  onClick={() => {
                    /*  */
                  }}
                />
              </div>
            )}
          </div>
          <NavigationButton
            mod={["arrow-right"]}
            onClick={() => onChange?.(currentPage + 1)}
            disabled={currentPage === totalPages || disabled}
            hotkey={hotkey?.next}
          />
          <>
            <div className="lsf-pagination__divider" />
            <NavigationButton
              mod={["arrow-right", "arrow-right-double"]}
              onClick={() => onChange?.(totalPages)}
              disabled={currentPage === totalPages || disabled}
            />
          </>
        </div>
        {pageSizeSelectable && (
          <div className="lsf-pagination__page-size">
            <select value={pageSize} onChange={handleChangeSelect}>
              {renderOptions()}
            </select>
          </div>
        )}
      </div>
    );
  },
);

type NavigationButtonProps = {
  onClick: () => void;
  mod: string[];
  disabled?: boolean;
  hotkey?: string;
};

const NavigationButton: FC<NavigationButtonProps> = ({ mod, disabled, hotkey, onClick }) => {
  const actionHandler = useCallback(() => {
    if (!disabled) onClick();
  }, [disabled, onClick]);

  useHotkey(hotkey, actionHandler);

  // Build button class names
  const buttonClasses = ["lsf-pagination__btn"];

  // Add all modifiers from the array
  mod.forEach((modifier) => {
    buttonClasses.push(`lsf-pagination__btn_${modifier}`);
  });

  // Add disabled state if needed
  if (disabled) buttonClasses.push("lsf-pagination__btn_disabled");

  const buttonElement = (
    <button className={buttonClasses.join(" ")} onClick={actionHandler} disabled={disabled} type="button" />
  );

  return hotkey ? <Hotkey.Tooltip name={hotkey}>{buttonElement}</Hotkey.Tooltip> : buttonElement;
};
