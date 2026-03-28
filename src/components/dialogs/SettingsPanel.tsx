import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import type { ThemeName } from '../../types';

interface SettingsPanelProps {
  onClose: () => void;
}

type SettingsTab = 'theme' | 'colors' | 'cursor' | 'sounds';

interface ColorRowProps {
  label: string;
  value: string | null;
  fallback: string;
  onChange: (color: string | null) => void;
}

function ColorRow({ label, value, fallback, onChange }: ColorRowProps) {
  const displayColor = value ?? fallback;

  return (
    <div className="settings-color-row">
      <span className="settings-color-label">{label}</span>
      <div className="settings-color-controls">
        <input
          type="color"
          value={displayColor}
          onChange={(e) => onChange(e.target.value)}
          className="settings-color-input"
        />
        <span className="settings-color-hex">{displayColor}</span>
        {value !== null && (
          <button
            className="settings-color-reset"
            onClick={() => onChange(null)}
            title="Reset to theme default"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (val: number) => void;
}

function SliderRow({ label, value, min, max, unit, onChange }: SliderRowProps) {
  return (
    <div className="settings-slider-row">
      <div className="settings-slider-header">
        <span className="settings-color-label">{label}</span>
        <span className="settings-slider-value">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="settings-slider"
      />
    </div>
  );
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('theme');

  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const customAccentColor = useAppStore((s) => s.customAccentColor);
  const customEyeColor = useAppStore((s) => s.customEyeColor);
  const customCaretColor = useAppStore((s) => s.customCaretColor);
  const setCustomAccentColor = useAppStore((s) => s.setCustomAccentColor);
  const setCustomEyeColor = useAppStore((s) => s.setCustomEyeColor);
  const setCustomCaretColor = useAppStore((s) => s.setCustomCaretColor);
  const caretWidth = useAppStore((s) => s.caretWidth);
  const caretHeightPercent = useAppStore((s) => s.caretHeightPercent);
  const setCaretWidth = useAppStore((s) => s.setCaretWidth);
  const setCaretHeightPercent = useAppStore((s) => s.setCaretHeightPercent);

  // Get current theme defaults for color picker fallbacks
  const getComputedVar = (name: string) => {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };

  const themes: { id: ThemeName; label: string }[] = [
    { id: 'monokai', label: 'Monokai (Dark)' },
    { id: 'sixteen', label: 'Sixteen (Light)' },
    { id: 'celeste', label: 'Celeste (Light)' },
    { id: 'breeze', label: 'Breeze (Light)' },
  ];

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'theme' ? 'settings-tab-active' : ''}`}
            onClick={() => setActiveTab('theme')}
          >
            Theme
          </button>
          <button
            className={`settings-tab ${activeTab === 'colors' ? 'settings-tab-active' : ''}`}
            onClick={() => setActiveTab('colors')}
          >
            Colors
          </button>
          <button
            className={`settings-tab ${activeTab === 'cursor' ? 'settings-tab-active' : ''}`}
            onClick={() => setActiveTab('cursor')}
          >
            Cursor
          </button>
          <button
            className={`settings-tab ${activeTab === 'sounds' ? 'settings-tab-active' : ''}`}
            onClick={() => setActiveTab('sounds')}
          >
            Sounds
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'theme' && (
            <div className="settings-theme-list">
              {themes.map((t) => (
                <button
                  key={t.id}
                  className={`settings-theme-option ${theme === t.id ? 'settings-theme-active' : ''}`}
                  onClick={() => setTheme(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'colors' && (
            <div className="settings-colors-list">
              <ColorRow
                label="Accent"
                value={customAccentColor}
                fallback={getComputedVar('--accent') || '#a6e22e'}
                onChange={setCustomAccentColor}
              />
              <ColorRow
                label="Eye Icon"
                value={customEyeColor}
                fallback={getComputedVar('--eye-color') || '#f8f8f2'}
                onChange={setCustomEyeColor}
              />
              <ColorRow
                label="Cursor Color"
                value={customCaretColor}
                fallback={getComputedVar('--caret-color') || '#f8f8f2'}
                onChange={setCustomCaretColor}
              />
            </div>
          )}

          {activeTab === 'cursor' && (
            <div className="settings-cursor-list">
              <SliderRow
                label="Thickness"
                value={caretWidth}
                min={1}
                max={6}
                unit="px"
                onChange={setCaretWidth}
              />
              <SliderRow
                label="Height"
                value={caretHeightPercent}
                min={50}
                max={120}
                unit="%"
                onChange={setCaretHeightPercent}
              />
            </div>
          )}

          {activeTab === 'sounds' && (
            <div className="settings-sounds-placeholder">
              <span className="settings-placeholder-text">
                Sound settings coming soon
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
