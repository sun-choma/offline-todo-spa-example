import { Heading, HStack, Spinner, Tabs, VStack } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { WifiIcon, WifiOffIcon } from "lucide-react";

import { getTodos } from "@/api/todos.ts";
import { useConnectivity } from "@/providers/ConnectivityProvider.tsx";
import { TodoList } from "@/components/todo/todo-list.tsx";
import { QUERY_KEYS } from "@/api/queryKeys.ts";
import { Alert } from "@/components/ui/alert.tsx";
import { PendingList } from "@/components/todo/pending-list.tsx";
import { useSyncListener } from "@/hooks/common/useSyncListener.ts";
import { CACHE_KEYS } from "@/serviceWorker/common/constants.ts";
import { useNotifySync } from "@/hooks/useNotifySync.tsx";
import { Button } from "@/components/ui/button.tsx";

import reactLogo from "/assets/react.svg";

function App() {
  const {
    data: todoList,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.TODO_LIST,
    queryFn: getTodos,
  });

  const { isOnline } = useConnectivity();

  // Hook to refetch todos when background tasks (failed POSTs) have been resolved
  useSyncListener({
    queueName: CACHE_KEYS.TODO_POST_QUEUE,
    onSyncEnd: (meta) => meta.succeeded && refetch(),
  });

  // Display toast upon update in background task queue (failed POSTs)
  useNotifySync(CACHE_KEYS.TODO_POST_QUEUE);

  return (
    <VStack height="full" flexGrow={1} justifyContent="center">
      <VStack>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
        <Heading>PWA Todo List Example</Heading>
        <Alert
          status={isOnline ? "info" : "warning"}
          icon={isOnline ? <WifiIcon /> : <WifiOffIcon />}
          title={
            isOnline
              ? "Application online"
              : "Oops, seems like app went offline"
          }
        />
      </VStack>
      <Tabs.Root defaultValue="list">
        <Tabs.List>
          <Tabs.Trigger value="list">List</Tabs.Trigger>
          <Tabs.Trigger value="pending">Refetch</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="list">
          {isLoading && <Spinner />}
          {!isLoading && todoList && (
            <VStack gap="8px">
              {todoList.metadata && (
                <Alert
                  status={
                    todoList.metadata.isCachedResponse ? "warning" : "info"
                  }
                  title={
                    todoList.metadata.isCachedResponse
                      ? "Displayed data may be outdated"
                      : "Up to date"
                  }
                >
                  <HStack gap="8px">
                    <span>{`Received: ${new Date(todoList.metadata.timestamp).toLocaleString()}`}</span>
                    <Button onClick={() => refetch()}>Update</Button>
                  </HStack>
                </Alert>
              )}
              <TodoList todos={todoList.items} />
            </VStack>
          )}
        </Tabs.Content>
        <Tabs.Content value="pending">
          <PendingList />
        </Tabs.Content>
      </Tabs.Root>
    </VStack>
  );
}

export default App;
