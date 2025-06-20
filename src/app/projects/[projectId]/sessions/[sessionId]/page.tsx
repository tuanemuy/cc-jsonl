import { listMessagesAction } from "@/actions/message";
import { getProjectAction } from "@/actions/project";
import { getSessionAction } from "@/actions/session";
import { sessionIdSchema } from "@/core/domain/session/types";
import Link from "next/link";
import { notFound } from "next/navigation";

interface SessionPageProps {
  params: {
    projectId: string;
    sessionId: string;
  };
}

export default async function SessionPage({ params }: SessionPageProps) {
  try {
    const sessionId = sessionIdSchema.parse(params.sessionId);
    const [project, session, messages] = await Promise.all([
      getProjectAction(params.projectId),
      getSessionAction(params.sessionId),
      listMessagesAction({
        pagination: {
          page: 1,
          limit: 1000,
          order: "asc",
          orderBy: "createdAt",
        },
        filter: { sessionId },
      }),
    ]);

    if (!project || !session) {
      notFound();
    }

    return (
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link
              href={`/projects/${params.projectId}`}
              className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
            >
              ← Back to {project?.name}
            </Link>
            <h1 className="text-2xl font-bold">Session {session.id}</h1>
            <p className="text-gray-600 mt-2">
              Created: {session.createdAt.toLocaleDateString()} • Last updated:{" "}
              {session.updatedAt.toLocaleDateString()}
            </p>
          </div>

          <div className="bg-white border rounded-lg">
            <div className="border-b p-4">
              <h2 className="font-semibold">Chat Messages</h2>
              <p className="text-sm text-gray-600">{messages.count} messages</p>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {messages.items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No messages found in this session.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {messages.items.map((message) => (
                    <div key={message.id} className="p-4">
                      <div className="flex items-start space-x-3">
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            message.role === "user"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {message.role === "user" ? "U" : "A"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium capitalize">
                              {message.role}
                            </span>
                            <span className="text-xs text-gray-500">
                              {message.createdAt.toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-sm">
                            {message.content ? (
                              <pre className="whitespace-pre-wrap font-mono text-xs bg-gray-50 p-2 rounded">
                                {typeof message.content === "string"
                                  ? message.content
                                  : JSON.stringify(message.content, null, 2)}
                              </pre>
                            ) : (
                              <span className="text-gray-400 italic">
                                No content
                              </span>
                            )}
                          </div>
                          {message.rawData && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-500 cursor-pointer">
                                Raw data
                              </summary>
                              <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(message.rawData, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  } catch (error) {
    notFound();
  }
}
