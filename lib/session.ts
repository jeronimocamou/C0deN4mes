// Anonymous per-browser session id, shared by home and lobby join flows.
export function getOrCreateSessionId(): string {
  let id = localStorage.getItem('session_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('session_id', id)
  }
  return id
}
