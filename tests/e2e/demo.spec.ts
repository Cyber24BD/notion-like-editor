import { expect, test } from '@playwright/test'

test('demo page switching keeps saved content', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.notion-editor')).toBeVisible()
  await expect(page.locator('.notion-page-title')).toHaveValue('Getting started')
  await expect(page.locator('.notion-editor')).toContainText(
    'Select any text to reveal the toolbar',
  )

  await page
    .locator('.tree-label', { hasText: 'Blocks & shortcuts' })
    .click()
  await expect(page.locator('.notion-page-title')).toHaveValue('Blocks & shortcuts')
  await expect(page.locator('.notion-editor')).toContainText('Handy shortcuts')

  await page.locator('.tree-label', { hasText: 'Getting started' }).click()
  await expect(page.locator('.notion-page-title')).toHaveValue('Getting started')
  await expect(page.locator('.notion-editor')).toContainText(
    'Select any text to reveal the toolbar',
  )
})

test('demo can create a chart block from the slash menu', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.notion-editor')).toBeVisible()

  const scroll = page.locator('.notion-page-scroll')
  await scroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await page.locator('.notion-editor p').last().click()
  await page.keyboard.press('Enter')
  await page.keyboard.type('/chart')
  await expect(page.locator('.slash-menu')).toBeVisible()
  await page.keyboard.press('Enter')

  await expect(page.locator('.chart-block')).toBeVisible()
  await expect(page.locator('.chart-block svg')).toBeVisible()
})
