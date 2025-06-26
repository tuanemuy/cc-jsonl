import { Folder } from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { type Project } from "@/core/domain/project/types";
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
            {project.name}
          </h3>
          <p className="mt-2 text-sm sm:text-sm text-muted-foreground mt-0.5">
            {formatDate(project.createdAt)}
          </p>
        </div>
      </Card>
    </Link>
  );
}
