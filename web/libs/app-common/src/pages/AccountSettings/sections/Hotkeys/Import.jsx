
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

// ImportDialog component for importing hotkeys
export const ImportDialog = ({ open, onOpenChange, onImport }) => {
  const [importText, setImportText] = useState("");
  const [error, setError] = useState("");
  
  const handleImport = () => {
    try {
      // Parse the import text
      const hotkeys = JSON.parse(importText);
      
      // Validate the imported data
      if (!Array.isArray(hotkeys)) {
        throw new Error("Invalid format: expected an array of hotkeys");
      }
      
      // Check if each hotkey has the required fields
      hotkeys.forEach(hotkey => {
        if (!hotkey.id || !hotkey.section || !hotkey.element || !hotkey.label || !hotkey.key) {
          throw new Error("Invalid hotkey format: missing required fields");
        }
      });
      
      // Call the import function
      onImport(hotkeys);
      onOpenChange(false);
      setImportText("");
      setError("");
      
    } catch (err) {
      setError("Invalid JSON format: " + err.message);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Import Hotkeys</DialogTitle>
          <DialogDescription>
            Paste your exported hotkeys JSON below. This will replace your current hotkeys.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Label htmlFor="import-json">Hotkeys JSON</Label>
          <textarea
            id="import-json"
            className="flex min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder='[{"id": 1, "section": "annotation-actions", ...}]'
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={!importText}>Import Hotkeys</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
