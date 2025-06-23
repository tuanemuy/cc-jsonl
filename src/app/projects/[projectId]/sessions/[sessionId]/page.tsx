import Link from "next/link";
import { notFound } from "next/navigation";
import { listMessagesAction } from "@/actions/message";
import { getProjectAction } from "@/actions/project";
import { getSessionAction } from "@/actions/session";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { PageLayout } from "@/components/layout/PageLayout";
import { sessionIdSchema } from "@/core/domain/session/types";
import { formatDate } from "@/lib/date";
import { getSessionDisplayName } from "@/lib/sessionName";

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
      <PageLayout fullHeight>
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 py-3 sm:py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-4">
                  <Link
                    href={`/projects/${projectIdParam}`}
                    className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <span className="text-lg">←</span>
                    <span className="hidden sm:inline">{project?.name}</span>
                    <span className="sm:hidden">Back</span>
                  </Link>
                  <div className="h-4 w-px bg-border hidden sm:block" />
                  <h1 className="text-lg sm:text-xl font-semibold truncate">
                    {getSessionDisplayName(session.name)}
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {formatDate(session.createdAt)}
                </p>
              </div>
            </div>
          </header>

          {/* Chat Interface - Full Height */}
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              sessionId={session.id}
              projectId={session.projectId || undefined}
              initialMessages={messages.items}
            />
          </div>
        </div>
      </PageLayout>
    );
  } catch (_error) {
    notFound();
  }
}
