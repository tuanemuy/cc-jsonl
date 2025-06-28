import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Session } from "@/core/domain/session/types";
import { formatDate, formatRelativeTime } from "@/lib/date";

interface SessionListItemProps {
  session: Session;
  href: string;
}

export function SessionListItem({ session, href }: SessionListItemProps) {
  return (
    <Link href={href}>
      <Card className="p-4">
        <div>
          <MessageSquare className="size-6 text-muted-foreground group-hover:text-foreground transition-colors" />
          <h3 className="mt-2 font-medium group-hover:text-primary transition-colors">
            {session.name || session.id}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.lastMessageAt
              ? `${formatRelativeTime(session.lastMessageAt)}`
              : `Created: ${formatDate(session.createdAt)}`}
          </p>
        </div>
      </Card>
    </Link>
  );
}

export function SessionListItemSkeleton() {
  return (
    <Card className="p-4">
      <div>
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-6 w-3/4 mt-4" />
        <Skeleton className="h-4 w-1/2 mt-2" />
      </div>
    </Card>
  );
}
