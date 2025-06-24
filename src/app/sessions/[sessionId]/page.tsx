import { notFound } from "next/navigation";
import { listMessagesAction } from "@/actions/message";
import { getSessionAction } from "@/actions/session";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { sessionIdSchema } from "@/core/domain/session/types";

type PageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function SessionPage({ params }: PageProps) {
  const { sessionId: sessionIdParam } = await params;
  const sessionId = sessionIdSchema.parse(sessionIdParam);

  const session = await getSessionAction(sessionIdParam);
  if (!session) {
    notFound();
  }

  const messages = await listMessagesAction({
    pagination: { page: 1, limit: 100, order: "asc", orderBy: "timestamp" },
    filter: { sessionId },
  });

  return (
    <div className="flex h-screen">
      <main className="flex-1 flex flex-col">
        <ChatInterface
          sessionId={sessionId}
          projectId={session.projectId || undefined}
          initialMessages={messages.items}
        />
      </main>
    </div>
  );
}
