"use client";

import { Folder, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { listProjectsAction } from "@/actions/project";
import { listSessionsAction } from "@/actions/session";
import { PageLayout } from "@/components/layout/PageLayout";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { ProjectSkeleton } from "@/components/ui/skeleton-loader";
import { SwipeableCard } from "@/components/ui/swipeable-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Project } from "@/core/domain/project/types";
import type { Session } from "@/core/domain/session/types";
import { formatDate, formatRelativeTime } from "@/lib/date";
import { getSessionDisplayName } from "@/lib/sessionName";

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
          <div className="max-w-4xl mx-auto">
            <header className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold">
                Claude Code Chat Logs
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-2">
                Browse your Claude Code projects and chat sessions
              </p>
            </header>

            <Tabs defaultValue="projects" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
              </TabsList>

              <TabsContent value="projects" className="mt-6">
                <div className="space-y-4">
                  {loadingProjects ? (
                    <div className="grid gap-2 sm:gap-3">
                      {Array.from({ length: 3 }, (_, i) => (
                        <ProjectSkeleton key={`project-skeleton-${i + 1}`} />
                      ))}
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="text-center py-12">
                      <Folder className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        No projects found.
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Projects will appear here when chat logs are detected.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:gap-3">
                      {projects.map((project) => (
                        <SwipeableCard
                          key={project.id}
                          onSwipeRight={() =>
                            router.push(`/projects/${project.id}`)
                          }
                          className="cursor-pointer"
                        >
                          <Link
                            href={`/projects/${project.id}`}
                            className="group block p-4 sm:p-5 border rounded-lg hover:bg-accent/50 hover:border-accent transition-all active:scale-[0.98]"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Folder className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                <div>
                                  <h3 className="font-medium group-hover:text-primary transition-colors">
                                    {project.name}
                                  </h3>
                                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                    {formatDate(project.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <span className="text-muted-foreground group-hover:translate-x-1 transition-transform">
                                →
                              </span>
                            </div>
                          </Link>
                        </SwipeableCard>
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
                      <p className="text-muted-foreground">
                        No sessions found.
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Sessions will appear here when chat logs are detected.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:gap-3">
                      {sessions.map((session) => (
                        <SwipeableCard
                          key={session.id}
                          onSwipeRight={() =>
                            router.push(`/sessions/${session.id}`)
                          }
                          className="cursor-pointer"
                        >
                          <Link
                            href={`/sessions/${session.id}`}
                            className="group block p-4 sm:p-5 border rounded-lg hover:bg-accent/50 hover:border-accent transition-all active:scale-[0.98]"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 min-w-0">
                                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                                <div className="min-w-0">
                                  <h3 className="font-medium group-hover:text-primary transition-colors truncate">
                                    {getSessionDisplayName(session.name)}
                                  </h3>
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                                    <span>{formatDate(session.createdAt)}</span>
                                    {session.lastMessageAt && (
                                      <>
                                        <span className="hidden sm:inline">
                                          •
                                        </span>
                                        <span className="text-xs">
                                          Last message{" "}
                                          {formatRelativeTime(
                                            session.lastMessageAt,
                                          )}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className="text-muted-foreground group-hover:translate-x-1 transition-transform flex-shrink-0">
                                →
                              </span>
                            </div>
                          </Link>
                        </SwipeableCard>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </PullToRefresh>
    </PageLayout>
  );
}
