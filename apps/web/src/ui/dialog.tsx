import { cn } from '@/lib/cn'
import { X } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'
import { Button } from './button'

export interface DialogProps {
	open: boolean
	onClose: () => void
	children: ReactNode
	className?: string
}

export function Dialog({ open, onClose, children, className }: DialogProps) {
	useEffect(() => {
		if (open) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = 'unset'
		}
		return () => {
			document.body.style.overflow = 'unset'
		}
	}, [open])

	if (!open) return null

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div
				className="fixed inset-0 bg-background/80 backdrop-blur-sm"
				onClick={onClose}
				onKeyDown={(e) => e.key === 'Escape' && onClose()}
				role="button"
				tabIndex={-1}
				aria-label="Close dialog"
			/>
			<div
				className={cn(
					'relative z-50 w-full max-w-lg rounded-lg border border-border bg-background shadow-lg',
					className,
				)}
			>
				{children}
			</div>
		</div>
	)
}

export function DialogHeader({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<div className={cn('flex items-center justify-between border-b border-border p-6', className)}>
			{children}
		</div>
	)
}

export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
	return <h2 className={cn('text-lg font-semibold', className)}>{children}</h2>
}

export function DialogClose({ onClose }: { onClose: () => void }) {
	return (
		<Button variant="ghost" size="icon" onClick={onClose}>
			<X className="h-4 w-4" />
		</Button>
	)
}

export function DialogContent({
	children,
	className,
}: { children: ReactNode; className?: string }) {
	return <div className={cn('p-6', className)}>{children}</div>
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<div
			className={cn('flex items-center justify-end gap-2 border-t border-border p-6', className)}
		>
			{children}
		</div>
	)
}
