import { PageTransition } from "@/components/PageTransition";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      <Sidebar className="hidden md:flex" />
      <div className="flex flex-1 flex-col w-full h-full min-w-0 bg-muted/20">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 relative w-full">
          <PageTransition>{children}</PageTransition>
        </main>
        <StatusBar />
        <BottomNav className="md:hidden" />
      </div>
    </div>
  );
}
