import type { Table } from "@tanstack/react-table";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Label } from "../label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../select";
import { Button } from "../button";
import type { RequestData, MetaPagination } from "./data-table";

interface DataTablePaginationProps<TData> {
  meta: MetaPagination;
  table: Table<TData>;
  getData: (requestData: RequestData) => void;
}

export default function DataTablePagination<TData>({
  meta,
  table,
  getData,
}: DataTablePaginationProps<TData>) {
  return (
    <div className="flex items-center justify-between px-4">
      <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
        exibindo {table?.getRowModel()?.rows?.length} de {meta?.total}{" "}
        registro(s).
      </div>
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            Linhas por página
          </Label>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              const newPageSize = Number(value);
              table.setPageSize(newPageSize);
              table.setPageIndex(0);
              getData({ page: 0, perPage: newPageSize });
            }}
          >
            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-fit items-center justify-center text-sm font-medium">
          Página {table.getState().pagination.pageIndex + 1} de{" "}
          {table.getPageCount()}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => {
              table.setPageIndex(0);
              getData({ page: 0 });
            }}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Primeira Página</span>
            {/* ultra left */}

            <ChevronFirst />
          </Button>

          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => {
              getData({
                page: Number(table.getState().pagination.pageIndex) - 1,
              });

              table.previousPage();
            }}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Página Anterior</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => {
              getData({ page: table.getState().pagination.pageIndex + 1 });

              table.nextPage();
            }}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Próxima página</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => {
              getData({ page: table.getPageCount() - 1 });

              table.setPageIndex(table.getPageCount() - 1);
            }}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Última página</span>
            <ChevronLast />
          </Button>
        </div>
      </div>
    </div>
  );
}
