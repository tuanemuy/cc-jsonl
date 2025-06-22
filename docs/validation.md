# Validation Strategy

## Server Action

```typescript
// src/actions/post.ts
import { revalidatePath } from "next/navigation";
import { updatePost, updatePostInputSchema } from "@/core/application/post/updatePost";
import { validate } from "@/lib/validation";
import type { FormState } from "@/lib/formState";
import { context } from "./context";

export async function updatePostAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const rawData = {
    id: formData.get("id"),
    content: formData.get("content"),
  };

  const validation = validate(updatePostInputSchema, rawData);
  if (validation.isErr()) {
    return {
      input: rawData,
      error: validation.error,
    };
  }

  const result = updateUserProfile(context, validation.value);

  if (result.isErr()) {
    return {
      input: rawData,
      error: result.error,
    };
  }

  revalidatePath(`/post/${rawData.id}`);

  return {
    input: rawData,
    result: result.value,
    error: null
  };
}
```

## Client Component

```typescript
// src/components/post/PostUpdateForm.tsx
"use client";

import { useActionState, startTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updatePostAction } from "@/actions/post";
// ...

const inputSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1)
});

interface Props {
  post: Post;
}

export function ProfileUpdateForm({ post }: Props) {
  const form = useForm<UpdateUserProfileInput>({
    resolver: zodResolver(inputSchema),
    defaultValues: post,
  });

  const [formState, formAction, isPending] = useActionState(
    updateUserProfileAction,
    { input: post, error: null }
  );

  const onSubmit = (data: UpdateUserProfileInput) => {
    startTransition(() => {
      formAction(data);
    });
  };

  return (
      <Form {...form}>
        <form 
          action={formAction} 
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => /* FormItem */}
          />

          // ...
        </form>
      </Form>
    </div>
  );
}
```
