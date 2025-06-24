import React from "react";
import Input from "../Common/Input/Input";

export const FilterInput = ({ value, type, onChange, placeholder, schema, style }) => {
  const inputRef = React.useRef();
  const onChangeHandler = () => {
    const value = inputRef.current?.value ?? inputRef.current?.input?.value;

    onChange(value);
  };

  return (
    <Input
      rawClassName="h-full font-size-12 h-8 min-h-8"
      style={{
        ...style,
      }}
      type={type}
      value={value ?? ""}
      ref={inputRef}
      placeholder={placeholder}
      onChange={onChangeHandler}
      size="small"
      {...(schema ?? {})}
    />
  );
};
