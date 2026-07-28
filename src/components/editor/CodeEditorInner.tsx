'use client';

import { useMemo } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { json as jsonLang } from '@codemirror/lang-json';
import { yaml as yamlLang } from '@codemirror/lang-yaml';
import { EditorView } from '@codemirror/view';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { useTheme } from '../theme/ThemeProvider';

export interface CodeEditorInnerProps {
  value: string;
  onChange?: (value: string) => void;
  language: 'json' | 'yaml';
  readOnly?: boolean;
  ariaLabel: string;
  /** 1-based line to scroll to / highlight, if any. */
  highlightLine?: number;
  editorRef?: React.RefObject<ReactCodeMirrorRef | null>;
}

/**
 * The actual CodeMirror instance. Loaded lazily by CodeEditor so the heavy
 * editor bundle is only fetched on the client when a tool page mounts.
 */
export default function CodeEditorInner({
  value,
  onChange,
  language,
  readOnly = false,
  ariaLabel,
  editorRef,
}: CodeEditorInnerProps) {
  const { resolved } = useTheme();

  const extensions = useMemo(() => {
    const langExt = language === 'json' ? jsonLang() : yamlLang();
    return [langExt, EditorView.lineWrapping];
  }, [language]);

  return (
    <CodeMirror
      ref={editorRef}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      editable={!readOnly}
      theme={resolved === 'dark' ? githubDark : githubLight}
      extensions={extensions}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: !readOnly,
        foldGutter: true,
        autocompletion: false,
        highlightSelectionMatches: true,
      }}
      height="100%"
      style={{ height: '100%' }}
      aria-label={ariaLabel}
    />
  );
}
