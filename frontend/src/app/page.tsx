import { redirect } from "next/navigation";

/** Bas bet endi mustaqil sahna emes — bevosita KPI paneline yóneltiredi. */
export default function RootPage() {
  redirect("/dashboard");
}
