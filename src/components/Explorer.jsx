import { getIconForName } from '../LanguageHandler'
import { useState, useRef, useEffect, useMemo } from 'react'

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

  // Build a nested tree from file paths like "components/Button.js"
  const tree = useMemo(() => {
    const root = { type: 'dir', name: '', children: {} }
    for (const f of files) {
      const parts = (f.name || '').split('/').filter(Boolean)
      let node = root
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        const isFile = i === parts.length - 1
        if (isFile) {
          if (!node.children._files) node.children._files = []
          node.children._files.push({ ...f, displayName: part })
        } else {
          if (!node.children[part]) node.children[part] = { type: 'dir', name: part, children: {} }
          node = node.children[part]
        }
      }
      if (parts.length === 0) {
        // files with empty name fallback
        if (!root.children._files) root.children._files = []
        root.children._files.push({ ...f, displayName: f.name || '' })
      }
    }
    return root
  }, [files])

  const [expanded, setExpanded] = useState({})
  const toggleDir = (path) => setExpanded((s) => ({ ...s, [path]: !s[path] }))
  const [selectedFolder, setSelectedFolder] = useState(null)

  // context menu state
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, type: null, id: null, path: null })
  useEffect(() => {
    const onDocClick = () => setContextMenu((c) => (c.visible ? { ...c, visible: false } : c))
    window.addEventListener('click', onDocClick)
    return () => window.removeEventListener('click', onDocClick)
  }, [])

  const openContextMenu = (e, opts) => {
    e.preventDefault()
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, ...opts })
  }

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
    <div className="w-60 bg-black border-r border-[#3C3C3C] flex flex-col h-full select-none">
        <div className="flex items-center justify-between px-3 py-2 border-y border-[#3C3C3C]">
        <div className="text-sm uppercase tracking-wider text-[#D4D4D4]/70">Explorer</div>
        <button onClick={() => onNewFile && onNewFile(selectedFolder)} className="px-1 text-white text-lg font-bold flex rounded-lg items-center gap-1">
          +
        </button>
      </div>
        <div className="flex-1 overflow-auto py-2">
        {/* Recursive render of folders and files */}
        {Object.keys(tree.children).length === 0 && <div className="px-3 text-sm text-[#9CA3AF]">No files</div>}
        {
          // render root files first
          tree.children._files && tree.children._files.map((f) => {
            const Icon = getIconForName(f.name)
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
                  <div className="group relative">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => onOpenFile(f.id)}
                          onDoubleClick={() => startRename(f.id, f.name)}
                          className={`w-full text-left rounded-xl flex items-center gap-2 px-2 py-2 text-sm text-white ${active ? 'bg-gray-700' : ''}`}
                        >
                          <Icon className="opacity-100" /> {f.displayName || f.name || 'untitled-document'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openContextMenu(e, { type: 'file', id: f.id, path: f.name }) }}
                          className="ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white px-2"
                          aria-label="file options"
                        >
                          ⋮
                        </button>
                      </div>
                  </div>
                )}
              </div>
            )
          })
        }

        {/* helper to render directories recursively */}
        {Object.keys(tree.children).filter(k => k !== '_files').map((dirName) => {
          const node = tree.children[dirName]
          const path = dirName
          const isOpen = !!expanded[path]
          const childFiles = node.children._files || []

          return (
            <div key={path} className="w-full">
              <div className="w-full px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <button onClick={() => { toggleDir(path); setSelectedFolder(path) }} className="w-full text-left rounded-xl flex items-center gap-2 px-2 py-2 text-sm text-white bg-gray-800">
                    <span className="font-medium">{dirName}</span>
                  </button>
                  <button onClick={(e) => openContextMenu(e, { type: 'folder', path })} className="text-white px-2 py-1 rounded hover:bg-gray-700">⋮</button>
                </div>
              </div>
              {isOpen && (
                <div className="pl-4">
                  {childFiles.map((f) => {
                    const Icon = getIconForName(f.name)
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
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => onOpenFile(f.id)}
                              onDoubleClick={() => startRename(f.id, f.name)}
                              className={`w-full text-left rounded-xl flex items-center gap-2 px-2 py-2 text-sm text-white ${active ? 'bg-gray-700' : ''}`}
                            >
                              <Icon className="opacity-100" /> {f.displayName || f.name || 'untitled-document'}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openContextMenu(e, { type: 'file', id: f.id, path: f.name }) }}
                              className="ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white px-2"
                              aria-label="file options"
                            >
                              ⋮
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Context menu popup */}
      {contextMenu.visible && (
        <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 60 }} className="bg-white text-black rounded shadow-md">
          {contextMenu.type === 'file' && (
            <div>
              <button onClick={() => { setRenamingId(contextMenu.id); setInputValue(''); setContextMenu({ visible: false }) }} className="block px-4 py-2 text-left hover:bg-gray-100 w-48">Rename</button>
              <button onClick={() => { if (confirm('Delete file?')) { typeof onDeleteFile === 'function' && onDeleteFile(contextMenu.id) } setContextMenu({ visible: false }) }} className="block px-4 py-2 text-left hover:bg-gray-100 w-48">Delete</button>
            </div>
          )}
          {contextMenu.type === 'folder' && (
            <div>
              <button onClick={() => { typeof onNewFile === 'function' && onNewFile(contextMenu.path); setContextMenu({ visible: false }) }} className="block px-4 py-2 text-left hover:bg-gray-100 w-48">New file in folder</button>
              <button onClick={() => { setExpanded((s) => ({ ...s, [contextMenu.path]: true })); setSelectedFolder(contextMenu.path); setContextMenu({ visible: false }) }} className="block px-4 py-2 text-left hover:bg-gray-100 w-48">Open folder</button>
              <button onClick={() => { if (confirm('Delete folder and all files inside?')) { typeof onDeleteFolder === 'function' && onDeleteFolder(contextMenu.path) } setContextMenu({ visible: false }) }} className="block px-4 py-2 text-left hover:bg-gray-100 w-48">Delete folder</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Explorer