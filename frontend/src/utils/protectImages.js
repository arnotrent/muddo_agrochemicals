// Casual "save the picture" deterrents: no right-click menu and no drag-out on images (add data-allow-save to opt out).
// This cannot stop a screenshot — it just stops one-click saving of people's profile photos.
const block = (e) => {
  const t = e.target
  if (t && t.tagName === 'IMG' && !t.closest('[data-allow-save]')) e.preventDefault()
}
export function protectImages() {
  document.addEventListener('contextmenu', block)
  document.addEventListener('dragstart', block)
}
