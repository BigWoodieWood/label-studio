import ReactDOM from "react-dom";
import clsx from "clsx";
import { Button } from "@humansignal/ui";
import { KeyboardKey } from "./Key";
import { DEFAULT_HOTKEYS, HOTKEY_SECTIONS, URL_TO_SECTION_MAPPING } from "./defaults";

/**
 * Main modal component that displays keyboard shortcuts
 * Renders shortcuts organized by sections and subgroups
 */
const HotkeyHelpModal = ({ sectionsToShow, onClose }) => {
  /**
   * Handles backdrop clicks to close modal
   */
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  /**
   * Navigates to hotkey customization page and closes modal
   */
  const handleCustomizeClick = () => {
    window.location.href = "/user/account/hotkeys";
    onClose();
  };

  /**
   * Renders a single hotkey section with its shortcuts
   */
  const renderSection = (sectionId) => {
    const section = HOTKEY_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return null;

    const sectionHotkeys = DEFAULT_HOTKEYS.filter((h) => h.section === sectionId);
    if (sectionHotkeys.length === 0) return null;

    // Group hotkeys by subgroup for better organization
    const groupedHotkeys = sectionHotkeys.reduce((groups, hotkey) => {
      const subgroup = hotkey.subgroup || "default";
      if (!groups[subgroup]) {
        groups[subgroup] = [];
      }
      groups[subgroup].push(hotkey);
      return groups;
    }, {});

    // Sort subgroups with 'default' always first
    const subgroups = Object.keys(groupedHotkeys).sort((a, b) => {
      if (a === "default") return -1;
      if (b === "default") return 1;
      return a.localeCompare(b);
    });

    return (
      <div key={sectionId} className="border border-gray-200 dark:border-gray-700 rounded-lg">
        {/* Section Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-medium">{section.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{section.description}</p>
        </div>

        {/* Section Content */}
        <div className="p-4">
          <div className="space-y-2">
            {subgroups.map((subgroup) => (
              <div
                key={subgroup}
                className={clsx(
                  subgroup !== "default" && "mt-4 pt-2 border rounded-md border-gray-200 dark:border-gray-700 p-3",
                )}
              >
                {/* Subgroup Header */}
                {subgroup !== "default" && (
                  <div className="mb-3">
                    <div className="text-sm font-medium mb-1 capitalize">
                      {HOTKEY_SECTIONS[subgroup]?.title || subgroup}
                    </div>
                    {HOTKEY_SECTIONS[subgroup]?.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {HOTKEY_SECTIONS[subgroup].description}
                      </div>
                    )}
                  </div>
                )}

                {/* Hotkey Items */}
                {groupedHotkeys[subgroup].map((hotkey) => (
                  <div key={`${section.id}-${hotkey.element}`} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">{hotkey.label}</div>
                      {hotkey.description && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">{hotkey.description}</div>
                      )}
                    </div>
                    <KeyboardKey>{hotkey.key}</KeyboardKey>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div onClick={handleBackdropClick} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-3xl max-h-[80vh] overflow-hidden w-full mx-4">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Available Keyboard Shortcuts</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Keyboard shortcuts for this page.&nbsp;
            <a
              href="/user/account/hotkeys"
              onClick={(e) => {
                e.preventDefault();
                handleCustomizeClick();
              }}
              className="text-blue-600 hover:underline"
            >
              Customize
            </a>
          </p>
        </div>

        {/* Modal Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">{sectionsToShow.map(renderSection)}</div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end">
            <Button onClick={handleCustomizeClick}>Customize Hotkeys</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Determines which hotkey sections to display based on URL or explicit section names
 * @param {string|string[]} sectionOrUrl - URL string, section name, or array of section names
 * @returns {string[]} Array of section IDs to display
 */
const determineSectionsToShow = (sectionOrUrl) => {
  let sectionsToShow = [];

  if (sectionOrUrl) {
    // Check if input is a URL
    if (typeof sectionOrUrl === "string" && (sectionOrUrl.startsWith("http") || sectionOrUrl.startsWith("/"))) {
      // Apply URL-to-section mapping
      for (const mapping of URL_TO_SECTION_MAPPING) {
        if (mapping.regex.test(sectionOrUrl)) {
          if (Array.isArray(mapping.section)) {
            sectionsToShow = [...sectionsToShow, ...mapping.section];
          } else {
            sectionsToShow.push(mapping.section);
          }
        }
      }
    } else {
      // Input is section name(s)
      sectionsToShow = Array.isArray(sectionOrUrl) ? sectionOrUrl : [sectionOrUrl];
    }
  } else {
    // Use current URL if no input provided
    const currentUrl = window.location.pathname + window.location.search;
    for (const mapping of URL_TO_SECTION_MAPPING) {
      if (mapping.regex.test(currentUrl)) {
        if (Array.isArray(mapping.section)) {
          sectionsToShow = [...sectionsToShow, ...mapping.section];
        } else {
          sectionsToShow.push(mapping.section);
        }
      }
    }
  }

  // Remove duplicates
  sectionsToShow = [...new Set(sectionsToShow)];

  // Show all sections if none were identified
  if (sectionsToShow.length === 0) {
    sectionsToShow = HOTKEY_SECTIONS.map((section) => section.id);
  }

  return sectionsToShow;
};

/**
 * Creates and displays a modal with keyboard shortcuts
 * Automatically determines which shortcuts to show based on current page or provided sections
 *
 * @param {string|string[]} [sectionOrUrl] - Optional URL or section name(s) to determine which shortcuts to display
 *                                         - If URL: uses regex mapping to find relevant sections
 *                                         - If string: shows that specific section
 *                                         - If array: shows multiple specific sections
 *                                         - If undefined: auto-detects from current URL
 *
 * @example
 * // Show shortcuts for current page
 * openHotkeyHelp();
 *
 * // Show shortcuts for specific section
 * openHotkeyHelp('annotation');
 *
 * // Show shortcuts for multiple sections
 * openHotkeyHelp(['annotation', 'regions']);
 *
 * // Show shortcuts based on URL
 * openHotkeyHelp('/projects/123/data/?task=456');
 */
export const openHotkeyHelp = (sectionOrUrl) => {
  const sectionsToShow = determineSectionsToShow(sectionOrUrl);

  // Create modal container with high z-index
  const modalRoot = document.createElement("div");
  modalRoot.style.position = "fixed";
  modalRoot.style.top = "0";
  modalRoot.style.left = "0";
  modalRoot.style.width = "100%";
  modalRoot.style.height = "100%";
  modalRoot.style.zIndex = "9999";
  document.body.appendChild(modalRoot);

  /**
   * Cleans up modal DOM elements and event listeners
   */
  const closeModal = () => {
    ReactDOM.unmountComponentAtNode(modalRoot);
    document.body.removeChild(modalRoot);
    document.removeEventListener("keydown", handleEscKey);
  };

  /**
   * Handles ESC key press to close modal
   */
  const handleEscKey = (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  };

  // Set up ESC key listener
  document.addEventListener("keydown", handleEscKey);

  // Render modal component
  ReactDOM.render(<HotkeyHelpModal sectionsToShow={sectionsToShow} onClose={closeModal} />, modalRoot);

  return {
    close: closeModal,
  };
};
