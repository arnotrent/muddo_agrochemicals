import ChatIcon from './ChatIcon'
import { formatSize, kindLabel, KIND } from './fileUtils'
import { useAttachmentUrl, downloadAttachment } from './useAttachmentUrl'

function Thumb({ att, onOpen, more, className = '' }) {
  const [url, refresh] = useAttachmentUrl(att)
  return (
    <button type="button" onClick={onOpen} aria-label={`Open image ${att.name}`}
      className={`relative overflow-hidden rounded-lg bg-black/10 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-blue ${className}`}>
      <img src={url} alt={att.name} loading="lazy" onError={refresh} className="w-full h-full object-cover" />
      {more > 0 && <span className="absolute inset-0 bg-black/55 text-white text-xl font-bold flex items-center justify-center">+{more} more</span>}
    </button>
  )
}

/** Images → responsive gallery (max 4 tiles, "+N more"); everything else → file cards. */
export default function MessageAttachments({ attachments, mine, onOpen }) {
  if (!attachments?.length) return null
  const images = attachments.filter((a) => a.category === 'image')
  const files = attachments.filter((a) => a.category !== 'image')
  const shown = images.slice(0, 4)
  const extra = images.length - shown.length

  return (
    <div className="mb-1.5 flex flex-col gap-1.5">
      {shown.length > 0 && (
        <div className={`grid ${shown.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-1 max-w-[300px]`}>
          {shown.map((a, i) => (
            <Thumb key={a.id} att={a} onOpen={() => onOpen(a)} more={i === shown.length - 1 ? extra : 0}
              className={shown.length === 1 ? 'max-h-[260px]' : 'aspect-square'} />
          ))}
        </div>
      )}
      {files.map((a) => (
        <div key={a.id} className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 ${mine ? 'bg-white/15' : 'bg-bg-alt'}`}>
          <button type="button" onClick={() => onOpen(a)} className="flex items-center gap-2.5 min-w-0 flex-1 text-left" aria-label={`Open ${a.name}`}>
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${mine ? 'bg-white/20' : 'bg-bg-card text-accent-blue'}`}>
              <ChatIcon name={KIND[a.category]?.icon || 'file'} size="1.1rem" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold truncate">{a.name}</span>
              <span className="block text-[0.7rem] opacity-75">{kindLabel(a)}{a.size != null ? ` · ${formatSize(a.size)}` : ''}</span>
            </span>
          </button>
          <button type="button" onClick={() => downloadAttachment(a)} aria-label={`Download ${a.name}`}
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${mine ? 'hover:bg-white/20' : 'hover:bg-bg-card text-text-2'}`}>
            <ChatIcon name="download" />
          </button>
        </div>
      ))}
    </div>
  )
}
