import Link from "next/link";
import { notFound } from "next/navigation";
import { listMessagesAction } from "@/actions/message";
import { getProjectAction } from "@/actions/project";
import { getSessionAction } from "@/actions/session";
import { ChatInterface } from "@/app/components/chat/ChatInterface";
import { sessionIdSchema } from "@/core/domain/session/types";

interface SessionPageProps {
  params: Promise<{
    projectId: string;
    sessionId: string;
  }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  try {
    const { projectId: projectIdParam, sessionId: sessionIdParam } =
      await params;
    const sessionId = sessionIdSchema.parse(sessionIdParam);
    const [project, session, messages] = await Promise.all([
      getProjectAction(projectIdParam),
      getSessionAction(sessionIdParam),
      listMessagesAction({
        pagination: {
          page: 1,
          limit: 1000,
          order: "asc",
          orderBy: "createdAt",
        },
        filter: { sessionId },
      }),
    ]);

    if (!project || !session) {
      notFound();
    }

    return (
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link
              href={`/projects/${projectIdParam}`}
              className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
            >
              ← Back to {project?.name}
            </Link>
            <h1 className="text-2xl font-bold">Session {session.id}</h1>
            <p className="text-gray-600 mt-2">
              Created: {session.createdAt.toLocaleDateString()} • Last updated:{" "}
              {session.updatedAt.toLocaleDateString()}
            </p>
          </div>

          <ChatInterface
            sessionId={session.id}
            projectId={session.projectId}
            initialMessages={messages.items}
          />
        </div>
      </main>
    );
  } catch (_error) {
    notFound();
  }
}
