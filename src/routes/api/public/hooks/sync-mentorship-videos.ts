import { createFileRoute } from "@tanstack/react-router";
import { syncMentorshipVideos } from "@/lib/mentorship-videos.functions";

export const Route = createFileRoute("/api/public/hooks/sync-mentorship-videos")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const result = await syncMentorshipVideos();
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(
            JSON.stringify({ ok: false, error: e?.message ?? "erro" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
