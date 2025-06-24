import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectAction } from "@/actions/project";
import { listSessionsAction } from "@/actions/session";
import { PageLayout } from "@/components/layout/PageLayout";
import { NewChatButton } from "@/components/project/NewChatButton";
import { SessionListItem } from "@/components/session/SessionListItem";
import { projectIdSchema } from "@/core/domain/project/types";
import { formatDate } from "@/lib/date";

interface ProjectPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  try {
    const { projectId: projectIdParam } = await params;
    const projectId = projectIdSchema.parse(projectIdParam);
    const [project, sessions] = await Promise.all([
      getProjectAction(projectIdParam),
      listSessionsAction({
        pagination: {
          page: 1,
          limit: 100,
          order: "desc",
          orderBy: "updatedAt",
        },
        filter: { projectId },
      }),
    ]);

    if (!project) {
      notFound();
    }

    return (
      <PageLayout>
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="max-w-4xl mx-auto">
            <header className="mb-6 sm:mb-8">
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground transition-colors mb-4 inline-flex items-center gap-1"
              >
                <span className="text-lg">←</span> Back to Projects
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {project?.name}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-2">
                Created {formatDate(project?.createdAt)}
              </p>
            </header>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-lg sm:text-xl font-semibold">Sessions</h2>
                <NewChatButton projectId={project.id} />
              </div>
              {sessions.items.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No sessions found for this project.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Sessions will appear here when chat logs are detected.
                  </p>
                </div>
              ) : (
                <div className="grid gap-2 sm:gap-3">
                  {sessions.items.map((session) => (
                    <SessionListItem
                      key={session.id}
                      session={session}
                      href={`/sessions/${session.id}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </PageLayout>
    );
  } catch (_error) {
    notFound();
  }
}
