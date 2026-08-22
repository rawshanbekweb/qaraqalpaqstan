"use client";

import { TaskBoard } from "@/components/admin/TaskBoard";

export default function TasksPage() {
  return (
    <div className="flex w-full flex-col gap-7">
      <div>
        <h1 className="text-2xl font-bold text-ink">Tapsırmalar</h1>
        <p className="text-sm text-ink-3">
          Barlıq ekonomikalıq tapsırmalar hám bajarılıw halatları dizimi
        </p>
      </div>
      <TaskBoard />
    </div>
  );
}
