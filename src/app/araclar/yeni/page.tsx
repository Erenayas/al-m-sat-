import Link from "next/link";
import { VehicleForm } from "@/components/stock/forms";
import { Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function NewVehiclePage() {
  return (
    <div className="space-y-4 max-w-6xl">
      <div>
        <Link href="/araclar" className="text-xs text-brand">
          ← araçlar
        </Link>
        <PageHeader
          title="Araç ekle"
          description="Alış fiyatını gir; masrafları sonra tek tek ekleyeceksin. Gerçek maliyet ve kâr bunların toplamından çıkıyor."
        />
      </div>

      <Card>
        <VehicleForm />
      </Card>
    </div>
  );
}
