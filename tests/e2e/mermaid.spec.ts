import { expect, test, type Page } from '@playwright/test'

async function openMermaid(page: Page): Promise<void> {
  await page.goto('/harness.html')
  await expect(page.locator('.notion-editor')).toBeVisible()
  await page.locator('.notion-editor p').last().click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/mermaid')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Mermaid diagram' })).toBeVisible()
}

test('every Mermaid template renders without syntax errors or leaked DOM', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openMermaid(page)

  const templates = page.locator('.mermaid-dialog__template')
  await expect(templates).toHaveCount(23)
  const labels = await templates.allInnerTexts()

  for (const label of labels) {
    await page
      .locator('.mermaid-dialog__template')
      .filter({ hasText: label })
      .click()
    const diagram = page.locator(
      '.mermaid-dialog__preview svg[role~="graphics-document"]',
    )
    await expect(diagram).toHaveCount(1)
    await expect(page.locator('.video-dialog__error')).toHaveCount(0)

    const info = await diagram.first().evaluate(
      (svg) => {
        const viewBox = (svg.getAttribute('viewBox') ?? '').split(/\s+/).map(Number)
        return {
          width: viewBox[2] ?? 0,
          height: viewBox[3] ?? 0,
          syntaxError: (svg.textContent ?? '').includes(
            'Syntax error in text',
          ),
        }
      },
    )
    expect(info.width, `${label} width`).toBeGreaterThan(0)
    expect(info.height, `${label} height`).toBeGreaterThan(0)
    expect(info.width, `${label} width`).toBeLessThan(5000)
    expect(info.height, `${label} height`).toBeLessThan(5000)
    expect(info.syntaxError, `${label} syntax`).toBe(false)
    await expect(page.locator('[id^="dmermaid-"]')).toHaveCount(0)
  }

  expect(
    await page.evaluate(() =>
      [...document.querySelectorAll('svg')].some((svg) =>
        (svg.textContent ?? '').includes('Syntax error in text'),
      ),
    ),
  ).toBe(false)
})

test('invalid Mermaid shows a parse error and cleans up error SVGs', async ({
  page,
}) => {
  await openMermaid(page)
  await page.locator('#mermaid-code-input').fill('flowchart TD\n  A-->')

  await expect(page.locator('.video-dialog__error')).toContainText(
    'Parse error on line',
  )
  await expect(page.locator('.mermaid-dialog__preview')).toContainText(
    'Fix the syntax to see the preview.',
  )
  await expect(page.locator('[id^="dmermaid-"]')).toHaveCount(0)
  expect(
    await page.evaluate(() =>
      [...document.querySelectorAll('svg')].some((svg) =>
        (svg.textContent ?? '').includes('Syntax error in text'),
      ),
    ),
  ).toBe(false)
})

test('Mermaid diagram inserts as a block and renders with the dark surface', async ({
  page,
}) => {
  await openMermaid(page)
  await page
    .locator('.mermaid-dialog__template')
    .filter({ hasText: 'Flowchart' })
    .click()
  await page.selectOption('#mermaid-theme-select', 'dark')
  const diagram = page.locator(
      '.mermaid-dialog__preview svg[role~="graphics-document"]',
    )
    await expect(diagram).toHaveCount(1)
  await expect(page.locator('.mermaid-dialog__preview')).toHaveCSS(
    'background-color',
    'rgb(30, 30, 30)',
  )

  await page
    .getByRole('button', { name: /Insert diagram|Update diagram/ })
    .click()
  const block = page.locator('.mermaid-block')
  await expect(block).toBeVisible()
  await expect(block).toHaveAttribute('data-error', 'false')
  await expect(
    block.locator('.mermaid-block__svg svg[role~="graphics-document"]'),
  ).toHaveCount(1)
  await expect(block.locator('.mermaid-block__content')).toHaveCSS(
    'background-color',
    'rgb(30, 30, 30)',
  )
})
