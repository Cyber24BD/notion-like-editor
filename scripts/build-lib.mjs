import { build } from 'vite'

const run = async (configFile) => {
  await build({ configFile })
}

await run('vite.lib.config.ts')
await run('vite.lib.external.config.ts')

for (const preset of ['core', 'standard']) {
  process.env.PRESET = preset

  process.env.EXTERNAL = '0'
  await run('vite.lib.preset.config.ts')

  process.env.EXTERNAL = '1'
  await run('vite.lib.preset.config.ts')
}
