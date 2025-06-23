import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { listSessionsAction } from "@/actions/session";
import { PageLayout } from "@/components/layout/PageLayout";
import { formatDate, formatRelativeTime } from "@/lib/date";

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
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="group block p-4 sm:p-5 border rounded-lg hover:bg-accent/50 hover:border-accent transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                        <div className="min-w-0">
                          <h3 className="font-medium group-hover:text-primary transition-colors truncate">
                            {session.name}
                          </h3>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                            <span>{formatDate(session.createdAt)}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="text-xs">
                              Updated {formatRelativeTime(session.updatedAt)}
                            </span>
                            {session.lastMessageAt && (
                              <>
                                <span className="hidden sm:inline">•</span>
                                <span className="text-xs">
                                  Last message{" "}
                                  {formatRelativeTime(session.lastMessageAt)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-muted-foreground group-hover:translate-x-1 transition-transform flex-shrink-0">
                        →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
