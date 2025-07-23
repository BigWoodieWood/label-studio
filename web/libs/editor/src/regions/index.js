import { types } from "mobx-state-tree";

import { AudioRegionModel } from "./AudioRegion";
import { BrushRegionModel, HtxBrush } from "./BrushRegion";
import { BitmaskRegionModel, HtxBitmask } from "./BitmaskRegion";
import { ParagraphsRegionModel } from "./ParagraphsRegion";
import { TimeSeriesRegionModel } from "./TimeSeriesRegion";
import { HtxKeyPoint, KeyPointRegionModel } from "./KeyPointRegion";
import { PolygonPoint, PolygonPointView } from "./PolygonPoint";
import { HtxPolygon, PolygonRegionModel } from "./PolygonRegion";
import { HtxRectangle, RectRegionModel } from "./RectRegion";
import { EllipseRegionModel, HtxEllipse } from "./EllipseRegion";
import { HtxTextAreaRegion, TextAreaRegionModel } from "./TextAreaRegion";
import { RichTextRegionModel } from "./RichTextRegion";
import { TimelineRegionModel } from "./TimelineRegion";
import { VideoRectangleRegionModel } from "./VideoRectangleRegion";
import { CustomRegionModel } from "./CustomRegion";

const AllRegionsType = types.union(
  AudioRegionModel,
  BrushRegionModel,
  BitmaskRegionModel,
  EllipseRegionModel,
  TimeSeriesRegionModel,
  KeyPointRegionModel,
  PolygonRegionModel,
  RectRegionModel,
  TextAreaRegionModel,
  RichTextRegionModel,
  TimeSeriesRegionModel,
  TimelineRegionModel,
  ParagraphsRegionModel,
  VideoRectangleRegionModel,
  CustomRegionModel
);

export {
  AllRegionsType,
  AudioRegionModel,
  BrushRegionModel,
  EllipseRegionModel,
  HtxBrush,
  HtxBitmask,
  HtxEllipse,
  HtxKeyPoint,
  HtxPolygon,
  HtxRectangle,
  HtxTextAreaRegion,
  RichTextRegionModel,
  ParagraphsRegionModel,
  TimeSeriesRegionModel,
  KeyPointRegionModel,
  PolygonPoint,
  PolygonPointView,
  PolygonRegionModel,
  RectRegionModel,
  TextAreaRegionModel,
  TimelineRegionModel,
  VideoRectangleRegionModel,
  CustomRegionModel
};
