import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface KeyValue {
  key: string | number;
  value: string;
}

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  label: string;
  control: Control<T>;
  getData?: () => Promise<KeyValue[]>;
  rawData?: KeyValue[];
  description?: string;
  emptyMessage?: string;
  disabled?: boolean;
  hideMessage?: boolean;
};

export default function SingleSelect<T extends FieldValues>({
  control,
  label,
  name,
  getData,
  rawData,
  description,
  emptyMessage = "Nenhuma opção encontrada.",
  disabled = false,
  hideMessage = false,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<KeyValue[]>(rawData ?? []);
  const [isPending, setIsPending] = useState(false);

  const selectedValue = useWatch({ control, name });

  async function fetchData() {
    if (!getData) return;
    setIsPending(true);
    try {
      const result = await getData();
      setData(result);
    } finally {
      setIsPending(false);
    }
  }

  useEffect(() => {
    if (rawData) {
      setData(rawData);
      return;
    }
    if (!open) return;
    fetchData();
  }, [open, rawData]);

  useEffect(() => {
    if (rawData || !getData) return;
    fetchData();
  }, []);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Popover open={open} onOpenChange={setOpen} modal={false}>
            <PopoverTrigger asChild disabled={disabled}>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between overflow-hidden",
                    disabled && "disabled:pointer-events-auto disabled:cursor-not-allowed",
                    !selectedValue && "text-muted-foreground"
                  )}
                >
                  <span className="truncate flex-1 text-left">
                    {selectedValue !== undefined && selectedValue !== null && selectedValue !== ""
                      ? data.find((item) => item.key === selectedValue)?.value ?? "..."
                      : "Selecione uma opção"}
                  </span>
                  <ChevronsUpDown className="opacity-50 shrink-0" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command>
                <CommandInput placeholder="Pesquise..." className="h-9" />
                <CommandList>
                  <CommandEmpty>{emptyMessage}</CommandEmpty>
                  <CommandGroup>
                    {data.map((item) => (
                      <CommandItem
                        key={item.key}
                        value={String(item.value)}
                        onSelect={() => {
                          field.onChange(selectedValue === item.key ? undefined : item.key);
                          setOpen(false);
                        }}
                      >
                        <span className="truncate">{item.value}</span>
                        <Check
                          className={cn(
                            "shrink-0",
                            selectedValue === item.key ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {description && <FormDescription>{description}</FormDescription>}
          {!hideMessage && <FormMessage />}
        </FormItem>
      )}
    />
  );
}
