import fs from 'node:fs'
import { expect, type Page, type TestInfo } from '@playwright/test'

export type ImageKind = 'small' | 'large'

export async function makeJpeg(
  page: Page,
  testInfo: TestInfo,
  kind: ImageKind,
): Promise<string> {
  const dataUrl = await page.evaluate(
    (imageKind) => {
      const width = imageKind === 'large' ? 1200 : 600
      const height = imageKind === 'large' ? 900 : 400
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('no 2d context')
      if (imageKind === 'large') {
        const pixels = context.createImageData(width, height)
        for (let index = 0; index < pixels.data.length; index += 4) {
          pixels.data[index] = Math.random() * 255
          pixels.data[index + 1] = Math.random() * 255
          pixels.data[index + 2] = Math.random() * 255
          pixels.data[index + 3] = 255
        }
        context.putImageData(pixels, 0, 0)
      } else {
        const gradient = context.createLinearGradient(0, 0, width, height)
        gradient.addColorStop(0, '#f8d7c4')
        gradient.addColorStop(0.5, '#a8d8ff')
        gradient.addColorStop(1, '#b8f2d0')
        context.fillStyle = gradient
        context.fillRect(0, 0, width, height)
        context.fillStyle = 'rgba(30,40,60,.8)'
        context.font = 'bold 48px sans-serif'
        context.fillText('Harness image', 24, height / 2)
      }
      return canvas.toDataURL(
        'image/jpeg',
        imageKind === 'large' ? 0.92 : 0.75,
      )
    },
    kind,
  )

  const filePath = testInfo.outputPath(`${kind}-${Date.now()}.jpg`)
  fs.writeFileSync(
    filePath,
    Buffer.from(dataUrl.split(',')[1] ?? '', 'base64'),
  )
  return filePath
}

export async function insertImageWithSlash(
  page: Page,
  filePath: string,
): Promise<void> {
  const lastParagraph = page.locator('.notion-editor p').last()
  await lastParagraph.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/image')
  await expect(page.locator('.slash-menu')).toBeVisible()
  const chooserPromise = page.waitForEvent('filechooser')
  await page.keyboard.press('Enter')
  const chooser = await chooserPromise
  await chooser.setFiles(filePath)
}

export async function dropImages(
  page: Page,
  filePath: string,
  count: number,
): Promise<void> {
  const base64 = fs.readFileSync(filePath).toString('base64')
  await page.evaluate(
    ({ data, total }) => {
      const bytes = Uint8Array.from(atob(data), (character) =>
        character.charCodeAt(0),
      )
      const transfer = new DataTransfer()
      for (let index = 0; index < total; index += 1) {
        transfer.items.add(
          new File([bytes], `drop-${index}.jpg`, { type: 'image/jpeg' }),
        )
      }
      const editor = document.querySelector('.notion-editor')
      if (!editor) throw new Error('editor missing')
      const rect = editor.getBoundingClientRect()
      editor.dispatchEvent(
        new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
          clientX: rect.left + 60,
          clientY: rect.top + 40,
        }),
      )
    },
    { data: base64, total: count },
  )
}
