"use client";

import { useEffect, useState, useCallback } from "react";
import { listSessionsAction } from "@/actions/session";
import type { Session } from "@/core/domain/session/types";
import type { ProjectId } from "@/core/domain/project/types";

const defaultLimit = 10;

type Args = {
  limit?: number;
  projectId?: ProjectId;
};

export function useSessions({ limit: limitValue, projectId }: Args) {
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(-1);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const limit = limitValue || defaultLimit;
  const hasNext = count > page * limit;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const result = await listSessionsAction({
      pagination: {
        page: p,
        limit,
        order: "asc",
        orderBy: "path",
      },
      filter: projectId && {
        projectId,
      },
    });

    setSessions((prev) =>
      p === 1 ? result.items : [...prev, ...result.items],
    );
    setCount(result.count);
    setLoading(false);
  }, []);

  const loadNext = () => {
    if (hasNext) {
      load(page + 1);
      setPage(page + 1);
    }
  };

  useEffect(() => {
    load(1);
    setPage(1);
  }, []);

  return {
    sessions,
    count,
    loading,
    hasNext,
    load,
    loadNext,
  };
}
