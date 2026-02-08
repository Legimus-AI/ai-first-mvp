import { configure, getConsoleSink, getLogger } from '@logtape/logtape'

export async function setupLogger() {
	await configure({
		sinks: {
			console: getConsoleSink(),
		},
		loggers: [
			{ category: ['app'], sinks: ['console'], lowestLevel: 'debug' },
			{ category: ['hono'], sinks: ['console'], lowestLevel: 'info' },
			{ category: ['logtape', 'meta'], sinks: ['console'], lowestLevel: 'warning' },
		],
	})
}

export function getAppLogger(module: string) {
	return getLogger(['app', module])
}
