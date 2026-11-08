import { expect, test } from '@playwright/test'

const PRESETS = [
  {
    key: 'core',
    expected: 14,
    includes: ['Text', 'Callout', 'Image', 'Table', 'Page'],
    excludes: [
      'Code',
      'Chart',
      'Video',
      'Audio',
      'Iframe',
      'Bookmark',
      'Math',
      'Mermaid',
      'Table of contents',
    ],
  },
  {
    key: 'standard',
    expected: 19,
    includes: [
      'Code',
      'Chart',
      'Video',
      'Bookmark',
      'Table of contents',
    ],
    excludes: ['Audio', 'Iframe', 'Math', 'Mermaid'],
  },
  {
    key: 'core-external',
    expected: 14,
    includes: ['Text', 'Callout', 'Image', 'Table', 'Page'],
    excludes: [
      'Code',
      'Chart',
      'Video',
      'Audio',
      'Iframe',
      'Bookmark',
      'Math',
      'Mermaid',
      'Table of contents',
    ],
  },
  {
    key: 'standard-external',
    expected: 19,
    includes: [
      'Code',
      'Chart',
      'Video',
      'Bookmark',
      'Table of contents',
    ],
    excludes: ['Audio', 'Iframe', 'Math', 'Mermaid'],
  },
]

for (const preset of PRESETS) {
  test(`${preset.key} preset renders and registers only its blocks`, async ({
    page,
  }) => {
    await page.goto(`/preset-harness.html?preset=${preset.key}`)

    const root = page.locator(`.preset-harness[data-preset="${preset.key}"]`)
    await expect(root.locator('.notion-page')).toBeVisible()
    await expect(root.locator('.notion-page-title')).toHaveValue('Preset harness')
    await expect(root.locator('.notion-editor')).toContainText('Preset editor body.')

    // The 1.5 s idle preload must respect the preset. A core/standard editor
    // must not fetch Mermaid or the KaTeX math dialog in the background.
    await page.waitForTimeout(1900)
    const resources = await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .map((entry) => entry.name)
        .filter((name) => name.includes('Dialog') || name.includes('mermaid')),
    )
    expect(resources.some((name) => name.includes('/MermaidDialog.tsx'))).toBe(false)
    expect(resources.some((name) => name.includes('/MathDialog.tsx'))).toBe(false)

    await root.locator('.notion-editor p').last().click()
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await page.keyboard.type('/')
    await expect(page.locator('.slash-menu')).toBeVisible()

    const titles = await page.locator('.slash-menu__title').allInnerTexts()
    expect(titles).toHaveLength(preset.expected)
    for (const title of preset.includes) expect(titles).toContain(title)
    for (const title of preset.excludes) expect(titles).not.toContain(title)
  })
}
