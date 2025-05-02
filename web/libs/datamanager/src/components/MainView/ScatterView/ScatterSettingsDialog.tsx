import React, { FC, useState, useCallback } from 'react';
import { Button } from '../../Common/Button/Button';
import { Modal } from '../../Common/Modal/Modal';
import { Block, Elem } from '../../../utils/bem';
import { Space } from '../../Common/Space/Space';

interface ScatterSettings {
  classField: string;
}

interface ScatterSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: ScatterSettings) => void;
  settings: ScatterSettings;
  availableFields: string[];
}

export const ScatterSettingsDialog: FC<ScatterSettingsDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  settings,
  availableFields = [],
}) => {
  const [formValues, setFormValues] = useState<ScatterSettings>(settings);
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleFieldChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    console.log("Selected new classField:", newValue);
    setFormValues(prev => ({
      ...prev,
      classField: newValue,
    }));
  }, []);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (formRef.current) {
      // Get values directly from the form to avoid closure issues
      const selectElem = formRef.current.querySelector('select') as HTMLSelectElement;
      const currentClassField = selectElem ? selectElem.value : 'class';
      const currentFormValues = { classField: currentClassField };
      console.log("Submitting settings:", currentFormValues);
      onSave(currentFormValues);
    }
    onClose();
  }, [onSave, onClose]);

  if (!isOpen) return null;

  console.log("Dialog rendered with settings:", settings, "and formValues:", formValues);

  return (
    <Modal
      visible={isOpen}
      title="Scatter View Settings"
      onHide={onClose}
      closeOnClickOutside
      footer={
        <Space align="end">
          <Button onClick={onClose} size="compact">Cancel</Button>
          <Button onClick={handleSubmit} look="primary" size="compact">Save</Button>
        </Space>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit}>
        <Block name="scatter-settings-form">
          <Elem name="group">
            <Elem name="label">Class Field</Elem>
            <Elem name="control" tag="select" value={formValues.classField} onChange={handleFieldChange}>
              {availableFields.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </Elem>
          </Elem>
        </Block>
      </form>
    </Modal>
  );
}; 