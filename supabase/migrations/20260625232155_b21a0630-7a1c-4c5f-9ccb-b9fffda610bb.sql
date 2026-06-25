
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Trigger on signup: create profile + assign role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  IF NEW.email = 'julo.even97122@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Content tables
CREATE TABLE public.animes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  poster_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.animes TO authenticated;
GRANT ALL ON public.animes TO service_role;
ALTER TABLE public.animes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authed reads animes" ON public.animes FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage animes" ON public.animes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_id UUID NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
  number INT NOT NULL,
  language TEXT NOT NULL DEFAULT 'vf',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(anime_id, number, language)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seasons TO authenticated;
GRANT ALL ON public.seasons TO service_role;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authed reads seasons" ON public.seasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage seasons" ON public.seasons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  number INT NOT NULL,
  embed_url TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(season_id, number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.episodes TO authenticated;
GRANT ALL ON public.episodes TO service_role;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authed reads episodes" ON public.episodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage episodes" ON public.episodes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed Attack on Titan S1 VF
DO $$
DECLARE
  v_anime UUID;
  v_season UUID;
  urls TEXT[] := ARRAY[
    'https://vidmoly.to/embed-3uv67ncej0ei.html',
    'https://vidmoly.to/embed-3rngji4qmzhb.html',
    'https://vidmoly.to/embed-lo35rhlbfwv2.html',
    'https://vidmoly.to/embed-twx2n26hvxbx.html',
    'https://vidmoly.to/embed-4trkm8yzxg4t.html',
    'https://vidmoly.to/embed-uqm335zdlonp.html',
    'https://vidmoly.to/embed-wknpwpvtjlfg.html',
    'https://vidmoly.to/embed-kgcsavhacqib.html',
    'https://vidmoly.to/embed-nw2wzrbs9pqk.html',
    'https://vidmoly.to/embed-z41876cngnno.html',
    'https://vidmoly.to/embed-gqde4xe44obo.html',
    'https://vidmoly.to/embed-ch6p5h5q7i9w.html',
    'https://vidmoly.to/embed-tb1e81ortowg.html',
    'https://vidmoly.to/embed-gmvnxpby2bzl.html',
    'https://vidmoly.to/embed-pdbkzue2vf9r.html',
    'https://vidmoly.to/embed-d2mdep0fsg31.html',
    'https://vidmoly.to/embed-6uetfvag8r13.html',
    'https://vidmoly.to/embed-fzpc6ksfsrq2.html',
    'https://vidmoly.to/embed-c5c7mnt6tbbl.html',
    'https://vidmoly.to/embed-oyt4sh00gdmr.html',
    'https://vidmoly.to/embed-ei5ga3fsu48c.html',
    'https://vidmoly.to/embed-o7b5jf9qdzk9.html',
    'https://vidmoly.to/embed-vz1nqh1axczl.html',
    'https://vidmoly.to/embed-o710xaglu8mk.html',
    'https://vidmoly.to/embed-22w0107hwzzc.html'
  ];
  i INT;
BEGIN
  INSERT INTO public.animes (title, description, poster_url)
  VALUES (
    'L''Attaque des Titans',
    'L''humanité vit retranchée derrière d''immenses murs pour se protéger des Titans, des créatures gigantesques qui dévorent les humains.',
    'https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg'
  ) RETURNING id INTO v_anime;

  INSERT INTO public.seasons (anime_id, number, language)
  VALUES (v_anime, 1, 'vf') RETURNING id INTO v_season;

  FOR i IN 1..array_length(urls, 1) LOOP
    INSERT INTO public.episodes (season_id, number, embed_url, title)
    VALUES (v_season, i, urls[i], 'Épisode ' || i);
  END LOOP;
END $$;
