import clsx from "clsx";
import { useSDK } from "../../../providers/SDKProvider";
import { cn } from "../../../utils/bem";
import { isDefined } from "../../../utils/utils";
import "./Agreement.scss";
import { useState } from "react";
import { Popover } from "@humansignal/ui";
import { ff } from "@humansignal/core";
import { FF_AVERAGE_AGREEMENT_SCORE_POPOVER } from "../../../utils/feature-flags";

const agreement = (p) => {
  if (!isDefined(p)) return "zero";
  if (p < 33) return "low";
  if (p < 66) return "medium";
  return "high";
};

const formatNumber = (num) => {
  const number = Number(num);

  if (num % 1 === 0) {
    return number;
  }
  return number.toFixed(2);
};

export const Agreement = (cell) => {
  const { value, original: task } = cell;
  const sdk = useSDK();
  const agreementCN = cn("agreement");
  const scoreElem = agreementCN.elem("score");
  const [content, setContent] = useState(null);
  const isAgreementPopoverEnabled =
    window.APP_SETTINGS.billing?.enterprise && ff.isActive(FF_AVERAGE_AGREEMENT_SCORE_POPOVER);

  const handleClick = isAgreementPopoverEnabled
    ? (e) => {
        e.preventDefault();
        e.stopPropagation();
        sdk.invoke("agreementCellClick", { task }, (jsx) => setContent(jsx));
      }
    : undefined;

  const score = (
    <span className={clsx(scoreElem.toString(), scoreElem.mod({ [agreement(value)]: true }).toString())}>
      {isDefined(value) ? `${formatNumber(value)}%` : ""}
    </span>
  );

  return (
    <div className={agreementCN.toString()} onClick={handleClick}>
      {isAgreementPopoverEnabled ? (
        <Popover trigger={score} align="start">
          {content}
        </Popover>
      ) : (
        score
      )}
    </div>
  );
};

Agreement.userSelectable = false;
