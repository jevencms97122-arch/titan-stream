import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Tv2 } from "lucide-react";

export function Nav() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 px-4 py-3">
      <div className="glass mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-5 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
            <Tv2 className="size-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="bg-gradient-to-r from-primary via-purple-300 to-accent bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
            Jux-Stream
          </span>
        </Link>

        <nav className="flex items-center gap-1.5">
          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <Shield className="size-4" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            </Link>
          )}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
