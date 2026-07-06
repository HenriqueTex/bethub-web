import type { Table } from "@tanstack/react-table";
import { EraserIcon, Loader2, ListFilter, SearchIcon } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form } from "@/components/ui/form";
import type { RequestData } from "./data-table";

interface DataTableFilterProps<TData> {
  filters?: React.FC<{ form: UseFormReturn<z.infer<any>> }>;
  form: UseFormReturn<z.infer<any>>;
  getData: (requestData: RequestData) => void;
  table: Table<TData>;
  isPending: boolean;
}

export function DataTableFilter<TData>({
  filters: Filters,
  form,
  getData,
  table,
  isPending,
}: DataTableFilterProps<TData>) {
  const onSubmit = (data: any) => {
    table.setPageIndex(0);
    getData({ formData: data, page: 0 });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex">
          <ListFilter />
          Filtros
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px] p-0" forceMount>
        {Filters && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="p-2 space-y-2">
                <Filters form={form} />
              </div>
              <div className="flex justify-end border-t p-2 gap-4">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    form.reset();
                    form.handleSubmit(onSubmit)();
                  }}
                >
                  <EraserIcon />
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Loader2 className="animate-spin" /> : <SearchIcon />}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </PopoverContent>
    </Popover>
  );
}
