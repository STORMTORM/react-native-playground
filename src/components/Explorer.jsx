import { VscNewFile } from 'react-icons/vsc'
import { getIconForName } from '../LanguageHandler'
import { useState, useRef, useEffect } from 'react'

function Explorer({ files, activeId, onOpenFile, onNewFile, onUpdateFileName }) {
  const [renamingId, setRenamingId] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (renamingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [renamingId])

  // if App marks a file as isNew, automatically start renaming that file
  useEffect(() => {
    const newFile = files.find((f) => f.isNew)
    if (newFile) {
      setRenamingId(newFile.id)
      setInputValue(newFile.name || '')
    }
  }, [files])

  const handleContextMenu = (e, id, currentName) => {
    e.preventDefault()
    setRenamingId(id)
    setInputValue(currentName || '')
  }

  const startRename = (id, currentName) => {
    setRenamingId(id)
    setInputValue(currentName || '')
  }

  const commitRename = (id, value) => {
    const finalName = value && value.trim() ? value.trim() : 'untitled-document'
    onUpdateFileName(id, finalName)
    setRenamingId(null)
    setInputValue('')
  }

  const cancelRename = (id) => {
    // keep existing name but ensure non-empty
    const f = files.find((x) => x.id === id)
    const finalName = (f && f.name && f.name.trim()) ? f.name.trim() : 'untitled-document'
    onUpdateFileName(id, finalName)
    setRenamingId(null)
    setInputValue('')
  }

  return (
    <div className="min-w-52 bg-black border-r border-[#3C3C3C] flex flex-col h-full select-none">
      <div className="flex items-center justify-between px-3 py-2 border-y border-[#3C3C3C]">
        <div className="text-sm uppercase tracking-wider text-[#D4D4D4]/70">Explorer</div>
        <button onClick={onNewFile} className="px-1 text-white text-lg font-bold flex rounded-lg items-center gap-1">
          +
        </button>
      </div>
      <div className="flex-1 overflow-auto py-2">
        {files.map((f) => {
          const name = f.name || ''
          const Icon = getIconForName(name)
          const active = activeId === f.id
          return (
            <div key={f.id} className={`w-full px-3 py-1.5`}> 
              {renamingId === f.id ? (
                <input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(f.id, inputValue)
                    else if (e.key === 'Escape') cancelRename(f.id)
                  }}
                  onBlur={() => commitRename(f.id, inputValue)}
                  className="w-full bg-gray-700 border rounded-lg border-white text-sm px-2 py-1 text-white"
                />
              ) : (
                <button
                  onClick={() => onOpenFile(f.id)}
                  onContextMenu={(e) => handleContextMenu(e, f.id, f.name)}
                  onDoubleClick={() => startRename(f.id, f.name)}
                  className={`w-full rounded-xl flex items-center gap-2 px-2 py-2 text-sm text-white ${active ? 'bg-gray-700' : ''}`}
                >
                  <Icon className="opacity-100" /> {f.name || 'untitled-document'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Explorer