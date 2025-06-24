import React, { useState } from "react";
import { Button } from "@humansignal/ui";
import { Label } from "@humansignal/ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@humansignal/shad/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@humansignal/shad/components/ui/alert";

/**
 * ImportDialog - A dialog component for importing hotkey configurations
 * 
 * This component allows users to import hotkey configurations by pasting JSON data.
 * It validates the imported data structure and provides error feedback.
 * 
 * @param {ImportDialogProps} props - The component props
 * @returns {React.ReactElement} The ImportDialog component
 */
export const ImportDialog = ({ open, onOpenChange, onImport }) => {
  // State for the import text input
  const [importText, setImportText] = useState("");
  // State for validation errors
  const [error, setError] = useState("");

  /**
   * Validates a single hotkey object structure
   * @param {Object} hotkey - The hotkey object to validate
   * @throws {Error} If the hotkey is missing required fields
   */
  const validateHotkey = (hotkey) => {
    const requiredFields = ['id', 'section', 'element', 'label', 'key'];
    const missingFields = requiredFields.filter(field => !hotkey[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  };

  /**
   * Handles the import process
   * Parses JSON, validates structure, and calls the onImport callback
   */
  const handleImport = () => {
    try {
      // Clear any previous errors
      setError("");
      
      // Validate input exists
      if (!importText.trim()) {
        throw new Error("Please enter JSON data to import");
      }

      // Parse the JSON
      const hotkeys = JSON.parse(importText);
      
      // Validate it's an array
      if (!Array.isArray(hotkeys)) {
        throw new Error("Invalid format: expected an array of hotkeys");
      }

      // Validate it's not empty
      if (hotkeys.length === 0) {
        throw new Error("No hotkeys found in the imported data");
      }
      
      // Validate each hotkey object
      hotkeys.forEach((hotkey, index) => {
        try {
          validateHotkey(hotkey);
        } catch (validationError) {
          throw new Error(`Hotkey at index ${index}: ${validationError.message}`);
        }
      });
      
      // If validation passes, proceed with import
      onImport(hotkeys);
      
      // Reset the dialog state
      resetDialogState();
      
    } catch (err) {
      // Set error message for display
      setError(err.message);
    }
  };

  /**
   * Resets the dialog to its initial state
   */
  const resetDialogState = () => {
    setImportText("");
    setError("");
    onOpenChange(false);
  };

  /**
   * Handles dialog cancellation
   */
  const handleCancel = () => {
    resetDialogState();
  };

  /**
   * Handles textarea input changes
   * @param {React.ChangeEvent<HTMLTextAreaElement>} e - The change event
   */
  const handleTextareaChange = (e) => {
    setImportText(e.target.value);
    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] bg-neutral-surface">
        <DialogHeader>
          <DialogTitle>Import Hotkeys</DialogTitle>
          <DialogDescription>
            Paste your exported hotkeys JSON below. This will replace your current hotkeys.
            Make sure the JSON contains an array of hotkey objects with the required fields.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Label htmlFor="import-json">Hotkeys JSON</Label>
          <textarea
            id="import-json"
            className="flex min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            placeholder='[{"id": 1, "section": "annotation-actions", "element": "button", "label": "Save", "key": "Ctrl+S"}]'
            value={importText}
            onChange={handleTextareaChange}
            aria-describedby={error ? "import-error" : undefined}
          />
          
          {error && (
            <Alert variant="destructive" id="import-error">
              <AlertTitle>Import Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!importText.trim()}
          >
            Import Hotkeys
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
