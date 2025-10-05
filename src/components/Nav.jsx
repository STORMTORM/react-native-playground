import React, { useState, useRef, useEffect } from 'react'
import logo from '../assets/logo.png'

function Navbar({ onRun, onSave, onShare, onOpenSnack, onSelectExample, theme, onToggleTheme, projectName, onRenameProject, user, onSignIn, onSignOut, onSaveWorkspace, onLoadWorkspace }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    window.addEventListener('click', onDoc)
    return () => window.removeEventListener('click', onDoc)
  }, [])

  return (
    <div
      className="bg-black sticky top-0 z-20 flex items-center justify-between px-3 sm:px-6 py-1 shadow-soft"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full" >
          <img src={logo} alt="Logo" className="w-full h-full object-cover rounded-full" />
        </div>
        <input
          value={projectName || 'Project'}
          onChange={(e) => { if (typeof onRenameProject === 'function') onRenameProject(e.target.value) }}
          className="bg-transparent text-white font-semibold tracking-wide text-md sm:text-lg focus:outline-none"
        />
      </div>

      <input className='bg-gray-200 text-black rounded-xl px-3 py-1 w-1/3 sm:w-1/4 focus:outline-none focus:ring-2 focus:ring-accent' placeholder='Search files...' />

      <div className="flex items-center gap-2 sm:gap-3">
        {/* <button onClick={() => onSaveWorkspace && onSaveWorkspace()} className="px-2 py-2 rounded-xl text-white transition flex items-center gap-2">
          <VscSave />
        </button>
        <button onClick={() => onLoadWorkspace && onLoadWorkspace()} className="px-2 py-2 rounded-xl text-white transition flex items-center gap-2">
          Load
        </button>
        <button onClick={() => { if (typeof onShare === 'function') onShare({ download: true }) ; else if (onOpenSnack) onOpenSnack() }} className="px-2 py-2 rounded-xl text-white transition flex items-center gap-2">
          <VscShare /> 
        </button> */}

        {user ? (
          <div className="relative" ref={ref}>
            <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5">
              <img src={user?.avatar_url || user?.user_metadata?.avatar_url} alt="avatar" className="w-8 h-8 rounded-full" />
              <div className="text-sm text-white">{user?.user_metadata?.full_name || user?.email || user?.login}</div>
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-40 bg-white text-black rounded shadow-lg py-1 z-50">
                <button onClick={() => { setOpen(false); onSignOut && onSignOut() }} className="w-full text-left px-3 py-2 hover:bg-gray-100">Sign out</button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={onSignIn} className="px-3 py-1 bg-white rounded-xl text-black">Sign in</button>
        )}
      </div>
    </div>
  )
}

export default Navbar