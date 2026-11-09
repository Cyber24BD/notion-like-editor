import { expect, test, type Page } from '@playwright/test'

async function openPageMenu(page: Page, title: string): Promise<void> {
  const row = page.locator('.tree-row').filter({ hasText: title }).first()
  await row.getByRole('button', { name: 'Page options' }).click()
  await expect(page.locator('.notion-menu')).toBeVisible()
}

async function depthOf(page: Page, title: string): Promise<number> {
  return page
    .locator('.tree-row')
    .filter({ hasText: title })
    .first()
    .evaluate((row) => Number.parseInt((row as HTMLElement).style.paddingLeft, 10))
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.tree-row').filter({ hasText: 'Design notes' })).toBeVisible()
})

test('page menu can move, indent and outdent pages', async ({ page }) => {
  await openPageMenu(page, 'Design notes')
  await page.getByRole('menuitem', { name: 'Move up' }).click()
  await expect
    .poll(() => page.locator('.tree-row .tree-title').allInnerTexts())
    .toEqual(['Getting started', 'Design notes', 'Blocks & shortcuts'])

  await openPageMenu(page, 'Design notes')
  await page.getByRole('menuitem', { name: 'Move down' }).click()
  await expect
    .poll(() => page.locator('.tree-row .tree-title').allInnerTexts())
    .toEqual(['Getting started', 'Blocks & shortcuts', 'Design notes'])

  await openPageMenu(page, 'Design notes')
  await page.getByRole('menuitem', { name: 'Indent / nest' }).click()
  await expect.poll(() => depthOf(page, 'Design notes')).toBe(34)

  await openPageMenu(page, 'Design notes')
  await page.getByRole('menuitem', { name: 'Move out' }).click()
  await expect.poll(() => depthOf(page, 'Design notes')).toBe(20)
})

test('move to page dialog nests a page and supports the keyboard menu', async ({
  page,
}) => {
  const designRow = page.locator('.tree-row').filter({ hasText: 'Design notes' }).first()
  const options = designRow.getByRole('button', { name: 'Page options' })
  await options.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.notion-menu')).toBeVisible()
  await expect(page.getByRole('menuitem').first()).toBeFocused()

  await page.getByRole('menuitem', { name: 'Move to page…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Move page to…' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: 'Find a target page' })).toBeFocused()
  await dialog.getByRole('button', { name: /Blocks & shortcuts/ }).click()
  await expect(dialog).toHaveCount(0)
  await expect.poll(() => depthOf(page, 'Design notes')).toBe(34)
})
