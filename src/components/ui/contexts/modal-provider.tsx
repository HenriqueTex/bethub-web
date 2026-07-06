import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { Dialog } from "@/components/ui/dialog";

type ModalContent = ReactNode | (() => ReactNode);

type ModalData = {
  title?: string;
  content: ModalContent;
};

interface ModalContextType {
  openModal: (data: ModalData) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalData | null>(null);

  const openModal = (data: ModalData) => setModal(data);
  const closeModal = () => setModal(null);

  const content: ReactNode =
    typeof modal?.content === "function" ? modal.content() : modal?.content;

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <Dialog open={modal !== null} onOpenChange={closeModal}>
        {content}
      </Dialog>
    </ModalContext.Provider>
  );
}
