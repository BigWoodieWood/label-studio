
import React from "react";
import clsx from "clsx";
import { Button } from "@humansignal/ui";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@humansignal/shad/components/ui/card";
import { HotkeyItem } from "./Item";

/**
 * HotkeySection Component
 * 
 * Displays a section of hotkeys grouped by subgroups within a card layout.
 * Provides functionality to edit, toggle, and save hotkeys within the section.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.section - Section configuration object
 * @param {string} props.section.id - Unique identifier for the section
 * @param {string} props.section.title - Display title for the section
 * @param {string} props.section.description - Description text for the section
 * @param {Array} props.hotkeys - Array of hotkey objects for this section
 * @param {string} props.hotkeys[].id - Unique identifier for each hotkey
 * @param {string} [props.hotkeys[].subgroup] - Optional subgroup for organizing hotkeys
 * @param {string|null} props.editingHotkeyId - ID of currently editing hotkey, null if none
 * @param {Function} props.onEditHotkey - Callback when user starts editing a hotkey
 * @param {Function} props.onSaveHotkey - Callback when user saves hotkey changes
 * @param {Function} props.onCancelEdit - Callback when user cancels hotkey editing
 * @param {Function} props.onSaveSection - Callback when user saves section changes
 * @param {Function} props.onToggleHotkey - Callback when user toggles hotkey enabled/disabled
 * @param {boolean} props.hasChanges - Whether the section has unsaved changes
 * 
 * @returns {JSX.Element} Rendered HotkeySection component
 * 
 * @example
 * <HotkeySection
 *   section={{ id: "editor", title: "Editor", description: "Text editing shortcuts" }}
 *   hotkeys={[
 *     { id: "1", subgroup: "navigation", ... },
 *     { id: "2", subgroup: "editing", ... }
 *   ]}
 *   editingHotkeyId={null}
 *   onEditHotkey={(id) => setEditingId(id)}
 *   onSaveHotkey={(hotkey) => saveHotkey(hotkey)}
 *   onCancelEdit={() => setEditingId(null)}
 *   onSaveSection={(sectionId) => saveSection(sectionId)}
 *   onToggleHotkey={(id) => toggleHotkey(id)}
 *   hasChanges={true}
 * />
 */
export const HotkeySection = ({ 
  section, 
  hotkeys, 
  editingHotkeyId, 
  onEditHotkey, 
  onSaveHotkey, 
  onCancelEdit, 
  onSaveSection, 
  onToggleHotkey,
  hasChanges 
}) => {
  /**
   * Groups hotkeys by their subgroup property
   * Hotkeys without a subgroup are placed in the 'default' group
   * 
   * @returns {Object} Object with subgroup names as keys and arrays of hotkeys as values
   */
  const groupedHotkeys = hotkeys.reduce((groups, hotkey) => {
    const subgroup = hotkey.subgroup || 'default';
    if (!groups[subgroup]) {
      groups[subgroup] = [];
    }
    groups[subgroup].push(hotkey);
    return groups;
  }, {});

  /**
   * Gets sorted subgroup names with 'default' always appearing first
   * Other subgroups are sorted alphabetically
   * 
   * @returns {string[]} Sorted array of subgroup names
   */
  const subgroups = Object.keys(groupedHotkeys).sort((a, b) => {
    if (a === 'default') return -1;
    if (b === 'default') return 1;
    return a.localeCompare(b);
  });

  /**
   * Handles the save section button click
   */
  const handleSaveSection = () => {
    onSaveSection(section.id);
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle>{section.title}</CardTitle>
        <CardDescription>{section.description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div>
          {subgroups.map((subgroup) => (
            <div 
              key={subgroup} 
              className={clsx(
                subgroup !== 'default' && "mt-4 pt-2 border rounded-md border-border p-3"
              )}
            >
              {groupedHotkeys[subgroup].map(hotkey => (
                <HotkeyItem 
                  key={hotkey.id}
                  hotkey={hotkey}
                  onEdit={onEditHotkey}
                  onToggle={onToggleHotkey}
                  isEditing={editingHotkeyId === hotkey.id}
                  onSave={onSaveHotkey}
                  onCancel={onCancelEdit}
                />
              ))}
            </div>
          ))}
          
          {hotkeys.length === 0 && (
            <div className="py-8 text-center text-muted-foreground italic">
              No hotkeys in this section
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button 
          variant="default" 
          onClick={handleSaveSection}
          disabled={!hasChanges}
        >
          Save
        </Button>
      </CardFooter>
    </Card>
  );
};
