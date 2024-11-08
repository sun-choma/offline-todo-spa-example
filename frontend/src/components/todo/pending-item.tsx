import { Card, Flex, HStack, Spinner, VStack } from "@chakra-ui/react";
import { BadgeXIcon, CircleFadingPlusIcon } from "lucide-react";

interface PendingItemProps {
  children: string;
  timestamp: number;
  status: "create" | "delete";
  isLoading?: boolean;
}

export function PendingItem({
  isLoading,
  children,
  status,
  timestamp,
}: PendingItemProps) {
  return (
    <Card.Root width="350px" opacity="0.75">
      <Card.Body padding="16px" as={HStack} overflow="hidden" gap="16px">
        <VStack alignItems="start" overflow="hidden" flexGrow="1">
          <Card.Title
            fontSize="14px"
            textWrap="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
            width="100%"
          >
            <span>{children}</span>
            {isLoading && <Spinner />}
          </Card.Title>
          <Card.Description fontSize="14px">
            {new Date(timestamp).toLocaleString()}
          </Card.Description>
        </VStack>
        <Flex flexShrink="0">
          {status === "create" && <CircleFadingPlusIcon />}
          {status === "delete" && <BadgeXIcon />}
        </Flex>
      </Card.Body>
    </Card.Root>
  );
}
