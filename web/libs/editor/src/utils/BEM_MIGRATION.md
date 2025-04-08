# BEM Utility Removal Plan

This document outlines the plan for removing the utils/bem.ts utility and replacing all usages with direct class names.

## Current Status

The bem.ts utility is currently used in 59+ files across the codebase. Our plan is to replace all usages one by one with standard React patterns and explicit class names.

## Migration Strategy

### Direct Replacement Approach

We will take a component-by-component approach:

1. Identify isolated components that use bem.ts
2. Replace BEM utility calls with direct class names
3. Test components thoroughly after each change
4. Handle complex cases individually as we encounter them

### Class Naming Conventions

When replacing BEM utility usages, we'll follow these guidelines:

1. Use the "dm-" prefix for all BEM class names:
   - Block: `dm-block-name`
   - Element: `dm-block-name__element-name`
   - Modifier: `dm-block-name_modifier` or `dm-block-name_modifier_value`

2. Use arrays and string concatenation for building class names:
   ```jsx
   const classes = ["dm-block-name"];
   if (isActive) classes.push("dm-block-name_active");
   if (className) classes.push(className);
   return <div className={classes.join(" ")}>...</div>;
   ```
   
3. Important: Always use the "dm-" prefix for all class names, even if the original SCSS file doesn't use it.
   The CSS styles will be updated separately to match these new class names.

### Handling useBEM Hook

The `useBEM` hook is used in some components to access the current block context provided by parent Block components. When removing this hook, we must be careful about how we handle class names:

#### How useBEM Works

```jsx
const block = useBEM(); // Gets block context from nearest parent Block
<input className={block?.elem("input").toClassName()} /> // Generates "dm-parent-block__input"
```

#### Replacement Strategy

When removing useBEM:

1. **Identify Block Context**: Determine the parent block name that would normally provide the context
2. **Hardcode Class Names**: Replace dynamic class generation with explicit class names
   ```jsx
   // Before
   const block = useBEM();
   <input className={block?.elem("input").toClassName()} />
   
   // After
   <input className="dm-parent-block__input" />
   ```
3. **Component Coupling**: Be aware that this creates tighter coupling - components now need to "know" their parent block
4. **Current Usage Safety**: Before hardcoding, verify that the component is only used within a specific block context and not reused across different block contexts

#### Trade-offs

- **Pros**: Simpler code, direct class references, no dynamic generation
- **Cons**: Reduced flexibility for component reuse across different block contexts
  
This approach is valid when components are used consistently in the same block context, which is the case for most components in this codebase.

## Progress Tracking

As files are migrated, we'll track progress here:

- [x] TextAreaRegion.jsx - Replaced with direct className string
- [x] Button.tsx - Fully converted to use direct class names
- [x] Hotkey.ts - Using direct key element classes
- [x] Tag.tsx - Simple component converted to use direct class names

### Components Identified for Next Batch
- [x] Pagination.tsx - Button navigation and page selector
- [x] Space.tsx - Basic layout utility
- [x] Range.tsx - Slider component with handle and indicator
- [x] Hint.tsx - Simple hint component
- [x] TextArea.tsx - Text input component
- [x] DropdownComponent.tsx - Menu dropdown component
- [x] DropdownTrigger.tsx - Dropdown trigger component 
- [x] Select.tsx - Select component with options and option groups
- [x] Filter.tsx - Filter component with dropdown
- [x] FilterRow.tsx - Filter row component
- [x] TimeBox.tsx - Time input component
- [x] TimeDurationControl.tsx - Time duration component
- [x] Node.tsx - Node components
- [x] LinkState.tsx - Comment link state component
- [x] CommentFormButtons.tsx - Comment form buttons component
- [x] Controls.tsx - Bottom bar controls component
- [x] BottomBar.jsx - Bottom bar container component
- [x] Actions.jsx - Bottom bar actions component
- [x] HistoryActions.jsx - Editing history buttons component
- [x] CurrentTask.jsx - Task information component
- [x] Icon.jsx - Icon wrapper component
- [x] Input.jsx - Input form component
- [x] Label.jsx - Form label component
- [x] Menu.jsx - Menu component
- [x] MenuItem.jsx - Menu item component
- [x] Modal.jsx - Modal utility
- [x] ModalPopup.jsx - Modal component
- [x] RadioGroup.jsx - Radio button group component
- [x] TaxonomySearch.tsx - Taxonomy search component
- [x] Timeline/Controls/Slider.tsx - Timeline slider control
- [x] Timeline/Controls/ConfigControl.tsx - Timeline configuration control
- [x] Timeline/Controls/AudioControl.tsx - Timeline audio control
- [x] Timeline/Timeline.tsx - Main timeline component
- [x] Timeline/Seeker.tsx - Timeline seek control
- [x] Timeline/Controls.tsx - Timeline controls component
- [x] SidebarTabs/SidebarTabs.jsx - Sidebar tabs component
- [x] Label/Label.jsx - Label display component
- [x] AnnotationTab/AutoAcceptToggle.jsx - Auto accept toggle component
- [x] AnnotationTab/DynamicPreannotationsToggle.jsx - Dynamic preannotations toggle component
- [x] AnnotationTab/AnnotationTab.jsx - Annotation tab component
- [x] AnnotationTabs/AnnotationTabs.jsx - Annotation tabs component
- [x] AnnotationsCarousel/AnnotationButton.tsx - Annotation button component
- [x] AnnotationsCarousel/AnnotationsCarousel.tsx - Annotations carousel component
- [x] SidePanels/PanelBase.tsx - Side panel base component with resizing and positioning
- [x] SidePanels/SidePanels.tsx - Main side panels container component with panel management
- [x] SidePanels/OutlinerPanel/OutlinerPanel.tsx - Outliner panel component for region navigation
- [x] SidePanels/DetailsPanel/DetailsPanel.tsx - Details panel for regions and annotations
- [x] SidePanels/DetailsPanel/RegionDetails.tsx - Region details component showing region metadata and results
- [x] SidePanels/DetailsPanel/RegionItem.tsx - Region item component for displaying individual regions
- [x] SidePanels/DetailsPanel/RegionLabels.tsx - Component for displaying region labels
- [x] SidePanels/DetailsPanel/RegionEditor.tsx - Component for editing region properties
- [x] SidePanels/DetailsPanel/Relations.tsx - Component for displaying and managing relations between regions
- [x] SidePanels/DetailsPanel/RelationsControls.tsx - Controls for relations visibility and ordering
- [x] SidePanels/Components/RegionContextMenu.tsx - Context menu for regions

## Next Steps

1. Identify more isolated components or utilities that use bem.ts
2. Continue converting components one by one
3. Document complex cases that need special attention

## Completion Criteria

The migration will be considered complete when:
1. All files are updated to use direct class names
2. All tests pass
3. The bem.ts file is removed
4. The bemExample.tsx and bemLegacyIntermediate.ts files are also removed