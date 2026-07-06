import type { Control, FieldPath, FieldValues } from "react-hook-form";

import { useState } from "react";
import { Eye, EyeOff, ChevronsUpDown } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  label: string;
  control: Control<T>;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  description?: string;
  containerProps?: React.HTMLAttributes<HTMLDivElement>;
  visibleToggle?: boolean;
  hideMessage?: boolean;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
};

export function FormInput<T extends FieldValues>({
  name,
  label,
  control,
  type = "text",
  placeholder,
  description,
  containerProps = {},
  visibleToggle = false,
  hideMessage = false,
  min,
  max,
  step,
  disabled,
}: Props<T>) {
  const [visible, setVisible] = useState(type !== "password");

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const { className, ...rest } = containerProps;
        const isNumber = type === "number";
        const stepBy = (dir: number) => {
          if (disabled || field.disabled) return;
          const stepSize = step ?? 1;
          const current = Number(field.value);
          let next = (Number.isFinite(current) ? current : 0) + dir * stepSize;
          if (min !== undefined) next = Math.max(min, next);
          if (max !== undefined) next = Math.min(max, next);
          field.onChange(next);
        };
        return (
          <FormItem className={cn("col-span-12", className)} {...rest}>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  id={name}
                  type={
                    visible ? (type === "password" ? "text" : type) : "password"
                  }
                  placeholder={placeholder}
                  {...field}
                  disabled={disabled || field.disabled}
                  value={field.value ?? ""}
                  min={isNumber ? min : undefined}
                  max={isNumber ? max : undefined}
                  step={isNumber ? step : undefined}
                  className={isNumber ? "no-native-spinner pr-8" : undefined}
                />
                {isNumber && (
                  <div className="absolute inset-y-0 right-2.5 flex w-4 items-center justify-center">
                    <ChevronsUpDown className="size-4 shrink-0 opacity-50 pointer-events-none" />
                    <button
                      type="button"
                      tabIndex={-1}
                      disabled={disabled || field.disabled}
                      aria-label="Aumentar"
                      className="absolute inset-x-0 top-0 h-1/2 disabled:pointer-events-none"
                      onClick={() => stepBy(1)}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      disabled={disabled || field.disabled}
                      aria-label="Diminuir"
                      className="absolute inset-x-0 bottom-0 h-1/2 disabled:pointer-events-none"
                      onClick={() => stepBy(-1)}
                    />
                  </div>
                )}
                {type === "password" && visibleToggle && (
                  <Button
                    variant="ghost"
                    type="button"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                )}
              </div>
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            {!hideMessage && <FormMessage />}
          </FormItem>
        );
      }}
    />
  );
}
