import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteConfirmModalProps {
  title?: string;
  description?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export function DeleteConfirmModal({
  title = "Você tem certeza?",
  description = "Essa ação não pode ser desfeita.",
  onConfirm,
  onClose,
}: DeleteConfirmModalProps) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setPending(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Cancelar
        </Button>
        <Button
          variant="destructive"
          onClick={handleConfirm}
          disabled={pending}
        >
          {pending ? "Deletando..." : "Confirmar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
