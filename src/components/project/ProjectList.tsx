"use client";

import { Folder } from "lucide-react";
import {
  ProjectListItem,
  ProjectListItemSkeleton,
} from "@/components/project/ProjectListItem";
import type { Project } from "@/core/domain/project/types";
import { useIntersection } from "@/hooks/useIntersection";

type Props = {
  projects: Project[];
  count: number;
  loadNext: () => void;
  loading: boolean;
  hasNext: boolean;
};

export function ProjectList({
  projects,
  count,
  loadNext,
  loading,
  hasNext,
}: Props) {
  const { observerElementRef: projectsObserverElementRef } =
    useIntersection<HTMLDivElement>({
      onIntersect: loadNext,
    });

  return (
    <div className="space-y-4">
      {count === 0 ? (
        <div className="text-center py-12">
          <Folder className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No projects found.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Projects will appear here when chat logs are detected.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:gap-4">
          {projects.map((project) => (
            <ProjectListItem
              key={project.id}
              project={project}
              href={`/projects/${project.id}`}
            />
          ))}

          {loading && [0, 1, 2].map((i) => <ProjectListItemSkeleton key={i} />)}

          {hasNext && <div ref={projectsObserverElementRef} className="h-8" />}
        </div>
      )}
    </div>
  );
}
