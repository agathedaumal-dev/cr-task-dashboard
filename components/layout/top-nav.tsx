"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/layout/navigation-menu"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { ChevronDown } from "lucide-react"
import { appConfig } from "@/lib/app-config";

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card">
      <div className="flex h-20 items-center px-6 lg:px-10 justify-between max-w-[1920px] mx-auto">
        
        {/* Left Section: Logo + Navigation */}
        <div className="flex items-center gap-10">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src={appConfig.logoUrl}
              alt="papernest"
              width={120}
              height={32}
              className="h-8 w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList className="gap-2">
              
              <NavigationMenuItem>
                <NavigationMenuTrigger 
                  className="bg-secondary hover:bg-secondary/80 data-[state=open]:bg-secondary/80 cursor-default"
                >
                  <Typography
                    as="span"
                    variant="body"
                    size="l"
                    weight="medium"
                    className="text-muted-foreground"
                  >
                    Tools & Apps
                  </Typography>
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid gap-3 p-6 w-[400px]">
                    <ListItem href="/tools/analytics" title="Analytics">
                      Business intelligence and reporting dashboards.
                    </ListItem>
                    <ListItem href="/tools/admin" title="Admin Panel">
                      User management and system configuration.
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger 
                  className="bg-secondary hover:bg-secondary/80 data-[state=open]:bg-secondary/80 cursor-default"
                >
                  <Typography
                    as="span"
                    variant="body"
                    size="l"
                    weight="medium"
                    className="text-muted-foreground"
                  >
                    Resources
                  </Typography>
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid gap-3 p-6 w-[400px]">
                    <ListItem href="/docs/api" title="API Docs">
                      Internal API endpoints and usage guides.
                    </ListItem>
                    <ListItem href="/docs/guides" title="Playbooks">
                      Standard operating procedures (SOPs).
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger 
                  className="bg-secondary hover:bg-secondary/80 data-[state=open]:bg-secondary/80 cursor-default"
                >
                  <Typography
                    as="span"
                    variant="body"
                    size="l"
                    weight="medium"
                    className="text-muted-foreground"
                  >
                    My Dashboard
                  </Typography>
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid gap-3 p-6 w-[420px] grid-cols-2">
                    <ListItem href="/my-todo" title="My To-Do">
                      Overdue, Today, This Week, Upcoming.
                    </ListItem>
                    <ListItem href="/interlocutors" title="Interlocutors">
                      Follow-ups per stakeholder.
                    </ListItem>
                    <ListItem href="/products/carbon-comp-fr" title="Carbon Comp FR">
                      My + their tasks for France.
                    </ListItem>
                    <ListItem href="/products/carbon-comp-sp" title="Carbon Comp SP">
                      My + their tasks for Spain.
                    </ListItem>
                    <ListItem href="/products/carbon-comp-it" title="Carbon Comp IT">
                      My + their tasks for Italy.
                    </ListItem>
                    <ListItem href="/products/mrh" title="MRH">
                      My + their tasks for MRH.
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Right Section: Buttons & User Actions */}
        <div className="flex items-center gap-4">
          
          {/* Secondary Action (Green) */}
          <Button 
            className="hidden lg:inline-flex btn-terciary px-8 h-11 rounded-lg"
          >
            <Typography
              as="span"
              variant="body"
              size="l"
              weight="medium"
              className="text-white"
            >
              Documentation
            </Typography>
          </Button>

          {/* Primary Action (Purple) */}
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 h-11"
          >
            <Typography
              as="span"
              variant="body"
              size="l"
              weight="medium"
              className="text-white"
            >
              New Request
            </Typography>
          </Button>

          <div className="h-8 w-px bg-border mx-1 hidden sm:block" />

          {/* Language Selector (Hidden for now) */}
          <div className="hidden items-center gap-1 cursor-pointer hover:text-primary transition-colors">
            <Typography as="span" variant="body" size="s" weight="medium">
              FR
            </Typography>
            <ChevronDown className="h-4 w-4" />
          </div>

        </div>
      </div>
    </header>
  )
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <Typography as="div" variant="body" size="s" weight="medium">
            {title}
          </Typography>
          <Typography
            as="p"
            variant="body"
            size="s"
            weight="medium"
            className="line-clamp-2 leading-snug text-muted-foreground"
          >
            {children}
          </Typography>
        </a>
      </NavigationMenuLink>
    </li>
  )
})
ListItem.displayName = "ListItem"