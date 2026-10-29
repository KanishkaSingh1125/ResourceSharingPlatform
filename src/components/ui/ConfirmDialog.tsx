import { type ReactNode } from 'react'
import { AlertTriangle, Info, CheckCircle2, AlertCircle } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  isLoading?: boolean
}

const variantConfig: Record<
  ConfirmVariant,
  { icon: typeof AlertTriangle; iconColor: string; bg: string; buttonVariant: 'danger' | 'primary' }
> = {
  danger: {
    icon: AlertCircle,
    iconColor: 'text-red-600',
    bg: 'bg-red-50',
    buttonVariant: 'danger',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    bg: 'bg-amber-50',
    buttonVariant: 'primary',
  },
  info: {
    icon: Info,
    iconColor: 'text-brand-600',
    bg: 'bg-brand-50',
    buttonVariant: 'primary',
  },
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    bg: 'bg-emerald-50',
    buttonVariant: 'primary',
  },
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={config.buttonVariant}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.bg} ${config.iconColor}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-neutral-900">{title}</h4>
          <div className="mt-1.5 text-xs text-neutral-600 leading-relaxed">{message}</div>
        </div>
      </div>
    </Modal>
  )
}

