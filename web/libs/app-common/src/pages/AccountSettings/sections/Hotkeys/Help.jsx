
import { useCallback, useEffect, useState, useRef } from "react";
import React from "react";
import ReactDOM from "react-dom";
import clsx from "clsx";
import { ToastType, useToast } from "@humansignal/ui";
import { API } from "apps/labelstudio/src/providers/ApiProvider";
import { atomWithMutation } from "jotai-tanstack-query";
import { useAtomValue } from "jotai";

// Shadcn UI components
import { Button } from "@humansignal/ui";
import { Label, Input, Toggle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@humansignal/ui";

import { Switch } from "@humansignal/shad/components/ui/switch";
import { Separator } from "@humansignal/shad/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@humansignal/shad/components/ui/card";
import { Badge } from "@humansignal/shad/components/ui/badge";
import { Skeleton } from "@humansignal/shad/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@humansignal/shad/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@humansignal/shad/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@humansignal/shad/components/ui/dropdown-menu";

import { KeyboardKey } from "./Key";
import { HotkeyItem } from "./Item";
import { HotkeySection } from "./Section";
import { DEFAULT_HOTKEYS, HOTKEY_SECTIONS } from "./defaults";


// Define a regex mapping from URL patterns to section IDs
const URL_TO_SECTION_MAPPING = [
  { regex: /\/projects\/\d+\/data\/?\?.*task=\d+/i, section: ["annotation", "regions"] },
  { regex: /\/projects\/\d+\/data\/?$/i, section: "data_manager" },
  
];

export const openHotkeyHelp = (sectionOrUrl) => {
  let sectionsToShow = [];
  
  // If sectionOrUrl is provided
  if (sectionOrUrl) {
    // Check if it's a URL
    if (sectionOrUrl.startsWith('http') || sectionOrUrl.startsWith('/')) {
      // Apply regex mapping to identify sections
      for (const mapping of URL_TO_SECTION_MAPPING) {
        if (mapping.regex.test(sectionOrUrl)) {
          // If the mapping.section is an array, extend sectionsToShow with it
          if (Array.isArray(mapping.section)) {
            sectionsToShow = [...sectionsToShow, ...mapping.section];
          } else {
            sectionsToShow.push(mapping.section);
          }
        }
      }
    } else {
      // It's a section name or an array of section names
      sectionsToShow = Array.isArray(sectionOrUrl) ? sectionOrUrl : [sectionOrUrl];
    }
  } else {
    // If nothing is provided, use current URL
    const currentUrl = window.location.pathname;
    for (const mapping of URL_TO_SECTION_MAPPING) {
      if (mapping.regex.test(currentUrl)) {
        // If the mapping.section is an array, extend sectionsToShow with it
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

  // If no sections identified, show all sections
  if (sectionsToShow.length === 0) {
    sectionsToShow = HOTKEY_SECTIONS.map(section => section.id);
  }

  // Create modal root with high z-index
  const modalRoot = document.createElement('div');
  modalRoot.style.position = 'fixed';
  modalRoot.style.top = '0';
  modalRoot.style.left = '0';
  modalRoot.style.width = '100%';
  modalRoot.style.height = '100%';
  modalRoot.style.zIndex = '9999';
  modalRoot.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  modalRoot.style.display = 'flex';
  modalRoot.style.alignItems = 'center';
  modalRoot.style.justifyContent = 'center';
  document.body.appendChild(modalRoot);

  // Create a function to remove the modal
  const closeModal = () => {
    ReactDOM.unmountComponentAtNode(modalRoot);
    document.body.removeChild(modalRoot);
  };

  // The HotkeyHelpModal component
  const HotkeyHelpModal = () => {
    const [open, setOpen] = React.useState(true);

    const handleClose = () => {
      setOpen(false);
      setTimeout(closeModal, 300); // Give time for animation to complete
    };

    // Click outside to close
    const handleBackdropClick = (e) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    };

    return (
      <div onClick={handleBackdropClick} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-3xl max-h-[80vh] overflow-hidden w-full mx-4">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Available Keyboard Shortcuts</h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Keyboard shortcuts for this page.&nbsp;
              <a 
                href="/user/account/hotkeys" 
                onClick={() => { handleClose(); return true; }}
                className="text-blue-600 hover:underline"
              >
                Customize
              </a>
            </p>
          </div>
          
          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
            <div className="space-y-4">
              {sectionsToShow.map(sectionId => {
                const section = HOTKEY_SECTIONS.find(s => s.id === sectionId);
                if (!section) return null;

                const sectionHotkeys = DEFAULT_HOTKEYS.filter(h => h.section === sectionId);
                if (sectionHotkeys.length === 0) return null;

                // Group hotkeys by subgroup
                const groupedHotkeys = sectionHotkeys.reduce((groups, hotkey) => {
                  const subgroup = hotkey.subgroup || 'default';
                  if (!groups[subgroup]) {
                    groups[subgroup] = [];
                  }
                  groups[subgroup].push(hotkey);
                  return groups;
                }, {});

                // Get sorted subgroups (with 'default' always first)
                const subgroups = Object.keys(groupedHotkeys).sort((a, b) => {
                  if (a === 'default') return -1;
                  if (b === 'default') return 1;
                  return a.localeCompare(b);
                });

                return (
                  <div key={sectionId} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="font-medium">{section.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{section.description}</p>
                    </div>
                    <div className="p-4">
                      <div className="space-y-2">
                        {subgroups.map((subgroup, index) => (
                          <div key={subgroup} className={clsx(
                            subgroup !== 'default' && "mt-4 pt-2 border rounded-md border-gray-200 dark:border-gray-700 p-3"
                          )}>
                            {subgroup !== 'default' && (
                              <div className="mb-3">
                                <div className="text-sm font-medium mb-1 capitalize">
                                  {HOTKEY_SUBGROUPS[subgroup]?.title || subgroup}
                                </div>
                                {HOTKEY_SUBGROUPS[subgroup]?.description && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {HOTKEY_SUBGROUPS[subgroup].description}
                                  </div>
                                )}
                              </div>
                            )}
                            {groupedHotkeys[subgroup].map(hotkey => (
                              <div
                                key={`${section.id}-${hotkey.element}`}
                                className="flex items-center justify-between py-2"
                              >
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
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  window.location.href = "/user/account/hotkeys";
                  handleClose();
                }}
                variant="neutral"
              >
                Customize Hotkeys
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render the modal
  ReactDOM.render(<HotkeyHelpModal />, modalRoot);

  // Handle ESC key
  const handleEsc = (event) => {
    if (event.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", handleEsc);
    }
  };
  document.addEventListener("keydown", handleEsc);

  return null;
};
