import { cn } from '@/lib/cn'
import type { InputHTMLAttributes } from 'react'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
	error?: boolean
}

export function Input({ className, error, ...props }: InputProps) {
	return (
		<input
			className={cn(
				'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
				error && 'border-destructive',
				className,
			)}
			{...props}
		/>
	)
}
