import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { aria2Client } from "@/api/aria2";
import { OptionField } from "@/components/settings/OptionField";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getOptionsForCategory,
  type OptionCategory,
  optionCategories,
  pickLabel,
} from "@/config/aria2Options";

/**
 * The settings editor itself — shared by the /aria2-settings page and the
 * combined settings tabs. Categories are collapsible accordion sections;
 * desktop gets a sticky table of contents on the left. The host page may
 * control the open category (used for ?cat= URL linking on the standalone
 * page); without control props the panel keeps its own state.
 */
export function Aria2SettingsPanel({
  category,
  onCategoryChange,
}: {
  category?: string;
  onCategoryChange?: (category: string) => void;
} = {}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const queryClient = useQueryClient();
  // "" = everything collapsed (the default); the open section is the accordion
  // value, and closing a section reports "" back through onValueChange.
  const [internalCategory, setInternalCategory] = useState<string>("");
  const activeCategory = category ?? internalCategory;
  const setActiveCategory = (next: string) => {
    setInternalCategory(next);
    onCategoryChange?.(next);
  };
  /** Local edits: key -> new value. Diffed against server values on save. */
  const [edits, setEdits] = useState<Record<string, string>>({});

  const {
    data: options,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["globalOption"],
    queryFn: () => aria2Client.getGlobalOption(),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const saveMutation = useMutation({
    mutationFn: (changes: Record<string, string>) =>
      aria2Client.changeGlobalOption(changes),
    onSuccess: async () => {
      setEdits({});
      await queryClient.invalidateQueries({ queryKey: ["globalOption"] });
      toast.success(t("Aria2 settings saved"));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const current = (key: string) =>
    edits[key] ?? options?.[key] ?? (key === "continue" ? "false" : "");

  const dirtyKeys = useMemo(
    () =>
      Object.entries(edits)
        .filter(([key, value]) => (options?.[key] ?? "") !== value)
        .map(([key]) => key),
    [edits, options],
  );

  const dirtyCount = dirtyKeys.length;
  const dirtyIn = (categoryId: OptionCategory) =>
    dirtyKeys.filter((key) =>
      getOptionsForCategory(categoryId, "global").some((o) => o.key === key),
    ).length;

  const handleTocClick = (categoryId: OptionCategory) => {
    setActiveCategory(categoryId);
    requestAnimationFrame(() => {
      document
        .getElementById(`aria2-cat-${categoryId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSave = () => {
    const changes: Record<string, string> = {};
    for (const key of dirtyKeys) {
      changes[key] = edits[key];
    }
    if (Object.keys(changes).length === 0) return;
    saveMutation.mutate(changes);
  };

  return (
    <div className="space-y-4">
      {isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t("Cannot connect to Aria2. Check your settings.")}
        </div>
      )}

      <div className="flex gap-6">
        {/* Desktop table of contents */}
        <nav className="hidden w-44 shrink-0 md:block">
          <div className="sticky top-20 space-y-1">
            {optionCategories.map((category) => {
              const count = getOptionsForCategory(category.id, "global").length;
              const catDirty = dirtyIn(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleTocClick(category.id)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                    activeCategory === category.id
                      ? "bg-secondary font-medium text-secondary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="truncate">
                    {pickLabel(category.label, lang)}
                  </span>
                  {catDirty > 0 ? (
                    <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                      {catDirty}
                    </span>
                  ) : (
                    <span className="text-xs opacity-50">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          <Accordion
            type="single"
            collapsible
            value={activeCategory}
            onValueChange={setActiveCategory}
          >
            {optionCategories.map((category) => {
              const defs = getOptionsForCategory(category.id, "global");
              const catDirty = dirtyIn(category.id);
              return (
                <AccordionItem
                  key={category.id}
                  value={category.id}
                  id={`aria2-cat-${category.id}`}
                >
                  <AccordionTrigger className="px-1">
                    <span className="flex items-center gap-2">
                      {pickLabel(category.label, lang)}
                      {catDirty > 0 && (
                        <Badge variant="default" className="text-[10px]">
                          {t("{{count}} modified", { count: catDirty })}
                        </Badge>
                      )}
                      <span className="text-xs font-normal text-muted-foreground">
                        {defs.length}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="divide-y divide-border/50">
                    {isLoading
                      ? ["a", "b", "c", "d"].map((key) => (
                          <div
                            key={key}
                            className="flex items-center gap-4 p-3"
                          >
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-9 flex-1" />
                          </div>
                        ))
                      : defs.map((def) => (
                          <OptionField
                            key={def.key}
                            def={def}
                            value={current(def.key)}
                            dirty={dirtyKeys.includes(def.key)}
                            onChange={(value) =>
                              setEdits((prev) => ({
                                ...prev,
                                [def.key]: value,
                              }))
                            }
                          />
                        ))}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </div>

      {/* Sticky save bar */}
      {dirtyCount > 0 && (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-lg border bg-card/95 p-3 shadow-lg backdrop-blur animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none">
          <span className="text-sm text-muted-foreground">
            {t("{{count}} unsaved changes", { count: dirtyCount })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEdits({})}
              disabled={saveMutation.isPending}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              {t("Discard")}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              <Save className="mr-1.5 h-4 w-4" />
              {saveMutation.isPending ? t("Loading...") : t("Save Changes")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Standalone page shell for the desktop sidebar entry. */
export function Aria2Settings() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("Aria2 Settings")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("Live options of the connected aria2 instance")}
          </p>
        </div>
        <Badge variant="outline" className="gap-1 text-xs">
          <SlidersHorizontal className="h-3 w-3" />
          aria2 RPC
        </Badge>
      </div>
      <Aria2SettingsPanel />
    </div>
  );
}
