"use client";

import * as React from "react";
import { FileStack, MessagesSquare, PlusIcon, Shapes } from "lucide-react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "New Chat",
      url: "#",
      icon: PlusIcon,
      isActive: true,
    },
    {
      title: "Chats",
      url: "#",
      icon: MessagesSquare,
    },
    {
      title: "Projects",
      url: "#",
      icon: FileStack,
    },
    {
      title: "Artifacts",
      url: "#",
      icon: Shapes,
    },
  ],
  recents: [
    { title: "Explain Next.js Middleware", url: "#" },
    { title: "Database Schema Design for SaaS", url: "#" },
    { title: "Postgres RLS Example", url: "#" },
    { title: "Refactor Sidebar Component", url: "#" },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
            Claude
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.navMain} />
        <div className="mt-4 group-data-[collapsible=icon]:hidden">
          <h4 className="px-3 text-sm font-medium text-muted-foreground">
            Recents
          </h4>
          <div className="mt-2">
            <NavMain
              items={data.recents.map((chat) => ({
                title: chat.title,
                url: chat.url,
                icon: undefined,
              }))}
            />
          </div>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
