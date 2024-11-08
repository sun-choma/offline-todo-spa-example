import { DialogHeader, Input, useDisclosure } from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { generate } from "random-words";

import { Button } from "@/components/ui/button.tsx";
import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Field } from "@/components/ui/field.tsx";
import { useCreateTodo } from "@/api/todos.ts";
import { useEffect } from "react";
import { isAxiosError } from "axios";

export function TodoCreator() {
  const { open, onClose, onToggle } = useDisclosure();

  const form = useForm<{ text: string }>();
  const { mutate: create, isPending } = useCreateTodo();

  const submitHandler = form.handleSubmit((data) =>
    create(data.text, {
      onSuccess: () => {
        onClose();
        form.setValue("text", "");
      },
      onError: (error) => {
        if (isAxiosError(error) && error.response?.data.metadata.willRetry)
          onClose();
      },
    }),
  );

  useEffect(() => {
    if (open) {
      form.setValue("text", generate({ min: 3, max: 8, join: " " }));
    }
  }, [form, open]);

  return (
    <>
      <DialogRoot open={open} onOpenChange={onToggle} placement="center">
        <DialogTrigger asChild>
          <Button>Create Todo</Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={submitHandler}>
            <DialogHeader>
              <DialogTitle>Create Todo</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Field label="Todo text">
                <Input
                  required
                  placeholder="Ex. Buy some milk"
                  {...form.register("text")}
                />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button variant="surface" onClick={onClose}>
                Close
              </Button>
              <Button type="submit" loading={isPending}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogRoot>
    </>
  );
}
