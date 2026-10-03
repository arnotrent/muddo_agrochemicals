import { useEffect, useState } from 'react'
import { messagingApi } from '../../api/services'
import ChatIcon from './ChatIcon'
import { formatDate, formatSize, kindLabel, KIND } from './fileUtils'
import { downloadAttachment } from './useAttachmentUrl'

const TABS = [['', 'All'], ['images', 'Images'], ['documents', 'Documents'], ['spreadsheets', 'Spreadsheets'], ['videos', 'Videos'], ['other', 'Other']]
const EXTS = [['', 'All file types'], ['pdf', 'PDF'], ['docx', 'Word'], ['xlsx', 'Excel'], ['csv', 'CSV'], ['jpg', 'JPG'], ['png', 'PNG'], ['mp4', 'MP4'], ['zip', 'ZIP']]

/**
 * Shared Files gallery. scope = current conversation ({id, role}) or null for "all my conversations".
 * Search by filename/type, filter by category, sort, grid/list.
 */
export default function SharedFilesPanel({ scope, title = 'Shared files', onOpen, onClose, embedded = false }) {
  const [tab, setTab] = useState('')
  const [q, setQ] = useState('')
  const [ext, setExt] = useState('')
  const [sort, setSort] = useState('date_desc')
  const [view, setView] = useState('grid')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    setLoading(true)
    const t = setTimeout(() => {
      const params = { type: tab || undefined, sort, q: ext || q || undefined }
      if (scope) { params.with_id = scope.id; params.with_role = scope.role }
      messagingApi.files(params).then(({ data }) => live && setFiles(data.files)).catch(() => live && setFiles([])).finally(() => live && setLoading(false))
    }, 200)
    return () => { live = false; clearTimeout(t) }
  }, [tab, q, ext, sort, scope?.id, scope?.role]) // eslint-disable-line

  const body = (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="p-3 border-b border-border flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <ChatIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search files" placeholder="Search by file name…" className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-bg-input text-sm text-text-1 outline-none focus:border-accent-blue" />
        </div>
        <select value={ext} onChange={(e) => setExt(e.target.value)} aria-label="Filter by file type" className="px-2.5 py-2 rounded-lg border border-border bg-bg-input text-sm text-text-1">{EXTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort files" className="px-2.5 py-2 rounded-lg border border-border bg-bg-input text-sm text-text-1">
          <option value="date_desc">Newest first</option><option value="date_asc">Oldest first</option><option value="name">Name A–Z</option><option value="size">Largest first</option>
        </select>
        <div className="flex border border-border rounded-lg overflow-hidden">
          {[['grid', 'grid'], ['list', 'list']].map(([v, i]) => <button key={v} type="button" aria-label={`${v} view`} aria-pressed={view === v} onClick={() => setView(v)} className={`w-9 h-9 flex items-center justify-center ${view === v ? 'bg-accent-blue text-white' : 'text-text-2'}`}><ChatIcon name={i} /></button>)}
        </div>
      </div>
      <div className="px-3 py-2 flex gap-1.5 overflow-x-auto border-b border-border" role="tablist">
        {TABS.map(([v, l]) => <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${tab === v ? 'bg-accent-blue text-white' : 'bg-bg-alt text-text-2'}`}>{l}</button>)}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {loading ? <div className="text-center text-text-3 text-sm py-10">Loading…</div>
          : !files.length ? (
            <div className="text-center py-12 text-text-3"><ChatIcon name="file" size="2.5rem" className="mx-auto mb-2 opacity-50 block" /><div className="font-bold text-text-2">No shared files</div><div className="text-sm">Files shared in this conversation will appear here.</div></div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {files.map((f) => (
                <button key={f.id} onClick={() => onOpen(f, files)} className="text-left bg-bg-card border border-border rounded-xl overflow-hidden hover:border-accent-blue transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-blue">
                  <div className="aspect-[4/3] bg-bg-alt flex items-center justify-center overflow-hidden">
                    {f.category === 'image' ? <img src={f.url} alt={f.name} loading="lazy" className="w-full h-full object-cover" /> : <ChatIcon name={KIND[f.category]?.icon || 'file'} size="2rem" className="text-accent-blue" />}
                  </div>
                  <div className="p-2"><div className="text-xs font-bold text-text-1 truncate">{f.name}</div><div className="text-[0.66rem] text-text-3">{formatSize(f.size)} · {formatDate(f.uploaded_at)}</div></div>
                </button>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {files.map((f) => (
                <li key={f.id} className="flex items-center gap-3 py-2">
                  <button onClick={() => onOpen(f, files)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                    <span className="w-9 h-9 rounded-lg bg-bg-alt text-accent-blue flex items-center justify-center flex-shrink-0"><ChatIcon name={KIND[f.category]?.icon || 'file'} /></span>
                    <span className="min-w-0"><span className="block text-sm font-semibold text-text-1 truncate">{f.name}</span><span className="block text-xs text-text-3">{kindLabel(f)} · {formatSize(f.size)} · {f.uploaded_by_name} · {formatDate(f.uploaded_at)}</span></span>
                  </button>
                  <button onClick={() => downloadAttachment(f)} aria-label={`Download ${f.name}`} className="w-8 h-8 rounded-full hover:bg-bg-alt text-text-2 flex items-center justify-center"><ChatIcon name="download" /></button>
                </li>
              ))}
            </ul>
          )}
      </div>
    </div>
  )

  if (embedded) return body
  return (
    <div className="fixed inset-0 z-[3500] bg-black/55 flex items-center justify-center p-3 sm:p-6 animate-viewerIn" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-bg-card rounded-2xl w-full max-w-[760px] h-[min(640px,90vh)] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between"><h3 className="font-bold text-text-1">{title}</h3><button onClick={onClose} aria-label="Close" className="text-text-3"><ChatIcon name="x" size="1.2rem" /></button></div>
        {body}
      </div>
    </div>
  )
}
