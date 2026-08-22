import { daysLeft } from "@/lib/utils";

export type TaskStatusId = "completed" | "in_progress" | "not_done";

export interface TaskStatusMeta {
  id: TaskStatusId;
  /** Kórsetiletuǵın JALǴIZ tekst — basqa variant joq. */
  label: "Orınlandı" | "Orınlanıp atır" | "Orınlanbadı";
  /** Kartochka astındaǵı tolıq enli status túymesi ushın Tailwind klasları. */
  buttonClass: string;
  /** Filtr túymesindegi aktiv gradient hám basqa HEX kerek orınlar ushın. */
  color: string;
}

export const TASK_STATUSES: Record<TaskStatusId, TaskStatusMeta> = {
  completed: {
    id: "completed",
    label: "Orınlandı",
    buttonClass: "bg-green-600 text-white",
    color: "#16a34a",
  },
  in_progress: {
    id: "in_progress",
    label: "Orınlanıp atır",
    buttonClass: "bg-blue-600 text-white",
    color: "#2563eb",
  },
  not_done: {
    id: "not_done",
    label: "Orınlanbadı",
    buttonClass: "bg-red-600 text-white",
    color: "#dc2626",
  },
};

export const TASK_STATUS_LIST: TaskStatusMeta[] = Object.values(TASK_STATUSES);

/**
 * Tapsırma holatı — tikkeley bajarılıw foizinen (hám múddetten) esaplanadı,
 * backenniń xam statusınan (`at_risk`/`critical`) EMES, sonlıqtan tek 3
 * qatań variant bar:
 *
 *   progress >= 100          -> Orınlandı
 *   múddeti ótken (kún <0)   -> Orınlanbadı (progress > 0 bolsa da)
 *   progress <= 0            -> Orınlanbadı
 *   basqa jaǵdayda (1..99%)  -> Orınlanıp atır
 */
export function taskStatus(progress: number, deadline: string): TaskStatusMeta {
  if (progress >= 100) return TASK_STATUSES.completed;
  if (progress <= 0 || daysLeft(deadline) < 0) return TASK_STATUSES.not_done;
  return TASK_STATUSES.in_progress;
}
