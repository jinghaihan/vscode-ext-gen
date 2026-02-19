import type { GenerateOptions, GenerateResult } from './types'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { glob } from 'tinyglobby'

export async function processLocale(options: GenerateOptions, generateResult: GenerateResult): Promise<GenerateResult> {
  const { cwd = process.cwd(), locale } = options
  const files = await glob(`package.nls.*.json`, {
    cwd,
    onlyFiles: true,
  })
  const choices = files.map(file => path.basename(file, '.json').replace('package.nls.', ''))

  if (locale === true) {
    const nlsFileIsExists = await fs.stat(path.resolve(cwd, 'package.nls.json'))
      .then(stat => stat.isFile())
      .catch(() => false)
    if (nlsFileIsExists)
      return await applyLocaleStrings(options, generateResult)
    else
      throw new Error(`package.nls.json not found, available locales: ${choices.join(', ')}`)
  }

  if (choices.includes(locale!))
    return await applyLocaleStrings(options, generateResult)
  else
    throw new Error(`${locale} locale not found, available locales: ${choices.join(', ')}`)
}

async function applyLocaleStrings(options: GenerateOptions, generateResult: GenerateResult): Promise<GenerateResult> {
  const cwd = options.cwd ?? process.cwd()
  const filepath = typeof options.locale === 'string'
    ? path.resolve(cwd, `package.nls.${options.locale}.json`)
    : path.resolve(cwd, 'package.nls.json')
  const messages: Record<string, string> = JSON.parse(await fs.readFile(filepath, 'utf-8'))

  let replacedDts = generateResult.dts
  Object.entries(messages).forEach(([msgKey, msgValue]: [string, string]) => {
    const regex = new RegExp(`%${msgKey}%`, 'g')
    replacedDts = replacedDts.replace(regex, msgValue)
    Object.entries(generateResult.markdown).forEach(([key, content]) => {
      generateResult.markdown[key as keyof typeof generateResult.markdown] = content.replace(regex, msgValue)
    })
  })

  return { dts: replacedDts, markdown: generateResult.markdown }
}
