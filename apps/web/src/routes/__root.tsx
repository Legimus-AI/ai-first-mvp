import { useAuth } from '@/lib/auth'
import { Button } from '@/ui/button'
import { Separator } from '@/ui/separator'
import { Toaster } from '@/ui/sonner'
import { ThemeToggle } from '@/ui/theme-toggle'
import { Link, Outlet, createRootRoute, useLocation, useNavigate } from '@tanstack/react-router'
import { Bot, FileText, LayoutDashboard, LogOut, Menu, MessageSquare, Users } from 'lucide-react'
import { useState } from 'react'

export const Route = createRootRoute({
	component: RootLayout,
})

function RootLayout() {
	const location = useLocation()
	const navigate = useNavigate()
	const { isAuthenticated, isLoading, logout } = useAuth()
	const [sidebarOpen, setSidebarOpen] = useState(false)

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
			{/* Mobile top bar */}
			<div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center border-b border-border bg-background px-4 md:hidden">
				<button
					onClick={() => setSidebarOpen(true)}
					className="flex items-center justify-center"
					type="button"
				>
					<Menu className="h-5 w-5" />
				</button>
				<span className="ml-3 text-lg font-semibold">GenAI Bots</span>
			</div>

			{/* Mobile sidebar overlay */}
			{sidebarOpen && (
				<div className="fixed inset-0 z-40 md:hidden">
					<div
						className="fixed inset-0 bg-black/50"
						onClick={() => setSidebarOpen(false)}
						onKeyDown={(e) => {
							if (e.key === 'Escape') setSidebarOpen(false)
						}}
						role="button"
						tabIndex={0}
						aria-label="Close sidebar"
					/>
					<aside className="fixed inset-y-0 left-0 z-50 w-64 bg-background">
						<div className="flex h-16 items-center border-b border-border px-6">
							<h1 className="text-lg font-semibold">GenAI Bots</h1>
						</div>
						<nav className="flex flex-col gap-1 p-4">
							<NavLink
								to="/"
								icon={LayoutDashboard}
								label="Dashboard"
								onClick={() => setSidebarOpen(false)}
							/>
							<NavLink to="/bots" icon={Bot} label="Bots" onClick={() => setSidebarOpen(false)} />
							<NavLink
								to="/documents"
								icon={FileText}
								label="Documents"
								onClick={() => setSidebarOpen(false)}
							/>
							<NavLink
								to="/leads"
								icon={MessageSquare}
								label="Leads"
								onClick={() => setSidebarOpen(false)}
							/>
							<NavLink
								to="/users"
								icon={Users}
								label="Users"
								onClick={() => setSidebarOpen(false)}
							/>
						</nav>
						<Separator className="mx-4" />
						<div className="px-4 pt-2">
							<ThemeToggle />
						</div>
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
				</div>
			)}

			{/* Desktop sidebar */}
			<aside className="hidden w-64 border-r border-border bg-background md:block">
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
				<div className="px-4 pt-2">
					<ThemeToggle />
				</div>
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

			{/* Main content with top padding on mobile */}
			<main className="flex-1 overflow-auto pt-14 md:pt-0">
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
	onClick,
}: { to: string; icon: React.ElementType; label: string; onClick?: () => void }) {
	const location = useLocation()
	const isActive = location.pathname === to

	return (
		<Link to={to} onClick={onClick}>
			<Button variant={isActive ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start">
				<Icon className="mr-2 h-4 w-4" />
				{label}
			</Button>
		</Link>
	)
}
