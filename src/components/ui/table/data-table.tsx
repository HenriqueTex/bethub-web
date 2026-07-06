import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    sortColumn?: string | ((form: any) => string);
    conditional?: (ctx: { form: any }) => boolean;
  }
}

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { LayoutIcon, RefreshCcw } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/ui/contexts/modal-provider";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableFilter } from "./data-table-filter";
import DataTablePagination from "./data-table-pagination";

// Soft-deleted rows carry a `deletedAt`. Two shapes are supported: the raw
// sqlc model serializes it as sql.NullTime ({ Time, Valid }); mapped responses
// (automations, setpoints) expose it as an ISO string or null.
function isRowTrashed(original: unknown): boolean {
  const deletedAt = (original as { deletedAt?: unknown } | null)?.deletedAt;
  if (!deletedAt) return false;
  if (typeof deletedAt === "object") {
    return (deletedAt as { Valid?: boolean }).Valid === true;
  }
  return true;
}

export interface MetaPagination {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
}

export type FetchParams = {
  page: number;
  perPage: number;
  sortColumn?: string;
  sortBy?: "asc" | "desc";
  filters?: Record<string, any>;
};

export type FetchResult<TData> = {
  data: TData[];
  meta: MetaPagination;
};

export type FetchFn<TData> = (
  params: FetchParams,
) => Promise<FetchResult<TData>>;

export type RequestData = {
  formData?: Record<string, any>;
  page?: number;
  perPage?: number;
};

export type ActionItem<TData = any> = {
  label: string;
  icon: React.ReactNode;
  condition?: (item: TData) => boolean;
} & (
  | {
      content: (
        item: TData,
        onSuccess: () => void,
        onClose: () => void,
      ) => React.ReactNode;
      onClick?: never;
    }
  | {
      onClick: (item: TData) => void;
      content?: never;
    }
);

export type BulkActionsContext<TData> = {
  selected: TData[];
  clearSelection: () => void;
  refresh: () => void;
};

interface DataTableProps<TData, TValue> {
  fetchData: FetchFn<TData>;
  columns: ColumnDef<TData, TValue>[];
  actionsConfig?: ActionItem<TData>[];
  preload?: boolean;
  form?: UseFormReturn<z.infer<any>>;
  filters?: React.FC<{ form: UseFormReturn<z.infer<any>> }>;
  tableAction?: React.ReactNode;
  defaultSortColumn?: string;
  defaultPageSize?: number;
  // Opt-in row selection: adds a checkbox column (per-row + select-all-page)
  // and renders a contextual bulk-actions bar when ≥1 row is selected.
  enableSelection?: boolean;
  renderBulkActions?: (ctx: BulkActionsContext<TData>) => React.ReactNode;
}

export function DataTable<TData, TValue>({
  fetchData,
  columns,
  actionsConfig,
  preload = true,
  form,
  filters: Filters,
  tableAction,
  defaultSortColumn = "created_at",
  defaultPageSize = 10,
  enableSelection = false,
  renderBulkActions,
}: DataTableProps<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isPending, setIsPending] = useState(false);
  const { openModal, closeModal } = useModal();
  const [data, setData] = useState<FetchResult<TData>>({
    data: [],
    meta: {
      total: 0,
      perPage: 0,
      currentPage: 1,
      lastPage: 1,
    },
  });

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });

  const [sorting, setSorting] = useState<SortingState>([]);
  const hasFetchedRef = useRef(false);
  const getDataRef = useRef<(r: RequestData) => void>(() => {});
  const formValues = form?.watch();

  async function getData(requestData: RequestData) {
    const {
      formData,
      page = pagination.pageIndex,
      perPage = pagination.pageSize,
    } = requestData;

    setIsPending(true);
    try {
      const currentSort = sorting[0];
      const rawSortColumn = currentSort
        ? table.getColumn(currentSort.id)?.columnDef.meta?.sortColumn
        : defaultSortColumn;
      const sortColumn =
        typeof rawSortColumn === "function"
          ? rawSortColumn(form)
          : rawSortColumn;
      const sortBy = currentSort ? (currentSort.desc ? "desc" : "asc") : "asc";

      const result = await fetchData({
        page: page + 1,
        perPage,
        filters: formData ?? form?.getValues(),
        ...(sortColumn && { sortColumn, sortBy }),
      });

      hasFetchedRef.current = true;
      setData(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsPending(false);
    }
  }

  getDataRef.current = getData;

  useEffect(() => {
    if (!preload) return;
    getData({});
  }, []);

  const filteredColumns = useMemo(() => {
    const visible = columns.filter((col) => {
      const conditional = col.meta?.conditional;
      return conditional ? conditional({ form }) : true;
    });

    const selectCol: ColumnDef<TData> = {
      id: "_select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Selecionar todos"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Selecionar linha"
        />
      ),
      enableHiding: false,
    };

    const lead = enableSelection ? [selectCol] : [];
    if (!actionsConfig?.length) return [...lead, ...visible];
    const actionsCol: ColumnDef<TData> = {
      id: "_actions",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex justify-start gap-1">
          {actionsConfig
            .filter(
              (action) =>
                !action.condition || action.condition(row.original as TData),
            )
            .map((action, i) => (
              <Button
                key={i}
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  action.onClick
                    ? action.onClick(row.original as TData)
                    : openModal({
                        content: action.content(
                          row.original as TData,
                          () => {
                            closeModal();
                            getDataRef.current({});
                          },
                          closeModal,
                        ),
                      })
                }
                title={action.label}
              >
                {action.icon}
              </Button>
            ))}
        </div>
      ),
    };
    return [...lead, ...visible, actionsCol];
  }, [columns, formValues, actionsConfig, enableSelection]);

  const table = useReactTable({
    data: data.data,
    columns: filteredColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: data.meta.lastPage ?? 1,
    enableRowSelection: enableSelection,
    getRowId: enableSelection
      ? (row: any, index) => (row?.id != null ? String(row.id) : String(index))
      : undefined,
    // Selection is page-scoped: clear it whenever the page or page size changes.
    onPaginationChange: (updater) => {
      setPagination(updater);
      setRowSelection({});
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: { pagination, columnVisibility, sorting, rowSelection },
  });

  const selectedRows = table
    .getSelectedRowModel()
    .rows.map((r) => r.original as TData);
  const clearSelection = () => table.resetRowSelection();

  useEffect(() => {
    if (!hasFetchedRef.current) return;
    table.setPageIndex(0);
    getData({ page: 0 });
  }, [sorting]);

  const renderSkeletonRows = () => (
    <Fragment>
      {Array.from({ length: 10 }).map((_, index) => (
        <TableRow key={index}>
          {table.getVisibleLeafColumns().map((column) => (
            <TableCell key={column.id}>
              <Skeleton className="h-5 w-24 rounded-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </Fragment>
  );

  return (
    <div className="w-full">
      <div className="flex items-center py-4 justify-between gap-x-2">
        <div>{tableAction}</div>
        <div className="flex items-center gap-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="hidden h-8 lg:flex"
            >
              <LayoutIcon />
              Colunas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide() && column.id !== "_actions")
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {typeof column.columnDef.header === "string"
                    ? column.columnDef.header
                    : column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {form && Filters ? (
          <DataTableFilter
            filters={Filters}
            form={form}
            getData={getData}
            table={table}
            isPending={isPending}
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => getData({})}
          >
            <RefreshCcw />
            <span className="sr-only">Recarregar</span>
          </Button>
        )}
        </div>
      </div>

      {enableSelection && renderBulkActions && selectedRows.length > 0 && (
        <div className="mb-2 flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2">
          <span className="text-sm">
            <b>{selectedRows.length}</b> selecionado(s)
          </span>
          <div className="flex-1" />
          {renderBulkActions({
            selected: selectedRows,
            clearSelection,
            refresh: () => getDataRef.current({}),
          })}
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            Limpar
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : header.column.columnDef.meta
                        ?.sortColumn ? (
                      <DataTableColumnHeader
                        column={header.column}
                        title={
                          typeof header.column.columnDef.header === "string"
                            ? header.column.columnDef.header
                            : header.column.id
                        }
                      />
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isPending ? (
              renderSkeletonRows()
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const trashed = isRowTrashed(row.original);
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn(
                      trashed && "text-muted-foreground line-through opacity-60",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(cell.column.id === "_actions" && "no-underline")}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center"
                >
                  {preload
                    ? "Nenhum resultado encontrado."
                    : "Pesquise usando os filtros acima."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-1.5">
        <DataTablePagination table={table} meta={data.meta} getData={getData} />
      </div>
    </div>
  );
}
