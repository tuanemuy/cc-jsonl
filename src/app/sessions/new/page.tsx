import { ChatInterface } from "@/components/chat/ChatInterface";
import { PageLayout } from "@/components/layout/PageLayout";

type Props = {
  searchParams: Promise<{
    cwd?: string;
  }>;
};

export default async function NewSessionPage({ searchParams }: Props) {
  const { cwd } = await searchParams;

  return (
    <PageLayout returnTo="/">
      <ChatInterface
        sessionId={undefined}
        projectId={undefined}
        initialMessages={[]}
        cwd={cwd || ""}
      />
    </PageLayout>
  );
}
