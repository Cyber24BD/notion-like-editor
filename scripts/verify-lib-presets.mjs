import fs from 'node:fs'

const read = (file) => fs.readFileSync(`dist-lib/${file}`)
const failures = []

const full = read('index.js').length
const core = read('core.js').length
const standard = read('standard.js').length
const fullExternal = read('external/index.js').length
const coreExternal = read('core-external/index.js').length
const standardExternal = read('standard-external/index.js').length
const fullCss = read('notion-editor.css').length
const coreCss = read('core.css').length
const standardCss = read('standard.css').length

if (!(core < full)) failures.push('core bundle is not smaller than full')
if (!(coreExternal < fullExternal)) failures.push('core external is not smaller than full external')
if (!(standardExternal < fullExternal)) failures.push('standard external is not smaller than full external')
if (!(coreCss < fullCss)) failures.push('core CSS is not smaller than full CSS')
if (!(standardCss < fullCss)) failures.push('standard CSS is not smaller than full CSS')

if (failures.length > 0) {
  console.error(`Preset verification failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}

console.log(
  `Presets verified: full ${Math.round(full / 1024)} KB / core ${Math.round(core / 1024)} KB / standard ${Math.round(standard / 1024)} KB; ` +
    `external full ${Math.round(fullExternal / 1024)} KB / core ${Math.round(coreExternal / 1024)} KB / standard ${Math.round(standardExternal / 1024)} KB.`,
)
