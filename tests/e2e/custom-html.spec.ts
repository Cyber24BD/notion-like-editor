import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/harness.html')
  await expect(page.locator('.notion-editor')).toBeVisible()
  await expect(page.getByTestId('harness-status')).toContainText('Ready: yes')
})

async function openCustomHtml(page: import('@playwright/test').Page) {
  await page.locator('.notion-editor p').last().click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/custom html')
  await expect(page.locator('.slash-menu')).toBeVisible()
  await expect(
    page.locator('.slash-menu__title').filter({ hasText: 'Custom HTML' }),
  ).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('dialog', { name: /Custom HTML block|Edit custom block/ }),
  ).toBeVisible()
}

test('custom HTML runs isolated HTML, CSS and JavaScript', async ({ page }) => {
  await openCustomHtml(page)
  const preview = page.frameLocator('.custom-html-dialog iframe')
  await expect(preview.locator('.custom-card')).toBeVisible()
  await expect(preview.locator('#custom-action')).toContainText('Clicked 0 times')

  await preview.locator('#custom-action').click()
  await expect(preview.locator('#custom-action')).toContainText('Clicked 1 time')

  const isolated = await preview.locator('body').evaluate(() => {
    try {
      void window.parent.document
      return 'leaked'
    } catch {
      return 'isolated'
    }
  })
  expect(isolated).toBe('isolated')

  const sandbox = await page.locator('.custom-html-dialog iframe').getAttribute('sandbox')
  expect(sandbox).toContain('allow-scripts')
  expect(sandbox).not.toContain('allow-same-origin')

  await page.getByRole('tab', { name: 'CSS' }).click()
  await page.getByRole('textbox', { name: 'css code' }).fill(
    '.custom-card { background: rgb(1, 2, 3); }',
  )
  await expect(
    page
      .frameLocator('.custom-html-dialog iframe')
      .locator('.custom-card'),
  ).toHaveCSS('background-color', 'rgb(1, 2, 3)')

  await page.getByRole('tab', { name: 'HTML' }).click()
  await page.getByRole('textbox', { name: 'html code' }).fill(
    '<h1 id="custom-title">Hello custom world</h1>',
  )
  await expect(preview.locator('#custom-title')).toHaveText('Hello custom world')

  await page.getByRole('tab', { name: 'JavaScript' }).click()
  await page.getByRole('textbox', { name: 'javascript code' }).fill(
    "const value = await Promise.resolve('async-ok'); document.body.dataset.async = value",
  )
  await expect(preview.locator('body')).toHaveAttribute('data-async', 'async-ok')
})

test('custom HTML inserts an auto-sized block and supports preview/edit', async ({
  page,
}) => {
  await openCustomHtml(page)
  await page.getByRole('button', { name: 'Insert block' }).click()

  const block = page.locator('.custom-html-block')
  await expect(block).toBeVisible()
  const frame = block.locator('iframe')
  await expect(frame).toHaveCount(1)
  await expect(frame).toHaveAttribute('sandbox', /allow-scripts/)
  await expect(block.locator('iframe')).not.toHaveAttribute(
    'sandbox',
    /allow-same-origin/,
  )

  const height = await frame.evaluate((element) => {
    return (element as HTMLIFrameElement).getBoundingClientRect().height
  })
  expect(height).toBeGreaterThan(100)

  await block.hover()
  await page.getByRole('button', { name: 'Preview custom HTML' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Custom HTML preview' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Close custom HTML preview' })
    .click()

  await block.hover()
  await page.getByRole('button', { name: 'Edit custom HTML' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Edit custom block' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
})

test('custom HTML reports script errors without breaking the block', async ({
  page,
}) => {
  await openCustomHtml(page)
  await page.getByRole('tab', { name: 'JavaScript' }).click()
  await page.getByRole('textbox', { name: 'javascript code' }).fill(
    "throw new Error('custom boom')",
  )
  await expect(page.locator('.custom-html-preview-panel__error')).toContainText(
    'custom boom',
  )
  await expect(page.locator('.custom-html-dialog iframe')).toBeVisible()
})
