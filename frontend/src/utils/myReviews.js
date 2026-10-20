// The private edit links of reviews THIS browser submitted (so the visitor can fix or withdraw them later).
const KEY = 'muddo-my-reviews'
export const loadMine = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
export const saveMine = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 30))) } catch { /* private mode */ } window.dispatchEvent(new Event('myreviews:changed')) }
export const addMine = (kind, token, label) => saveMine([{ kind, token, label, at: Date.now() }, ...loadMine().filter((m) => m.token !== token)])
export const removeMine = (token) => saveMine(loadMine().filter((m) => m.token !== token))
