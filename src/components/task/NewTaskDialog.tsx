import { useHotkeys } from "@tanstack/react-hotkeys";
import { ChevronDown, Plus, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { aria2Client } from "@/api/aria2";
import { Collapsible } from "@/components/Collapsible";
import { OptionField } from "@/components/settings/OptionField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { aria2Options, type OptionCategory } from "@/config/aria2Options";
import { validateOptionValue } from "@/config/optionValidation";
import { useAppStore } from "@/store";

export function NewTaskDialog({
  children,
  enableHotkey = false,
}: {
  children?: React.ReactNode;
  /**
   * The dialog is mounted twice (Sidebar + BottomNav) and Radix portals escape
   * hidden parents, so a global hotkey registered by both instances would open
   * two stacked dialogs. Only one instance may register it.
   */
  enableHotkey?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [urls, setUrls] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  /** Validation errors for advanced options, shown inline on the fields. */
  const [optionErrors, setOptionErrors] = useState<Record<string, string>>({});
  const [taskOptions, setTaskOptions] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const hotkeysEnabled = useAppStore((s) => s.settings.hotkeysEnabled);
  useHotkeys(
    enableHotkey && hotkeysEnabled
      ? [
          {
            hotkey: "Mod+K",
            callback: () => {
              setOpen(true);
            },
          },
        ]
      : [],
  );

  /** Options grouped by category for the collapsible advanced section. */
  const advancedGroups = useMemo(() => {
    const groups = new Map<OptionCategory, typeof aria2Options>();
    for (const def of aria2Options) {
      if (!def.showIn?.includes("new-task")) continue;
      const list = groups.get(def.category) ?? [];
      list.push(def);
      groups.set(def.category, list);
    }
    return [...groups.entries()];
  }, []);

  const collectOptions = () => {
    const options: Record<string, string> = {};
    for (const [key, value] of Object.entries(taskOptions)) {
      if (value.trim() !== "") options[key] = value.trim();
    }
    return options;
  };

  /** Schema violations among the advanced options, keyed by option key. */
  const collectOptionErrors = () => {
    const errors: Record<string, string> = {};
    for (const [key, value] of Object.entries(taskOptions)) {
      const error = validateOptionValue(key, value, t);
      if (error) errors[key] = error;
    }
    return errors;
  };

  const resetForm = () => {
    setUrls("");
    setTaskOptions({});
    setOptionErrors({});
    setShowAdvanced(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const errors = collectOptionErrors();
    if (Object.keys(errors).length > 0) {
      setOptionErrors(errors);
      // the fields carrying the errors live in the advanced section
      setShowAdvanced(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setOptionErrors({});

    const options = collectOptions();
    // BT output names come from the torrent itself; `out` is HTTP-only.
    delete options.out;
    let successCount = 0;
    let failCount = 0;

    for (const file of Array.from(files)) {
      try {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            "",
          ),
        );
        await aria2Client.addTorrent(base64, undefined, options);
        successCount++;
      } catch (err) {
        failCount++;
        console.error(`Failed to add ${file.name}:`, err);
      }
    }

    if (successCount > 0) {
      toast.success(t("Added {{count}} tasks", { count: successCount }));
    }
    if (failCount > 0) {
      toast.error(t("Failed to add {{count}} tasks", { count: failCount }));
    }
    if (successCount > 0) {
      setOpen(false);
      resetForm();
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urls.trim()) return;

    const urlList = urls
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (urlList.length === 0) return;

    const errors = collectOptionErrors();
    if (Object.keys(errors).length > 0) {
      setOptionErrors(errors);
      // the fields carrying the errors live in the advanced section
      setShowAdvanced(true);
      return;
    }
    setOptionErrors({});

    const options = collectOptions();

    // Each line is a separate task. A single aria2.addUri call with multiple
    // URIs would treat them as mirrors of ONE download, which is never what
    // users mean when pasting different links.
    const results = await Promise.allSettled(
      urlList.map((url) => aria2Client.addUri([url], options)),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    const succeeded = results.length - failed;

    if (succeeded > 0) {
      toast.success(t("Added {{count}} tasks", { count: succeeded }));
    }
    if (failed > 0) {
      toast.error(t("Failed to add {{count}} tasks", { count: failed }));
    }
    if (succeeded > 0) {
      setOpen(false);
      resetForm();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        {children || (
          <Button className="w-full gap-2 transition-all hover:scale-[1.02]">
            <Plus className="w-4 h-4" /> {t("New Task")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("Add New Task")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <Textarea
            placeholder={t("Enter URLs, one per line...")}
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            rows={5}
            autoFocus
          />

          {/* Collapsible advanced options, schema-driven */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex w-full items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="flex-1 border-t" />
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            />
            {t("Advanced Options")}
            <span className="flex-1 border-t" />
          </button>

          <Collapsible open={showAdvanced}>
            <div className="space-y-4 rounded-lg border bg-muted/30 p-2">
              {advancedGroups.map(([category, defs]) => (
                <div key={category} className="space-y-1">
                  <h4 className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t(`options.categories.${category}`)}
                  </h4>
                  {defs.map((def) => (
                    <OptionField
                      key={def.key}
                      def={def}
                      value={taskOptions[def.key] ?? ""}
                      dirty={false}
                      error={optionErrors[def.key]}
                      onChange={(value) => {
                        setTaskOptions((prev) => ({
                          ...prev,
                          [def.key]: value,
                        }));
                        setOptionErrors((prev) => {
                          if (!(def.key in prev)) return prev;
                          const next = { ...prev };
                          delete next[def.key];
                          return next;
                        });
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </Collapsible>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".torrent"
            multiple
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t("Upload .torrent file")}
          </Button>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              {t("Cancel")}
            </Button>
            <Button type="submit">{t("Download")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
