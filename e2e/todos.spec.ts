import { expect, test } from '@playwright/test'

test.describe('Todos CRUD', () => {
	test.beforeEach(async ({ page, request }) => {
		// Clean up all todos via API for test isolation
		const res = await request.get('http://localhost:3000/api/todos')
		const { data } = await res.json()
		for (const todo of data) {
			await request.delete(`http://localhost:3000/api/todos/${todo.id}`)
		}
		await page.goto('/')
	})

	test('shows empty state initially', async ({ page }) => {
		await expect(page.getByText('AI First Skeleton')).toBeVisible()
		await expect(page.getByText('No todos yet. Add one above!')).toBeVisible()
		await expect(page.getByText('0 todos')).toBeVisible()
	})

	test('creates a todo', async ({ page }) => {
		await page.getByPlaceholder('What needs to be done?').fill('Buy groceries')
		await page.getByRole('button', { name: 'Add' }).click()
		await expect(page.getByText('Buy groceries')).toBeVisible()
		await expect(page.getByText('1 todos')).toBeVisible()
	})

	test('toggles a todo complete', async ({ page }) => {
		await page.getByPlaceholder('What needs to be done?').fill('Toggle me')
		await page.getByRole('button', { name: 'Add' }).click()
		await expect(page.getByText('Toggle me')).toBeVisible()

		const checkbox = page.getByRole('checkbox').first()
		await checkbox.click()
		await expect(checkbox).toBeChecked()
	})

	test('deletes a todo', async ({ page }) => {
		await page.getByPlaceholder('What needs to be done?').fill('Delete me')
		await page.getByRole('button', { name: 'Add' }).click()
		await expect(page.getByText('Delete me')).toBeVisible()

		await page.getByRole('button', { name: 'Delete' }).first().click()
		await expect(page.getByText('Delete me')).toBeHidden()
	})

	test('validates empty title', async ({ page }) => {
		await page.getByRole('button', { name: 'Add' }).click()
		// RHF + Zod prevents submission — empty state remains
		await expect(page.getByText('No todos yet. Add one above!')).toBeVisible()
	})

	test('full CRUD flow', async ({ page }) => {
		// Create two todos
		await page.getByPlaceholder('What needs to be done?').fill('Task A')
		await page.getByRole('button', { name: 'Add' }).click()
		await expect(page.getByText('Task A')).toBeVisible()

		await page.getByPlaceholder('What needs to be done?').fill('Task B')
		await page.getByRole('button', { name: 'Add' }).click()
		await expect(page.getByText('Task B')).toBeVisible()
		await expect(page.getByText('2 todos')).toBeVisible()

		// Complete first todo
		const checkbox = page.getByRole('checkbox').first()
		await checkbox.click()
		await expect(checkbox).toBeChecked()

		// Delete first (completed)
		await page.getByRole('button', { name: 'Delete' }).first().click()
		await expect(page.getByText('1 todos')).toBeVisible()

		// Delete remaining
		await page.getByRole('button', { name: 'Delete' }).first().click()
		await expect(page.getByText('No todos yet. Add one above!')).toBeVisible()
	})
})
