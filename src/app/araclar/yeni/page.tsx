import Link from "next/link";
import { VehicleForm } from "@/components/stock/forms";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function NewVehiclePage() {
  return (
    <div className="space-y-4 max-w-6xl">
      <div>
        <Link href="/araclar" className="text-xs text-accent">
          ← araçlar
        </Link>
        <h1 className="text-xl font-semibold mt-1">Araç ekle</h1>
        <p className="text-sm text-muted mt-1">
          Alış fiyatını gir; masrafları sonra tek tek ekleyeceksin. Gerçek maliyet
          ve kâr bunların toplamından çıkıyor.
        </p>
      </div>

      <Card>
        <VehicleForm />
      </Card>
    </div>
  );
}
