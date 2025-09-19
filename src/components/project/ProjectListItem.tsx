import { Folder } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project } from "@/core/domain/project/types";
import { formatDate } from "@/lib/date";

interface SessionListItemProps {
  project: Project;
  href: string;
}

export function ProjectListItem({ project, href }: SessionListItemProps) {
  return (
    <Link href={href}>
      <Card className="p-4">
        <div>
          <Folder className="size-6 text-muted-foreground group-hover:text-foreground transition-colors" />
          <h3 className="mt-2 font-medium group-hover:text-primary transition-colors leading-[1.5]">
            {project.path}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Updated: {formatDate(project.createdAt)}
          </p>
        </div>
      </Card>
    </Link>
  );
}

export function ProjectListItemSkeleton() {
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
