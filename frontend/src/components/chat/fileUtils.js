export const MAX_FILE_BYTES = 25 * 1024 * 1024
export const MAX_FILES = 10
export const ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.txt,.xls,.xlsx,.csv,.ppt,.pptx,.mp4,.mov,.webm,.mp3,.wav,.m4a,.ogg,.zip'
const ALLOWED = new Set(ACCEPT.replace(/\./g, '').split(','))

export const extOf = (name = '') => (name.includes('.') ? name.split('.').pop().toLowerCase() : '')

export function formatSize(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const CAT_BY_EXT = {
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image',
  pdf: 'document', doc: 'document', docx: 'document', txt: 'document',
  xls: 'spreadsheet', xlsx: 'spreadsheet', csv: 'spreadsheet',
  ppt: 'presentation', pptx: 'presentation',
  mp4: 'video', mov: 'video', webm: 'video',
  mp3: 'audio', wav: 'audio', m4a: 'audio', ogg: 'audio', zip: 'archive',
}
export const categoryOf = (name) => CAT_BY_EXT[extOf(name)] || 'other'

export const KIND = {
  image: { icon: 'image', label: 'Image' },
  document: { icon: 'file', label: 'Document' },
  spreadsheet: { icon: 'table', label: 'Spreadsheet' },
  presentation: { icon: 'slides', label: 'Presentation' },
  video: { icon: 'film', label: 'Video' },
  audio: { icon: 'music', label: 'Audio attachment' },
  archive: { icon: 'archive', label: 'Archive' },
  other: { icon: 'file', label: 'File' },
}

export function kindLabel(att) {
  const e = att.extension || extOf(att.name)
  if (['doc', 'docx'].includes(e)) return 'Word Document'
  if (e === 'pdf') return 'PDF'
  if (e === 'txt') return 'Text file'
  return KIND[att.category]?.label || 'File'
}

/** Instant client-side feedback; the server re-validates everything (magic bytes, size, type). */
export function precheck(file) {
  const ext = extOf(file.name)
  if (!ALLOWED.has(ext)) return `File type not supported — "${file.name}" cannot be uploaded.`
  if (file.size > MAX_FILE_BYTES) return `File too large — "${file.name}" is over the ${MAX_FILE_BYTES / 1024 / 1024} MB limit.`
  if (file.size === 0) return `"${file.name}" is empty.`
  return null
}

export const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
export const formatDate = (iso) => new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })
export function listTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString() ? formatTime(iso) : d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}
