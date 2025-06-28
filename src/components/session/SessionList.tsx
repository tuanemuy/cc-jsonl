"use client";

import type { Session } from "@/core/domain/session/types";
import type { ProjectId } from "@/core/domain/project/types";
import { useIntersection } from "@/hooks/useIntersection";
import { useSessions } from "@/hooks/useSessions";

import { MessageSquare } from "lucide-react";
import {
  SessionListItem,
  SessionListItemSkeleton,
} from "@/components/session/SessionListItem";

type Props = {
  sessions: Session[];
  count: number;
  loadNext: () => void;
  loading: boolean;
  hasNext: boolean;
};

export function SessionList({
  sessions,
  count,
  loadNext,
  loading,
  hasNext,
}: Props) {
  const { observerElementRef: sessionsObserverElementRef } =
    useIntersection<HTMLDivElement>({
      onIntersect: loadNext,
    });

  return (
    <div className="space-y-4">
      {count === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No sessions found.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Sessions will appear here when chat logs are detected.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 w-full">
          {sessions.map((session) => (
            <SessionListItem
              key={session.id}
              session={session}
              href={`/sessions/${session.id}`}
            />
          ))}

          {loading && [0, 1, 2].map((i) => <SessionListItemSkeleton key={i} />)}

          {!loading && hasNext && (
            <div ref={sessionsObserverElementRef} className="h-8" />
          )}
        </div>
      )}
    </div>
  );
}

type UseSessionListProps = {
  limit?: number;
  projectId?: ProjectId;
};

export function UseSessionList({ limit, projectId }: UseSessionListProps) {
  const { sessions, count, loadNext, loading, hasNext } = useSessions({
    limit,
    projectId,
  });

  return (
    <SessionList
      sessions={sessions}
      count={count}
      loadNext={loadNext}
      loading={loading}
      hasNext={hasNext}
    />
  );
}
