'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormatOptions } from '@/lib/types';
import {
  deleteCustomPreset,
  loadPresets,
  matchPreset,
  saveCustomPreset,
  MAX_PRESET_NAME_LENGTH,
  type Preset,
} from '@/lib/presets';

interface PresetPickerProps {
  options: FormatOptions;
  onApply: (options: FormatOptions) => void;
  /** Copies a link to the current settings. */
  onShare: () => void;
  onAnnounce?: (message: string) => void;
}

/**
 * Switch between named bundles of formatting settings, and save the current
 * settings as a new one. Presets are stored in localStorage on this device
 * only — they contain formatting preferences, never document contents.
 */
export function PresetPicker({ options, onApply, onShare, onAnnounce }: PresetPickerProps) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [naming, setNaming] = useState(false);
  const [draftName, setDraftName] = useState('');

  // localStorage is not available during SSR, so load after mount.
  useEffect(() => setPresets(loadPresets()), []);

  const active = matchPreset(options, presets);

  const handleSelect = useCallback(
    (name: string) => {
      const preset = presets.find((p) => p.name === name);
      if (!preset) return;
      onApply(preset.options);
      onAnnounce?.(`Applied the “${preset.name}” preset.`);
    },
    [presets, onApply, onAnnounce],
  );

  const handleSave = useCallback(() => {
    const name = draftName.trim();
    if (!name) return;
    saveCustomPreset(name, options);
    setPresets(loadPresets());
    setNaming(false);
    setDraftName('');
    onAnnounce?.(`Saved the “${name}” preset.`);
  }, [draftName, options, onAnnounce]);

  const handleDelete = useCallback(() => {
    if (!active || active.builtIn) return;
    deleteCustomPreset(active.name);
    setPresets(loadPresets());
    onAnnounce?.(`Deleted the “${active.name}” preset.`);
  }, [active, onAnnounce]);

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label className="flex items-center gap-1.5">
        <span className="text-slate-500">Preset</span>
        <select
          className="rounded border border-slate-300 bg-white px-1.5 py-1 dark:border-slate-700 dark:bg-slate-900"
          value={active?.name ?? ''}
          onChange={(e) => handleSelect(e.target.value)}
        >
          {!active && <option value="">Custom</option>}
          {presets.map((preset) => (
            <option key={preset.name} value={preset.name}>
              {preset.name}
            </option>
          ))}
        </select>
      </label>

      {naming ? (
        <span className="flex items-center gap-1.5">
          <label className="sr-only" htmlFor="preset-name">
            Preset name
          </label>
          <input
            id="preset-name"
            type="text"
            autoFocus
            value={draftName}
            maxLength={MAX_PRESET_NAME_LENGTH}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              } else if (e.key === 'Escape') {
                setNaming(false);
                setDraftName('');
              }
            }}
            placeholder="Preset name"
            className="w-36 rounded border border-slate-300 bg-white px-1.5 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
          <button type="button" className="btn" onClick={handleSave} disabled={!draftName.trim()}>
            Save
          </button>
          <button
            type="button"
            className="btn-ghost px-2"
            onClick={() => {
              setNaming(false);
              setDraftName('');
            }}
          >
            Cancel
          </button>
        </span>
      ) : (
        <>
          <button
            type="button"
            className="btn"
            onClick={() => setNaming(true)}
            title="Save the current settings as a named preset"
          >
            Save as…
          </button>
          {active && !active.builtIn && (
            <button
              type="button"
              className="btn"
              onClick={handleDelete}
              title={`Delete the “${active.name}” preset`}
            >
              Delete
            </button>
          )}
        </>
      )}

      <button
        type="button"
        className="btn"
        onClick={onShare}
        title="Copy a link that opens this tool with these settings"
      >
        Copy settings link
      </button>
    </div>
  );
}
