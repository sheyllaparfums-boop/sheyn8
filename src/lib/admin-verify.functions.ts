import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkCeoRole, getAdminOverviewData, requireCeo } from "@/lib/require-ceo.server";

export const verifyCeoRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    return { isCeo: await checkCeoRole(userId) };
  });

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireCeo])
  .handler(() => getAdminOverviewData());
