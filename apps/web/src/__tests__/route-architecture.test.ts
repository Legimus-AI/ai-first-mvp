import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function collectRouteFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const entryPath = join(directory, entry.name)
		if (entry.isDirectory()) return collectRouteFiles(entryPath)
		return entry.name.endsWith('.tsx') ? [entryPath] : []
	})
}

describe('route architecture', () => {
	it('keeps every route registered and file-route paths unique', () => {
		const routesDirectory = join(import.meta.dirname, '..', 'routes')
		const routeFiles = collectRouteFiles(routesDirectory)
		const declaredPaths: string[] = []

		for (const routeFile of routeFiles) {
			const routeSource = readFileSync(routeFile, 'utf8')
			expect(routeSource, routeFile).toMatch(/export const Route = create(?:File|Root)Route\(/)
			const declaredPath = routeSource.match(/createFileRoute\(['"]([^'"]+)['"]\)/)?.[1]
			if (declaredPath) declaredPaths.push(declaredPath)
		}

		expect(new Set(declaredPaths).size).toBe(declaredPaths.length)
	})
})
