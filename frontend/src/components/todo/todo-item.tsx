import { Text } from "@chakra-ui/react";
import { CheckboxCard } from "@/components/ui/checkbox-card.tsx";

interface TodoItemProps {
  guid: string;
  children: string;
  isChecked?: boolean;
  onCheckedChange: (args: { guid: string; value: boolean }) => void;
}

export function TodoItem({
  guid,
  children,
  isChecked,
  onCheckedChange,
}: TodoItemProps) {
  return (
    <CheckboxCard
      label={
        <Text textDecorationLine={isChecked ? "line-through" : ""}>
          {children}
        </Text>
      }
      description={guid}
      value={guid}
      checked={isChecked}
      onCheckedChange={(e) =>
        onCheckedChange({ value: Boolean(e.checked), guid })
      }
      width="350px"
    />
  );
}
