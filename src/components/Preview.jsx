
import { useEffect, useRef, useMemo } from 'react'
import * as Babel from '@babel/standalone'
import * as ReactNative from 'react-native-web'
import React from 'react'
import { createRoot } from 'react-dom/client'

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
    // cleanup: unmount react root when moduleMap changes or component unmounts
    return () => {
      if (rootRef.current) {
        try { rootRef.current.unmount() } catch (e) { /* ignore */ }
        rootRef.current = null
      }
    }
  }, [moduleMap])

  return (
    <div className="flex-none h-full bg-white flex flex-col rounded-xl">
      <div className="flex-1 overflow-auto border-4 border-red-400 rounded-xl">
        <div ref={mountRef} className="w-full overflow-auto rounded-md" />
      </div>
    </div>
  )
}
