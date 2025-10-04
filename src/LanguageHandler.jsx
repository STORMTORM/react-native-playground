import { VscFileCode, VscJson } from 'react-icons/vsc'
import { SiJavascript, SiTypescript, SiCss3, SiHtml5, SiMarkdown } from 'react-icons/si'

// Return a monaco language id from a filename
export function getLanguageFromName(name) {
  if (!name) return 'text'
  if (name.endsWith('.json')) return 'json'
  if (name.endsWith('.ts')) return 'typescript'
  if (name.endsWith('.tsx')) return 'typescript'
  if (name.endsWith('.jsx')) return 'javascript'
  if (name.endsWith('.css')) return 'css'
  if (name.endsWith('.html')) return 'html'
  if (name.endsWith('.md')) return 'markdown'
  return 'javascript'
}

// Note: boilerplate generation removed — this module only exposes language and icon helpers.

// Return a React icon component for a filename
export function getIconForName(name) {
  const n = name || ''
  if (n.endsWith('.json')) return VscJson
  if (n.endsWith('.js')) return SiJavascript
  if (n.endsWith('.ts') || n.endsWith('.tsx')) return SiTypescript
  if (n.endsWith('.css')) return SiCss3
  if (n.endsWith('.html')) return SiHtml5
  if (n.endsWith('.md')) return SiMarkdown
  return VscFileCode
}

export default {
  getLanguageFromName,
  getIconForName,
}
