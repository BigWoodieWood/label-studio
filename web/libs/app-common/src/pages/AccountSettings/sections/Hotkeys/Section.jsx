
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

import { HotkeyItem } from "./Item";


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
  // Group hotkeys by subgroup
  const groupedHotkeys = hotkeys.reduce((groups, hotkey) => {
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
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle>{section.title}</CardTitle>
        <CardDescription>{section.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          {subgroups.map((subgroup, index) => (
            <div key={subgroup} className={clsx(
              subgroup !== 'default' && "mt-4 pt-2 border rounded-md border-border p-3"
            )}>
              {subgroup !== 'default' && (
                <div className="mb-3">
                  <div className="text-sm font-medium mb-1 capitalize">
                    {HOTKEY_SUBGROUPS[subgroup]?.title || subgroup}
                  </div>
                  {HOTKEY_SUBGROUPS[subgroup]?.description && (
                    <div className="text-xs text-muted-foreground">
                      {HOTKEY_SUBGROUPS[subgroup].description}
                    </div>
                  )}
                </div>
              )}
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
          
          onClick={() => onSaveSection(section.id)}
          disabled={!hasChanges}
        >
          Save
        </Button>
      </CardFooter>
    </Card>
  );
};
