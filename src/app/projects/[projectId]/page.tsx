import { notFound } from "next/navigation";
import { getProjectAction } from "@/actions/project";
import { PageLayout } from "@/components/layout/PageLayout";
import { UseSessionList } from "@/components/session/SessionList";
import type { ProjectId } from "@/core/domain/project/types";
import { formatDate } from "@/lib/date";

interface ProjectPageProps {
  params: Promise<{
    projectId: ProjectId;
  }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const project = await getProjectAction(projectId);

  if (!project) {
    notFound();
  }

  return (
    <PageLayout back>
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold leading-[1.25]">
          {project?.name}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          Updated: {formatDate(project?.createdAt)}
        </p>

        <div className="mt-6">
          <UseSessionList projectId={projectId} />
        </div>
      </div>
    </PageLayout>
  );
}
