import { useAuth } from '@/lib/auth'
import { Button } from '@/ui/button'
import { Separator } from '@/ui/separator'
import { Toaster } from '@/ui/sonner'
import { Link, Outlet, createRootRoute, useLocation, useNavigate } from '@tanstack/react-router'
import {
	Bot,
	FileText,
	LayoutDashboard,
	LogOut,
	MessageSquare,
	Users,
} from 'lucide-react'

export const Route = createRootRoute({
	component: RootLayout,
})

function RootLayout() {
	const location = useLocation()
	const navigate = useNavigate()
	const { isAuthenticated, isLoading, logout } = useAuth()

	const isWidgetRoute = location.pathname.startsWith('/widget/')
	const isLoginRoute = location.pathname === '/login'

	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		)
	}

	if (!isAuthenticated && !isLoginRoute && !isWidgetRoute) {
		navigate({ to: '/login' })
		return null
	}

	if (isWidgetRoute || isLoginRoute) {
		return (
			<>
				<Outlet />
				<Toaster />
			</>
		)
	}

	return (
		<div className="flex h-screen bg-muted/30">
			<aside className="w-64 border-r border-border bg-background">
				<div className="flex h-16 items-center border-b border-border px-6">
					<h1 className="text-lg font-semibold">GenAI Bots</h1>
				</div>
				<nav className="flex flex-col gap-1 p-4">
					<NavLink to="/" icon={LayoutDashboard} label="Dashboard" />
					<NavLink to="/bots" icon={Bot} label="Bots" />
					<NavLink to="/documents" icon={FileText} label="Documents" />
					<NavLink to="/leads" icon={MessageSquare} label="Leads" />
					<NavLink to="/users" icon={Users} label="Users" />
				</nav>
				<Separator className="mx-4" />
				<div className="p-4">
					<Button
						variant="ghost"
						size="sm"
						className="w-full justify-start"
						onClick={() => {
							logout()
							navigate({ to: '/login' })
						}}
					>
						<LogOut className="mr-2 h-4 w-4" />
						Logout
					</Button>
				</div>
			</aside>
			<main className="flex-1 overflow-auto">
				<Outlet />
			</main>
			<Toaster />
		</div>
	)
}

function NavLink({
	to,
	icon: Icon,
	label,
}: { to: string; icon: React.ElementType; label: string }) {
	const location = useLocation()
	const isActive = location.pathname === to

	return (
		<Link to={to}>
			<Button
				variant={isActive ? 'secondary' : 'ghost'}
				size="sm"
				className="w-full justify-start"
			>
				<Icon className="mr-2 h-4 w-4" />
				{label}
			</Button>
		</Link>
	)
}
