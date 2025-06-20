import { getProjectAction } from "@/actions/project";
import { listSessionsAction } from "@/actions/session";
import { projectIdSchema } from "@/core/domain/project/types";
import Link from "next/link";
import { notFound } from "next/navigation";

interface ProjectPageProps {
  params: {
    projectId: string;
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  try {
    const projectId = projectIdSchema.parse(params.projectId);
    const [project, sessions] = await Promise.all([
      getProjectAction(params.projectId),
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
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
            >
              ← Back to Projects
            </Link>
            <h1 className="text-3xl font-bold">{project?.name}</h1>
            <p className="text-gray-600 mt-2">
              Created: {project?.createdAt.toLocaleDateString()}
            </p>
          </div>

          <div className="grid gap-4">
            <h2 className="text-xl font-semibold">Sessions</h2>
            {sessions.items.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No sessions found for this project.</p>
                <p className="text-sm mt-2">
                  Sessions will appear here when chat logs are detected.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {sessions.items.map((session) => (
                  <Link
                    key={session.id}
                    href={`/projects/${params.projectId}/sessions/${session.id}`}
                    className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="font-medium">Session {session.id}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Created: {session.createdAt.toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Last updated: {session.updatedAt.toLocaleDateString()}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  } catch (error) {
    notFound();
  }
}
