import { useRouter } from "next/navigation";
import { useTransition, type FormEvent } from "react";
import { formDataToQuery } from "@/lib/dashboard/formQuery";

// Submits a GET form as a client-side navigation to `path?query`, without a full page reload.
export function useQueryNavigation(path: string): { isPending: boolean; handleSubmit: (event: FormEvent<HTMLFormElement>) => void } {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const query = formDataToQuery(new FormData(event.currentTarget));
    startTransition(() => router.push(query ? `${path}?${query}` : path, { scroll: false }));
  }

  return { isPending, handleSubmit };
}
