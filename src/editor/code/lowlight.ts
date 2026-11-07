import { createLowlight } from 'lowlight'
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import go from 'highlight.js/lib/languages/go'
import graphql from 'highlight.js/lib/languages/graphql'
import ini from 'highlight.js/lib/languages/ini'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import kotlin from 'highlight.js/lib/languages/kotlin'
import less from 'highlight.js/lib/languages/less'
import markdown from 'highlight.js/lib/languages/markdown'
import php from 'highlight.js/lib/languages/php'
import plaintext from 'highlight.js/lib/languages/plaintext'
import powershell from 'highlight.js/lib/languages/powershell'
import python from 'highlight.js/lib/languages/python'
import ruby from 'highlight.js/lib/languages/ruby'
import rust from 'highlight.js/lib/languages/rust'
import scss from 'highlight.js/lib/languages/scss'
import sql from 'highlight.js/lib/languages/sql'
import swift from 'highlight.js/lib/languages/swift'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

export const lowlight = createLowlight({
  bash,
  c,
  cpp,
  csharp,
  css,
  dockerfile,
  go,
  graphql,
  ini,
  java,
  javascript,
  json,
  kotlin,
  less,
  markdown,
  php,
  plaintext,
  powershell,
  python,
  ruby,
  rust,
  scss,
  sql,
  swift,
  typescript,
  xml,
  yaml,
})

export interface CodeLanguageOption {
  value: string
  label: string
  extension: string
}

export const CODE_LANGUAGES: CodeLanguageOption[] = [
  { value: '', label: 'Auto detect', extension: 'txt' },
  { value: 'plaintext', label: 'Plain text', extension: 'txt' },
  { value: 'bash', label: 'Bash / Shell', extension: 'sh' },
  { value: 'c', label: 'C', extension: 'c' },
  { value: 'cpp', label: 'C++', extension: 'cpp' },
  { value: 'csharp', label: 'C#', extension: 'cs' },
  { value: 'css', label: 'CSS', extension: 'css' },
  { value: 'dockerfile', label: 'Dockerfile', extension: 'dockerfile' },
  { value: 'go', label: 'Go', extension: 'go' },
  { value: 'graphql', label: 'GraphQL', extension: 'graphql' },
  { value: 'ini', label: 'INI', extension: 'ini' },
  { value: 'java', label: 'Java', extension: 'java' },
  { value: 'javascript', label: 'JavaScript', extension: 'js' },
  { value: 'json', label: 'JSON', extension: 'json' },
  { value: 'kotlin', label: 'Kotlin', extension: 'kt' },
  { value: 'less', label: 'Less', extension: 'less' },
  { value: 'markdown', label: 'Markdown', extension: 'md' },
  { value: 'php', label: 'PHP', extension: 'php' },
  { value: 'powershell', label: 'PowerShell', extension: 'ps1' },
  { value: 'python', label: 'Python', extension: 'py' },
  { value: 'ruby', label: 'Ruby', extension: 'rb' },
  { value: 'rust', label: 'Rust', extension: 'rs' },
  { value: 'scss', label: 'SCSS', extension: 'scss' },
  { value: 'sql', label: 'SQL', extension: 'sql' },
  { value: 'swift', label: 'Swift', extension: 'swift' },
  { value: 'typescript', label: 'TypeScript', extension: 'ts' },
  { value: 'xml', label: 'HTML / XML', extension: 'html' },
  { value: 'yaml', label: 'YAML', extension: 'yml' },
]

const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  html: 'xml',
  sh: 'bash',
  shell: 'bash',
  py: 'python',
  md: 'markdown',
  yml: 'yaml',
  'c++': 'cpp',
  'c#': 'csharp',
  docker: 'dockerfile',
  gql: 'graphql',
  ps1: 'powershell',
  text: 'plaintext',
}

export function normalizeLanguage(value: string): string {
  return LANGUAGE_ALIASES[value] ?? value
}

export function languageLabel(value: string | null | undefined): string {
  if (!value) return 'Auto detect'
  const normalized = normalizeLanguage(value)
  return CODE_LANGUAGES.find((language) => language.value === normalized)?.label ?? value
}

export function languageExtension(value: string | null | undefined): string {
  if (!value) return 'txt'
  const normalized = normalizeLanguage(value)
  return CODE_LANGUAGES.find((language) => language.value === normalized)?.extension ?? 'txt'
}
