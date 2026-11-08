import { expect, test } from '@playwright/test'
import {
  dropImages,
  insertImageWithSlash,
  makeJpeg,
} from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/harness.html')
  await expect(page.locator('.notion-editor')).toBeVisible()
  await expect(page.getByTestId('harness-status')).toContainText('Ready: yes')
})

test('controlled value applies external content without remounting', async ({
  page,
}) => {
  await page.evaluate(() => {
    ;(window as unknown as { __pm?: Element | null }).__pm =
      document.querySelector('.ProseMirror')
  })

  await page.getByRole('button', { name: 'External update' }).click()

  await expect(page.locator('.notion-editor')).toContainText('Loaded externally')
  await expect(page.locator('.notion-editor')).toContainText(
    'No remount happened.',
  )
  await expect(page.locator('.page-title')).toHaveValue('Harness document')

  const sameEditor = await page.evaluate(() => {
    const host = window as unknown as { __pm?: Element | null }
    return host.__pm === document.querySelector('.ProseMirror')
  })
  expect(sameEditor).toBe(true)
})

test('ref setContent updates the controlled document', async ({ page }) => {
  await page.getByRole('button', { name: 'Ref set' }).click()

  await expect(page.locator('.notion-editor')).toContainText('Set by ref')
  await expect(page.locator('.notion-editor')).toContainText('Imperative update.')

  await page.getByRole('button', { name: 'Capture state' }).click()
  const state = await page.evaluate(
    () =>
      (
        window as unknown as {
          __harnessState?: {
            empty: boolean
            json: { content?: Array<{ content?: Array<{ text?: string }> }> }
          }
        }
      ).__harnessState,
  )

  expect(state?.empty).toBe(false)
  expect(state?.json.content?.[0].content?.[0].text).toBe('Set by ref')
})

test('failed upload shows inline retry, succeeds, and is undoable', async ({
  page,
}, testInfo) => {
  const file = await makeJpeg(page, testInfo, 'small')
  await page.getByRole('button', { name: 'Fail next upload' }).click()
  await insertImageWithSlash(page, file)

  const overlay = page.locator('.image-upload-overlay')
  await expect(overlay).toBeVisible()
  await expect(overlay).toContainText(/Preparing image|Uploading/)
  await expect(overlay).toContainText('Upload failed', { timeout: 15_000 })
  await expect(overlay).toContainText('Simulated upload failure')
  await expect(overlay.getByRole('button', { name: 'Retry' })).toBeVisible()

  await overlay.getByRole('button', { name: 'Retry' }).click()
  await expect(overlay).toHaveCount(0, { timeout: 20_000 })
  await expect(page.locator('.image-block img')).toHaveAttribute(
    'src',
    /^data:image\/jpeg/,
  )

  await page.getByRole('button', { name: 'Capture state' }).click()
  const state = await page.evaluate(
    () =>
      (
        window as unknown as {
          __harnessState?: {
            json: {
              content?: Array<{
                type?: string
                attrs?: Record<string, unknown>
              }>
            }
          }
        }
      ).__harnessState,
  )
  const images =
    state?.json.content?.filter((node) => node.type === 'image') ?? []
  expect(images).toHaveLength(1)
  expect(images[0].attrs).toMatchObject({ src: expect.stringMatching(/^data:/) })
  expect(images[0].attrs?.uploadState).toBeUndefined()
  expect(images[0].attrs?.uploadPreview).toBeUndefined()

  const uploads = await page.evaluate(
    () =>
      (
        window as unknown as {
          __harness?: { uploads: Array<{ failed: boolean }> }
        }
      ).__harness?.uploads ?? [],
  )
  expect(uploads).toHaveLength(2)
  expect(uploads[0].failed).toBe(true)
  expect(uploads[1].failed).toBe(false)

  await page.locator('.notion-editor p').last().click()
  await page.keyboard.press('Control+z')
  await expect(page.locator('.image-block')).toHaveCount(0)
  await page.locator('.notion-editor p').last().click()
  await page.keyboard.press('Control+y')
  await expect(page.locator('.image-block')).toHaveCount(1)
  await expect(page.locator('.image-upload-overlay')).toHaveCount(0)
  await expect(page.locator('.image-block img')).toHaveAttribute(
    'src',
    /^data:image\/jpeg/,
  )
})

test('cancel removes the placeholder and aborts the upload', async ({
  page,
}, testInfo) => {
  const file = await makeJpeg(page, testInfo, 'small')
  await insertImageWithSlash(page, file)

  const overlay = page.locator('.image-upload-overlay')
  await expect(overlay).toBeVisible()
  await expect(overlay).toContainText(/Preparing image|Uploading/)
  await overlay.getByRole('button', { name: 'Cancel' }).click()

  await expect(overlay).toHaveCount(0)
  await expect(page.locator('.image-block')).toHaveCount(0)
  await expect(page.getByTestId('harness-status')).not.toContainText('Error:')

  const uploads = await page.evaluate(
    () =>
      (
        window as unknown as {
          __harness?: { uploads: unknown[] }
        }
      ).__harness?.uploads ?? [],
  )
  expect(uploads.length).toBeLessThanOrEqual(1)
})

test('image queue runs at most three jobs at once', async ({
  page,
}, testInfo) => {
  const file = await makeJpeg(page, testInfo, 'small')
  await dropImages(page, file, 7)

  await expect(page.locator('.image-block')).toHaveCount(7, {
    timeout: 10_000,
  })
  await page.waitForTimeout(120)

  const during = await page.evaluate(
    () => ({
      states: [...document.querySelectorAll('.image-block')].map((block) =>
        block.getAttribute('data-upload-state'),
      ),
      maxActive:
        (
          window as unknown as {
            __harness?: { maxActive: number }
          }
        ).__harness?.maxActive ?? 0,
    }),
  )
  expect(during.states.filter((state) => state === 'uploading')).toHaveLength(3)
  expect(during.states.filter((state) => state === 'queued')).toHaveLength(4)
  expect(during.maxActive).toBeLessThanOrEqual(3)

  await expect(page.locator('.image-upload-overlay')).toHaveCount(0, {
    timeout: 30_000,
  })
  await expect(page.locator('.image-block')).toHaveCount(7)
  const final = await page.evaluate(
    () => ({
      maxActive:
        (
          window as unknown as {
            __harness?: { maxActive: number }
          }
        ).__harness?.maxActive ?? 0,
      allLocal: [...document.querySelectorAll<HTMLImageElement>('.image-block img')].every((img) =>
        img.src.startsWith('data:image/'),
      ),
    }),
  )
  expect(final.maxActive).toBeLessThanOrEqual(3)
  expect(final.allLocal).toBe(true)
})

test('local fallback shows the same placeholder and compresses to WebP', async ({
  page,
}, testInfo) => {
  await page.getByRole('button', { name: 'Use local storage' }).click()
  await expect(page.getByTestId('harness-status')).toContainText('Mode: local')

  const file = await makeJpeg(page, testInfo, 'large')
  await insertImageWithSlash(page, file)

  const overlay = page.locator('.image-upload-overlay')
  await expect(overlay).toBeVisible()
  await expect(overlay).toContainText(/Preparing image|Waiting/)
  await expect(overlay).toHaveCount(0, { timeout: 30_000 })
  await expect(page.locator('.image-block img')).toHaveAttribute(
    'src',
    /^data:image\/webp/,
  )

  const bytes = await page.evaluate(() => {
    const image = document.querySelector<HTMLImageElement>('.image-block img')
    const base64 = image?.src.split(',')[1] ?? ''
    return base64 ? atob(base64).length : 0
  })
  expect(bytes).toBeGreaterThan(0)
  expect(bytes).toBeLessThanOrEqual(200 * 1024)

  const uploads = await page.evaluate(
    () =>
      (
        window as unknown as {
          __harness?: { uploads: unknown[] }
        }
      ).__harness?.uploads ?? [],
  )
  expect(uploads).toHaveLength(0)
})
