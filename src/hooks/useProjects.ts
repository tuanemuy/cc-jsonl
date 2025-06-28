"use client";

import { useCallback, useEffect, useState } from "react";
import { listProjectsAction } from "@/actions/project";
import type { Project } from "@/core/domain/project/types";

type Args = {
  limit: number;
};

export function useProjects({ limit }: Args = { limit: 10 }) {
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(-1);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const hasNext = count > page * limit;

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      const result = await listProjectsAction({
        pagination: {
          page: p,
          limit,
          order: "asc",
          orderBy: "path",
        },
      });

      setProjects((prev) =>
        p === 1 ? result.items : [...prev, ...result.items],
      );
      setCount(result.count);
      setLoading(false);
    },
    [limit],
  );

  const loadNext = () => {
    if (hasNext) {
      load(page + 1);
      setPage(page + 1);
    }
  };

  useEffect(() => {
    load(1);
    setPage(1);
  }, [load]);

  return {
    projects,
    count,
    loading,
    hasNext,
    load,
    loadNext,
  };
}
