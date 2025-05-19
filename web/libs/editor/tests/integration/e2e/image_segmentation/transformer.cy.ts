import { ImageView, Labels, LabelStudio, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import { Hotkeys } from "@humansignal/frontend-test/helpers/LSF/Hotkeys";

const IMAGE = "https://data.heartex.net/open-images/train_0/mini/0030019819f25b28.jpg";

const annotationEmpty = {
  id: "1000",
  result: [],
};

const shapes = {
  Rectangle: {
    drawAction: "drawRect",
    hasTransformer: true,
    hasRotator: true,
    hasMoveToolTransformer: true,
    hasMultiSelectionTransformer: true,
    hasMultiSelectionRotator: true,
    hotKey: "r",
    byBBox(x, y, width, height) {
      return {
        params: [x, y, width, height],
        result: { width, height, rotation: 0, x, y },
      };
    },
  },
  Ellipse: {
    drawAction: "drawRect",
    hasTransformer: true,
    hasRotator: true,
    hasMoveToolTransformer: true,
    hasMultiSelectionTransformer: true,
    hasMultiSelectionRotator: true,
    hotKey: "o",
    byBBox(x, y, width, height) {
      return {
        params: [x + width / 2, y + height / 2, width / 2, height / 2],
        result: {
          radiusX: width / 2,
          radiusY: height / 2,
          rotation: 0,
          x: x + width / 2,
          y: y + height / 2,
        },
      };
    },
  },
  Polygon: {
    drawAction: "drawPolygon",
    hasTransformer: false,
    hasRotator: false,
    hasMoveToolTransformer: true,
    hasMultiSelectionTransformer: true,
    hasMultiSelectionRotator: false,
    hotKey: "p",
    byBBox(x, y, width, height) {
      const points = [];

      points.push([x, y]);
      points.push([x + width, y]);
      points.push([x + width / 2, y + height / 2]);
      points.push([x + width, y + height]);
      points.push([x, y + height]);
      return {
        params: [[...points, points[0]]],
        result: {
          points,
          closed: true,
        },
      };
    },
  },
  KeyPoint: {
    drawAction: "clickAt",
    hasTransformer: false,
    hasRotator: false,
    hasMoveToolTransformer: false,
    hasMultiSelectionTransformer: true,
    hasMultiSelectionRotator: false,
    hotKey: "k",
    params: 'strokeWidth="2"',
    byBBox(x, y, width, height) {
      return {
        params: [x + width / 2, y + height / 2],
        result: {
          x: x + width / 2,
          y: y + height / 2,
          width: 2,
        },
      };
    },
  },
};

const getParamsWithLabels = (shapeName) => ({
  config: `
  <View>
    <Image name="img" value="$image" />
    <${shapeName}Labels name="tag" toName="img">
      <Label value="${shapeName}" background="orange"/>
    </${shapeName}Labels>
  </View>`,
  data: { image: IMAGE },
});

function drawShapeByBbox(Shape, bbox) {
  ImageView[Shape.drawAction](...Shape.byBBox(bbox.x, bbox.y, bbox.width, bbox.height).params);
}

describe("Image Transformer", () => {
  for (const shapeName in shapes) {
    it(`should exist for different shapes, their amount and modes. -- ${shapeName}`, () => {
      const Shape = shapes[shapeName];
      const { config, data } = getParamsWithLabels(shapeName);
      const bbox1 = {
        x: 100,
        y: 100,
        width: 200,
        height: 200,
      };
      const bbox2 = {
        x: 400,
        y: 100,
        width: 200,
        height: 200,
      };
      const getCenter = (bbox) => [bbox.x + bbox.width / 2, bbox.y + bbox.height / 2];

      LabelStudio.params().config(config).data(data).withResult([]).init();
      LabelStudio.waitForObjectsReady();
      Sidebar.hasRegions(0);

      // Draw two regions
      Labels.selectWithHotkey("1");
      drawShapeByBbox(Shape, bbox1);
      Sidebar.hasRegions(1);

      Labels.selectWithHotkey("1");
      drawShapeByBbox(Shape, bbox2);
      Sidebar.hasRegions(2);

      // Check that it wasn't a cause to show a transformer
      ImageView.hasNoTransformer();

      // Select the first region
      ImageView.clickAt(...getCenter(bbox1));
      Sidebar.hasSelectedRegions(1);

      // Match if transformer exist with expectations in single selected mode
      ImageView.shouldHaveTransformer(Shape.hasTransformer);

      // Match if rotator at transformer exist with expectations in single selected mode
      ImageView.shouldHaveRotater(Shape.hasRotator);

      ImageView.selectMoveToolByButton();
      // Match if transformer exist with expectations in single selected mode with move tool chosen
      ImageView.shouldHaveTransformer(Shape.hasMoveToolTransformer);

      // Deselect the previous selected region
      Hotkeys.unselect();

      // Select 2 regions
      ImageView.drawThroughPoints(
        [
          [bbox1.x - 5, bbox1.y - 5],
          [bbox2.x + bbox2.width + 5, bbox2.y + bbox2.height + 5],
        ],
        "steps",
        10,
      );
    });
  }
});
