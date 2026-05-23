import { createFileRoute } from "@tanstack/react-router";

// Proxy de vídeo do Instagram (mp4 do CDN) com Content-Disposition
// pra forçar download em qualquer dispositivo.
export const Route = createFileRoute("/api/public/ig-video")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const target = url.searchParams.get("url");
        const filename = url.searchParams.get("name") || "shey-viral.mp4";
        const inline = url.searchParams.get("inline") === "1";
        if (!target) return new Response("missing url", { status: 400 });

        let parsed: URL;
        try {
          parsed = new URL(target);
        } catch {
          return new Response("invalid url", { status: 400 });
        }
        const okHost = /^https:$/.test(parsed.protocol) && /(^|\.)(cdninstagram\.com|fbcdn\.net|instagram\.com|tiktok\.com|tiktokcdn\.com|tiktokcdn-us\.com|tiktokcdn-eu\.com|tiktokv\.com|ibyteimg\.com|ttwstatic\.com|tikwm\.com|byteoversea\.com|akamaized\.net)$/i.test(parsed.hostname);
        if (!okHost) return new Response("forbidden host", { status: 403 });

        try {
          const upstream = await fetch(parsed.toString(), {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
              Accept: "video/mp4,video/*;q=0.9,*/*;q=0.8",
              Referer: /(^|\.)(tiktok\.com|tiktokcdn\.com|tiktokcdn-us\.com|tiktokcdn-eu\.com|tiktokv\.com|ibyteimg\.com|ttwstatic\.com|tikwm\.com|byteoversea\.com|akamaized\.net)$/i.test(parsed.hostname)
                ? "https://www.tiktok.com/"
                : "https://www.instagram.com/",
            },
          });
          if (!upstream.ok || !upstream.body) {
            return new Response("upstream error", { status: 502 });
          }
          const headers = new Headers();
          headers.set("Content-Type", upstream.headers.get("content-type") || "video/mp4");
          const len = upstream.headers.get("content-length");
          if (len) headers.set("Content-Length", len);
          const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "shey-viral.mp4";
          headers.set("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${safe}"`);
          headers.set("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
          headers.set("Cache-Control", "public, max-age=3600");
          headers.set("Access-Control-Allow-Origin", "*");
          return new Response(upstream.body, { status: 200, headers });
        } catch {
          return new Response("fetch failed", { status: 502 });
        }
      },
    },
  },
});
