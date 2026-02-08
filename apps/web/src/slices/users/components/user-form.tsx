import { Button } from '@/ui/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/ui/dialog'
import { Input } from '@/ui/input'
import { type UpdateUser, type User, updateUserSchema } from '@repo/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useUpdateUser } from '../hooks/use-users'

interface UserFormProps {
	open: boolean
	onClose: () => void
	user: User
}

export function UserForm({ open, onClose, user }: UserFormProps) {
	const updateMutation = useUpdateUser(user.id)

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<UpdateUser>({
		resolver: zodResolver(updateUserSchema),
		defaultValues: {
			name: user.name,
			role: user.role,
		},
	})

	useEffect(() => {
		if (open) {
			reset({
				name: user.name,
				role: user.role,
			})
		}
	}, [open, user, reset])

	const onSubmit = async (data: UpdateUser) => {
		await updateMutation.mutateAsync(data)
		onClose()
	}

	return (
		<Dialog open={open} onClose={onClose}>
			<DialogHeader>
				<DialogTitle>Edit User</DialogTitle>
				<DialogClose onClose={onClose} />
			</DialogHeader>
			<form onSubmit={handleSubmit(onSubmit)}>
				<DialogContent>
					<div className="space-y-4">
						<div className="space-y-2">
							<label htmlFor="name" className="text-sm font-medium">
								Name
							</label>
							<Input
								id="name"
								{...register('name')}
								error={!!errors.name}
								placeholder="John Doe"
							/>
							{errors.name && (
								<p className="text-sm text-destructive">{errors.name.message}</p>
							)}
						</div>

						<div className="space-y-2">
							<label htmlFor="role" className="text-sm font-medium">
								Role
							</label>
							<select
								id="role"
								{...register('role')}
								className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<option value="user">User</option>
								<option value="admin">Admin</option>
							</select>
							{errors.role && (
								<p className="text-sm text-destructive">{errors.role.message}</p>
							)}
						</div>
					</div>
				</DialogContent>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? 'Saving...' : 'Update'}
					</Button>
				</DialogFooter>
			</form>
		</Dialog>
	)
}
