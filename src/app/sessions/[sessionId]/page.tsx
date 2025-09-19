import { notFound } from "next/navigation";
import { listMessagesAction } from "@/actions/message";
import { getSessionAction } from "@/actions/session";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { PageLayout } from "@/components/layout/PageLayout";
import type { SessionId } from "@/core/domain/session/types";

type PageProps = {
  params: Promise<{
    sessionId: SessionId;
  }>;
};

export default async function SessionPage({ params }: PageProps) {
  const { sessionId } = await params;

  const session = await getSessionAction(sessionId);
  if (!session) {
    notFound();
  }

  const messages = await listMessagesAction({
    pagination: { page: 1, limit: 100, order: "asc", orderBy: "timestamp" },
    filter: { sessionId },
  });

  return (
    <PageLayout
      returnTo={session.projectId ? `/projects/${session.projectId}` : "/"}
      cwd={session.cwd}
    >
      <ChatInterface
        sessionId={sessionId}
        projectId={session.projectId || undefined}
        initialMessages={messages.items}
      />
    </PageLayout>
  );
}
