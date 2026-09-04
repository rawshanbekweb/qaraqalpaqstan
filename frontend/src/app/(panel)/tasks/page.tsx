"use client";

import { DirectionExplorer } from "@/components/directions/DirectionExplorer";

export default function TasksPage() {
  return (
    <div className="flex w-full flex-col gap-7">
      <div>
        <h1 className="text-2xl font-bold text-ink">Jónelisler</h1>
        <p className="text-sm text-ink-3">
          7 tiykarǵı ekonomikalıq jónelis, olardıń bólimleri hám hár bólim boyınsha hisabatlar
        </p>
      </div>
      <DirectionExplorer />
    </div>
  );
}
