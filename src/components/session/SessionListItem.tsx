import { MessageSquare } from "lucide-react";
import Link from "next/link";
import {
  getSessionDisplayName,
  type Session,
} from "@/core/domain/session/types";
import { formatDate, formatRelativeTime } from "@/lib/date";

interface SessionListItemProps {
  session: Session;
  href: string;
  className?: string;
}

export function SessionListItem({
  session,
  href,
  className = "",
}: SessionListItemProps) {
  return (
    <Link
      href={href}
      className={`group block p-4 sm:p-5 border rounded-lg hover:bg-accent/50 hover:border-accent transition-all ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          <div>
            <h3 className="font-medium group-hover:text-primary transition-colors">
              {getSessionDisplayName(session.name)}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {session.lastMessageAt
                ? formatRelativeTime(session.lastMessageAt)
                : formatDate(session.createdAt)}
            </p>
          </div>
        </div>
        <span className="text-muted-foreground group-hover:translate-x-1 transition-transform">
          →
        </span>
      </div>
    </Link>
  );
}
