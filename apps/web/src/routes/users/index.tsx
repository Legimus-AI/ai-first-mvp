import { UserTable } from '@/slices/users/components/user-table'
import { useUsers } from '@/slices/users/hooks/use-users'
import { Skeleton } from '@/ui/skeleton'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/users/')({
	component: UsersPage,
})

function UsersPage() {
	const { data, isLoading } = useUsers()

	return (
		<div className="p-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold">Users</h1>
				<p className="text-muted-foreground">Manage system users</p>
			</div>

			{isLoading ? (
				<div className="space-y-4">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-24 w-full" />
				</div>
			) : (
				<UserTable users={data?.data ?? []} />
			)}
		</div>
	)
}
