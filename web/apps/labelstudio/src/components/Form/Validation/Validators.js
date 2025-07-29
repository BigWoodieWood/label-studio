import { isDefined, isEmptyString } from "../../../utils/helpers";
import "./Validation.scss";

export const required = (fieldName, value) => {
  if (!isDefined(value) || isEmptyString(value)) {
    return "This field is required";
  }
};

export const minLength = (min) => (fieldName, value) => {
  if (isDefined(value) && !isEmptyString(value) && String(value).length < min) {
    return `Must have at least ${min} characters`;
  }
};

export const maxLength = (max) => (fieldName, value) => {
  if (isDefined(value) && String(value).length > max) {
    return `Must have no more than ${max} characters`;
  }
};

export const matchPattern = (pattern) => (fieldName, value) => {
  pattern = typeof pattern === "string" ? new RegExp(pattern) : pattern;

  if (!isEmptyString(value) && value.match(pattern) === null) {
    return `Must match the pattern ${pattern}`;
  }
};

export const json = (fieldName, value) => {
  const err = "Must be a valid JSON string";

  if (!isDefined(value) || value.trim().length === 0) return;

  if (/^(\{|\[)/.test(value) === false || /(\}|\])$/.test(value) === false) {
    return err;
  }

  try {
    JSON.parse(value);
  } catch (e) {
    return err;
  }
};

export const regexp = (fieldName, value) => {
  try {
    new RegExp(value);
  } catch (err) {
    return "Must be a valid regular expression";
  }
};
