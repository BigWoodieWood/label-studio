Implementation Plan – Filtered-Tasks Layer for ScatterView
=========================================================

High-level Goal
---------------
When Data-Manager filters are active, highlight the *filtered* subset of
tasks in a dedicated Deck.gl layer while dimming all other (base) points.

Legend of terms
---------------
• "base points"     – entire `/scatter/tasks` result (all tasks in project)  
• "filtered ids"    – tasks that satisfy current DM filters (POST endpoint)  
• "selected ids"    – current DM manual selection (`view.selected`)  
• "active id"       – task open in the labeling editor  

┌──────────────────────────────────────────────────────────────┐
│ Layers draw-order (bottom → top)                             │
│  1. BASE            – all points  (opacity 0.25 when filters)│
│  2. FILTERED        – filtered ⊄ selected                    │
│  3. SELECTED        – selected ⊄ active                      │
│  4. ACTIVE          – single active point                    │
│  5. HOVERED         – current cursor target                  │
│  6. SELECTION_BOX   – drag rectangle (PolygonLayer)          │
└──────────────────────────────────────────────────────────────┘


────────────────────────────────────────────────────────────────
1. Backend – `POST /api/dm/scatter/filtered-ids`
────────────────────────────────────────────────────────────────
File locations
• `label_studio/scatter/api.py`          – new view class
• `label_studio/scatter/urls.py`         – append new path
• `label_studio/scatter/constants.py`    – allowed params already exist
• tests in `label_studio/scatter/tests/`

Endpoint details
  URL      : /api/dm/scatter/filtered-ids
  Method   : POST
  Payload  : { project: <int>, filters, ordering, selectedItems? }  # identical to DM
  Response : { ids: [ <int>, … ] }

Implementation steps
a.  Add `class ScatterFilteredIDsAPI(APIView)` with
    permission `ViewClassPermission(POST=all_permissions.tasks_view)`.

b.  Extract `project_id = request.data.get("project")`; 404 if missing.

c.  Build `prepare_params = get_prepare_params(request, project)`  
    (already accounts for filters/ordering/selection).

d.  Obtain queryset exactly as DM does:
        from data_manager.api import TaskListAPI
        qs = TaskListAPI().get_task_queryset(request, prepare_params)

e.  Return flat list of IDs:
        ids = list(qs.values_list("id", flat=True))
        return Response({"ids": ids})

f.  Tests:
    • missing project → 400  
    • no permission  → 403  
    • filter narrows ids correctly  
    • large sets (e.g. 10 000+) are accepted (no pagination)  

g.  Wire in `urls.py`:
        path("filtered-ids", ScatterFilteredIDsAPI.as_view(),
             name="scatter-filtered-ids")

────────────────────────────────────────────────────────────────
2. SDK / API config
────────────────────────────────────────────────────────────────
File: `web/libs/datamanager/src/sdk/api-config.js`

    scatter_filtered_ids: { path: "/scatter/filtered-ids", method: "post" }

Now every frontend piece calls it via `datamanager.apiCall("scatter_filtered_ids", {}, body)`.

────────────────────────────────────────────────────────────────
3. Front-end State & Data flow
────────────────────────────────────────────────────────────────
3.1 Tab model additions  (runtime, not persisted)
-------------------------------------------------
File: `src/stores/Tabs/tab.js`

    scatter: types.optional(ScatterState, {})

Extend `ScatterState`:
    filteredIds: types.optional(types.array(types.number), [])
    setFiltered(ids) { self.filteredIds.replace(ids) }
    clearFiltered()  { self.filteredIds.clear() }

3.2 Hook: `useScatterFilteredIds`
---------------------------------
Location: `ScatterView/hooks/useScatterFilteredIds.ts`

    const { project }   = getRoot(view);
    const { filters, ordering } = view;          # mobx snapshots
    const dm = useContext(DataManagerContext);   # gives apiCall

    useEffect(() => {
      if (!filters.active) {                    # no filters → clear
        view.scatter.clearFiltered();
        return;
      }
      const body = { project, filters, ordering };
      dm.apiCall("scatter_filtered_ids", {}, body)
        .then(res => view.scatter.setFiltered(res.ids));
    }, [project, filters.snapshot, ordering.snapshot]);

3.3 Events / “signal” origin
----------------------------
`Tab.filters` is an observable;  `useScatterFilteredIds` simply *reacts*
to its MobX changes. No explicit SDK event is required.

────────────────────────────────────────────────────────────────
4. Rendering – `useScatterLayers` extension
────────────────────────────────────────────────────────────────
Input arrays
    allPoints      – map(taskId → point)
    filteredIds    – view.scatter.filteredIds
    selectedIds    – view.selectedIds
    activeId       – view.scatter.activePointId

Split logic
    base      = allPoints where id ∉ filteredIds
    filtered  = allPoints where id ∈ filteredIds ∧ id ∉ selectedIds ∧ id ≠ activeId
    selected  = allPoints where id ∈ selectedIds ∧ id ≠ activeId
    active    = point with id === activeId
    hovered   = runtime state

Layer definitions
    new ScatterplotLayer({
      id          : LAYER_ID.FILTERED,
      data        : filtered,
      getFillColor: originalColor,
      getLineColor: STROKE.selected,         # orange outline
      opacity     : CATEGORY_COLORS_OPACITY, # 0.75
      stroked     : true,
      lineWidthMinPixels: STROKE_WIDTH.selected,
      radiusScale : RADIUS.default,
      updateTriggers: { data: filtered },
    })

Opacity change for base
    baseLayerOpacity = view.scatter.filteredIds.length ? 0.25 : OPACITY

────────────────────────────────────────────────────────────────
5. Visual tokens update (`scatter-tokens.ts`)
────────────────────────────────────────────────────────────────
export const OPACITY_BASE_DIMMED = 0.25;      # new constant

No change to `CATEGORY_COLORS_OPACITY` (remains 0.75).

────────────────────────────────────────────────────────────────
6. UI behaviour
────────────────────────────────────────────────────────────────
• When `view.filters.isActive` becomes true  
  – hook fetches ids → store updates → layers rerender instantly.

• When filters cleared  
  – hook clears `filteredIds` → filtered layer disappears, base layer
    returns to normal opacity.

• Tooltips / selection logic stay unchanged — operate on *all* points.

────────────────────────────────────────────────────────────────
7. Testing & QA checklist
────────────────────────────────────────────────────────────────
Backend
  ☐ Unit tests for new endpoint
  ☐ Permissions & 400/403 branches
  ☐ Regression: existing scatter/tasks unaffected

Frontend
  ☐ Storybook scenario with filter applied (mock API)
  ☐ Cypress flow: apply filter → filtered layer appears
  ☐ Performance check with 50 k ids payload
  ☐ RTL test: `useScatterFilteredIds` writes to store

────────────────────────────────────────────────────────────────
8. Incremental rollout
────────────────────────────────────────────────────────────────
1. Merge backend endpoint & SDK config (CI green).
2. Add Tab model fields + hook (no UI change yet).
3. Extend `useScatterLayers`; behind feature flag `ff_scatter_filtered`.
4. QA, docs update, enable flag by default.