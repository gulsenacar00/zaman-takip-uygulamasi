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
        aria-label="Tamamlandı olarak işaretle"
      />

      {editing ? (
        <div className="flex-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(note.content)
                setEditing(false)
              }}
              className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : (
        <p
          className={`flex-1 whitespace-pre-wrap text-sm ${
            note.is_done ? 'text-slate-400 line-through' : 'text-slate-800'
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
            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            Düzenle
          </button>
          <button
            type="button"
            onClick={() => onDelete(note.id)}
            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-rose-50 hover:text-rose-700"
          >
            Sil
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
      <form onSubmit={addNote} className="rounded-xl border border-slate-200 bg-white p-4">
        <label htmlFor="new-note" className="text-sm font-semibold text-slate-800">
          Yeni not / yapılacak
        </label>
        <textarea
          id="new-note"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(e)
          }}
          rows={3}
          placeholder="Aklınızdakini yazın… (Ctrl+Enter ile ekleyin)"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
        >
          Ekle
        </button>
      </form>

      {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Yükleniyor…</p>
      ) : notes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          Henüz not yok.
        </p>
      ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <header className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800">
            {openCount} açık · {notes.length - openCount} tamamlandı
          </header>
          <ul className="divide-y divide-slate-100">
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
