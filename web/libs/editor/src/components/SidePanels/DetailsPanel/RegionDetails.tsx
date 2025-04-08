import { Typography } from "antd";
import { observer } from "mobx-react";
import { type FC, useEffect, useMemo, useRef } from "react";
import { RegionEditor } from "./RegionEditor";
import "./RegionDetails.scss";

const { Text } = Typography;

const TextResult: FC<{ mainValue: string[] }> = observer(({ mainValue }) => {
  return (
    <Text mark>
      {mainValue.map((value: string, i: number) => (
        <p key={`${value}-${i}`} data-counter={i + 1}>
          {value}
        </p>
      ))}
    </Text>
  );
});

const ChoicesResult: FC<{ mainValue: string[] }> = observer(({ mainValue }) => {
  return <Text mark>{mainValue.join(", ")}</Text>;
});

const RatingResult: FC<{ mainValue: string[] }> = observer(({ mainValue }) => {
  return <span>{mainValue}</span>;
});

export const ResultItem: FC<{ result: any }> = observer(({ result }) => {
  const { type, mainValue } = result;
  /**
   * @todo before fix this var was always false, so fix is left commented out
   * intention was to don't show per-region textarea text twice —
   * in region list and in region details; it failed but there were no complaints
   */
  // const isRegionList = from_name.displaymode === PER_REGION_MODES.REGION_LIST;

  const content = useMemo(() => {
    if (type === "rating") {
      return (
        <div className="dm-region-meta__result">
          <Text>Rating: </Text>
          <div className="dm-region-meta__value">
            <RatingResult mainValue={mainValue} />
          </div>
        </div>
      );
    }
    if (type === "textarea") {
      return (
        <div className="dm-region-meta__result">
          <Text>Text: </Text>
          <div className="dm-region-meta__value">
            <TextResult mainValue={mainValue} />
          </div>
        </div>
      );
    }
    if (type === "choices") {
      return (
        <div className="dm-region-meta__result">
          <Text>Choices: </Text>
          <div className="dm-region-meta__value">
            <ChoicesResult mainValue={mainValue} />
          </div>
        </div>
      );
    }
    if (type === "taxonomy") {
      return (
        <div className="dm-region-meta__result">
          <Text>Taxonomy: </Text>
          <div className="dm-region-meta__value">
            <ChoicesResult mainValue={mainValue.map((v: string[]) => v.join("/"))} />
          </div>
        </div>
      );
    }
  }, [type, mainValue]);

  return content ? <div className="dm-region-meta">{content}</div> : null;
});

export const RegionDetailsMain: FC<{ region: any }> = observer(({ region }) => {
  return (
    <>
      <div className="dm-detailed-region__result">
        {(region?.results as any[]).map((res) => (
          <ResultItem key={res.pid} result={res} />
        ))}
        {region?.text ? (
          <div className="dm-region-meta">
            <div className="dm-region-meta__item">
              <div className="dm-region-meta__content dm-region-meta__content_type_text">
                {region.text.replace(/\\n/g, "\n")}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <RegionEditor region={region} />
    </>
  );
});

type RegionDetailsMetaProps = {
  region: any;
  editMode?: boolean;
  cancelEditMode?: () => void;
  enterEditMode?: () => void;
};

export const RegionDetailsMeta: FC<RegionDetailsMetaProps> = observer(
  ({ region, editMode, cancelEditMode, enterEditMode }) => {
    const input = useRef<HTMLTextAreaElement | null>();

    const saveMeta = (value: string) => {
      region.setMetaText(value);
    };

    useEffect(() => {
      if (editMode && input.current) {
        const { current } = input;

        current.focus();
        current.setSelectionRange(current.value.length, current.value.length);
      }
    }, [editMode]);

    return (
      <>
        {editMode ? (
          <textarea
            ref={(el) => (input.current = el)}
            placeholder="Meta"
            className="dm-detailed-region__meta-text"
            value={region.meta.text}
            onChange={(e) => saveMeta(e.target.value)}
            onBlur={(e) => {
              saveMeta(e.target.value);
              cancelEditMode?.();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                saveMeta(e.target.value);
                cancelEditMode?.();
              }
            }}
          />
        ) : (
          region.meta?.text && (
            <div className="dm-detailed-region__meta-text" onClick={() => enterEditMode?.()}>
              {region.meta?.text}
            </div>
          )
        )}
      </>
    );
  },
);
