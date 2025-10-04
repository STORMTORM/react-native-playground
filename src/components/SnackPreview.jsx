import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Snack } from 'snack-sdk'
import Preview from './Preview'

// SnackPreview: publishes files to Snack and shows the web player URL in an iframe.
// Adds debounced auto-publish when `open` is true. Provides manual publish control.
// small inline styles to mimic a phone chrome
const styles = {
  deviceOuter: {
    width: '360px',
    height: '720px',
    background: '#000',
    borderRadius: '36px',
    padding: '10px',
    boxSizing: 'border-box',
  },
  deviceInner: {
    width: '100%',
    height: '100%',
    background: '#fff',
    borderRadius: '28px',
    overflow: 'hidden',
    position: 'relative',
  },
  notch: {
    height: '24px',
    width: '120px',
    background: '#111',
    borderRadius: '12px',
    margin: '8px auto 0',
  },
  spinner: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#fff',
  },
}
export default function SnackPreview({ files = [], open, onClose, debounceMs = 1000, embedded = false }) {
  const [url, setUrl] = useState(null)
  const [expUrl, setExpUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [autoPublish, setAutoPublish] = useState(true)
  const [lastPublishedAt, setLastPublishedAt] = useState(null)
  const [platform, setPlatform] = useState('web')
  const [orientation, setOrientation] = useState('portrait')
  const [connectedClients, setConnectedClients] = useState(0)
  const [logs, setLogs] = useState([])
  const [live, setLive] = useState(false) // when true, tries to go online and open transports (websocket)

  const timerRef = useRef(null)
  const mountedRef = useRef(true)
  const publishIdRef = useRef(0)
  const snackRef = useRef(null)
  const iframeRef = useRef(null)
  const stateListenerRef = useRef(null)
  const logListenerRef = useRef(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      // Clean up snack instance
      if (snackRef.current && typeof snackRef.current.setOnline === 'function') {
        try { snackRef.current.setOnline(false) } catch (e) { /* ignore */ }
      }
    }
  }, [])

  const buildSnackFiles = useCallback(() => {
    const snackFiles = {}
    for (const f of files) {
      const name = f.name && f.name.trim() ? f.name.trim() : `file-${f.id}.js`
      snackFiles[name] = { type: 'CODE', contents: f.content || '' }
    }
    if (!snackFiles['App.js']) {
      snackFiles['App.js'] = {
        type: 'CODE',
        contents:
          "import React from 'react'\nimport { View, Text } from 'react-native'\n\nexport default function App(){ return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>No App.js provided</Text></View> }",
      }
    }
    return snackFiles
  }, [files])

  const doPublish = useCallback(async () => {
    const id = ++publishIdRef.current
    setLoading(true)
    setError(null)
    try {
      const snackFiles = buildSnackFiles()

      if (!snackRef.current) {
        // Create a new Snack instance. Use `live` to decide whether to enable online transports.
        snackRef.current = new Snack({ files: snackFiles, sdkVersion: '48.0.0', online: !!live })
      } else {
        // Update existing snack files
        try {
          snackRef.current.updateFiles(snackFiles)
        } catch (e) {
          // ignore
        }
      }

      // If live is requested, try to enable online transports (may open websockets)
      if (live) {
        try {
          if (typeof snackRef.current.setOnline === 'function') snackRef.current.setOnline(true)
        } catch (e) {
          // ignore
        }
      }

      // If we have an iframe ref and the API supports webPreviewRef, attach it
      if (iframeRef.current && snackRef.current && snackRef.current.getState) {
        try {
          // Some versions support passing webPreviewRef in constructor only, but setting it here is harmless if supported
          if (snackRef.current.webPreviewRef) {
            snackRef.current.webPreviewRef.current = iframeRef.current.contentWindow
          }
        } catch (e) {
          // ignore
        }
      }

      let state = null
      if (live) {
        // In live mode we can await state
        state = await snackRef.current.getStateAsync()
      } else {
        // In non-live mode, save to get a web URL without opening transports
        try {
          const saved = await snackRef.current.saveAsync({ ignoreUser: true })
          state = saved || {}
        } catch (e) {
          // saveAsync may not be supported in some contexts; fallback to getStateAsync
          try {
            state = await snackRef.current.getStateAsync()
          } catch (e2) {
            state = {}
          }
        }
      }

      if (!mountedRef.current) return
      // Ignore older publish responses
      if (id !== publishIdRef.current) return
  let previewUrl = (state && (state.webPreviewURL || state.url || state.saveURL || state.previewURL)) || null

      // If the SDK returned a native exp:// URL (not embeddable), try to save the snack and use a web preview instead
      if (previewUrl && previewUrl.startsWith('exp://')) {
        try {
          const saved = await snackRef.current.saveAsync({ ignoreUser: true })
          // saved may contain { id, url }
          previewUrl = saved && (saved.url || (saved.id ? `https://snack.expo.dev/${saved.id}` : null))
          if (!previewUrl) {
            // Attempt to construct a reasonable web url from state (snack id or saveURL)
            const id = state.snackId || state.id || (state.saveURL && state.saveURL.split('/').pop())
            if (id) previewUrl = `https://snack.expo.dev/${id}`
          }
        } catch (e) {
          // If saving fails, fall back to constructing a snack.expo.dev link; surface a helpful note
          const id = state.snackId || state.id || (state.saveURL && state.saveURL.split('/').pop())
          if (id) {
            previewUrl = `https://snack.expo.dev/${id}`
          } else {
            // keep the native exp:// url in state so user can open it via a click
            setExpUrl(previewUrl)
            setError('Snack returned a native URL that cannot be embedded. Click "Open in Expo Go" to launch in Expo Go (requires Expo Go installed).')
            previewUrl = null
          }
        }
      }

      // If we still have a native exp URL and we didn't find a web preview, keep it separately
      if (previewUrl && previewUrl.startsWith('exp://')) {
        setExpUrl(previewUrl)
        // prefer web preview for iframe; clear url so fallback shows local preview
        previewUrl = null
      } else {
        setExpUrl(null)
      }

      setUrl(previewUrl)
      setLastPublishedAt(new Date())
    } catch (err) {
      console.error('Snack publish failed', err)
      if (!mountedRef.current) return
      setError(err.message || String(err))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [buildSnackFiles])

  // Publish immediately when modal opens or when embedded is mounted
  useEffect(() => {
    if (!open && !embedded) return
    // clear any pending timer
    if (timerRef.current) clearTimeout(timerRef.current)
    // immediate publish on open/embedded mount
    doPublish()
  }, [open, embedded, doPublish])

  // Auto-publish on file changes when modal is open or embedded is active and autoPublish enabled (debounced)
  useEffect(() => {
    if (!(open || embedded) || !autoPublish) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      doPublish()
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [files, open, embedded, autoPublish, debounceMs, doPublish])

  if (!open && !embedded) return null

  if (embedded) {
    // Render as an always-visible right-side phone preview
    return (
      <div className="flex-none w-[380px] border-l border-[#3C3C3C] h-full bg-white flex flex-col">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <div className="text-sm text-[#111] font-medium">Phone Preview</div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={autoPublish} onChange={(e) => setAutoPublish(e.target.checked)} />
              Auto
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
              Live
            </label>
            <button onClick={doPublish} disabled={loading} className="px-3 py-1 rounded bg-gray-200 text-sm">{loading ? 'Publishing...' : 'Publish'}</button>
            {expUrl && (
              <button
                onClick={() => window.open(expUrl)}
                className="px-3 py-1 rounded bg-green-500 text-white text-sm"
              >
                Open in Expo Go
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 p-3 flex items-center justify-center">
            <div style={styles.deviceOuter} className="relative">
              <div style={styles.deviceInner}>
                <div style={styles.notch} />
                <div style={{ position: 'absolute', inset: 0 }}>
                  {url ? (
                    <iframe
                      ref={iframeRef}
                      src={url}
                      title="Snack Preview"
                      className="w-full h-full border-0"
                      style={{ display: 'block', width: '100%', height: '100%' }}
                    />
                  ) : (
                    // Fallback to local preview runner so users always see something
                    <div className="w-full h-full">
                      <Preview files={files} />
                    </div>
                  )}
                </div>
                {loading && (
                  <div style={styles.spinner} className="text-sm">
                    Publishing...
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>
    )
  }

  // Fallback: modal rendering (if not embedded)
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="w-[90%] h-[90%] bg-white rounded-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="font-semibold">Snack Preview</div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={autoPublish} onChange={(e) => setAutoPublish(e.target.checked)} />
                Auto-publish
              </label>
              <button onClick={doPublish} disabled={loading} className="px-3 py-1 rounded bg-gray-200">{loading ? 'Publishing...' : 'Publish now'}</button>
            </div>
            <button onClick={onClose} className="px-3 py-1 rounded bg-gray-200">Close</button>
          </div>
        </div>

        <div className="flex-1 flex">
          <div className="w-64 border-r p-3">
            <div className="text-sm mb-2">Status</div>
            <div className="text-xs text-gray-600 mb-2">{loading ? 'Publishing...' : (lastPublishedAt ? `Last published: ${lastPublishedAt.toLocaleTimeString()}` : 'Not published yet')}</div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            {url && (
              <div className="mt-3">
                <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 underline">Open in Snack</a>
              </div>
            )}
            {expUrl && (
              <div className="mt-3">
                <button onClick={() => window.open(expUrl)} className="text-white bg-green-500 px-2 py-1 rounded text-sm">Open in Expo Go</button>
              </div>
            )}
          </div>

          <div className="flex-1">
            {url ? (
                <iframe ref={iframeRef} src={url} title="Snack Preview" className="w-full h-full border-0" />
            ) : (
              <div className="w-full h-full">
                <Preview files={files} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
