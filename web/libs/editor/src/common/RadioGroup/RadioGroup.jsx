import React, { useState } from "react";
import "./RadioGroup.scss";

const RadioContext = React.createContext();

export const RadioGroup = ({ size, value, defaultValue, onChange, children, ...props }) => {
  const [currentValue, setCurrentValue] = useState(defaultValue);

  const onRadioChange = (e) => {
    setCurrentValue(e.target.value);
    onChange?.(e);
  };

  return (
    <RadioContext.Provider
      value={{
        value: value ?? currentValue,
        onChange: onRadioChange,
        defaultValue,
      }}
    >
      <div className={`dm-radio-group ${size ? `dm-radio-group_size_${size}` : ""}`} style={props.style}>
        <div className="dm-radio-group__buttons">{children}</div>
      </div>
    </RadioContext.Provider>
  );
};

const RadioButton = ({ value, disabled, children }) => {
  const { onChange, value: currentValue } = React.useContext(RadioContext);
  const checked = value === currentValue;

  const buttonClasses = ["dm-radio-group__button"];
  if (checked) buttonClasses.push("dm-radio-group__button_checked");
  if (disabled) buttonClasses.push("dm-radio-group__button_disabled");

  return (
    <label className={buttonClasses.join(" ")}>
      <input
        className="dm-radio-group__input"
        type="radio"
        value={value}
        checked={value === currentValue}
        onChange={onChange}
        disabled={disabled}
      />
      {children}
    </label>
  );
};

RadioGroup.Button = RadioButton;
