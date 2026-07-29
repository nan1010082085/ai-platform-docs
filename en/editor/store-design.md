# Store Design

7 Pinia stores, each with its own responsibility.

## useWidgetStore (`stores/widget.ts`)

The single source of truth for widget data.

**Responsibilities**:
- Widget[] CRUD (addWidget, removeWidget, updateWidget)
- Tree traversal (findWidget, findParentContainer)
- Position ops (moveWidget, resizeWidget)
- Container ops (addToContainer, reparentToContainer)
- Batch ops (loadWidgets, clearWidgets)
- Data completion (normalizePosition - ensures all widgets have a position)

**Data**: `widgets: Ref<Widget[]>` - root-level widget array

## useEditorStore (`stores/editor.ts`)

Editor interaction state.

**Responsibilities**:
- Selection state (selectedId)
- Mode switch (edit/preview)
- Undo/redo (history stack; main canvas and dialogs managed independently)
- Clipboard (copy/paste)
- Dirty flag (isDirty)

## useSchemaStore (`stores/api.ts`)

Backend CRUD for schemas.

**Responsibilities**:
- Schema list (list, search)
- Schema detail (loadSchema)
- Schema save (saveSchema)
- Schema publish (publishSchema)
- Published schema query

## useDragStore (`stores/drag.ts`)

Drag state management.

**Responsibilities**:
- Drag source (panel/canvas)
- Drag position (dragX, dragY)
- Collision container (hoveredContainerId)
- Guides (guideLines, snapX, snapY)
- Drop preview line (dropPreviewLine)

## useBoardStore (`stores/board.ts`)

Canvas viewport state.

**Responsibilities**:
- Canvas size (width, height)
- Zoom (zoom)
- Scroll position (scrollLeft, scrollTop)
- Canvas name (name)

## useAppStore (`stores/app.ts`)

Global app state.

**Responsibilities**:
- Theme (theme)
- Language (locale)
- Global config

## useRequestStore (`stores/request.ts`)

HTTP request state.

**Responsibilities**:
- Request queue
- Request status tracking
- Error handling
