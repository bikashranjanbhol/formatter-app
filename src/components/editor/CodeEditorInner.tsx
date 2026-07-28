'use client';

import { useMemo } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { json as jsonLang } from '@codemirror/lang-json';
import { yaml as yamlLang } from '@codemirror/lang-yaml';
import { EditorView } from '@codemirror/view';
import { foldGutter } from '@codemirror/language';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { useTheme } from '../theme/ThemeProvider';

// Larger, clearer fold markers than CodeMirror's tiny default arrows. Returns a
// chevron that points down when the section is open and right when collapsed.
function foldMarker(open: boolean): HTMLElement {
  const span = document.createElement('span');
  span.className = 'cm-fold-marker';
  span.setAttribute('aria-hidden', 'true');
  span.style.cssText =
    'display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;cursor:pointer;';
  const points = open ? '6 9 12 15 18 9' : '9 6 15 12 9 18';
  span.innerHTML =
    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="${points}"/></svg>`;
  return span;
}

const largeFoldGutter = foldGutter({
  markerDOM: foldMarker,
});

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
    return [langExt, EditorView.lineWrapping, largeFoldGutter];
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
        // Use our own larger fold gutter (added via extensions) instead.
        foldGutter: false,
        autocompletion: false,
        highlightSelectionMatches: true,
      }}
      height="100%"
      style={{ height: '100%' }}
      aria-label={ariaLabel}
    />
  );
}
