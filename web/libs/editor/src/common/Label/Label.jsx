import { forwardRef } from "react";
import "./Label.scss";

export const Label = forwardRef(
  ({ text, children, required, placement, description, size, large, style, simple, flat }, ref) => {
    const TagName = simple ? "div" : "label";

    const classNames = ["lsf-field-label"];
    if (size) classNames.push(`lsf-field-label_size_${size}`);
    if (large) classNames.push("lsf-field-label_large");
    if (flat) classNames.push("lsf-field-label_flat");
    if (placement) classNames.push(`lsf-field-label_placement_${placement}`);
    if (description) classNames.push("lsf-field-label_withDescription");
    if (!children) classNames.push("lsf-field-label_empty");

    return (
      <TagName ref={ref} className={classNames.join(" ")} style={style} data-required={required}>
        <div className="lsf-field-label__text">
          <div className="lsf-field-label__content">
            {text}
            {description && <div className="lsf-field-label__description">{description}</div>}
          </div>
        </div>
        <div className="lsf-field-label__field">{children}</div>
      </TagName>
    );
  },
);

export default Label;
