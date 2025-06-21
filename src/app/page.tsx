import Link from "next/link";
import { listProjectsAction } from "@/actions/project";

export default async function Home() {
  const result = await listProjectsAction({
    pagination: { page: 1, limit: 100, order: "desc", orderBy: "updatedAt" },
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Claude Code Chat Logs</h1>
        </div>

        <div className="grid gap-4">
          <h2 className="text-xl font-semibold">Projects</h2>
          {result.items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No projects found.</p>
              <p className="text-sm mt-2">
                Projects will appear here when chat logs are detected.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {result.items.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-medium">{project.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Created: {project.createdAt.toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
