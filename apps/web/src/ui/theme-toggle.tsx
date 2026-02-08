import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from './button'

export function ThemeToggle() {
	const [dark, setDark] = useState(() => {
		if (typeof window === 'undefined') return false
		return (
			localStorage.getItem('theme') === 'dark' ||
			(!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
		)
	})

	useEffect(() => {
		const root = document.documentElement
		if (dark) {
			root.classList.add('dark')
			localStorage.setItem('theme', 'dark')
		} else {
			root.classList.remove('dark')
			localStorage.setItem('theme', 'light')
		}
	}, [dark])

	return (
		<Button
			variant="ghost"
			size="sm"
			className="w-full justify-start"
			onClick={() => setDark(!dark)}
		>
			{dark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
			{dark ? 'Light Mode' : 'Dark Mode'}
		</Button>
	)
}
