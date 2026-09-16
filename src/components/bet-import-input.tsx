"use client"

import { useEffect, useRef, useState } from "react"
import { Crop, ImagePlus, LoaderCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import {
  fullImageCrop,
  prepareBetImage,
  validateBetImage,
  type ImageCrop
} from "@/lib/prepare-bet-image"

interface Props {
  loading: boolean
  disabled?: boolean
  onAnalyze: (file: File | null, text?: string) => void
  onCancel: () => void
}

export function BetImportInput({
  loading,
  disabled,
  onAnalyze,
  onCancel
}: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [source, setSource] = useState<"image" | "text">("image")
  const [text, setText] = useState("")
  const [error, setError] = useState("")
  const [preparing, setPreparing] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const [crop, setCrop] = useState<ImageCrop>(fullImageCrop)
  const input = useRef<HTMLInputElement>(null)
  const generation = useRef(0)

  useEffect(() => {
    if (preview) return () => URL.revokeObjectURL(preview)
  }, [preview])
  useEffect(
    () => () => {
      generation.current++
    },
    []
  )

  function cancel() {
    generation.current++
    setPreparing(false)
    onCancel()
  }

  function selectFile(next: File) {
    cancel()
    setError("")
    try {
      validateBetImage(next)
      setFile(next)
      setPreview(URL.createObjectURL(next))
      setCrop(fullImageCrop)
      setSource("image")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Imagem inválida.")
    }
  }

  async function analyze() {
    setError("")
    if (source === "text") {
      onAnalyze(null, text)
      return
    }
    if (!file) return
    const current = ++generation.current
    setPreparing(true)
    try {
      const prepared = await prepareBetImage(file, crop)
      if (current === generation.current) onAnalyze(prepared)
    } catch (cause) {
      if (current === generation.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível preparar a imagem."
        )
    } finally {
      if (current === generation.current) setPreparing(false)
    }
  }

  return (
    <section
      aria-label="Importar aposta"
      className="min-w-0 space-y-3 rounded-lg border bg-muted/20 p-3"
      onPaste={(event) => {
        if (disabled) return
        const image = Array.from(event.clipboardData.files).find((item) =>
          item.type.startsWith("image/")
        )
        if (image) {
          event.preventDefault()
          selectFile(image)
        }
      }}
    >
      <div className="flex gap-2" aria-label="Origem da importação">
        {(["image", "text"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            disabled={disabled}
            variant={source === value ? "secondary" : "ghost"}
            aria-pressed={source === value}
            onClick={() => {
              cancel()
              setSource(value)
            }}
          >
            {value === "image" ? "Imagem" : "Texto"}
          </Button>
        ))}
      </div>
      {source === "image" ? (
        <>
          <button
            type="button"
            disabled={disabled}
            className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-md border border-dashed bg-background p-3 focus-visible:ring-2 focus-visible:ring-ring lg:h-52"
            onClick={() => input.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              if (!disabled && event.dataTransfer.files[0])
                selectFile(event.dataTransfer.files[0])
            }}
          >
            {file && preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Comprovante selecionado"
                  className="h-full w-full object-contain"
                />
              </>
            ) : (
              <span className="grid justify-items-center gap-2 text-sm">
                <ImagePlus className="size-6 text-muted-foreground" />
                Importar aposta por imagem
                <span className="text-xs text-muted-foreground">
                  Arraste, clique ou cole com Ctrl+V
                </span>
              </span>
            )}
          </button>
          <input
            ref={input}
            id="new-bet-image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={disabled}
            aria-label="Escolher imagem da aposta"
            onChange={(event) => {
              const next = event.target.files?.[0]
              if (next) selectFile(next)
              event.target.value = ""
            }}
          />
          {file && (
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={() => setCropOpen(true)}
              >
                <Crop className="size-4" />
                Recortar / ampliar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={() => {
                  cancel()
                  setFile(null)
                  setPreview(null)
                  setError("")
                }}
              >
                <X className="size-4" />
                Remover
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {Object.values(crop).some((value) => value > 0)
              ? "Recorte aplicado. Somente a área selecionada será enviada."
              : "PNG, JPG ou WebP, até 10 MB. Recorte o comprovante antes de ler."}
          </p>
        </>
      ) : (
        <>
          <label htmlFor="bet-import-text" className="text-sm font-medium">
            Texto da aposta
          </label>
          <Textarea
            id="bet-import-text"
            rows={5}
            maxLength={6000}
            placeholder="Cole a mensagem ou o texto do comprovante…"
            value={text}
            disabled={disabled}
            onChange={(event) => {
              cancel()
              setText(event.target.value)
            }}
          />
          <p className="text-xs text-muted-foreground">
            Até 6.000 caracteres. Inclua evento, seleção, odd e valor, se
            disponíveis.
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {loading || preparing ? (
        <div className="flex items-center gap-2">
          <p role="status" className="flex flex-1 items-center gap-2 text-xs">
            <LoaderCircle className="size-4 animate-spin" />
            {preparing ? "Preparando imagem…" : "Lendo aposta…"}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={cancel}>
            Cancelar
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={disabled || (source === "image" ? !file : !text.trim())}
          onClick={analyze}
        >
          {source === "image" ? "Ler imagem" : "Preencher pelo texto"}
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        O preenchimento manual continua disponível.
      </p>
      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Recortar comprovante</DialogTitle>
            <DialogDescription>
              Ajuste as margens. Preserve evento, seleção, odd e valor legíveis.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="relative mx-auto w-fit max-w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Área de recorte do comprovante"
                className="max-h-[45vh] max-w-full object-contain"
              />
              <div
                className="pointer-events-none absolute border-2 border-emerald-500 shadow-[0_0_0_9999px_#0008]"
                style={{
                  left: crop.left + "%",
                  top: crop.top + "%",
                  right: crop.right + "%",
                  bottom: crop.bottom + "%"
                }}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["left", "Esquerda"],
                ["right", "Direita"],
                ["top", "Topo"],
                ["bottom", "Base"]
              ] as const
            ).map(([side, label]) => (
              <label key={side} className="grid gap-1 text-xs">
                {label}: {crop[side]}%
                <input
                  type="range"
                  min={0}
                  max={45}
                  value={crop[side]}
                  onChange={(event) => {
                    cancel()
                    setCrop((current) => ({
                      ...current,
                      [side]: Number(event.target.value)
                    }))
                  }}
                />
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                cancel()
                setCrop(fullImageCrop)
              }}
            >
              Restaurar
            </Button>
            <Button type="button" onClick={() => setCropOpen(false)}>
              Usar recorte
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
