"use client"

import { usePathname } from "next/navigation"
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
import { navigation } from "@/lib/navigation"

export function AppHeader() {
  const pathname = usePathname()
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

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.url} className="contents">
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.url}>{crumb.title}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  )
}
