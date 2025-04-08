import { observer } from "mobx-react";
import { type FC, useCallback, useMemo, useState } from "react";
import {
  IconMenu,
  IconRelationBi,
  IconRelationLeft,
  IconRelationRight,
  IconTrash,
  IconEyeClosed,
  IconEyeOpened,
} from "@humansignal/icons";
import { Button } from "../../../common/Button/Button";
import { wrapArray } from "../../../utils/utilities";
import { RegionItem } from "./RegionItem";
import { Select } from "antd";
import "./Relations.scss";

const RealtionsComponent: FC<any> = ({ relationStore }) => {
  const relations = relationStore.orderedRelations;

  return (
    <div className="lsf-relations">
      <RelationsList relations={relations} />
    </div>
  );
};

interface RelationsListProps {
  relations: any[];
}

const RelationsList: FC<RelationsListProps> = observer(({ relations }) => {
  return (
    <>
      {relations.map((rel, i) => {
        return <RelationItem key={i} relation={rel} />;
      })}
    </>
  );
});

const RelationItem: FC<{ relation: any }> = observer(({ relation }) => {
  const [hovered, setHovered] = useState(false);

  const onMouseEnter = useCallback(() => {
    if (!!relation.node1 && !!relation.node2) {
      setHovered(true);
      relation.toggleHighlight();
      relation.setSelfHighlight(true);
    }
  }, []);

  const onMouseLeave = useCallback(() => {
    if (!!relation.node1 && !!relation.node2) {
      setHovered(false);
      relation.toggleHighlight();
      relation.setSelfHighlight(false);
    }
  }, []);

  const directionIcon = useMemo(() => {
    const { direction } = relation;

    switch (direction) {
      case "left":
        return <IconRelationLeft data-direction={relation.direction} />;
      case "right":
        return <IconRelationRight data-direction={relation.direction} />;
      case "bi":
        return <IconRelationBi data-direction={relation.direction} />;
      default:
        return null;
    }
  }, [relation.direction]);

  // const;

  return (
    <div
      className={`lsf-relations__item ${!relation.visible ? "lsf-relations__item_hidden" : ""}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="lsf-relations__content">
        <div className="lsf-relations__icon" onClick={relation.rotateDirection}>
          <div className="lsf-relations__direction">{directionIcon}</div>
        </div>
        <div className="lsf-relations__nodes">
          <RegionItem compact withActions={false} withIds={false} region={relation.node1} />
          <RegionItem compact withActions={false} withIds={false} region={relation.node2} />
        </div>
        <div className="lsf-relations__actions">
          <div className="lsf-relations__action">
            {(hovered || relation.showMeta) && relation.hasRelations && (
              <Button
                primary={relation.showMeta}
                aria-label={`${relation.showMeta ? "Hide" : "Show"} Relation Labels`}
                type={relation.showMeta ? undefined : "text"}
                onClick={relation.toggleMeta}
                style={{ padding: 0 }}
              >
                <IconMenu />
              </Button>
            )}
          </div>
          <div className="lsf-relations__action">
            {(hovered || !relation.visible) && (
              <Button
                type="text"
                onClick={relation.toggleVisibility}
                aria-label={`${relation.visible ? "Hide" : "Show"} Relation`}
              >
                {relation.visible ? (
                  <IconEyeOpened style={{ width: 20, height: 20 }} />
                ) : (
                  <IconEyeClosed style={{ width: 20, height: 20 }} />
                )}
              </Button>
            )}
          </div>
          <div className="lsf-relations__action">
            {hovered && (
              <Button
                type="text"
                danger
                aria-label="Delete Relation"
                onClick={() => {
                  relation.node1.setHighlight(false);
                  relation.node2.setHighlight(false);
                  relation.parent.deleteRelation(relation);
                }}
              >
                <IconTrash />
              </Button>
            )}
          </div>
        </div>
      </div>
      {relation.showMeta && <RelationMeta relation={relation} />}
    </div>
  );
});

const RelationMeta: FC<any> = observer(({ relation }) => {
  const { selectedValues, control } = relation;
  const { children, choice } = control;

  const selectionMode = useMemo(() => {
    return choice === "multiple" ? "multiple" : undefined;
  }, [choice]);

  const onChange = useCallback(
    (val: any) => {
      const values: any[] = wrapArray(val);

      relation.setRelations(values);
    },
    [relation],
  );

  return (
    <div className="lsf-relation-meta">
      <Select
        mode={selectionMode}
        style={{ width: "100%" }}
        placeholder="Select labels"
        value={selectedValues}
        onChange={onChange}
      >
        {children.map((c: any) => (
          <Select.Option key={c.value} value={c.value} style={{ background: c.background }}>
            {c.value}
          </Select.Option>
        ))}
      </Select>
    </div>
  );
});

export const Relations = observer(RealtionsComponent);
