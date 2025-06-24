import { MessageSquare } from "lucide-react";
import { listSessionsAction } from "@/actions/session";
import { PageLayout } from "@/components/layout/PageLayout";
import { SessionListItem } from "@/components/session/SessionListItem";

export default async function SessionsPage() {
  const sessions = await listSessionsAction({
    pagination: {
      page: 1,
      limit: 100,
      order: "desc",
      orderBy: "updatedAt",
    },
  });

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold">All Sessions</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Browse all chat sessions across all projects
            </p>
          </header>

          <div className="space-y-4">
            {sessions.items.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No sessions found.</p>
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
}
