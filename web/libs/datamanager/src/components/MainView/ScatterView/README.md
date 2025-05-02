# ScatterView Component

## Overview

The `ScatterView` component provides a 2D scatter plot visualization for tasks within the Data Manager. Its primary purpose is to allow users to explore and interact with tasks that have associated numerical `x` and `y` coordinates, offering an alternative spatial perspective compared to the standard grid or list views. This is particularly useful for visualizing embeddings, spatial data, or any dataset where a 2D projection is meaningful.

## Goals

*   **High Performance:** Render large datasets (potentially 50k-100k+ points) smoothly.
*   **Interactivity:** Support standard plot interactions like panning, zooming, hovering (tooltips), and point selection.
*   **Labeling Integration:** Allow users to select points on the scatter plot to initiate the labeling workflow.
*   **Configurability:** Enable users to customize aspects like point coloring based on task data fields.
*   **Maintainability:** Utilize modern React and TypeScript best practices, leveraging a suitable visualization library.

## Implementation Details

### Technology Stack

*   **React:** The core UI library.
*   **TypeScript:** For type safety and improved developer experience.
*   **Deck.gl (`@deck.gl/react`, `@deck.gl/layers`, `@deck.gl/core`):** A high-performance WebGL-powered visualization library chosen for its ability to handle large datasets efficiently. We specifically use the `ScatterplotLayer` for rendering points.
*   **MobX (`mobx-react`, `mobx-state-tree`):** Used for state management, particularly for handling view state and task selection synchronization.

### Key Concepts

1.  **Data Format:** The component expects an array of `TaskPoint` objects (defined in `./types.ts`). Each task *must* have `data.x` and `data.y` properties containing numerical coordinates to be rendered. Optional fields like `data.class` (or others configured via settings) can be used for styling.
2.  **Rendering:** `DeckGL` from `@deck.gl/react` is the main container. The `ScatterplotLayer` is configured with accessors (`getPosition`, `getFillColor`, `getRadius`, etc.) that map `TaskPoint` data to visual properties.
3.  **View State:** Panning and zooming are handled by Deck.gl's built-in controller. The component maintains a controlled `viewState` and calculates an `initialViewState` to automatically frame the data upon loading.
4.  **Interactions:**
    *   **Hover:** `onHover` callback updates the `hoveredId` state, triggering visual feedback (point enlargement, outline changes) via layer accessors. Tooltips are displayed using `getTooltip`.
    *   **Click:** `onClick` callback handles point selection.
        *   It retrieves the clicked `TaskPoint`.
        *   It calls the `onChange` prop (if provided) to update the selection state in the parent MobX store.
        *   Crucially, it interacts with the root store (`getRoot(view)`) to either initiate labeling (`startLabeling`) for a new point or close the labeling interface (`closeLabeling`) if the currently selected/labeled point is clicked again. Logic is deferred slightly using `setTimeout` to ensure the event cycle completes.
        *   *TODO:* Shift+click for multi-selection is planned but not yet implemented.
5.  **Styling:**
    *   Point color is determined by the value of a configurable field (defaulting to `data.class`). A hashing function maps distinct string values to a predefined color palette (`palette`).
    *   Point radius and line width/color change based on hover and selection status (`view.selected?.isSelected(d.id)`).
    *   Basic CSS/SCSS is used for the container and toolbar (`ScatterView.scss`).
6.  **Configuration:** The `ScatterSettingsButton` and its associated modal allow users to select which task data field should be used for color-coding points (`settings.classField`).

### Evolution (Canvas to Deck.gl)

Initially, a custom implementation using the HTML Canvas API was developed. However, due to performance concerns with very large datasets and alignment with React best practices favoring declarative approaches, the component was refactored to use Deck.gl. This provides better performance, built-in interaction handling, and a more maintainable structure.

## Current State & Achievements

*   Successfully renders tasks as points based on `data.x` and `data.y`.
*   Uses Deck.gl (`ScatterplotLayer`) for rendering.
*   Supports panning and zooming.
*   Provides hover effects (point highlighting) and tooltips displaying basic task info.
*   Integrates with the labeling workflow via single point clicks (`startLabeling`, `closeLabeling`).
*   Points are color-coded based on a configurable string field (`data.class` by default) using a stable hashing approach.
*   Selection state is reflected visually (different outline/radius).
*   Includes a basic settings UI (`ScatterSettingsButton`) to change the color-coding field.
*   Handles cases where no data or no coordinate data is available.
*   Calculates an appropriate initial view state to fit the data.

## Future Work & TODOs

*   Implement multi-selection (e.g., using Shift+click or lasso tool).
*   Enhance the Settings UI with more options (e.g., point size, opacity, different palettes, selecting X/Y fields if needed).
*   Investigate performance optimizations for extreme scales (e.g., data aggregation, layer optimizations).
*   Consider adding other Deck.gl layers if needed (e.g., `TextLayer` for labels).
*   Refine tooltip content and styling.
*   Implement the `loadMore` functionality for infinite scrolling/pagination if required.

## Best Practices & Contribution Guide

*   **Follow Project Standards:** Adhere to the established React, TypeScript, and general coding standards outlined in the project's documentation (refer to `.mdc` rules if applicable).
*   **Declarative Approach:** Favor Deck.gl's declarative layer properties and updates over imperative manipulation. Use `updateTriggers` effectively when accessor dependencies change.
*   **Type Safety:** Maintain strong typing using TypeScript interfaces (`TaskPoint`, `ScatterViewProps`, etc.).
*   **Component Structure:** Keep the main `ScatterView.tsx` focused. Extract complex logic or reusable parts into hooks or utility functions where appropriate (e.g., `calculateBounds`, `hexToRgba`).
*   **State Management:** Leverage MobX for shared state (like selection) passed via props (`view`). Keep local UI state (like `hoveredId`, `viewState`) within the component using `useState`.
*   **Performance:** Be mindful of performance implications, especially within layer accessors which run frequently. Avoid unnecessary computations. Use `useMemo` and `useCallback` appropriately.
*   **Comments:** Add comments for non-obvious logic, especially around Deck.gl configurations, interaction handling, and state management integration.
*   **Testing:** Consider adding Storybook stories for different data scenarios and unit/integration tests for key interactions.