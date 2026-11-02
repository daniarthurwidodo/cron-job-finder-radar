export function formDataToQuery(formData: FormData): string {
  const params = new URLSearchParams();
  for (const [key, value] of formData) {
    if (typeof value === "string" && value.trim() !== "") params.set(key, value.trim());
  }
  return params.toString();
}
