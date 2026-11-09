import { expect, test } from '@playwright/test'
import { insertImageWithSlash, makeJpeg } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/harness.html')
  await expect(page.locator('.notion-editor')).toBeVisible()
  await expect(page.getByTestId('harness-status')).toContainText('Ready: yes')
})

test('page cover uploads, repositions and removes', async ({ page }, testInfo) => {
  const image = await makeJpeg(page, testInfo, 'small')
  await page.locator('.notion-page-header').hover()

  const chooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add cover' }).click()
  const chooser = await chooserPromise
  await chooser.setFiles(image)

  const cover = page.locator('.notion-page-cover')
  await expect(cover).toBeVisible()
  await expect(cover.locator('img')).toHaveAttribute('src', /^data:image\//)

  const positionControl = page.locator('.notion-page-cover__position')
  await positionControl.focus()
  await expect(positionControl).toHaveAttribute('aria-valuenow', '50')
  await page.keyboard.press('End')
  await expect(positionControl).toHaveAttribute('aria-valuenow', '100')
  await page.keyboard.press('Home')
  await expect(positionControl).toHaveAttribute('aria-valuenow', '0')
  await page.keyboard.press('ArrowDown')
  await expect(positionControl).toHaveAttribute('aria-valuenow', '2')

  const before = await cover.locator('img').evaluate((element) => {
    return getComputedStyle(element).objectPosition
  })
  const box = await cover.boundingBox()
  if (!box) throw new Error('cover has no box')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.2)
  await page.mouse.up()
  await expect
    .poll(async () => {
      return cover.locator('img').evaluate((element) => {
        return getComputedStyle(element).objectPosition
      })
    })
    .not.toBe(before)

  await cover.hover()
  await page.getByRole('button', { name: 'Remove' }).click()
  await expect(page.locator('.notion-page-cover')).toHaveCount(0)
})


test('page cover survives page navigation in the demo store', async ({
  page,
}, testInfo) => {
  const image = await makeJpeg(page, testInfo, 'small')
  await page.goto('/')
  await expect(page.locator('.notion-page-header')).toBeVisible()
  await page.locator('.notion-page-header').hover()
  const chooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add cover' }).click()
  const chooser = await chooserPromise
  await chooser.setFiles(image)
  await expect(page.locator('.notion-page-cover')).toBeVisible()

  await page.locator('.tree-row').filter({ hasText: 'Design notes' }).first().click()
  await expect(page.locator('.notion-page-title')).toHaveValue('Design notes')
  await page.locator('.tree-row').filter({ hasText: 'Getting started' }).first().click()
  await expect(page.locator('.notion-page-title')).toHaveValue('Getting started')
  await expect(page.locator('.notion-page-cover')).toBeVisible()
})

test('find and replace updates the document', async ({ page }) => {
  await page.locator('.notion-editor p').first().click()
  await page.keyboard.press('Control+f')
  await expect(page.locator('.find-bar')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Find in page' })).toBeFocused()

  await page.getByRole('textbox', { name: 'Find in page' }).fill('Controlled')
  await expect(page.locator('.search-match')).toHaveCount(1)
  await expect(page.locator('.find-bar__count')).toHaveText('1 of 1')

  await page.keyboard.press('Control+h')
  const replaceInput = page.getByRole('textbox', { name: 'Replace with' })
  await expect(replaceInput).toBeVisible()
  await replaceInput.fill('Updated')
  await page.getByRole('button', { name: 'Replace', exact: true }).click()

  await expect(page.locator('.notion-editor')).toContainText('Updated editor body.')
  await expect(page.locator('.find-bar__count')).toHaveText('No results')

  await page.getByRole('textbox', { name: 'Find in page' }).fill('editor')
  await expect(page.locator('.search-match')).toHaveCount(1)
  await page.getByRole('textbox', { name: 'Replace with' }).fill('block')
  await page.getByRole('button', { name: 'Replace all' }).click()
  await expect(page.locator('.notion-editor')).toContainText('Updated block body.')
  await expect(page.locator('.find-bar__count')).toHaveText('No results')

  await page.keyboard.press('Escape')
  await expect(page.locator('.find-bar')).toHaveCount(0)
})

test('keyboard shortcuts dialog is discoverable and closes with Escape', async ({
  page,
}) => {
  await page.locator('.notion-editor p').first().click()
  await page.keyboard.press('Control+/')
  const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Find in page')
  await expect(dialog).toContainText('Duplicate selected blocks')

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('find opens when focus is on the app top bar', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.notion-page-title')).toBeVisible()
  await page.locator('.topbar .notion-icon-btn').first().focus()
  await page.keyboard.press('Control+f')
  await expect(page.locator('.find-bar')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.find-bar')).toHaveCount(0)
})

test('mobile table toolbar stays inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/harness.html')
  await expect(page.locator('.notion-editor')).toBeVisible()

  await page.locator('.notion-editor p').last().click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/table')
  await page.keyboard.press('Enter')
  await expect(page.locator('.notion-editor table')).toBeVisible()

  await page.locator('.notion-editor table td').first().click()
  const toolbar = page.locator('.table-toolbar')
  await expect(toolbar).toBeVisible()
  const box = await toolbar.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(320.5)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
})

test('mobile image toolbar stays inside the viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/harness.html')
  await expect(page.locator('.notion-editor')).toBeVisible()

  const image = await makeJpeg(page, testInfo, 'small')
  await insertImageWithSlash(page, image)
  await expect(page.locator('.image-block img')).toBeVisible()
  await page.locator('.image-block img').click()
  const toolbar = page.locator('.image-toolbar')
  await expect(toolbar).toBeVisible()
  const box = await toolbar.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(320.5)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
})

test('sidebar drag nests a page and rejects cycles', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.tree-row').filter({ hasText: 'Design notes' })).toBeVisible()

  const design = page.locator('.tree-row').filter({ hasText: 'Design notes' }).first()
  const blocks = page.locator('.tree-row').filter({ hasText: 'Blocks & shortcuts' }).first()
  await design.dragTo(blocks, { targetPosition: { x: 24, y: 14 } })

  await expect
    .poll(async () => {
      return page
        .locator('.tree-row')
        .filter({ hasText: 'Design notes' })
        .first()
        .evaluate((row) => Number.parseInt((row as HTMLElement).style.paddingLeft, 10))
    })
    .toBe(34)

  // Moving the parent under its own child must be rejected by the store.
  const movedDesign = page.locator('.tree-row').filter({ hasText: 'Design notes' }).first()
  const movedBlocks = page.locator('.tree-row').filter({ hasText: 'Blocks & shortcuts' }).first()
  await movedBlocks.dragTo(movedDesign, { targetPosition: { x: 24, y: 14 } })
  await expect
    .poll(async () => {
      return page
        .locator('.tree-row')
        .filter({ hasText: 'Blocks & shortcuts' })
        .first()
        .evaluate((row) => Number.parseInt((row as HTMLElement).style.paddingLeft, 10))
    })
    .toBe(20)
})
