"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import ViewColumnOutlined from "@mui/icons-material/ViewColumnOutlined";
import FilterListOutlined from "@mui/icons-material/FilterListOutlined";
import ErrorOutlineOutlined from "@mui/icons-material/ErrorOutlineOutlined";
import RefreshOutlined from "@mui/icons-material/RefreshOutlined";
import {
  ColumnsPanelTrigger,
  DataGrid,
  FilterPanelTrigger,
  GridOverlay,
  QuickFilter,
  QuickFilterClear,
  QuickFilterControl,
  Toolbar,
  ToolbarButton,
  type DataGridProps,
  type GridActionsColDef,
  type GridColDef,
  type GridRowId,
  type GridRowSelectionModel,
  type GridSortModel,
  type GridValidRowModel,
} from "@mui/x-data-grid";
import { EmptyState } from "@/components/feedback/EmptyState";
import { TableSkeleton } from "@/components/layout/PageSkeleton";
import { RADIUS } from "@/theme/tokens";

export type { GridColDef } from "@mui/x-data-grid";
export { GridActionsCellItem } from "@mui/x-data-grid";

export type DataTableEmptyState = {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  illustration?: "inbox" | "search" | "table" | "map" | "shield";
};

export type DataTableProps<R extends GridValidRowModel> = {
  rows: readonly R[];
  columns: GridColDef<R>[];
  getRowId?: (row: R) => GridRowId;
  /** Shows the loading overlay / progress bar. */
  loading?: boolean;
  /** When set, renders the error state (with optional retry) instead of rows. */
  error?: string | null;
  onRetry?: () => void;
  emptyState?: DataTableEmptyState;
  /** Quick-filter search box in the toolbar (default on). */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Extra toolbar content, e.g. select filters, rendered next to the search box. */
  filters?: React.ReactNode;
  /** Right-aligned toolbar actions (e.g. "Add user"). */
  actions?: React.ReactNode;
  /** Show the column-visibility and filter-panel buttons (default on). */
  columnTools?: boolean;
  /** Row selection with checkboxes. */
  selectable?: boolean;
  onSelectionChange?: (ids: GridRowId[], rows: R[]) => void;
  /** Rendered in the toolbar while rows are selected (receives the selected rows). */
  bulkActions?: (rows: R[]) => React.ReactNode;
  pageSizeOptions?: number[];
  initialPageSize?: number;
  initialSort?: GridSortModel;
  /** Max height of the scroll area (header stays sticky). */
  maxHeight?: number | string;
  density?: DataGridProps["density"];
  /** Any other DataGrid prop. */
  gridProps?: Partial<DataGridProps<R>>;
  /** Visually hidden label for assistive technology. */
  label?: string;
};

type ToolbarContext = {
  searchable: boolean;
  searchPlaceholder: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  columnTools: boolean;
  selectedRows: unknown[];
  bulkActions?: (rows: never[]) => React.ReactNode;
  clearSelection: () => void;
};

const ToolbarCtx = React.createContext<ToolbarContext | null>(null);

function DataTableToolbar() {
  const ctx = React.useContext(ToolbarCtx);
  if (!ctx) return null;
  const { searchable, searchPlaceholder, filters, actions, columnTools, selectedRows, bulkActions, clearSelection } = ctx;
  const hasSelection = selectedRows.length > 0;
  return (
    <Toolbar>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, width: 1, px: 1, py: 1 }}>
        {hasSelection ? (
          <>
            <Typography variant="body2" sx={{ fontWeight: 600, pl: 1 }}>
              {selectedRows.length} selected
            </Typography>
            {bulkActions?.(selectedRows as never[])}
            <Button size="small" variant="text" onClick={clearSelection} startIcon={<CloseOutlined />}>
              Clear
            </Button>
          </>
        ) : (
          <>
            {searchable && (
              <QuickFilter expanded>
                <QuickFilterControl
                  render={({ ref, ...controlProps }, state) => (
                    <TextField
                      {...controlProps}
                      inputRef={ref}
                      size="small"
                      placeholder={searchPlaceholder}
                      aria-label="Search table"
                      sx={{ width: { xs: 1, sm: 256 } }}
                      slotProps={{
                        input: {
                          ...controlProps.slotProps?.input,
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchOutlined sx={{ fontSize: 18, color: "text.disabled" }} />
                            </InputAdornment>
                          ),
                          endAdornment: state.value ? (
                            <InputAdornment position="end">
                              <QuickFilterClear edge="end" size="small" aria-label="Clear search">
                                <CloseOutlined fontSize="inherit" />
                              </QuickFilterClear>
                            </InputAdornment>
                          ) : null,
                        },
                      }}
                    />
                  )}
                />
              </QuickFilter>
            )}
            {filters}
          </>
        )}
        <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
          {columnTools && !hasSelection && (
            <>
              <Tooltip title="Filters">
                <FilterPanelTrigger render={<ToolbarButton aria-label="Open filters" />}>
                  <FilterListOutlined fontSize="small" />
                </FilterPanelTrigger>
              </Tooltip>
              <Tooltip title="Columns">
                <ColumnsPanelTrigger render={<ToolbarButton aria-label="Choose columns" />}>
                  <ViewColumnOutlined fontSize="small" />
                </ColumnsPanelTrigger>
              </Tooltip>
            </>
          )}
          {actions}
        </Box>
      </Box>
    </Toolbar>
  );
}

function NoRowsOverlay({ emptyState }: { emptyState?: DataTableEmptyState }) {
  return (
    <GridOverlay>
      <EmptyState
        compact
        illustration={emptyState?.illustration ?? "table"}
        title={emptyState?.title ?? "Nothing here yet"}
        description={emptyState?.description}
        action={emptyState?.action}
      />
    </GridOverlay>
  );
}

function NoResultsOverlay() {
  return (
    <GridOverlay>
      <EmptyState compact illustration="search" title="No rows match" description="Try a different search or clear the filters." />
    </GridOverlay>
  );
}

function ErrorOverlay({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <GridOverlay>
      <EmptyState
        compact
        icon={<ErrorOutlineOutlined sx={{ fontSize: 40, color: "error.main" }} />}
        title="Couldn't load data"
        description={error}
        action={
          onRetry ? (
            <Button size="small" variant="outlined" startIcon={<RefreshOutlined />} onClick={onRetry}>
              Try again
            </Button>
          ) : undefined
        }
      />
    </GridOverlay>
  );
}

/**
 * Standard data table (MUI X DataGrid): sorting, quick search + column filters, pagination with
 * page-size picker, optional row selection and bulk actions, sticky header, and
 * loading / empty / error states. Pass `type: "actions"` columns for per-row menus.
 */
export function DataTable<R extends GridValidRowModel>({
  rows,
  columns,
  getRowId,
  loading = false,
  error = null,
  onRetry,
  emptyState,
  searchable = true,
  searchPlaceholder = "Search…",
  filters,
  actions,
  columnTools = true,
  selectable = false,
  onSelectionChange,
  bulkActions,
  pageSizeOptions = [10, 25, 50, 100],
  initialPageSize = 25,
  initialSort,
  maxHeight = 640,
  density = "standard",
  gridProps,
  label,
}: DataTableProps<R>) {
  const [selection, setSelection] = React.useState<GridRowSelectionModel>({ type: "include", ids: new Set() });
  // DataGrid measures its container on the client; show a skeleton until it has mounted so SSR never paints an empty card.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const rowId = React.useCallback((row: R): GridRowId => (getRowId ? getRowId(row) : (row.id as GridRowId)), [getRowId]);

  const selectedRows = React.useMemo(() => {
    if (selection.type === "include") return rows.filter((r) => selection.ids.has(rowId(r)));
    return rows.filter((r) => !selection.ids.has(rowId(r)));
  }, [rows, selection, rowId]);

  const handleSelection = (model: GridRowSelectionModel) => {
    setSelection(model);
    if (onSelectionChange) {
      const next = model.type === "include" ? rows.filter((r) => model.ids.has(rowId(r))) : rows.filter((r) => !model.ids.has(rowId(r)));
      onSelectionChange(next.map(rowId), next);
    }
  };

  const clearSelection = () => handleSelection({ type: "include", ids: new Set() });

  const toolbarCtx = React.useMemo<ToolbarContext>(
    () => ({
      searchable,
      searchPlaceholder,
      filters,
      actions,
      columnTools,
      selectedRows,
      bulkActions: bulkActions as ToolbarContext["bulkActions"],
      clearSelection,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchable, searchPlaceholder, filters, actions, columnTools, selectedRows, bulkActions],
  );

  const showToolbar = searchable || !!filters || !!actions || columnTools || !!bulkActions;

  if (!mounted) {
    return <TableSkeleton rows={Math.min(Math.max(rows.length, 3), 8)} columns={Math.min(columns.length, 6)} toolbar={showToolbar} />;
  }

  // Merge caller overrides without letting them replace the base sx / slots / initialState wholesale.
  const { sx: extraSx, initialState: extraInitialState, slots: extraSlots, slotProps: extraSlotProps, ...restGridProps } = gridProps ?? {};

  return (
    <ToolbarCtx.Provider value={toolbarCtx}>
      <Card sx={{ display: "flex", flexDirection: "column", minHeight: 240, maxHeight, overflow: "hidden" }}>
        <DataGrid<R>
          {...restGridProps}
          rows={error ? [] : (rows as R[])}
          columns={columns}
          getRowId={getRowId}
          loading={loading}
          density={density}
          label={label}
          showToolbar={showToolbar}
          localeText={{ actionsCellMore: "Row actions", ...restGridProps.localeText }}
          checkboxSelection={selectable}
          disableRowSelectionOnClick
          rowSelectionModel={selectable ? selection : undefined}
          onRowSelectionModelChange={selectable ? handleSelection : undefined}
          pageSizeOptions={pageSizeOptions}
          initialState={{
            pagination: { paginationModel: { pageSize: initialPageSize, page: 0 } },
            sorting: initialSort ? { sortModel: initialSort } : undefined,
            ...extraInitialState,
          }}
          slots={{
            toolbar: DataTableToolbar,
            noRowsOverlay: error ? () => <ErrorOverlay error={error} onRetry={onRetry} /> : () => <NoRowsOverlay emptyState={emptyState} />,
            noResultsOverlay: NoResultsOverlay,
            ...extraSlots,
          }}
          slotProps={{
            loadingOverlay: { variant: "linear-progress", noRowsVariant: "skeleton" },
            ...extraSlotProps,
          }}
          sx={[
            {
              border: 0,
              "--DataGrid-overlayHeight": "220px",
              "& .MuiDataGrid-toolbarContainer, & .MuiDataGrid-toolbar": { borderBottom: 1, borderColor: "divider", minHeight: 52, height: "auto", flexWrap: "wrap", overflow: "visible", px: 2 },
              "& .MuiDataGrid-columnHeaders": { position: "sticky", top: 0, zIndex: 2 },
              "& .MuiDataGrid-columnHeader": { bgcolor: "background.paper" },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontSize: "0.6875rem",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "text.faint",
              },
              "& .MuiDataGrid-cell": { fontSize: "0.875rem", lineHeight: 1.43, display: "flex", alignItems: "center", borderColor: "divider" },
              "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": { outline: "none" },
              "& .MuiDataGrid-cell:focus-visible, & .MuiDataGrid-columnHeader:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
              "& .MuiDataGrid-row:hover": { bgcolor: "action.hover" },
              "& .MuiDataGrid-row.Mui-selected": { bgcolor: "action.selected" },
              "& .MuiDataGrid-footerContainer": { borderTop: 1, borderColor: "divider", minHeight: 48 },
              "& .MuiDataGrid-menuIcon, & .MuiDataGrid-sortIcon": { color: "text.secondary" },
              "& .MuiDataGrid-overlayWrapper": { minHeight: 220 },
              "& .MuiDataGrid-virtualScroller": { minHeight: 120 },
              borderRadius: `${RADIUS.lg}px`,
            },
            ...(Array.isArray(extraSx) ? extraSx : [extraSx]),
          ]}
        />
      </Card>
    </ToolbarCtx.Provider>
  );
}

/** Convenience: builds an `actions` column that opens a kebab menu per row. */
export function actionsColumn<R extends GridValidRowModel>(
  getActions: GridActionsColDef<R>["getActions"],
  overrides: Partial<GridActionsColDef<R>> = {},
): GridActionsColDef<R> {
  return {
    field: "__actions",
    type: "actions",
    headerName: "",
    width: 56,
    align: "right",
    sortable: false,
    filterable: false,
    hideable: false,
    disableColumnMenu: true,
    getActions,
    ...overrides,
  };
}
