export function defaultName(name) {
  const n = name && name.trim() ? name.trim() : 'untitled-document'
  return n
}

export function ensureFileHasContent(file) {
  // placeholder: currently we don't auto-generate boilerplate
  return file
}
