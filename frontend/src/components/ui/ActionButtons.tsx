import { Check, X } from 'lucide-react';

interface ActionButtonsProps {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function ActionButtons({
  onCancel,
  onConfirm,
  confirmLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  isLoading = false,
  loadingLabel = 'Salvando...',
  disabled = false,
  className,
}: ActionButtonsProps) {
  return (
    <div className={`flex items-center justify-end gap-3 pt-6 border-t border-border ${className ?? ''}`}>
      <button
        onClick={onCancel}
        type="button"
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
      >
        <X className="w-4 h-4" />
        <span>{cancelLabel}</span>
      </button>

      <button
        onClick={onConfirm}
        type="button"
        disabled={isLoading || disabled}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Check className="w-4 h-4" />
        <span>{isLoading ? loadingLabel : confirmLabel}</span>
      </button>
    </div>
  );
}
