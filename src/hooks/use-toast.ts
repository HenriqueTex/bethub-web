import { toast } from "sonner";
type Position =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top-center"
  | "bottom-center";

type Variants = "sucess" | "error";
interface UseToastProps {
  variant: Variants;
  description: string;
}

export default function useToast({ description, variant }: UseToastProps) {
  const baseToastStyle = {
    borderRadius: 8,
    fontSize: 16,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
  };

  const defaultToast = {
    description: description,
    closeButton: true,
    position: "top-right" as Position,
  };

  switch (variant) {
    case "sucess":
      toast.success("Sucesso!", {
        ...defaultToast,
        style: {
          backgroundColor: "green",
          ...baseToastStyle,
          color: "white",
        },
      });

      break;

    case "error":
      toast.warning("Aviso!", {
        ...defaultToast,
        style: {
          backgroundColor: "red",
          ...baseToastStyle,
          color: "white",
        },
      });
      break;

    default:
      break;
  }
}
