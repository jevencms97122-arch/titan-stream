import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Nav } from "@/components/Nav";
import { Play, ExternalLink, ChevronLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/anime/$id")({
  component: AnimePage,
});

/** Wraps the embed URL in a blob HTML page with no-referrer policy.
 *  This bypasses referrer-based hotlink protection on streaming sites. */
function createProxyBlobUrl(embedUrl: string): string {
  const safe = embedUrl.replace(/"/g, "&quot;");
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="referrer" content="no-referrer">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;overflow:hidden}
iframe{width:100%;height:100%;border:none}
</style>
</head>
<body>
<iframe
  src="${safe}"
  allowfullscreen
  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-pointer-lock"
></iframe>
</body>
</html>`;
  return URL.createObjectURL(new Blob([html], { type: "text/html" }));
}

function VideoPlayer({ embedUrl, epKey }: { embedUrl: string; epKey: string }) {
  const blobUrlRef = useRef<string | null>(null);
  const [proxyUrl, setProxyUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Revoke previous blob URL to avoid memory leaks
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const url = createProxyBlobUrl(embedUrl);
    blobUrlRef.current = url;
    setProxyUrl(url);
    setLoading(true);
  }, [epKey, embedUrl]);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const openInTab = () => {
    const url = createProxyBlobUrl(embedUrl);
    window.open(url, "_blank", "noopener");
    // Don't revoke immediately — browser needs time to load it
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <div className="relative aspect-video w-full bg-black">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
          <Loader2 className="size-10 animate-spin text-primary" />
        </div>
      )}
      {proxyUrl && (
        <iframe
          key={epKey}
          src={proxyUrl}
          onLoad={() => setLoading(false)}
          className="absolute inset-0 h-full w-full"
          allowFullScreen
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        />
      )}
      {/* Fallback button always visible */}
      <button
        onClick={openInTab}
        className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-2 text-xs text-white/70 backdrop-blur-sm transition-all hover:bg-black/80 hover:text-white"
      >
        <ExternalLink className="size-3.5" />
        Ouvrir dans un onglet
      </button>
    </div>
  );
}

function AnimePage() {
  const { id } = Route.useParams();
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [session, loading, navigate]);

  const { data } = useQuery({
    queryKey: ["anime", id],
    queryFn: async () => {
      const [{ data: anime }, { data: seasons }] = await Promise.all([
        supabase.from("animes").select("*").eq("id", id).maybeSingle(),
        supabase.from("seasons").select("*").eq("anime_id", id).order("number"),
      ]);
      return { anime, seasons: seasons ?? [] };
    },
    enabled: !!session,
  });

  const [seasonId, setSeasonId] = useState<string | null>(null);
  const currentSeason = useMemo(
    () => data?.seasons.find((s) => s.id === seasonId) ?? data?.seasons[0],
    [data, seasonId],
  );

  const { data: episodes } = useQuery({
    queryKey: ["episodes", currentSeason?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("episodes")
        .select("*")
        .eq("season_id", currentSeason!.id)
        .order("number");
      return data ?? [];
    },
    enabled: !!currentSeason?.id,
  });

  const [epId, setEpId] = useState<string | null>(null);
  const currentEp = episodes?.find((e) => e.id === epId) ?? episodes?.[0];

  if (!session || !data?.anime) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const anime = data.anime;

  return (
    <div className="min-h-screen">
      <Nav />

      {/* Cinematic hero backdrop */}
      <div className="relative -mt-16 overflow-hidden pt-16">
        {anime.poster_url && (
          <>
            <div
              className="absolute inset-0 scale-110 blur-3xl"
              style={{
                backgroundImage: `url(${anime.poster_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center top",
                opacity: 0.20,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80" />
          </>
        )}

        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-6">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> Bibliothèque
          </Link>

          <div className="flex gap-7">
            {anime.poster_url && (
              <div className="hidden shrink-0 sm:block">
                <img
                  src={anime.poster_url}
                  alt={anime.title}
                  className="w-44 rounded-2xl object-cover shadow-2xl"
                  style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}
                />
              </div>
            )}

            <div className="flex-1 animate-fade-up">
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{anime.title}</h1>
              {anime.description && (
                <p className="mt-3 line-clamp-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  {anime.description}
                </p>
              )}

              {data.seasons.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {data.seasons.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setSeasonId(s.id); setEpId(null); }}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                        currentSeason?.id === s.id
                          ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25"
                          : "glass-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Saison {s.number}
                      <span className={`ml-2 rounded-md px-1.5 py-0.5 text-xs font-bold ${
                        currentSeason?.id === s.id ? "bg-white/20" : "bg-white/10"
                      }`}>
                        {s.language.toUpperCase()}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 pb-12">
        {currentEp ? (
          <div className="glass-strong overflow-hidden rounded-3xl">
            <VideoPlayer embedUrl={currentEp.embed_url} epKey={currentEp.id} />
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {currentSeason && `Saison ${currentSeason.number} · ${currentSeason.language.toUpperCase()}`}
                </p>
                <p className="mt-0.5 font-semibold">
                  {currentEp.title
                    ? `Ép. ${currentEp.number} — ${currentEp.title}`
                    : `Épisode ${currentEp.number}`}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass flex h-40 items-center justify-center rounded-3xl">
            <p className="text-sm text-muted-foreground">Sélectionnez un épisode</p>
          </div>
        )}

        {episodes && episodes.length > 0 && (
          <div className="glass mt-5 rounded-3xl p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Épisodes · {episodes.length}
            </h2>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
              {episodes.map((ep) => {
                const active = currentEp?.id === ep.id;
                return (
                  <button
                    key={ep.id}
                    onClick={() => setEpId(ep.id)}
                    title={ep.title ?? `Épisode ${ep.number}`}
                    className={`group relative flex h-12 items-center justify-center rounded-xl text-sm font-bold transition-all duration-200 ${
                      active
                        ? "bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/30 scale-105"
                        : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground hover:scale-105"
                    }`}
                  >
                    {active && (
                      <span className="absolute inset-0 rounded-xl ring-2 ring-primary/50" />
                    )}
                    {ep.number}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
