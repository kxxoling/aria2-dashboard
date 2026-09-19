import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Aria2OptionDef } from "@/config/aria2Options";
import { pickLabel } from "@/config/aria2Options";
import { formatBytes } from "@/lib/utils.format";

/**
 * Renders one schema-driven aria2 option field. aria2 stores every option as
 * a string, so all inputs produce string values.
 */
export function OptionField({
  def,
  value,
  dirty,
  disabled,
  onChange,
}: {
  def: Aria2OptionDef;
  value: string;
  dirty: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const id = useMemo(() => `aria2-option-${def.key}`, [def.key]);
  const inputDisabled = disabled || def.readonly;
  // Placeholders are English source strings acting as i18n keys; untranslated
  // technical hints (paths, URL patterns) fall back to the key itself.
  const placeholder = def.placeholder ? t(def.placeholder) : undefined;
  const suffix = def.suffix ? pickLabel(def.suffix, lang) : undefined;
  // aria2 reports byte counts for size options; render read-only ones
  // human-readable (editable fields keep the raw value to avoid fight the user).
  const humanSize =
    def.sizeFormat && !dirty && /^\d+$/.test(value) && Number(value) > 0
      ? `≈ ${formatBytes(Number(value))}`
      : null;

  return (
    <div
      className={`grid gap-1.5 rounded-md border p-3 transition-colors md:grid-cols-[minmax(160px,240px)_1fr] md:items-start md:gap-4 ${
        dirty
          ? "border-primary/40 bg-primary/5"
          : "border-transparent hover:border-border"
      }`}
    >
      <div className="flex min-w-0 flex-col gap-0.5 pt-2">
        <Label
          htmlFor={id}
          className={`text-sm ${inputDisabled ? "text-muted-foreground" : ""}`}
        >
          {pickLabel(def.label, lang)}
        </Label>
        <code className="truncate font-mono text-[11px] text-muted-foreground/70">
          {def.key}
        </code>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          {def.type === "boolean" ? (
            <Checkbox
              id={id}
              checked={value === "true"}
              disabled={inputDisabled}
              onCheckedChange={(v) => onChange(v ? "true" : "false")}
            />
          ) : def.type === "select" ? (
            <select
              id={id}
              value={value}
              disabled={inputDisabled}
              onChange={(e) => onChange(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {def.choices?.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          ) : def.type === "text" ? (
            <Textarea
              id={id}
              value={value}
              disabled={inputDisabled}
              placeholder={placeholder}
              onChange={(e) => onChange(e.target.value)}
              rows={Math.min(6, Math.max(2, value.split("\n").length))}
              className="font-mono text-xs"
            />
          ) : (
            <Input
              id={id}
              type={def.type === "password" ? "password" : "text"}
              inputMode={def.type === "number" ? "numeric" : undefined}
              value={humanSize ?? value}
              disabled={inputDisabled || humanSize !== null}
              placeholder={placeholder}
              onChange={(e) => onChange(e.target.value)}
              className="font-mono text-sm"
            />
          )}
        </div>

        {suffix && !dirty && (
          <span className="hidden shrink-0 text-xs text-muted-foreground lg:inline">
            {suffix}
          </span>
        )}
        {dirty && (
          <span className="shrink-0 text-xs font-medium text-primary">
            {t("Modified")}
          </span>
        )}
        {def.readonly && (
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {t("Read only")}
          </span>
        )}
      </div>
    </div>
  );
}
