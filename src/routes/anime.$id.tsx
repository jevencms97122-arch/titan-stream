import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/anime/$id")({
  component: AnimePage,
});

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
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="glass-strong overflow-hidden rounded-3xl">
          <div className="flex flex-col gap-6 p-6 md:flex-row">
            {data.anime.poster_url && (
              <img
                src={data.anime.poster_url}
                alt={data.anime.title}
                className="h-72 w-48 shrink-0 rounded-2xl object-cover shadow-2xl"
              />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight">{data.anime.title}</h1>
              <p className="mt-3 text-sm text-muted-foreground">{data.anime.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.seasons.map((s) => (
                  <Button
                    key={s.id}
                    size="sm"
                    variant={currentSeason?.id === s.id ? "default" : "secondary"}
                    onClick={() => { setSeasonId(s.id); setEpId(null); }}
                  >
                    Saison {s.number} · {s.language.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {currentEp && (
          <div className="glass mt-6 overflow-hidden rounded-3xl">
            <div className="aspect-video w-full bg-black">
              <iframe
                key={currentEp.id}
                src={currentEp.embed_url}
                className="h-full w-full"
                allowFullScreen
                allow="autoplay; fullscreen; encrypted-media"
              />
            </div>
            <div className="p-4 text-sm font-medium">
              {currentEp.title ?? `Épisode ${currentEp.number}`}
            </div>
          </div>
        )}

        {episodes && episodes.length > 0 && (
          <div className="glass mt-6 rounded-3xl p-4">
            <h2 className="mb-3 px-2 text-sm font-semibold text-muted-foreground">Épisodes</h2>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
              {episodes.map((ep) => (
                <button
                  key={ep.id}
                  onClick={() => setEpId(ep.id)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    (currentEp?.id === ep.id)
                      ? "border-primary bg-primary/20"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {ep.number}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
