import { redirect } from "next/navigation";
import { DASHBOARD_PATH } from "@/lib/constants";

export default function HomePage(): never {
  redirect(DASHBOARD_PATH);
}
