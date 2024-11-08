import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/api/client.ts";
import { ENDPOINTS } from "@/api/endpoints.ts";
import { QUERY_KEYS } from "@/api/queryKeys.ts";

import { toaster } from "@/components/ui/toaster.tsx";
import {
  WorkerData,
  WorkerError,
} from "@/serviceWorker/plugins/responseMeta/types.ts";

export interface Todo {
  id: string;
  text: string;
}

export async function getTodos() {
  const response = await client.get<WorkerData<{ items: Todo[] }>>(
    ENDPOINTS.TODO_LIST,
  );
  return response.data;
}

export type CreateTodoPayload = {
  text: string;
};

export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (text: string) => {
      const response = await client.post<
        unknown,
        { data: string },
        CreateTodoPayload
      >(ENDPOINTS.TODO_LIST, { text });
      return response.data;
    },
    onSuccess: () => {
      toaster.create({
        title: "Success!",
        description: "Todo successfully added",
        type: "success",
        duration: 2000,
      });
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        let willRetry = false;
        if (error.response) {
          const details: WorkerError = error.response.data;
          willRetry = details.metadata?.willRetry || false;
        }

        toaster.create({
          title: "Oops! Failed to add todo",
          description: willRetry
            ? "Don't worry, we will retry when network is available"
            : error.message,
          type: willRetry ? "info" : "error",
          duration: willRetry ? 5000 : 3000,
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TODO_LIST });
    },
  });
}

export function useDeleteTodos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await client.delete(`${ENDPOINTS.TODO_LIST}?ids=${ids}`);
      return response.data;
    },
    onSuccess: () => {
      toaster.create({
        title: "Success!",
        description: "Selected todos successfully removed",
        type: "success",
        duration: 2000,
      });
    },
    onError: (error) => {
      toaster.create({
        title: "Oops!",
        description: error.message,
        type: "error",
        duration: 2000,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TODO_LIST });
    },
  });
}
