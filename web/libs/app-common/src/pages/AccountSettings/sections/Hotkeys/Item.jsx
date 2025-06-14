
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

import { useAPI } from "apps/labelstudio/src/providers/ApiProvider";
import { KeyboardKey } from "./Key";

import { IconEdit } from "@humansignal/icons";

export const HotkeyItem = ({ hotkey, onEdit, isEditing, onSave, onCancel, onToggle }) => {
  const [editedKey, setEditedKey] = useState(hotkey.key);
  const [keyRecordingMode, setKeyRecordingMode] = useState(false);
  const [error, setError] = useState("");
  const keyRecordingRef = useRef(null);
  
  // Handle key press in the key input field
  const handleKeyPress = (e) => {
    if (!keyRecordingMode) return;
    
    e.preventDefault();
    
    const { key, ctrlKey, shiftKey, altKey, metaKey } = e.nativeEvent;
    
    // Skip if it's just a modifier key
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return;
    
    let keyCombo = [];
    if (ctrlKey) keyCombo.push('ctrl');
    if (shiftKey) keyCombo.push('shift');
    if (altKey) keyCombo.push('alt');
    if (metaKey) keyCombo.push('meta');
    
    keyCombo.push(key.toLowerCase());
    
    setEditedKey(keyCombo.join('+'));
    setError("");
    setKeyRecordingMode(false);
  };
  
  // Start recording key combination
  const startRecordingKeys = () => {
    setKeyRecordingMode(true);
    setEditedKey("");
    setError("");
    if (keyRecordingRef.current) {
      keyRecordingRef.current.focus();
    }
  };
  
  // Handle save button click
  const handleSave = () => {
    onSave(hotkey.id, editedKey);
  };
  
  // If in editing mode, render edit form
  if (isEditing) {
    return (
      <div className="py-3 space-y-3 border-b border-border last:border-0">
        <div className="font-medium">{hotkey.label}</div>
        <div className="flex gap-3">
          <div 
            ref={keyRecordingRef}
            className={clsx(
              "flex-1 flex items-center justify-center min-h-[40px] px-4 py-2 border rounded-md cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              keyRecordingMode ? "bg-primary/10 border-primary" : "border-input bg-background",
              error ? "border-destructive" : ""
            )}
            onClick={startRecordingKeys}
            onKeyDown={handleKeyPress}
            tabIndex="0"
          >
            {keyRecordingMode ? (
              <span className="text-primary font-medium animate-pulse">Press keys now...</span>
            ) : editedKey ? (
              <KeyboardKey>{editedKey}</KeyboardKey>
            ) : (
              <span className="text-muted-foreground">Click to set shortcut</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="default" size="sm" onClick={handleSave} disabled={!editedKey || !!error}>
              Apply
            </Button>
            <Button variant="neutral" size="sm" onClick={() => onCancel(hotkey.id)}>
              Cancel
            </Button>
          </div>
        </div>
        {error && (
          <div className="text-sm text-destructive mt-1">{error}</div>
        )}
      </div>
    );
  }
  
  // Otherwise render normal view with new layout: toggle, description, hotkey
  return (
    <div className={clsx(
      "flex items-center py-3 border-b border-border/10 last:border-0",
      !hotkey.active && "opacity-60"
    )}>
      <div className="flex-none mr-4">
        <Switch 
          checked={hotkey.active}
          onCheckedChange={() => onToggle(hotkey.id)}
          aria-label={`${hotkey.active ? 'Disable' : 'Enable'} ${hotkey.label}`}
        />
      </div>
      <div className="flex-1 mr-4">
        <div className="font-medium">{hotkey.label}</div>
        <div className="text-sm text-muted-foreground">{hotkey.description}</div>
      </div>
      <div 
        className="flex items-center gap-2 cursor-pointer hover:opacity-80" 
        onClick={() => onEdit(hotkey.id)}
      >
        <KeyboardKey>{hotkey.key}</KeyboardKey>
        {/* <div className="px-0.5 py-0.5 bg-muted text-muted-foreground rounded"> */}
        {/*   <IconEdit className="text-xs" /> */}
        {/* </div> */}
      </div>
    </div>
  );
};
