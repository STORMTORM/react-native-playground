import { Editor } from "@monaco-editor/react";
import { useRef } from "react";

function CodeEditor({ value = '', onChange = () => {}, language = 'javascript', filename }) {
  const editorRef = useRef()

  const onMount = (editor, monaco) => {
    editorRef.current = editor
    editor.focus()

    // add save shortcut handler (Cmd/Ctrl+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Prevent default browser save and call any save handler if needed
      // For now, just blurring to indicate save; could wire to onSave later
      editor.trigger('keyboard', 'blur', null)
      // eslint-disable-next-line no-console
      console.log('Save shortcut pressed for', filename)
    })
  }

  return (
    <div className="flex-1 border-r border-[#3C3C3C]">
      <div className="px-3 py-3 border-y border-[#3C3C3C] bg-[#0B0B0B] text-sm text-[#D4D4D4]">{filename ?? 'Untitled'}</div>
      <Editor
        // height="calc(100vh - 260px)"
        width="100%"
        height="calc(100vh - 94px)"
        theme="vs-dark"
        language={language}
        value={value}
        onChange={(val) => onChange(val)}
        onMount={onMount}
        options={{ minimap: { enabled: false }, fontSize: 13 }}
      />
    </div>
  )
}

export default CodeEditor;
