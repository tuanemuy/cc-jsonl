import Link from "next/link";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { PageLayout } from "@/components/layout/PageLayout";

export default function NewSessionPage() {
  return (
    <PageLayout back>
      <ChatInterface
        sessionId={undefined} // No session ID for new chat
        projectId={undefined} // No specific project for new chat
        initialMessages={[]} // No initial messages for new chat
        cwd={""} // Let user specify working directory
      />
    </PageLayout>
  );
}
