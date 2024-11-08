import { HStack, VStack } from "@chakra-ui/react";
import { TodoItem } from "@/components/todo/todo-item.tsx";
import { Button } from "@/components/ui/button.tsx";

import { CreateTodoPayload, Todo, useDeleteTodos } from "@/api/todos.ts";
import { useCallback, useState } from "react";
import { TodoCreator } from "@/components/todo/todo-creator.tsx";
import { useSyncQueue } from "@/hooks/common/useSyncQueue.ts";
import { CACHE_KEYS } from "@/serviceWorker/common/constants.ts";
import { PendingItem } from "@/components/todo/pending-item.tsx";

interface TodoListProps {
  todos: Todo[];
}

export function TodoList({ todos }: TodoListProps) {
  const { entries: pendingNewTodos } = useSyncQueue<CreateTodoPayload>(
    CACHE_KEYS.TODO_POST_QUEUE,
  );

  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleSelectionChange = useCallback(
    ({ guid, value }: { guid: string; value: boolean }) => {
      setSelectedItems((prevState) => {
        if (value) return [...prevState, guid];
        else return prevState.filter((item) => item !== guid);
      });
    },
    [],
  );

  const { mutate: deleteTodos, isPending: isDeleting } = useDeleteTodos();

  function handleDeleteTodos() {
    deleteTodos(selectedItems);
  }

  return (
    <VStack>
      <VStack maxHeight="265px" padding="12px" overflow="auto">
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            guid={todo.id}
            isChecked={selectedItems.includes(todo.id)}
            onCheckedChange={handleSelectionChange}
          >
            {todo.text}
          </TodoItem>
        ))}
        {pendingNewTodos.map((item) => (
          <PendingItem
            key={item.requestId}
            timestamp={item.timestamp}
            status="create"
          >
            {item.request.payload.text}
          </PendingItem>
        ))}
      </VStack>
      <HStack>
        <TodoCreator />
        <Button
          colorPalette="red"
          variant="subtle"
          disabled={selectedItems.length === 0}
          loading={isDeleting}
          onClick={handleDeleteTodos}
        >
          Delete selected
        </Button>
      </HStack>
    </VStack>
  );
}
