import { createContext, useContext, useMemo, useState } from 'react'

const SelectionContext = createContext(null)

/**
 * Takvimde seçili olan kaydın kimliği. Blok takvimde çizilir ama özellikler
 * paneli sağ sütunda durduğu için seçim iki bileşenin ortak üstünde tutulur.
 */
export function SelectionProvider({ children }) {
  const [selectedId, setSelectedId] = useState(null)

  const value = useMemo(
    () => ({
      selectedId,
      select: (id) => setSelectedId((current) => (current === id ? null : id)),
      clear: () => setSelectedId(null),
    }),
    [selectedId]
  )

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
}

export function useSelection() {
  const ctx = useContext(SelectionContext)
  if (!ctx) throw new Error('useSelection can only be used inside SelectionProvider.')
  return ctx
}
