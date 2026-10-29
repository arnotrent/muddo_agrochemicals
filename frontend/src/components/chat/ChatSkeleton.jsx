/** Shown while a conversation's first messages load (instead of the misleading "No messages yet"). */
export default function ChatSkeleton() {
  const rows = [['w-[52%]', ''], ['w-[38%]', 'self-end'], ['w-[62%]', ''], ['w-[30%]', 'self-end'], ['w-[46%]', '']]
  return (
    <div className="flex flex-col gap-3 animate-pulse" aria-busy="true" aria-label="Loading messages">
      {rows.map(([w, side], i) => <div key={i} className={`h-11 rounded-2xl bg-bg-alt border border-border ${w} ${side}`} />)}
    </div>
  )
}
