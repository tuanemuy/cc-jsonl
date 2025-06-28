"use client";

import { useProjects } from "@/hooks/useProjects";
import { useSessions } from "@/hooks/useSessions";
import { useLocalStorage } from "@/hooks/useLocalStorage";

import { PageLayout } from "@/components/layout/PageLayout";
import { ProjectList } from "@/components/project/ProjectList";
import { SessionList } from "@/components/session/SessionList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const {
    projects,
    count: projectsCount,
    loadNext: loadProjectsNext,
    loading: projectsLoading,
    hasNext: projectsHasNext,
  } = useProjects({ limit: 10 });
  const {
    sessions,
    count: sessionsCount,
    loadNext: loadSessionsNext,
    loading: sessionsLoading,
    hasNext: sessionsHasNext,
  } = useSessions({ limit: 10 });

  const { value: tab, setValue: setTab } = useLocalStorage("tab", "projects");

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <Tabs value={tab} onValueChange={(value) => setTab(value)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="mt-2">
            <ProjectList
              projects={projects}
              count={projectsCount}
              loadNext={loadProjectsNext}
              loading={projectsLoading}
              hasNext={projectsHasNext}
            />
          </TabsContent>

          <TabsContent value="sessions" className="mt-2">
            <SessionList
              sessions={sessions}
              count={sessionsCount}
              loadNext={loadSessionsNext}
              loading={sessionsLoading}
              hasNext={sessionsHasNext}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
