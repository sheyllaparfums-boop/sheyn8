import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("name,email,handle,niche,goal,avatar_url,plan,trial_ends_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const UpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  handle: z.string().trim().max(60).optional(),
  niche: z.string().trim().max(60).optional(),
  goal: z.string().trim().max(120).optional(),
  avatar_url: z.string().url().max(500).optional().nullable(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update(data)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

