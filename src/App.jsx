import { useState } from "react";
import JSZip from 'jszip'
import "./global.css";
import Nav from "./components/Nav";
import Explorer from "./components/Explorer";
import CodeEditor from "./components/CodeEditor";
import { getLanguageFromName } from "./LanguageHandler";
import SnackPreview from "./components/SnackPreview";
import { supabase } from './lib/supabaseClient'
import { useEffect } from 'react'

function App() {
  const [files, setFiles] = useState([
    {
      id: 'app-js',
      name: 'App.js',
      content: `import React from 'react'
import { View } from 'react-native'
import ExampleComponent from './components/ExampleComponent'

export default function App() {
  return (
    <View style={{ justifyContent: 'center', alignItems: 'center', position: 'absolute', top:'50%', right:'25%' }}>
      <ExampleComponent />
    </View>
  )
}
`,
    },
    {
      id: 'components-examplecomponent',
      name: 'components/ExampleComponent.js',
      content: `import React from 'react'
import { Text } from 'react-native'

export default function ExampleComponent() {
  return <Text style={{ fontSize: 18, color: '#111' }}>Welcome to Snglrty</Text>
}
`,
    },
    {
      id: 'package-json',
      name: 'package.json',
      content: `{
  "name": "playground-app",
  "version": "1.0.0",
  "main": "App.js",
  "dependencies": {}
}`,
    },
    {
      id: 'assets-readme',
      name: 'assets/README.md',
      content: `# Assets

Place image and asset files here. The preview supports referencing assets by path when supported by the runtime.`,
    },
  ])
  const [activeId, setActiveId] = useState('app-js');
  const [snackOpen, setSnackOpen] = useState(false);
  const [user, setUser] = useState(null)

  useEffect(() => {
    let mounted = true
    // get current session user
    const init = async () => {
      try {
        const { data } = await supabase.auth.getUser()
        if (!mounted) return
        setUser(data.user ?? null)
      } catch (e) {
        // ignore
      }
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      try { subscription?.unsubscribe() } catch (e) { /* ignore */ }
    }
  }, [])

  const handleSignIn = async () => {
    // Open OAuth redirect to GitHub via Supabase
    await supabase.auth.signInWithOAuth({ provider: 'github' })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const handleOpenFile = (id) => {
    setActiveId(id);
  };

  const handleNewFile = () => {
    const id = Date.now().toString();
    // start with an empty name so the UI will prompt the user to name it
    const newFile = { id, name: "", content: "", isNew: true };
    setFiles((prev) => [...prev, newFile]);
    setActiveId(id);
  };

  // Create a new file inside a folder path (e.g., 'components')
  const handleNewFileInFolder = (folderPath) => {
    const id = Date.now().toString();
    // create a placeholder name; Explorer will prompt rename
    const name = folderPath ? `${folderPath}/NewFile.js` : 'NewFile.js'
    const newFile = { id, name: name, content: '', isNew: true }
    setFiles((prev) => [...prev, newFile])
    setActiveId(id)
  }

  const handleDeleteFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    setActiveId((cur) => (cur === id ? null : cur))
  }

  // Delete all files under a folder path
  const handleDeleteFolder = (path) => {
    setFiles((prev) => prev.filter((f) => !(f.name && f.name.startsWith(path + '/'))))
    setActiveId((cur) => {
      const still = files.find((f) => f.id === cur)
      return still ? cur : null
    })
  }

  const handleChangeContent = (value) => {
    if (!activeId) return;
    setFiles((prev) =>
      prev.map((f) => (f.id === activeId ? { ...f, content: value ?? "" } : f))
    );
  };

  // rename actions are handled inside the Explorer component; App only updates file data
  const handleUpdateFileName = (id, newName) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: newName, isNew: false } : f))
    );
    // make sure renamed file is active
    setActiveId(id);
  };

  const activeFile = files.find((f) => f.id === activeId) ?? null;

  // determine project name from package.json if present
  const pkg = files.find((f) => f.name === 'package.json')
  let projectName = 'Project'
  try {
    if (pkg && pkg.content) {
      const parsed = JSON.parse(pkg.content)
      if (parsed && parsed.name) projectName = parsed.name
    }
  } catch (e) {
    // ignore parse errors
  }

  const handleShare = ({ download } = {}) => {
    if (!download) return
    // Create a zip containing each file as its own entry
    const zip = new JSZip()
    for (const f of files) {
      const filename = f.name && f.name.trim() ? f.name.trim() : `file-${f.id}.js`
      zip.file(filename, f.content || '')
    }
    zip.generateAsync({ type: 'blob' }).then((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectName || 'project'}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    })
  }

  const handleRenameProject = (newName) => {
    // update package.json file content if present
    setFiles((prev) => prev.map((f) => {
      if (f.name === 'package.json') {
        try {
          const parsed = JSON.parse(f.content || '{}')
          parsed.name = newName
          return { ...f, content: JSON.stringify(parsed, null, 2) }
        } catch (e) {
          // fallback: replace name key heuristically
          const replaced = (f.content || '').replace(/"name"\s*:\s*"[^"]*"/, `"name": "${newName}"`)
          return { ...f, content: replaced }
        }
      }
      return f
    }))
  }

  // Save current workspace to Supabase (table: workspaces)
  const saveWorkspace = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user
      if (!user) return alert('Please sign in to save your workspace')

      // Upsert workspace identified by user_id + name
      const payload = {
        user_id: user.id,
        name: projectName || 'project',
        files,
      }

      // Try upsert; requires a unique constraint on (user_id, name) in the DB
      const { data, error } = await supabase.from('workspaces').upsert(payload, { onConflict: 'user_id,name' }).select()
      if (error) throw error
      alert('Workspace saved')
      return data
    } catch (err) {
      console.error('Save failed', err)
      alert('Save failed: ' + (err.message || err))
    }
  }

  // Load latest workspace for the current user (by updated_at)
  const loadLatestWorkspace = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user
      if (!user) return alert('Please sign in to load your workspace')

      const { data, error } = await supabase.from('workspaces').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1)
      if (error) throw error
      if (!data || data.length === 0) return alert('No workspace found')
      const ws = data[0]
      if (ws.files) setFiles(ws.files)
      if (ws.name) handleRenameProject(ws.name)
      alert('Workspace loaded')
      return ws
    } catch (err) {
      console.error('Load failed', err)
      alert('Load failed: ' + (err.message || err))
    }
  }

  // Preview will now compile and run all files provided by the Explorer
  // The entry file is chosen automatically inside Preview (App.js, index.js or the first file)

  return (
    <div className="flex-1">
  <Nav onOpenSnack={() => setSnackOpen(true)} onShare={handleShare} projectName={projectName} onRenameProject={handleRenameProject} user={user} onSignIn={handleSignIn} onSignOut={handleSignOut} onSaveWorkspace={saveWorkspace} onLoadWorkspace={loadLatestWorkspace} />
      <div className="flex h-[calc(100vh-48px)]">
        <div className="flex-1 flex">
          <Explorer
            files={files}
            activeId={activeId}
            onOpenFile={handleOpenFile}
            onNewFile={handleNewFileInFolder}
            onUpdateFileName={handleUpdateFileName}
            onDeleteFile={handleDeleteFile}
            onDeleteFolder={handleDeleteFolder}
          />
          <CodeEditor
            value={activeFile ? activeFile.content : ""}
            onChange={handleChangeContent}
            language={getLanguageFromName(activeFile?.name)}
            filename={activeFile?.name}
          />
          <SnackPreview files={files} open={snackOpen} onClose={() => setSnackOpen(false)} embedded={true} />
        </div>
      </div>
    </div>
  );
}

export default App;
