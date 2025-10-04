import React from 'react'
import { motion } from 'framer-motion'
import { VscPlay, VscSave, VscShare, VscColorMode } from 'react-icons/vsc'
import logo from '../assets/logo.png'

function Navbar({ onRun, onSave, onShare, onOpenSnack, onSelectExample, theme, onToggleTheme, projectName, onRenameProject }) {
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
        <button onClick={onRun} className="px-2 py-2 rounded-xl text-green-400 font-bold flex items-center gap-2 transition">
          <VscPlay />
        </button>
        <button onClick={onSave} className="px-2 py-2 rounded-xl text-white transition flex items-center gap-2">
          <VscSave />
        </button>
        <button onClick={() => { if (typeof onShare === 'function') onShare({ download: true }) ; else if (onOpenSnack) onOpenSnack() }} className="px-2 py-2 rounded-xl text-white transition flex items-center gap-2">
          <VscShare /> 
        </button>

        {/* <button onClick={onToggleTheme} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition flex items-center gap-2">
          <VscColorMode /> <span className="hidden md:inline">{theme === 'dark' ? 'Dark' : 'Light'}</span>
        </button> */}

        <div className="w-8 h-8 rounded-full bg-white">
          <img
            src="https://avatars.githubusercontent.com/u/6704328?v=4"
            alt="Profile"
            className="w-full h-full object-cover rounded-full"
          />
        </div>
      </div>
    </div>
  )
}

export default Navbar