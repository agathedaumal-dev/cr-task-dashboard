import { TopNav } from "@/components/layout/top-nav"
import { Toaster } from "@/components/ui/sonner"
import { appConfig } from "@/lib/app-config";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />

      <main className="flex-1 w-full max-w-[1920px] mx-auto p-6 lg:p-10">
        {children}
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground border-t bg-card">
        <p>© {appConfig.appName} - personal deployment.</p>
      </footer>

      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "!bg-card text-foreground border-border shadow-lg",
          },
        }}
      />
    </div>
  )
}
