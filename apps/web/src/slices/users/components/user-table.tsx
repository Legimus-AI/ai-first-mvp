import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import type { User } from '@repo/shared'
import { Edit, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useDeleteUser } from '../hooks/use-users'
import { UserForm } from './user-form'

interface UserTableProps {
	users: User[]
}

export function UserTable({ users }: UserTableProps) {
	const [editingUser, setEditingUser] = useState<User | null>(null)
	const deleteMutation = useDeleteUser()

	const handleDelete = async (id: string) => {
		if (confirm('Are you sure you want to delete this user?')) {
			await deleteMutation.mutateAsync(id)
		}
	}

	if (users.length === 0) {
		return (
			<div className="flex h-48 items-center justify-center rounded-md border border-border bg-muted/30">
				<p className="text-muted-foreground">No users found.</p>
			</div>
		)
	}

	return (
		<>
			<div className="rounded-md border border-border">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-border bg-muted/50">
							<th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
							<th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
							<th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
							<th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
							<th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
						</tr>
					</thead>
					<tbody>
						{users.map((user) => (
							<tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30">
								<td className="px-4 py-3 font-medium">{user.name}</td>
								<td className="px-4 py-3 text-muted-foreground">{user.email}</td>
								<td className="px-4 py-3">
									<Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
										{user.role}
									</Badge>
								</td>
								<td className="px-4 py-3 text-muted-foreground">
									{new Date(user.createdAt).toLocaleDateString()}
								</td>
								<td className="px-4 py-3 text-right">
									<div className="flex items-center justify-end gap-2">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => setEditingUser(user)}
										>
											<Edit className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleDelete(user.id)}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{editingUser && (
				<UserForm open={!!editingUser} onClose={() => setEditingUser(null)} user={editingUser} />
			)}
		</>
	)
}
