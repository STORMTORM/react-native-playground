import { useState } from "react";
import "./global.css";
import Nav from "./components/Nav";
import Explorer from "./components/Explorer";
import CodeEditor from "./components/CodeEditor";
import { getLanguageFromName } from "./LanguageHandler";
import SnackPreview from "./components/SnackPreview";

function App() {
  const [files, setFiles] = useState([
    {
      id: 'app-js',
      name: 'App.js',
      content: `import React from 'react'
import { View, Text } from 'react-native'

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20, color: 'blue' }}>Hello from Snack clone</Text>
    </View>
  )
}
`,
    },
  ]);
  const [activeId, setActiveId] = useState(null);
  const [snackOpen, setSnackOpen] = useState(false);

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

  // Preview will now compile and run all files provided by the Explorer
  // The entry file is chosen automatically inside Preview (App.js, index.js or the first file)

  return (
    <div className="flex-1">
      <Nav onOpenSnack={() => setSnackOpen(true)} />
      <div className="flex h-[calc(100vh-48px)]">
        <div className="flex-1 flex">
          <Explorer
            files={files}
            activeId={activeId}
            onOpenFile={handleOpenFile}
            onNewFile={handleNewFile}
            onUpdateFileName={handleUpdateFileName}
          />
          <CodeEditor
            value={activeFile ? activeFile.content : ""}
            onChange={handleChangeContent}
            language={getLanguageFromName(activeFile?.name)}
            filename={activeFile?.name}
          />
        </div>

        {/* Right-side embedded Snack preview (phone) */}
        <SnackPreview files={files} open={snackOpen} onClose={() => setSnackOpen(false)} embedded={true} />

      </div>
    </div>
  );
}

export default App;
