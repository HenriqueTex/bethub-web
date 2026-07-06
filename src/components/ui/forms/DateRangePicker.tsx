import type { Control, FieldPath, FieldValues } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  label: string;
  control: Control<T>;
  description?: string;
  numberOfMonths?: number;
};

export default function DateRangePicker<T extends FieldValues>({
  control,
  label,
  name,
  description,
  numberOfMonths = 2,
}: Props<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {field.value?.from ? (
                    field.value.to ? (
                      <>
                        {format(field.value.from, "dd/MM/yyyy", { locale: ptBR })}
                        {" - "}
                        {format(field.value.to, "dd/MM/yyyy", { locale: ptBR })}
                      </>
                    ) : (
                      format(field.value.from, "dd/MM/yyyy", { locale: ptBR })
                    )
                  ) : (
                    <span>Selecione o período</span>
                  )}
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                defaultMonth={field.value?.from}
                selected={field.value}
                onSelect={field.onChange}
                numberOfMonths={numberOfMonths}
                locale={ptBR}
                captionLayout="dropdown"
                formatters={{
                  formatMonthDropdown: (month) =>
                    format(month, "LLLL", { locale: ptBR }),
                }}
              />
            </PopoverContent>
          </Popover>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
