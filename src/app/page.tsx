"use client";

import { Folder, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { listProjectsAction } from "@/actions/project";
import { listSessionsAction } from "@/actions/session";
import { PageLayout } from "@/components/layout/PageLayout";
import { NewChatButton } from "@/components/project/NewChatButton";
import { SessionListItem } from "@/components/session/SessionListItem";
import { ProjectListItem } from "@/components/project/ProjectListItem";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { ProjectSkeleton } from "@/components/ui/skeleton-loader";
import { SwipeableCard } from "@/components/ui/swipeable-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Project } from "@/core/domain/project/types";
import type { Session } from "@/core/domain/session/types";
import { formatDate } from "@/lib/date";

export default function Home() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const [projectsResult, sessionsResult] = await Promise.all([
        listProjectsAction({
          pagination: {
            page: 1,
            limit: 100,
            order: "desc",
            orderBy: "updatedAt",
          },
        }),
        listSessionsAction({
          pagination: {
            page: 1,
            limit: 100,
            order: "desc",
            orderBy: "updatedAt",
          },
        }),
      ]);

      setProjects(projectsResult.items);
      setSessions(sessionsResult.items);
      setLoadingProjects(false);
      setLoadingSessions(false);
    };
    loadData();
  }, []);

  const handleRefresh = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const [projectsResult, sessionsResult] = await Promise.all([
      listProjectsAction({
        pagination: {
          page: 1,
          limit: 100,
          order: "desc",
          orderBy: "updatedAt",
        },
      }),
      listSessionsAction({
        pagination: {
          page: 1,
          limit: 100,
          order: "desc",
          orderBy: "updatedAt",
        },
      }),
    ]);
    setProjects(projectsResult.items);
    setSessions(sessionsResult.items);
  };

  return (
    <PageLayout>
      <PullToRefresh onRefresh={handleRefresh} className="h-full">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <Tabs defaultValue="projects" className="">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
            </TabsList>

            <TabsContent value="projects" className="mt-2">
              <div className="space-y-4">
                {loadingProjects ? (
                  <div className="grid gap-3 sm:gap-4">
                    {Array.from({ length: 3 }, (_, i) => (
                      <ProjectSkeleton key={`project-skeleton-${i + 1}`} />
                    ))}
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-12">
                    <Folder className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No projects found.</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Projects will appear here when chat logs are detected.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:gap-4">
                    {projects.map((project) => (
                      <ProjectListItem
                        key={project.id}
                        project={project}
                        href={`/projects/${project.id}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="sessions" className="mt-6">
              <div className="space-y-4">
                {loadingSessions ? (
                  <div className="grid gap-2 sm:gap-3">
                    {Array.from({ length: 3 }, (_, i) => (
                      <ProjectSkeleton key={`session-skeleton-${i + 1}`} />
                    ))}
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No sessions found.</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Sessions will appear here when chat logs are detected.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:gap-3 w-full">
                    {sessions.map((session) => (
                      <SwipeableCard
                        key={session.id}
                        onSwipeRight={() =>
                          router.push(`/sessions/${session.id}`)
                        }
                        className="cursor-pointer"
                      >
                        <SessionListItem
                          session={session}
                          href={`/sessions/${session.id}`}
                          className="active:scale-[0.98]"
                        />
                      </SwipeableCard>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </PullToRefresh>
    </PageLayout>
  );
}
