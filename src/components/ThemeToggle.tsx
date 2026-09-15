import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { colorSchemes } from "@/lib/colorSchemes";
import { useAppStore } from "@/store";

function SchemeDot({ schemeId }: { schemeId: string }) {
  const theme = useAppStore((s) => s.theme);
  const scheme = colorSchemes.find((s) => s.id === schemeId) ?? colorSchemes[0];
  const [bg, accent] =
    theme === "light" ? scheme.swatch.light : scheme.swatch.dark;
  return (
    <span
      className="flex h-4 w-4 items-center justify-center rounded-full border border-border"
      style={{ backgroundColor: bg }}
      aria-hidden
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: accent }}
      />
    </span>
  );
}

export function ThemeToggle() {
  const { theme, setTheme, colorScheme, setColorScheme } = useAppStore();
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          {theme === "light" && <Sun className="h-4 w-4" />}
          {theme === "dark" && <Moon className="h-4 w-4" />}
          {theme === "system" && <Monitor className="h-4 w-4" />}
          <span className="sr-only">{t("Toggle Theme")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}
        >
          <DropdownMenuRadioItem value="light">
            <Sun className="mr-2 h-4 w-4" />
            {t("Light Theme")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="mr-2 h-4 w-4" />
            {t("Dark Theme")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="mr-2 h-4 w-4" />
            {t("System Theme")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Palette className="h-3 w-3" />
          {t("Color Scheme")}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={colorScheme}
          onValueChange={setColorScheme}
        >
          {colorSchemes.map((scheme) => (
            <DropdownMenuRadioItem key={scheme.id} value={scheme.id}>
              <SchemeDot schemeId={scheme.id} />
              <span className="ml-2">{scheme.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
