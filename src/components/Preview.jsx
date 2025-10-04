// import React, { useEffect, useRef, useState } from 'react'
// import * as Babel from '@babel/standalone'
// import * as ReactNativeWeb from 'react-native-web'
// import { createRoot } from 'react-dom/client'

// // A tiny in-browser bundler/runtime that compiles multiple Explorer files together
// // and executes the app entry (App.js/index.js or first file) using a CommonJS-like loader.
// export default function Preview({ files = [] }) {
//   const mountRef = useRef(null)
//   const rootRef = useRef(null)
//   const [error, setError] = useState(null)

//   // Build a module map keyed by normalized names (exact file names as provided)
//   const buildModuleMap = () => {
//     const map = {}
//     for (const f of files) {
//       const name = (f.name && f.name.trim()) || `file-${f.id}.js`
//       map[name] = f.content || ''
//     }
//     return map
//   }

//   // Try to resolve an import id to a key in the module map
//   const resolveKey = (map, id) => {
//     if (map[id]) return id
//     if (map['./' + id]) return './' + id
//     if (map[id + '.js']) return id + '.js'
//     if (map[id + '.jsx']) return id + '.jsx'
//     if (map['./' + id + '.js']) return './' + id + '.js'
//     if (map['./' + id + '.jsx']) return './' + id + '.jsx'
//     // try basename match
//     const keys = Object.keys(map)
//     const match = keys.find((k) => k.endsWith('/' + id) || k.endsWith('/' + id + '.js') || k.endsWith('/' + id + '.jsx'))
//     if (match) return match
//     return null
//   }

//   const transformModule = (code) => {
//     try {
//       // transform JSX/ES modules to CommonJS using babel-standalone
//       const out = Babel.transform(code, {
//         presets: ['react'],
//         plugins: ['transform-modules-commonjs'],
//         sourceMaps: 'inline',
//       })
//       return out.code
//     } catch (err) {
//       throw err
//     }
//   }

//   const run = () => {
//     setError(null)
//     const map = buildModuleMap()

//     // simple module cache
//     const cache = {}

//     const requireFactory = (basedir) => {
//       const require = (id) => {
//         // externals
//         if (id === 'react') return React
//         if (id === 'react-native') return ReactNativeWeb

//         // resolve in-module map
//         const key = resolveKey(map, id)
//         if (!key) throw new Error(`Module not found: ${id}`)

//         if (cache[key] && cache[key].exports) return cache[key].exports

//         const module = { exports: {} }
//         cache[key] = module

//         const code = map[key]
//         const transformed = transformModule(code)

//         // execute module in a Function scope
//         const fn = new Function('require', 'module', 'exports', transformed)
//         fn(requireFactory(key), module, module.exports)
//         return module.exports
//       }
//       return require
//     }

//     try {
//       // find entry
//       const entryCandidates = ['App.js', 'App.jsx', 'index.js', 'index.jsx']
//       let entry = null
//       for (const c of entryCandidates) if (map[c]) { entry = c; break }
//       if (!entry) entry = Object.keys(map)[0]
//       if (!entry) throw new Error('No files to run')

//       const require = requireFactory('/')
//       const exported = require(entry)

//       // exported can be a React component (default export) or a React element
//       const AppComponent = exported && (exported.default || exported) || null

//       if (!mountRef.current) return
//       // cleanup previous root
//       if (rootRef.current) {
//         try { rootRef.current.unmount() } catch (e) { /* ignore */ }
//         rootRef.current = null
//       }
//       const root = createRoot(mountRef.current)
//       rootRef.current = root
//       root.render(React.createElement(AppComponent))
//     } catch (err) {
//       console.error('Preview runtime error', err)
//       setError(err.message || String(err))
//     }
//   }

//   useEffect(() => {
//     // run when files change
//     run()

//     return () => {
//       if (rootRef.current) {
//         try { rootRef.current.unmount() } catch (e) { /* ignore */ }
//         rootRef.current = null
//       }
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [files])

//   return (
//     <div className="w-full h-full bg-white" style={{ position: 'relative' }}>
//       {error && (
//         <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', color: 'white', padding: 12, zIndex: 50 }}>
//           <div style={{ fontWeight: 700, marginBottom: 8 }}>Preview error</div>
//           <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{error}</pre>
//         </div>
//       )}
//       <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
//     </div>
//   )
// }
import { useEffect, useRef, useMemo } from 'react'
import * as Babel from '@babel/standalone'
import * as ReactNative from 'react-native-web'
import React from 'react'
import { createRoot } from 'react-dom/client'

// Simple in-browser bundler/runtime for the playground
// - Accepts `files` array: [{ id, name, content }]
// - Builds a module map keyed by filename
// - Transforms each module with Babel (jsx -> js)
// - Executes the chosen entry module and renders default export

function buildModuleMap(files = []) {
  const map = {}
  for (const f of files) {
    const raw = f.name && f.name.trim() ? f.name.trim() : `file-${f.id}.js`
    const base = raw.replace(/^\.\//, '')
    const noExt = base.replace(/\.(js|jsx)$/, '')
    const variants = [base, `./${base}`, noExt, `./${noExt}`, `${noExt}.js`, `${noExt}.jsx`, `${base}.js`, `${base}.jsx`]
    for (const v of variants) {
      if (!map[v]) map[v] = { code: f.content || '', name: base }
    }
  }
  return map
}

function transformModule(code) {
  try {
    // transform JSX and ES modules to CommonJS so we can run in the runtime
    const transformed = Babel.transform(code, {
      presets: ['react'],
      plugins: ['transform-modules-commonjs'],
    }).code
    return transformed
  } catch (err) {
    throw err
  }
}

export default function Preview({ files = [] }) {
  const mountRef = useRef(null)
  const rootRef = useRef(null)
  const lastErrorRef = useRef(null)

  const moduleMap = useMemo(() => buildModuleMap(files), [files])

  useEffect(() => {
    if (!mountRef.current) return
    mountRef.current.innerHTML = ''
    lastErrorRef.current = null

    // No files: show empty state
    if (!files || files.length === 0) {
      const el = document.createElement('div')
      el.className = 'text-gray-600'
      el.innerText = 'No files to preview — create a file in Explorer and add a React Native component export.'
      mountRef.current.appendChild(el)
      return
    }

    try {
      // Build runtime require that resolves from moduleMap
      const compiled = {}

      const requireFactory = (map) => {
        // resolve helper: tries various candidate keys in the module map
        const resolve = (specifier) => {
          if (specifier === 'react') return { external: 'react' }
          if (specifier === 'react-native') return { external: 'react-native' }
          const candidates = [
            specifier,
            `./${specifier}`,
            specifier.replace(/^\.\//, ''),
            `${specifier}.js`,
            `${specifier}.jsx`,
            `./${specifier}.js`,
            `./${specifier}.jsx`,
          ]
          for (const c of candidates) if (map[c]) return { key: c }
          return null
        }

        const makeRequire = (parentName) => {
          return (name) => {
            // externals
            if (name === 'react') return React
            if (name === 'react-native') return ReactNative

            // Resolve relative imports and module map keys
            const resolved = resolve(name)
            if (!resolved) throw new Error(`Module not found: ${name} (from ${parentName})`)

            if (resolved.external) {
              if (resolved.external === 'react') return React
              if (resolved.external === 'react-native') return ReactNative
            }

            const key = resolved.key
            if (compiled[key]) return compiled[key].exports

            const mod = { exports: {} }
            compiled[key] = mod

            const src = map[key]
            if (!src) throw new Error(`Module not found after resolution: ${key}`)

            const code = src.code
            // Wrap code in function (require, module, exports, React, ReactNative, __filename)
            const wrapped = `(function(require,module,exports,React,ReactNative,__filename){\n${transformModule(code)}\n})`
            // eslint-disable-next-line no-new-func
            const fn = new Function('return ' + wrapped)()
            // create a local require bound to this module's name so relative imports resolve
            const localRequire = makeRequire(key)
            fn(localRequire, mod, mod.exports, React, ReactNative, key)
            return mod.exports
          }
        }

        // root require (no parent)
        return makeRequire('<root>')
      }

      // Prefer typical entry filenames
      const entryCandidates = ['App.js', 'App.jsx', 'index.js', 'index.jsx']
      let entry = null
      for (const c of entryCandidates) if (moduleMap[c]) { entry = c; break }
      if (!entry) entry = Object.keys(moduleMap)[0]
      if (!entry) throw new Error('No entry file found')

      const require = requireFactory(moduleMap)
      const entryExports = require(entry)

      // If module default export is a React component (function or class), render it
      const Component = entryExports && entryExports.default ? entryExports.default : null

      if (!Component) {
        // If entry exports a function directly (module.exports = () => ...)
        const maybeComp = entryExports && typeof entryExports === 'function' ? entryExports : null
        if (maybeComp) {
          if (!rootRef.current) rootRef.current = createRoot(mountRef.current)
          rootRef.current.render(React.createElement(maybeComp))
          return
        }
        throw new Error('Entry file does not export a React component as default')
      }

      if (!rootRef.current) rootRef.current = createRoot(mountRef.current)
      rootRef.current.render(React.createElement(Component))
    } catch (err) {
      lastErrorRef.current = err
      if (mountRef.current) {
        mountRef.current.innerHTML = ''
        const pre = document.createElement('pre')
        pre.className = 'text-red-400 bg-[#1a0b0b] p-2 rounded-md whitespace-pre-wrap'
        pre.innerText = err && err.message ? err.message : String(err)
        mountRef.current.appendChild(pre)
      }
    }
  }, [moduleMap, files])

  return (
    <div className="flex-none min-w-[20rem] border-l border-[#3C3C3C] h-full bg-white flex flex-col">
      <div className="px-3 py-2 border-b border-[#3C3C3C] flex items-center justify-between">
        <div className="text-sm text-[#D4D4D4] font-medium">Preview</div>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <div ref={mountRef} className="w-full rounded-md overflow-auto" />
      </div>
    </div>
  )
}
