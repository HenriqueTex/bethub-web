import { Check, ChevronsUpDown, CircleX } from "lucide-react";
import { Reducer, useEffect, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

interface KeyValue {
  key: string | number;
  value: string;
  group?: string;
}

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  label: string;
  control: Control<T>;
  getData?: () => Promise<KeyValue[]>;
  rawData?: KeyValue[];
  emptyMessage?: string;
  searchPlaceholder?: string;
  selectPlaceholder?: string;
  description?: string;
};

export default function MultipleSelect<T extends FieldValues>({
  control,
  label,
  name,
  getData,
  rawData,
  emptyMessage = "Nenhum item encontrado.",
  searchPlaceholder = "Pesquisar...",
  selectPlaceholder = "Selecione itens...",
  description,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<KeyValue[]>(rawData ?? []);
  const [isPending, setIsPending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState<number | null>(null);
  const badgeWidth = 120;

  const selectedKeys: (string | number)[] = useWatch({ control, name }) || [];
  const selectedItems = data.filter((item) => selectedKeys.includes(item.key));
  const ungroupedItems = data.filter((item) => !item.group);
  const groupedData = data
    .filter((item) => item.group)
    .reduce<Record<string, KeyValue[]>>((groups, item) => {
      const group = item.group!;
      groups[group] = groups[group] ?? [];
      groups[group].push(item);
      return groups;
    }, {});


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
    const container = containerRef.current;
    if (!container) return;
    const updateWidth = () => setButtonWidth(container.offsetWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

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

  function BadgeItem({ item, onRemove }: { item: KeyValue; onRemove: (item: KeyValue) => void }) {
    return (
      <Badge className="w-30 shrink-0">
        <span className="truncate">{item.value}</span>
        <span
          className="shrink-0"
          onClick={(e) => {
            e.preventDefault();
            onRemove(item);
          }}
        >
          <CircleX className="h-4 w-4" />
        </span>
      </Badge>
    );
  }

  function BadgeMore({
    items,
    onRemove,
  }: {
    items: KeyValue[];
    onRemove: (items: KeyValue[]) => void;
  }) {
    return (
      <Badge className="w-30 shrink-0">
        <span>{items.length} Mais</span>
        <span
          onClick={(e) => {
            e.preventDefault();
            onRemove(items);
          }}
        >
          <CircleX className="h-4 w-4" />
        </span>
      </Badge>
    );
  }

  function SelectItems({
    items,
    onRemove,
    onRemoveMultiple,
  }: {
    items: KeyValue[];
    onRemove: (item: KeyValue) => void;
    onRemoveMultiple: (items: KeyValue[]) => void;
  }) {
    if (!buttonWidth) return <>{selectPlaceholder}</>;

    const gapSize = 6;
    const maxItemsThatFit = Math.floor((buttonWidth + gapSize) / (badgeWidth + gapSize));

    if (items.length <= maxItemsThatFit) {
      return (
        <div className="flex gap-1.5 overflow-hidden">
          {items.map((item) => (
            <BadgeItem key={item.key} item={item} onRemove={onRemove} />
          ))}
        </div>
      );
    }

    const visibleCount = Math.max(1, maxItemsThatFit - 1);
    const hiddenItems = items.slice(visibleCount);

    return (
      <div className="flex gap-1.5 overflow-hidden">
        {items.slice(0, visibleCount).map((item) => (
          <BadgeItem key={item.key} item={item} onRemove={onRemove} />
        ))}
        {hiddenItems.length > 0 && (
          <BadgeMore items={hiddenItems} onRemove={onRemoveMultiple} />
        )}
      </div>
    );
  }

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const removeItem = (item: KeyValue) => {
          field.onChange(selectedItems.filter((v) => v.key !== item.key).map((i) => i.key));
        };

        const removeItems = (items: KeyValue[]) => {
          field.onChange(
            selectedItems
              .filter((v) => !items.some((i) => i.key === v.key))
              .map((i) => i.key)
          );
        };

        const handleSelectAll = () => {
          if (selectedKeys.length === data.length) {
            field.onChange([]);
          } else {
            field.onChange(data.map((item) => item.key));
          }
        };

        const isAllSelected = data.length > 0 && selectedKeys.length === data.length;

        return (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Popover open={open} onOpenChange={setOpen} modal={false}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between overflow-hidden"
                >
                  <div
                    ref={containerRef}
                    className="flex flex-1 gap-1.5 overflow-hidden"
                  >
                    {selectedItems.length > 0 ? (
                      <SelectItems
                        items={selectedItems}
                        onRemove={removeItem}
                        onRemoveMultiple={removeItems}
                      />
                    ) : (
                      selectPlaceholder
                    )}
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
              <Command>
                <CommandInput placeholder={searchPlaceholder} />
                <CommandList>
                  <CommandEmpty>{!isPending && emptyMessage}</CommandEmpty>
                  {isPending ? (
                    <div className="px-2 py-1 text-sm text-muted-foreground">
                      Carregando...
                    </div>
                  ) : (
                    <>
                      {ungroupedItems.map((item) => (
                        <CommandItem
                          key={item.key}
                          value={String(item.value)}
                          onSelect={() => {
                            if (selectedItems.some((v) => v.key === item.key)) {
                              field.onChange(
                                selectedItems
                                  .filter((v) => v.key !== item.key)
                                  .map((i) => i.key)
                              );
                            } else {
                              field.onChange([...selectedKeys, item.key]);
                            }
                          }}
                        >
                          {item.value}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              selectedItems.some((v) => v.key === item.key)
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}

                      {Object.entries(groupedData).map(([groupName, items]) => {
                        const groupKeys = items.map((item) => item.key);
                        const isGroupSelected = groupKeys.every((key) =>
                          selectedKeys.includes(key)
                        );

                        return (
                          <CommandGroup key={groupName}>
                            <CommandItem
                              value={`group-${groupName}`}
                              onSelect={() => {
                                if (isGroupSelected) {
                                  field.onChange(
                                    selectedKeys.filter(
                                      (key) => !groupKeys.includes(key)
                                    )
                                  );
                                } else {
                                  field.onChange(
                                    Array.from(
                                      new Set([...selectedKeys, ...groupKeys])
                                    )
                                  );
                                }
                              }}
                            >
                              <div className="flex items-center gap-2 px-2 py-1">
                                <Checkbox checked={isGroupSelected} />
                                <span>{groupName}</span>
                              </div>
                            </CommandItem>

                            {items.map((item) => (
                              <CommandItem
                                key={item.key}
                                value={String(item.value)}
                                onSelect={() => {
                                  if (selectedItems.some((v) => v.key === item.key)) {
                                    field.onChange(
                                      selectedItems
                                        .filter((v) => v.key !== item.key)
                                        .map((i) => i.key)
                                    );
                                  } else {
                                    field.onChange([...selectedKeys, item.key]);
                                  }
                                }}
                              >
                                {item.value}
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    selectedItems.some((v) => v.key === item.key)
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        );
                      })}
                    </>
                  )}
                  </CommandList>
                  {Object.keys(groupedData).length > 0 && (
                    <>
                      <Separator />
                      <div className="flex h-10 items-center gap-3 p-2">
                        <Checkbox
                          id="select-all"
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                        />
                        <Label htmlFor="select-all">Selecionar todos</Label>
                      </div>
                    </>
                  )}
                </Command>
              </PopoverContent>
            </Popover>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
