import Link from "next/link";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { PageLayout } from "@/components/layout/PageLayout";

export default function NewSessionPage() {
  return (
    <PageLayout fullHeight>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <span className="text-lg">←</span>
                  <span className="hidden sm:inline">Sessions</span>
                  <span className="sm:hidden">Back</span>
                </Link>
                <div className="h-4 w-px bg-border hidden sm:block" />
                <h1 className="text-lg sm:text-xl font-semibold truncate">
                  New Chat
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Start a new conversation
              </p>
            </div>
          </div>
        </header>

        {/* Chat Interface - Full Height */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            sessionId={undefined} // No session ID for new chat
            projectId={undefined} // No specific project for new chat
            initialMessages={[]} // No initial messages for new chat
            cwd={""} // Let user specify working directory
          />
        </div>
      </div>
    </PageLayout>
  );
}
