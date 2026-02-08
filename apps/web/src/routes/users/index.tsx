import { UserTable } from '@/slices/users/components/user-table'
import { useUsers } from '@/slices/users/hooks/use-users'
import { Skeleton } from '@/ui/skeleton'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/users/')({
	component: UsersPage,
})

function UsersPage() {
	const { data, isLoading, isError, error } = useUsers()

	if (isError) {
		return (
			<div className="flex flex-col items-center justify-center p-4 py-12 md:p-8">
				<p className="text-sm text-destructive">Failed to load users: {error.message}</p>
			</div>
		)
	}

	return (
		<div className="p-4 md:p-8">
			<div className="mb-8">
				<h1 className="text-2xl font-bold md:text-3xl">Users</h1>
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
