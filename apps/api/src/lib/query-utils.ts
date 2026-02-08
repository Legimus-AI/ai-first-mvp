import { type ListQuery, buildPaginationMeta } from '@repo/shared'
import { type InferSelectModel, type SQL, and, asc, count, desc, ilike, or } from 'drizzle-orm'
import type { PgColumn, PgTableWithColumns } from 'drizzle-orm/pg-core'
import type { getDb } from '../db/client'

// biome-ignore lint/suspicious/noExplicitAny: Drizzle's PgTableWithColumns generic requires `any` — no narrower type works for the generic constraint
interface PaginatedListConfig<TTable extends PgTableWithColumns<any>> {
	/** Drizzle table object */
	table: TTable
	/** Columns to search with ilike when query.search is provided */
	searchColumns?: PgColumn[]
	/** Whitelist of sortable/filterable columns — keys are query param names, values are column refs */
	sortColumns: Record<string, PgColumn>
	/** Default sort column key (must exist in sortColumns) */
	defaultSort?: string
	/** Additional WHERE condition (e.g., eq(table.botId, botId)) */
	extraWhere?: SQL
}

// biome-ignore lint/suspicious/noExplicitAny: Drizzle generic constraint (see above)
export async function paginatedList<TTable extends PgTableWithColumns<any>>(
	db: ReturnType<typeof getDb>,
	query: ListQuery,
	config: PaginatedListConfig<TTable>,
) {
	const { table, searchColumns = [], sortColumns, defaultSort = 'createdAt', extraWhere } = config
	const offset = (query.page - 1) * query.limit

	// 1. Build search condition
	let searchCondition: SQL | undefined

	if (query.filterValue && query.filterFields) {
		// Targeted search: filterValue=val&filterFields=col1,col2
		// Fields are resolved against sortColumns whitelist (security: only allowed columns)
		const requestedFields = query.filterFields.split(',').map((f) => f.trim())
		const resolvedColumns = requestedFields
			.map((name) => sortColumns[name])
			.filter((col): col is PgColumn => col !== undefined)
		if (resolvedColumns.length > 0) {
			const conditions = resolvedColumns.map((col) => ilike(col, `%${query.filterValue}%`))
			searchCondition = conditions.length === 1 ? conditions[0] : or(...conditions)
		}
	} else if (query.search && searchColumns.length > 0) {
		// Standard search: searches across all searchColumns
		const conditions = searchColumns.map((col) => ilike(col, `%${query.search}%`))
		searchCondition = conditions.length === 1 ? conditions[0] : or(...conditions)
	}

	// 2. Compose WHERE
	const whereCondition =
		searchCondition && extraWhere ? and(searchCondition, extraWhere) : searchCondition || extraWhere

	// 3. Build ORDER BY from whitelist (safe — user string never reaches SQL)
	const sortKey = query.sort && sortColumns[query.sort] ? query.sort : defaultSort
	const sortColumn = sortColumns[sortKey]
	const orderByClause = query.order === 'asc' ? asc(sortColumn) : desc(sortColumn)

	// 4. Execute query + count in parallel
	const [items, [totalResult]] = await Promise.all([
		db
			.select()
			.from(table)
			.where(whereCondition)
			.orderBy(orderByClause)
			.offset(offset)
			.limit(query.limit),
		db.select({ count: count() }).from(table).where(whereCondition),
	])

	return {
		data: items as InferSelectModel<TTable>[],
		meta: buildPaginationMeta(query, Number(totalResult.count)),
	}
}
