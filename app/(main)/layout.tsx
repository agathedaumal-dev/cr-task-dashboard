import { auth } from "@clerk/nextjs/server"
import { TopNav } from "@/components/layout/top-nav"
import { Toaster } from "@/components/ui/sonner"
import { appConfig } from "@/lib/app-config";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await auth.protect()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />

      <main className="flex-1 w-full max-w-[1920px] mx-auto p-6 lg:p-10">
        {children}
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground border-t bg-card">
        <p>© {appConfig.appName} - powered by papervibes.<a href="#" className="underline hover:text-primary"></a></p>
      </footer>

      {/* Customized Sonner: Opaque & Colored */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          //className: "!bg-card text-foreground border-border shadow-lg",
          classNames: {
            toast: "!bg-card text-foreground border-border shadow-lg",
          },
        }}
      /> 
    </div>
  )
}