import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { env } from "@/lib/env";
import { appConfig } from "@/lib/app-config";

export default async function UnauthorizedPage() {
  const { userId, sessionClaims } = await auth();
  const publicMetadata =
    (sessionClaims?.metadata ?? {}) as Record<string, unknown>;
  const appIdentifier = env.APP_IDENTIFIER;
  const isAuthorized = appIdentifier
    ? Object.prototype.hasOwnProperty.call(publicMetadata, appIdentifier)
    : false;

  if (isAuthorized) {
    redirect("/");
  }

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
            <span role="img" aria-label="Locked">
              🔒
            </span>
          </div>

          <Typography
            as="h1"
            variant="title"
            size="l"
            weight="book"
            className="mt-6"
          >
            Access Denied
          </Typography>

          <Typography as="p" variant="body" size="m" weight="medium" className="mt-3">
            You are not authorized to access the{" "}
            <span className="font-medium text-primary">{appConfig.appName}</span> page.
          </Typography>

          <Typography
            as="p"
            variant="body"
            size="m"
            weight="medium"
            className="mt-2 text-muted-foreground"
          >
            To request access, please contact the {appConfig.ownerTeam} team at{" "}
          <a href={`mailto:${appConfig.supportEmail}`} >
            {appConfig.supportEmail}
            </a>.
          </Typography>

          <div className="mt-8">
            <Button asChild size="lg">
              <Link href={`mailto:${appConfig.supportEmail}`} >Contact {appConfig.ownerTeam}</Link>
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