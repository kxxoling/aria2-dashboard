import { Gauge, Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { normalizeLanguage, SUPPORTED_LANGUAGES } from "@/i18n";
import { colorSchemes } from "@/lib/colorSchemes";
import { type AppSettings, defaultSettings, useAppStore } from "@/store";

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[hsl(var(--primary))]"
        aria-label={label}
      />
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  step,
  suffix,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  step: number;
  suffix: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n >= min) onChange(n);
        }}
        aria-label={label}
        className="h-8 w-24 rounded-md border border-input bg-transparent px-2 text-right text-sm tabular-nums shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <span className="text-xs text-muted-foreground">{suffix}</span>
    </span>
  );
}

const selectClass =
  "h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/** UI behavior preferences (language, notifications, confirmations). */
export function InterfaceSettingsPanel() {
  const { t, i18n } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const colorScheme = useAppStore((s) => s.colorScheme);
  const setColorScheme = useAppStore((s) => s.setColorScheme);

  const applyLanguage = (pref: AppSettings["language"]) => {
    setSettings({ language: pref });
    if (pref === "system") {
      i18n.changeLanguage(normalizeLanguage(navigator.language));
    } else {
      i18n.changeLanguage(pref);
    }
  };

  return (
    <div className="max-w-xl space-y-1 pt-2">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Globe2 className="h-4 w-4" />
        {t("Interface")}
      </div>

      <SettingRow
        label={t("Language")}
        hint={t("Applies instantly; follows your system by default")}
      >
        <select
          value={settings.language}
          onChange={(e) =>
            applyLanguage(e.target.value as AppSettings["language"])
          }
          aria-label={t("Language")}
          className={selectClass}
        >
          <option value="system">{t("Follow system")}</option>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.nativeName}
            </option>
          ))}
        </select>
      </SettingRow>

      <SettingRow
        label={t("Color Scheme")}
        hint={t("Palette applied on top of light/dark mode")}
      >
        <select
          value={colorScheme}
          onChange={(e) => setColorScheme(e.target.value)}
          aria-label={t("Color Scheme")}
          className={selectClass}
        >
          {colorSchemes.map((scheme) => (
            <option key={scheme.id} value={scheme.id}>
              {scheme.label}
            </option>
          ))}
        </select>
      </SettingRow>

      <SettingRow
        label={t("Show speed in tab title")}
        hint={t("Live download/upload rates in the browser tab")}
      >
        <Toggle
          checked={settings.titleSpeedEnabled}
          onChange={(v) => setSettings({ titleSpeedEnabled: v })}
          label={t("Show speed in tab title")}
        />
      </SettingRow>

      <SettingRow
        label={t("Notify when downloads complete")}
        hint={t("Uses the browser notification API")}
      >
        <Toggle
          checked={settings.browserNotification}
          onChange={(v) => {
            if (v && typeof Notification !== "undefined") {
              Notification.requestPermission();
            }
            setSettings({ browserNotification: v });
          }}
          label={t("Notify when downloads complete")}
        />
      </SettingRow>

      <SettingRow
        label={t("Confirm before removing tasks")}
        hint={t("Ask before single or batch removal")}
      >
        <Toggle
          checked={settings.confirmTaskRemoval}
          onChange={(v) => setSettings({ confirmTaskRemoval: v })}
          label={t("Confirm before removing tasks")}
        />
      </SettingRow>

      <SettingRow label={t("Keyboard shortcuts")} hint="Cmd/Ctrl + K">
        <Toggle
          checked={settings.hotkeysEnabled}
          onChange={(v) => setSettings({ hotkeysEnabled: v })}
          label={t("Keyboard shortcuts")}
        />
      </SettingRow>

      <div className="mt-4 mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Gauge className="h-4 w-4" />
        {t("Performance")}
      </div>

      <SettingRow
        label={t("Global stats refresh")}
        hint={t("Header rates and counters poll interval")}
      >
        <NumberInput
          value={settings.globalStatInterval}
          min={250}
          step={250}
          suffix="ms"
          label={t("Global stats refresh")}
          onChange={(v) => setSettings({ globalStatInterval: v })}
        />
      </SettingRow>

      <SettingRow
        label={t("Task list refresh")}
        hint={t("How often the task table polls aria2")}
      >
        <NumberInput
          value={settings.taskListInterval}
          min={500}
          step={500}
          suffix="ms"
          label={t("Task list refresh")}
          onChange={(v) => setSettings({ taskListInterval: v })}
        />
      </SettingRow>

      <SettingRow
        label={t("WebSocket reconnect delay")}
        hint={t("Wait before retrying a dropped WebSocket connection")}
      >
        <NumberInput
          value={settings.wsReconnectInterval}
          min={1000}
          step={1000}
          suffix="ms"
          label={t("WebSocket reconnect delay")}
          onChange={(v) => setSettings({ wsReconnectInterval: v })}
        />
      </SettingRow>

      <p className="pt-2 text-xs text-muted-foreground">
        {t("Defaults")}：{defaultSettings.globalStatInterval} /{" "}
        {defaultSettings.taskListInterval} /{" "}
        {defaultSettings.wsReconnectInterval} ms
      </p>
    </div>
  );
}
