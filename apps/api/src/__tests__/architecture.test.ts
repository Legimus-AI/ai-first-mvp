import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC_DIR = join(import.meta.dirname, '..')

function collectFiles(directory: string, suffix: string): string[] {
	if (!existsSync(directory)) return []
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name)
		if (entry.isDirectory()) return collectFiles(path, suffix)
		return entry.name.endsWith(suffix) ? [path] : []
	})
}

function findThinRouteViolations(source: string): string[] {
	const violations: string[] = []
	const sourceLines = source.split('\n')
	for (let lineIndex = 0; lineIndex < sourceLines.length; lineIndex++) {
		const line = (sourceLines[lineIndex] ?? '').trim()
		const nextLine = (sourceLines[lineIndex + 1] ?? '').trim()
		if (!line || line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue
		if (/^(?:switch|try)\b|^(?:for|while)\s*\(/.test(line)) violations.push('business control flow')
		if (
			(/\bif\s*\(/.test(line) && !/throw AppError\./.test(line + nextLine)) ||
			/=\s*[^?;]+\?[^:;]+:/.test(line)
		) {
			violations.push('business condition')
		}
		if (
			/\{\s*\.\.\.|\.(?:filter|flatMap|map|reduce|sort)\s*\(|\bJSON\.(?:parse|stringify)\s*\(|\bObject\.(?:assign|entries|fromEntries|keys|values)\s*\(/.test(
				line,
			)
		) {
			violations.push('payload transformation')
		}
	}
	return violations
}

describe('risk-weighted architecture guardrails', () => {
	it('discovers non-empty executable verification', () => {
		const testFiles = collectFiles(SRC_DIR, '.test.ts')
		const emptyTestFiles = testFiles.flatMap((file) => {
			const content = readFileSync(file, 'utf8')
			return /\b(?:it|test)\s*\(/.test(content) ? [] : [relative(SRC_DIR, file)]
		})

		expect(testFiles.length).toBeGreaterThan(1)
		expect(emptyTestFiles).toEqual([])
	})

	it('rejects pending tests and duplicate per-slice contract inventories', () => {
		const violations: string[] = []
		for (const testFile of collectFiles(SRC_DIR, '.test.ts')) {
			const content = readFileSync(testFile, 'utf8')
			const path = relative(SRC_DIR, testFile)
			if (/\b(?:it|test|describe)\.(?:todo|skip)(?:\.each)?\s*\(/.test(content)) {
				violations.push(`${path} — pending or skipped test`)
			}
			if (basename(testFile) === 'routes.contract.test.ts') {
				violations.push(`${path} — global contracts.test.ts already owns route discovery`)
			}
		}
		expect(violations).toEqual([])
	})

	it('thin-route detector rejects adversarial business and payload logic', () => {
		const cleanRoute = `const item = await service.getItem(user.organizationId, id)\nif (!item) throw AppError.notFound('Missing')\nreturn c.json({ data: item })`
		const adversarialRoute =
			'if (input.enabled) await service.enable(input)\nconst selected = input.enabled ? input.primary : input.fallback\nconst payload = { ...input, items: input.items.filter(Boolean).map(normalize) }\nreturn c.json(JSON.stringify(payload))\nswitch (input.mode) {}'
		expect(findThinRouteViolations(cleanRoute)).toEqual([])
		expect(findThinRouteViolations(adversarialRoute)).toEqual([
			'business condition',
			'business condition',
			'payload transformation',
			'payload transformation',
			'business control flow',
		])
	})

	it('keeps routes typed and thin', () => {
		const violations: string[] = []
		const knownLegacyInlineParams = new Set([
			'slices/bots/routes.ts',
			'slices/conversations/routes.ts',
			'slices/documents/routes.ts',
			'slices/leads/routes.ts',
			'slices/users/routes.ts',
		])
		for (const routeFile of collectFiles(join(SRC_DIR, 'slices'), 'routes.ts')) {
			const content = readFileSync(routeFile, 'utf8')
			const path = relative(SRC_DIR, routeFile)
			const sliceName = path.split('/')[1]
			if (sliceName !== 'auth' && sliceName !== 'push') {
				for (const violation of findThinRouteViolations(content)) {
					violations.push(`${path} — ${violation}`)
				}
			}
			if (
				/from ['"](?:drizzle-orm(?:\/[^'"]*)?|\.\/schema|\.\.\/\.\.\/lib\/query-utils)['"]/.test(
					content,
				)
			) {
				violations.push(`${path} — persistence import belongs in service.ts`)
			}
			if (/\b(?:app|\w+Routes)\.(?:get|post|put|patch|delete)\s*\(\s*['"`]/.test(content)) {
				violations.push(`${path} — handler bypasses createRoute()`)
			}
			if (/^(?:export\s+)?(?:async\s+)?function\s+/m.test(content)) {
				violations.push(`${path} — helper logic belongs outside routes.ts`)
			}
			if (
				/const\s+\w+(?:Schema|Input|Response)\s*=\s*z\./.test(content) &&
				!knownLegacyInlineParams.has(path)
			) {
				violations.push(`${path} — schemas belong in @repo/shared`)
			}
		}
		expect(violations).toEqual([])
	})

	it('keeps services free of HTTP and runtime shell concerns', () => {
		const violations: string[] = []
		for (const serviceFile of collectFiles(join(SRC_DIR, 'slices'), 'service.ts')) {
			const content = readFileSync(serviceFile, 'utf8')
			const path = relative(SRC_DIR, serviceFile)
			const isAuthService = path === 'slices/auth/service.ts'
			if (!isAuthService && /from ['"]hono(?:\/[^'"]*)?['"]/.test(content)) {
				violations.push(`${path} — HTTP dependency in service`)
			}
			if (/\b(?:process\.|Bun\.|Deno\.|console\.|getAppLogger\s*\()/.test(content)) {
				violations.push(`${path} — runtime or logging concern in service`)
			}
			if (/\b(?:Context|MiddlewareHandler|Request|Response)\b/.test(content)) {
				violations.push(`${path} — HTTP context in service`)
			}
		}
		expect(violations).toEqual([])
	})
})
