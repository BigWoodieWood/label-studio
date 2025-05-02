import React, { FC, useState, useCallback } from 'react';
import { IconSettings } from '@humansignal/icons';
import { ScatterSettingsDialog } from './ScatterSettingsDialog';
import { Block } from '../../../utils/bem';
import { Button } from '../../Common/Button/Button';
import { Icon } from '../../Common/Icon/Icon';

interface ScatterSettings {
  classField: string;
}

interface ScatterSettingsButtonProps {
  onSettingsChange: (settings: ScatterSettings) => void;
  settings: ScatterSettings;
  availableFields: string[];
}

export const ScatterSettingsButton: FC<ScatterSettingsButtonProps> = ({
  onSettingsChange,
  settings,
  availableFields,
}) => {
  const [showDialog, setShowDialog] = useState(false);

  const handleOpenDialog = useCallback(() => {
    setShowDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setShowDialog(false);
  }, []);

  const handleSaveSettings = useCallback((newSettings: ScatterSettings) => {
    console.log("ScatterSettingsButton received settings:", newSettings);
    onSettingsChange(newSettings);
  }, [onSettingsChange]);

  return (
    <Block name="scatter-settings">
      <Button
        type="text"
        icon={<Icon icon={IconSettings} />}
        onClick={handleOpenDialog}
        aria-label="Scatter view settings"
      />
      
      {showDialog && (
        <ScatterSettingsDialog
          isOpen={showDialog}
          onClose={handleCloseDialog}
          onSave={handleSaveSettings}
          settings={settings}
          availableFields={availableFields}
        />
      )}
    </Block>
  );
}; 