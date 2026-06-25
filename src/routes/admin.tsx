import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { session, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/auth" });
    else if (!isAdmin) navigate({ to: "/" });
  }, [session, isAdmin, loading, navigate]);

  const { data: animes } = useQuery({
    queryKey: ["admin-animes"],
    queryFn: async () => {
      const { data } = await supabase.from("animes").select("*, seasons(*, episodes(*))").order("created_at");
      return data ?? [];
    },
    enabled: !!isAdmin,
  });

  const [newAnime, setNewAnime] = useState({ title: "", description: "", poster_url: "" });
  const [seasonForm, setSeasonForm] = useState<Record<string, { number: string; language: string }>>({});
  const [epForm, setEpForm] = useState<Record<string, { number: string; embed_url: string; title: string }>>({});

  async function addAnime() {
    if (!newAnime.title) return;
    const { error } = await supabase.from("animes").insert(newAnime);
    if (error) return toast.error(error.message);
    setNewAnime({ title: "", description: "", poster_url: "" });
    qc.invalidateQueries({ queryKey: ["admin-animes"] });
    qc.invalidateQueries({ queryKey: ["animes"] });
    toast.success("Anime ajouté");
  }

  async function addSeason(animeId: string) {
    const f = seasonForm[animeId];
    if (!f?.number) return;
    const { error } = await supabase.from("seasons").insert({
      anime_id: animeId,
      number: parseInt(f.number),
      language: f.language || "vf",
    });
    if (error) return toast.error(error.message);
    setSeasonForm({ ...seasonForm, [animeId]: { number: "", language: "vf" } });
    qc.invalidateQueries({ queryKey: ["admin-animes"] });
  }

  async function addEpisode(seasonId: string) {
    const f = epForm[seasonId];
    if (!f?.number || !f.embed_url) return;
    const { error } = await supabase.from("episodes").insert({
      season_id: seasonId,
      number: parseInt(f.number),
      embed_url: f.embed_url,
      title: f.title || null,
    });
    if (error) return toast.error(error.message);
    setEpForm({ ...epForm, [seasonId]: { number: "", embed_url: "", title: "" } });
    qc.invalidateQueries({ queryKey: ["admin-animes"] });
  }

  async function remove(table: "animes" | "seasons" | "episodes", id: string) {
    if (!confirm("Supprimer ?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-animes"] });
    qc.invalidateQueries({ queryKey: ["animes"] });
  }

  if (!isAdmin) return <div className="min-h-screen"><Nav /></div>;

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>

        <section className="glass-strong rounded-3xl p-6">
          <h2 className="mb-4 text-lg font-semibold">Ajouter un anime</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1"><Label>Titre</Label><Input value={newAnime.title} onChange={(e) => setNewAnime({ ...newAnime, title: e.target.value })} className="bg-white/5"/></div>
            <div className="space-y-1 md:col-span-2"><Label>Affiche (URL)</Label><Input value={newAnime.poster_url} onChange={(e) => setNewAnime({ ...newAnime, poster_url: e.target.value })} className="bg-white/5"/></div>
            <div className="space-y-1 md:col-span-3"><Label>Description</Label><Input value={newAnime.description} onChange={(e) => setNewAnime({ ...newAnime, description: e.target.value })} className="bg-white/5"/></div>
          </div>
          <Button className="mt-4" onClick={addAnime}>Ajouter</Button>
        </section>

        {animes?.map((a: any) => (
          <section key={a.id} className="glass rounded-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{a.title}</h3>
              <Button size="icon" variant="ghost" onClick={() => remove("animes", a.id)}><Trash2 className="size-4" /></Button>
            </div>

            <div className="space-y-4">
              {a.seasons?.sort((x: any, y: any) => x.number - y.number).map((s: any) => (
                <div key={s.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-medium">Saison {s.number} · {s.language.toUpperCase()} <span className="text-muted-foreground text-sm">({s.episodes?.length ?? 0} ép.)</span></h4>
                    <Button size="icon" variant="ghost" onClick={() => remove("seasons", s.id)}><Trash2 className="size-4" /></Button>
                  </div>

                  <div className="grid gap-2 md:grid-cols-[80px_1fr_1fr_auto] mb-2">
                    <Input placeholder="N°" value={epForm[s.id]?.number ?? ""} onChange={(e) => setEpForm({ ...epForm, [s.id]: { ...(epForm[s.id] ?? { embed_url: "", title: "" }), number: e.target.value } })} className="bg-white/5"/>
                    <Input placeholder="Titre (optionnel)" value={epForm[s.id]?.title ?? ""} onChange={(e) => setEpForm({ ...epForm, [s.id]: { ...(epForm[s.id] ?? { number: "", embed_url: "" }), title: e.target.value } })} className="bg-white/5"/>
                    <Input placeholder="Embed URL" value={epForm[s.id]?.embed_url ?? ""} onChange={(e) => setEpForm({ ...epForm, [s.id]: { ...(epForm[s.id] ?? { number: "", title: "" }), embed_url: e.target.value } })} className="bg-white/5"/>
                    <Button onClick={() => addEpisode(s.id)}>+ Ép.</Button>
                  </div>

                  {s.episodes && s.episodes.length > 0 && (
                    <div className="mt-3 space-y-1 text-sm">
                      {s.episodes.sort((x: any, y: any) => x.number - y.number).map((ep: any) => (
                        <div key={ep.id} className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-white/5">
                          <span className="truncate">Ép. {ep.number} — <span className="text-muted-foreground truncate">{ep.embed_url}</span></span>
                          <button onClick={() => remove("episodes", ep.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="grid gap-2 md:grid-cols-[120px_120px_auto]">
                <Input placeholder="N° saison" value={seasonForm[a.id]?.number ?? ""} onChange={(e) => setSeasonForm({ ...seasonForm, [a.id]: { ...(seasonForm[a.id] ?? { language: "vf" }), number: e.target.value } })} className="bg-white/5"/>
                <Input placeholder="vf / vostfr" value={seasonForm[a.id]?.language ?? "vf"} onChange={(e) => setSeasonForm({ ...seasonForm, [a.id]: { ...(seasonForm[a.id] ?? { number: "" }), language: e.target.value } })} className="bg-white/5"/>
                <Button variant="secondary" onClick={() => addSeason(a.id)}>+ Saison</Button>
              </div>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
