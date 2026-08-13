"use client";

import dynamic from "next/dynamic";
import type {
  IBranding,
  ILocation,
  CategoryWithItems,
  MenuViewMode,
  MenuMode,
} from "@/types";
import type { FlipbookPageData } from "@/app/menu/page";
import type { ComponentType } from "react";

interface MobileProps {
  branding: IBranding | null;
  categoriesWithItems: CategoryWithItems[];
  location: ILocation | null;
  mode: MenuMode;
}
interface TabletProps {
  branding: IBranding | null;
  pages: FlipbookPageData[];
  location: ILocation | null;
  mode: MenuMode;
}

const MobileMenuShell = dynamic<MobileProps>(
  () =>
    import("./mobile/MobileMenuShell") as Promise<{
      default: ComponentType<MobileProps>;
    }>,
  { ssr: false },
);
const TabletMenuShell = dynamic<TabletProps>(
  () =>
    import("./tablet/TabletMenuShell") as Promise<{
      default: ComponentType<TabletProps>;
    }>,
  { ssr: false },
);

interface Props {
  branding: IBranding | null;
  categoriesWithItems: CategoryWithItems[];
  flipbookPages: FlipbookPageData[];
  location: ILocation | null;
  locationType: MenuMode;
  locationCode: string | null;
  viewMode: MenuViewMode;
}

export default function MenuShell({
  branding,
  categoriesWithItems,
  flipbookPages,
  location,
  locationType,
  viewMode,
}: Props) {
  // Room self-service ordering is disabled for Taj (restaurant & cafe — no room
  // service). Any "room" location degrades to table (captain-led) mode: menu is
  // view-only with no cart, no "Add to Order", and no WhatsApp self-order.
  const mode: MenuMode = locationType === "room" ? "table" : locationType;

  if (viewMode === "tablet") {
    return (
      <TabletMenuShell
        branding={branding}
        pages={flipbookPages}
        location={location}
        mode={mode}
      />
    );
  }

  return (
    <MobileMenuShell
      branding={branding}
      categoriesWithItems={categoriesWithItems}
      location={location}
      mode={mode}
    />
  );
}
