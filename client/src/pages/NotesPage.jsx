import { useEffect, useState } from 'react'
import { api } from '../api.js'

function NoteItem({ note, onToggle, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.content)

  async function save() {
    const content = draft.trim()
    if (!content) return
    await onSave(note.id, { content })
    setEditing(false)
  }

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <input
        type="checkbox"
        checked={note.is_done}
        onChange={() => onToggle(note)}
        className="mt-1 size-4 shrink-0 cursor-pointer accent-emerald-600"
        aria-label="Mark as done"
      />

      {editing ? (
        <div className="flex-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none
              focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100
              dark:focus:border-slate-400"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700
                dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(note.content)
                setEditing(false)
              }}
              className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100
                dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p
          className={`flex-1 whitespace-pre-wrap text-sm ${
            note.is_done
              ? 'text-slate-400 line-through dark:text-slate-600'
              : 'text-slate-800 dark:text-slate-100'
          }`}
        >
          {note.content}
        </p>
      )}

      {!editing && (
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => {
              setDraft(note.content)
              setEditing(true)
            }}
            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800
              dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(note.id)}
            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-rose-50 hover:text-rose-700
              dark:text-slate-400 dark:hover:bg-rose-950 dark:hover:text-rose-300"
          >
            Delete
          </button>
        </div>
      )}
    </li>
  )
}

export default function NotesPage() {
  const [notes, setNotes] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/notes')
      .then((data) => setNotes(data.notes))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Tamamlananlar listenin altına iner (sunucudaki sıralamayla aynı mantık).
  const sortNotes = (list) =>
    [...list].sort(
      (a, b) => Number(a.is_done) - Number(b.is_done) || b.created_at.localeCompare(a.created_at)
    )

  async function addNote(event) {
    event.preventDefault()
    const content = draft.trim()
    if (!content) return
    try {
      const data = await api('/notes', { method: 'POST', body: { content } })
      setNotes((prev) => sortNotes([data.note, ...prev]))
      setDraft('')
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function patchNote(id, patch) {
    try {
      const data = await api(`/notes/${id}`, { method: 'PATCH', body: patch })
      setNotes((prev) => sortNotes(prev.map((n) => (n.id === id ? data.note : n))))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function deleteNote(id) {
    try {
      await api(`/notes/${id}`, { method: 'DELETE' })
      setNotes((prev) => prev.filter((n) => n.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  const openCount = notes.filter((n) => !n.is_done).length

  return (
    <div className="space-y-6">
      <form
        onSubmit={addNote}
        className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <label
          htmlFor="new-note"
          className="text-sm font-semibold text-slate-800 dark:text-slate-100"
        >
          New note / to-do
        </label>
        <textarea
          id="new-note"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(e)
          }}
          rows={3}
          placeholder="Write what's on your mind… (Ctrl+Enter to add)"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none
            placeholder:text-slate-400 focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800
            dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700
            disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
        >
          Add
        </button>
      </form>

      {error && (
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          No notes yet.
        </p>
      ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <header className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-100">
            {openCount} open · {notes.length - openCount} done
          </header>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {notes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                onToggle={(n) => patchNote(n.id, { is_done: !n.is_done })}
                onSave={patchNote}
                onDelete={deleteNote}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
