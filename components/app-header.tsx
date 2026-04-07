"use client"

import { usePathname, useRouter } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { LogOut, User } from "lucide-react"
import { navigation } from "@/lib/navigation"
import { logout } from "@/lib/auth"

export function AppHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const segments = pathname.split("/").filter(Boolean)

  const getBreadcrumbs = () => {
    const breadcrumbs: { title: string; url: string; isLast: boolean }[] = []

    if (segments.length === 0) {
      return [{ title: "Dashboard", url: "/", isLast: true }]
    }

    let currentPath = ""
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const isLast = index === segments.length - 1

      // Find title from navigation
      let title = segment.charAt(0).toUpperCase() + segment.slice(1)

      for (const navItem of navigation) {
        if (navItem.url === currentPath) {
          title = navItem.title
          break
        }
        if (navItem.items) {
          for (const subItem of navItem.items) {
            if (subItem.url === currentPath) {
              title = subItem.title
              break
            }
          }
        }
      }

      breadcrumbs.push({ title, url: currentPath, isLast })
    })

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()
  const compactBreadcrumbs = breadcrumbs.length > 0 ? [breadcrumbs[breadcrumbs.length - 1]] : []

  const handleLogout = () => {
    logout()
    router.replace("/login")
  }

  return (
    <header className="flex h-14 min-w-0 shrink-0 items-center gap-2 border-b bg-background px-3 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 hidden h-4 sm:block" />
      <Breadcrumb className="min-w-0 flex-1 overflow-hidden">
        <BreadcrumbList className="hidden min-w-0 flex-nowrap overflow-hidden md:flex">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.url} className="contents">
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage className="truncate">{crumb.title}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.url} className="truncate">
                    {crumb.title}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
        <BreadcrumbList className="min-w-0 flex-nowrap overflow-hidden md:hidden">
          {compactBreadcrumbs.map((crumb) => (
            <BreadcrumbItem key={crumb.url} className="min-w-0">
              <BreadcrumbPage className="truncate">{crumb.title}</BreadcrumbPage>
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menú de usuario">
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
