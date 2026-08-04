import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { appConfig } from "@/lib/app-config";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <section className="w-full max-w-[520px]">
        <div className="rounded-3xl border border-border/60 bg-background px-8 py-10 text-center shadow-xl">
          <Image
            src={appConfig.logoUrl}
            alt="Papernest Logo"
            width={280}
            height={64}
            className="mx-auto h-10 w-auto"
            priority
          />

          <div className="mx-auto mt-8 flex size-16 items-center justify-center rounded-full bg-secondary text-3xl">
            <span role="img" aria-label="Forbidden">
              🛑
            </span>
          </div>

          <Typography
            as="h1"
            variant="title"
            size="l"
            weight="book"
            className="mt-6"
          >
            Action Forbidden
          </Typography>

          <Typography as="p" variant="body" size="m" weight="medium" className="mt-3">
            You do not have the required permissions to view this page or perform this action.
          </Typography>

          <Typography
            as="p"
            variant="body"
            size="m"
            weight="medium"
            className="mt-2 text-muted-foreground"
          >
            If you believe this is a mistake, please contact the {appConfig.ownerTeam} team at{" "}
            <a href={`mailto:${appConfig.supportEmail}`} className="underline hover:text-primary">
              {appConfig.supportEmail}
            </a>.
          </Typography>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild variant="outline" size="lg">
              <Link href="/">Return Home</Link>
            </Button>
            <Button asChild size="lg">
              <Link href={`mailto:${appConfig.supportEmail}`}>Contact {appConfig.ownerTeam}</Link>
            </Button>
          </div>

          <Typography
            as="p"
            variant="caption"
            size="s"
            weight="book"
            className="mt-8 text-muted-foreground"
          >
            © papervibes. All rights reserved.
          </Typography>
        </div>
      </section>
    </main>
  );
}