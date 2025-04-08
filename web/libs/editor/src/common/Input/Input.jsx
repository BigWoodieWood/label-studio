import { forwardRef, useMemo } from "react";
import Label from "../Label/Label";
import "./Input.scss";

const Input = forwardRef(({ label, className, required, labelProps, ghost, waiting, ...props }, ref) => {
  const classList = ["lsf-input", ghost ? "lsf-input_ghost" : "", className].filter(Boolean).join(" ");

  const input = useMemo(() => {
    return waiting ? <div className="lsf-input__spinner" /> : <input {...props} ref={ref} className={classList} />;
  }, [props, ref, classList, waiting]);

  return label ? (
    <Label {...(labelProps ?? {})} text={label} required={required}>
      {input}
    </Label>
  ) : (
    input
  );
});

Input.displayName = "Input";

export default Input;
