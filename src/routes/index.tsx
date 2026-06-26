import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Nav } from "@/components/Nav";
import { Play, ChevronRight } from "lucide-react";

// v2
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jux-Stream — Animes en streaming" },
      { name: "description", content: "Regardez vos animes préférés sur Jux-Stream." },
    ],
  }),
  component: Home,
});

function AnimeCardSkeleton() {
  return (
    <div className="aspect-[2/3] rounded-2xl skeleton" />
  );
}

function Home() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [session, loading, navigate]);

  const { data: animes, isLoading } = useQuery({
    queryKey: ["animes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  if (!session) return null;

  const featured = animes?.[0];

  return (
    <div className="min-h-screen">
      <Nav />

      {/* Hero */}
      {featured && (
        <div className="relative mb-10 overflow-hidden">
          {/* Blurred backdrop */}
          {featured.poster_url && (
            <>
              <div
                className="absolute inset-0 scale-110 blur-2xl"
                style={{
                  backgroundImage: `url(${featured.poster_url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.25,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            </>
          )}

          <div className="relative mx-auto flex max-w-6xl items-end gap-8 px-4 pb-10 pt-8">
            {featured.poster_url && (
              <img
                src={featured.poster_url}
                alt={featured.title}
                className="hidden w-40 shrink-0 rounded-2xl shadow-2xl sm:block"
                style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}
              />
            )}
            <div className="animate-fade-up flex-1">
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                <span className="size-1.5 rounded-full bg-primary" />
                Nouveauté
              </span>
              <h2 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                {featured.title}
              </h2>
              {featured.description && (
                <p className="mt-3 line-clamp-2 max-w-xl text-sm text-muted-foreground sm:text-base">
                  {featured.description}
                </p>
              )}
              <Link
                to="/anime/$id"
                params={{ id: featured.id }}
                className="mt-5 inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-primary/40"
              >
                <Play className="size-4 fill-white" /> Regarder maintenant
              </Link>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 pb-12">
        {/* Section header */}
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">
            Bibliothèque
            {animes && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {animes.length} anime{animes.length > 1 ? "s" : ""}
              </span>
            )}
          </h1>
          {animes && animes.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              Tout voir <ChevronRight className="size-3" />
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <AnimeCardSkeleton key={i} />
            ))}
          </div>
        ) : !animes?.length ? (
          <div className="glass flex flex-col items-center justify-center gap-3 rounded-3xl py-20 text-center">
            <div className="size-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <Play className="size-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Aucun anime pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {animes.map((a, i) => (
              <Link
                key={a.id}
                to="/anime/$id"
                params={{ id: a.id }}
                className="group relative aspect-[2/3] overflow-hidden rounded-2xl bg-white/5"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {a.poster_url ? (
                  <img
                    src={a.poster_url}
                    alt={a.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                    <Play className="size-10 text-muted-foreground/40" />
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100" />

                {/* Play button on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
                  <div className="flex size-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm ring-2 ring-white/30 transition-transform duration-200 group-hover:scale-110">
                    <Play className="size-5 translate-x-0.5 fill-white text-white" />
                  </div>
                </div>

                {/* Title */}
                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-1 transition-transform duration-300 group-hover:translate-y-0">
                  <h3 className="line-clamp-2 text-xs font-bold leading-tight text-white drop-shadow-lg">
                    {a.title}
                  </h3>
                </div>

                {/* Border on hover */}
                <div className="absolute inset-0 rounded-2xl ring-1 ring-white/0 transition-all duration-300 group-hover:ring-primary/50" />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
