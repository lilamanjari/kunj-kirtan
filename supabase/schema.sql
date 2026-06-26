--
-- PostgreSQL database dump
--

\restrict U5Y0wuTAY0LEDrar7DYMKpldeCfuzbfpB0soTxAeSNYM06jHgGSFeyoztgXyRMr

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: kirtan_titles_fill_derived_fields(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.kirtan_titles_fill_derived_fields() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.title = btrim(new.title);
  new.normalized_title = public.normalize_search_text(new.title);
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: normalize_search_text(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_search_text(input_text text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  select trim(
    regexp_replace(
      regexp_replace(
        lower(unaccent(coalesce(input_text, ''))),
        '[^a-z0-9]+',
        ' ',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audio_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audio_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kirtan_id uuid NOT NULL,
    drive_file_id text NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL,
    is_current boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    duration_seconds integer
);


--
-- Name: kirtan_titles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kirtan_titles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kirtan_id uuid NOT NULL,
    kind text NOT NULL,
    title text NOT NULL,
    normalized_title text NOT NULL,
    is_searchable boolean DEFAULT true NOT NULL,
    is_browse_visible boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kirtan_titles_kind_check CHECK ((kind = ANY (ARRAY['first_line'::text, 'official'::text]))),
    CONSTRAINT kirtan_titles_title_check CHECK ((btrim(title) <> ''::text))
);


--
-- Name: bhajan_titles_flattened; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.bhajan_titles_flattened AS
 SELECT kirtan_id,
    max(
        CASE
            WHEN (kind = 'official'::text) THEN title
            ELSE NULL::text
        END) AS official_title,
    max(
        CASE
            WHEN (kind = 'first_line'::text) THEN title
            ELSE NULL::text
        END) AS first_line_title
   FROM public.kirtan_titles kt
  WHERE (kind = ANY (ARRAY['official'::text, 'first_line'::text]))
  GROUP BY kirtan_id;


--
-- Name: featured_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.featured_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slot text NOT NULL,
    entity_table text NOT NULL,
    entity_id uuid NOT NULL,
    title_override text,
    subtitle text,
    is_active boolean DEFAULT true NOT NULL,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    sort_order integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT featured_items_active_window_check CHECK (((ends_at IS NULL) OR (starts_at IS NULL) OR (ends_at >= starts_at))),
    CONSTRAINT featured_items_entity_table_check CHECK ((entity_table = ANY (ARRAY['kirtans'::text, 'tags'::text, 'lead_singers'::text])))
);


--
-- Name: kirtan_plays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kirtan_plays (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kirtan_id uuid NOT NULL,
    played_at timestamp with time zone DEFAULT now() NOT NULL,
    session_id text,
    client_id text,
    user_agent text,
    country text,
    qualified boolean DEFAULT true NOT NULL,
    seconds_played integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kirtan_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kirtan_tags (
    kirtan_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    slug text,
    published boolean DEFAULT true NOT NULL,
    browse_visible boolean DEFAULT false NOT NULL,
    CONSTRAINT tags_browse_visibility_requires_published CHECK (((published = true) OR (browse_visible = false)))
);


--
-- Name: COLUMN tags.published; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tags.published IS 'Whether the tag is publicly accessible anywhere in the app.';


--
-- Name: COLUMN tags.browse_visible; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tags.browse_visible IS 'Whether the tag appears in browse surfaces such as the occasions list. Requires published=true.';


--
-- Name: kirtan_tag_slugs; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.kirtan_tag_slugs AS
 SELECT kt.kirtan_id,
    t.slug
   FROM (public.kirtan_tags kt
     JOIN public.tags t ON ((t.id = kt.tag_id)));


--
-- Name: kirtans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kirtans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    title text,
    lead_singer_id uuid NOT NULL,
    raga text,
    recorded_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    download_count integer DEFAULT 0,
    sanga_id uuid,
    sequence_num integer,
    recorded_date_precision text,
    published boolean DEFAULT true NOT NULL,
    CONSTRAINT kirtans_type_check CHECK ((type = ANY (ARRAY['MM'::text, 'BHJ'::text, 'HK'::text]))),
    CONSTRAINT recorded_date_precision_check CHECK ((recorded_date_precision = ANY (ARRAY['day'::text, 'month'::text, 'year'::text])))
);


--
-- Name: lead_singers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_singers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    canonical_name text NOT NULL,
    display_name text NOT NULL,
    description text,
    image_url text,
    is_identified boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    slug text NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    home_sanga uuid
);


--
-- Name: kirtans_with_tags; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.kirtans_with_tags AS
 SELECT k.id,
    k.type,
    k.title,
    ls.display_name AS lead_singer,
    t.slug AS tag_slug,
    k.created_at,
    k.recorded_date,
    af.file_url AS audio_url
   FROM ((((public.kirtans k
     JOIN public.lead_singers ls ON ((ls.id = k.lead_singer_id)))
     JOIN public.audio_files af ON (((af.kirtan_id = k.id) AND (af.is_current = true))))
     LEFT JOIN public.kirtan_tags kt ON ((kt.kirtan_id = k.id)))
     LEFT JOIN public.tags t ON ((t.id = kt.tag_id)));


--
-- Name: sangas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sangas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: playable_kirtans; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.playable_kirtans AS
 SELECT k.id,
    k.type,
    k.title,
    k.recorded_date,
    af.file_url AS audio_url,
    ls.display_name AS lead_singer,
    k.created_at,
    s.name AS sanga,
    ls.id AS lead_singer_id,
        CASE
            WHEN (k.type = 'BHJ'::text) THEN lower(k.title)
            ELSE NULL::text
        END AS sort_key_alpha,
        CASE
            WHEN (k.type = 'MM'::text) THEN k.created_at
            ELSE NULL::timestamp with time zone
        END AS sort_key_created,
    af.duration_seconds,
    k.sequence_num,
    k.recorded_date_precision
   FROM (((public.kirtans k
     JOIN public.audio_files af ON (((af.kirtan_id = k.id) AND (af.is_current = true))))
     JOIN public.lead_singers ls ON ((ls.id = k.lead_singer_id)))
     LEFT JOIN public.sangas s ON ((s.id = k.sanga_id)))
  WHERE (k.published = true);


--
-- Name: lead_kirtan_counts; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.lead_kirtan_counts AS
 SELECT lead_singer_id,
    type,
    count(id) AS count
   FROM public.playable_kirtans
  WHERE (lead_singer_id IS NOT NULL)
  GROUP BY lead_singer_id, type;


--
-- Name: lead_singer_aliases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_singer_aliases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_singer_id uuid NOT NULL,
    alias text NOT NULL
);


--
-- Name: lead_singer_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_singer_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_singer_id uuid NOT NULL,
    image_key text NOT NULL,
    alt_text text,
    width integer,
    height integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lead_singer_images_dimensions_positive CHECK ((((width IS NULL) OR (width > 0)) AND ((height IS NULL) OR (height > 0)))),
    CONSTRAINT lead_singer_images_image_key_not_blank CHECK ((length(TRIM(BOTH FROM image_key)) > 0))
);


--
-- Name: TABLE lead_singer_images; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lead_singer_images IS 'Lead singer portrait and gallery images stored in R2.';


--
-- Name: COLUMN lead_singer_images.image_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lead_singer_images.image_key IS 'Object key inside the images bucket, for example lead-singers/bb-rasikananda-maharaja/portrait.jpg';


--
-- Name: playable_bhajan_titles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.playable_bhajan_titles AS
 SELECT kt.id AS browse_id,
    pk.id AS kirtan_id,
    kt.title,
    kt.kind AS title_kind,
    kt.normalized_title,
    pk.audio_url,
    pk.type,
    pk.lead_singer,
    pk.recorded_date,
    pk.recorded_date_precision,
    pk.sanga,
    pk.duration_seconds,
    pk.sequence_num,
    companion.title AS companion_title,
    companion.kind AS companion_title_kind,
    search_blob.searchable_text
   FROM (((public.playable_kirtans pk
     JOIN public.kirtan_titles kt ON ((kt.kirtan_id = pk.id)))
     LEFT JOIN LATERAL ( SELECT kt2.title,
            kt2.kind
           FROM public.kirtan_titles kt2
          WHERE ((kt2.kirtan_id = pk.id) AND (kt2.id <> kt.id) AND (kt2.is_browse_visible = true))
          ORDER BY
                CASE kt2.kind
                    WHEN 'official'::text THEN 1
                    WHEN 'first_line'::text THEN 2
                    ELSE 3
                END, kt2.title, kt2.id
         LIMIT 1) companion ON (true))
     LEFT JOIN LATERAL ( SELECT string_agg(DISTINCT kt3.normalized_title, ' '::text) AS searchable_text
           FROM public.kirtan_titles kt3
          WHERE ((kt3.kirtan_id = pk.id) AND (kt3.is_searchable = true))) search_blob ON (true))
  WHERE ((pk.type = 'BHJ'::text) AND (kt.is_browse_visible = true));


--
-- Name: playable_kirtans_with_titles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.playable_kirtans_with_titles AS
 SELECT pk.id,
    pk.type,
    pk.title,
    pk.recorded_date,
    pk.audio_url,
    pk.lead_singer,
    pk.created_at,
    pk.sanga,
    pk.lead_singer_id,
    pk.sort_key_alpha,
    pk.sort_key_created,
    pk.duration_seconds,
    pk.sequence_num,
    pk.recorded_date_precision,
    btp.official_title,
    btp.first_line_title,
        CASE
            WHEN (pk.type = 'BHJ'::text) THEN COALESCE(btp.official_title, btp.first_line_title, pk.title)
            ELSE pk.title
        END AS display_title
   FROM (public.playable_kirtans pk
     LEFT JOIN public.bhajan_titles_flattened btp ON ((btp.kirtan_id = pk.id)));


--
-- Name: popular_kirtans_moving_window; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.popular_kirtans_moving_window AS
 SELECT kirtan_id,
    (count(*))::integer AS play_count,
    (count(DISTINCT COALESCE(client_id, session_id)))::integer AS listener_count,
    max(created_at) AS last_played_at
   FROM public.kirtan_plays kp
  WHERE ((qualified = true) AND (created_at >= (now() - '30 days'::interval)))
  GROUP BY kirtan_id
  ORDER BY ((count(*))::integer) DESC, ((count(DISTINCT COALESCE(client_id, session_id)))::integer) DESC;


--
-- Name: playable_popular_kirtans_moving_window; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.playable_popular_kirtans_moving_window AS
 SELECT pk.id,
    pk.type,
    pk.title,
    pk.recorded_date,
    pk.audio_url,
    pk.lead_singer,
    pk.created_at,
    pk.sanga,
    pk.lead_singer_id,
    pk.sort_key_alpha,
    pk.sort_key_created,
    pk.duration_seconds,
    pk.sequence_num,
    pk.recorded_date_precision,
    p.play_count,
    p.listener_count,
    p.last_played_at
   FROM (public.popular_kirtans_moving_window p
     JOIN public.playable_kirtans pk ON ((pk.id = p.kirtan_id)));


--
-- Name: playable_popular_kirtans_moving_window_with_titles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.playable_popular_kirtans_moving_window_with_titles AS
 SELECT ppkmw.id,
    ppkmw.type,
    ppkmw.title,
    ppkmw.recorded_date,
    ppkmw.audio_url,
    ppkmw.lead_singer,
    ppkmw.created_at,
    ppkmw.sanga,
    ppkmw.lead_singer_id,
    ppkmw.sort_key_alpha,
    ppkmw.sort_key_created,
    ppkmw.duration_seconds,
    ppkmw.sequence_num,
    ppkmw.recorded_date_precision,
    ppkmw.play_count,
    ppkmw.listener_count,
    ppkmw.last_played_at,
    btp.official_title,
    btp.first_line_title,
        CASE
            WHEN (ppkmw.type = 'BHJ'::text) THEN COALESCE(btp.official_title, btp.first_line_title, ppkmw.title)
            ELSE ppkmw.title
        END AS display_title
   FROM (public.playable_popular_kirtans_moving_window ppkmw
     LEFT JOIN public.bhajan_titles_flattened btp ON ((btp.kirtan_id = ppkmw.id)));


--
-- Name: audio_files audio_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audio_files
    ADD CONSTRAINT audio_files_pkey PRIMARY KEY (id);


--
-- Name: featured_items featured_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_items
    ADD CONSTRAINT featured_items_pkey PRIMARY KEY (id);


--
-- Name: kirtan_plays kirtan_plays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kirtan_plays
    ADD CONSTRAINT kirtan_plays_pkey PRIMARY KEY (id);


--
-- Name: kirtan_tags kirtan_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kirtan_tags
    ADD CONSTRAINT kirtan_tags_pkey PRIMARY KEY (kirtan_id, tag_id);


--
-- Name: kirtan_titles kirtan_titles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kirtan_titles
    ADD CONSTRAINT kirtan_titles_pkey PRIMARY KEY (id);


--
-- Name: kirtans kirtans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kirtans
    ADD CONSTRAINT kirtans_pkey PRIMARY KEY (id);


--
-- Name: lead_singer_aliases lead_singer_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_singer_aliases
    ADD CONSTRAINT lead_singer_aliases_pkey PRIMARY KEY (id);


--
-- Name: lead_singer_images lead_singer_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_singer_images
    ADD CONSTRAINT lead_singer_images_pkey PRIMARY KEY (id);


--
-- Name: lead_singers lead_singers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_singers
    ADD CONSTRAINT lead_singers_pkey PRIMARY KEY (id);


--
-- Name: lead_singers lead_singers_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_singers
    ADD CONSTRAINT lead_singers_slug_unique UNIQUE (slug);


--
-- Name: sangas sangas_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sangas
    ADD CONSTRAINT sangas_name_key UNIQUE (name);


--
-- Name: sangas sangas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sangas
    ADD CONSTRAINT sangas_pkey PRIMARY KEY (id);


--
-- Name: tags tags_name_category_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_category_key UNIQUE (name, category);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: audio_files_duration_seconds_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audio_files_duration_seconds_idx ON public.audio_files USING btree (duration_seconds);


--
-- Name: featured_items_slot_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX featured_items_slot_active_idx ON public.featured_items USING btree (slot, is_active, sort_order, created_at DESC);


--
-- Name: idx_audio_files_current_kirtan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audio_files_current_kirtan ON public.audio_files USING btree (is_current, kirtan_id);


--
-- Name: idx_audio_files_kirtan_current; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audio_files_kirtan_current ON public.audio_files USING btree (kirtan_id) WHERE (is_current = true);


--
-- Name: idx_audio_files_kirtan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audio_files_kirtan_id ON public.audio_files USING btree (kirtan_id);


--
-- Name: idx_kirtan_plays_kirtan_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kirtan_plays_kirtan_created_at ON public.kirtan_plays USING btree (kirtan_id, created_at DESC) WHERE (qualified = true);


--
-- Name: idx_kirtan_plays_qualified_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kirtan_plays_qualified_created_at ON public.kirtan_plays USING btree (created_at DESC) WHERE (qualified = true);


--
-- Name: idx_kirtan_tags_kirtan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kirtan_tags_kirtan ON public.kirtan_tags USING btree (kirtan_id);


--
-- Name: idx_kirtan_tags_tag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kirtan_tags_tag ON public.kirtan_tags USING btree (tag_id);


--
-- Name: idx_kirtans_download_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kirtans_download_count ON public.kirtans USING btree (download_count DESC);


--
-- Name: idx_kirtans_lead_singer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kirtans_lead_singer ON public.kirtans USING btree (lead_singer_id);


--
-- Name: idx_kirtans_lead_singer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kirtans_lead_singer_id ON public.kirtans USING btree (lead_singer_id);


--
-- Name: idx_kirtans_mm_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kirtans_mm_order ON public.kirtans USING btree (type, recorded_date DESC, id DESC);


--
-- Name: idx_kirtans_recorded_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kirtans_recorded_date ON public.kirtans USING btree (recorded_date);


--
-- Name: idx_kirtans_sanga; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kirtans_sanga ON public.kirtans USING btree (sanga_id);


--
-- Name: idx_kirtans_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kirtans_title ON public.kirtans USING btree (title);


--
-- Name: idx_kirtans_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kirtans_type ON public.kirtans USING btree (type);


--
-- Name: idx_kirtans_type_lead_singer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kirtans_type_lead_singer ON public.kirtans USING btree (type, lead_singer_id);


--
-- Name: idx_lead_singer_aliases_alias; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_singer_aliases_alias ON public.lead_singer_aliases USING btree (alias);


--
-- Name: idx_lead_singers_display_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_singers_display_name ON public.lead_singers USING btree (display_name);


--
-- Name: idx_tags_name_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tags_name_category ON public.tags USING btree (name, category);


--
-- Name: idx_tags_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tags_slug ON public.tags USING btree (slug);


--
-- Name: kirtan_plays_kirtan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kirtan_plays_kirtan_id_idx ON public.kirtan_plays USING btree (kirtan_id);


--
-- Name: kirtan_plays_kirtan_id_played_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kirtan_plays_kirtan_id_played_at_idx ON public.kirtan_plays USING btree (kirtan_id, played_at DESC);


--
-- Name: kirtan_plays_played_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kirtan_plays_played_at_idx ON public.kirtan_plays USING btree (played_at DESC);


--
-- Name: kirtan_titles_browse_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kirtan_titles_browse_idx ON public.kirtan_titles USING btree (is_browse_visible, title, kirtan_id);


--
-- Name: kirtan_titles_browse_visible_normalized_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kirtan_titles_browse_visible_normalized_idx ON public.kirtan_titles USING gin (normalized_title public.gin_trgm_ops) WHERE (is_browse_visible = true);


--
-- Name: kirtan_titles_browse_visible_title_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kirtan_titles_browse_visible_title_idx ON public.kirtan_titles USING btree (title, id) WHERE (is_browse_visible = true);


--
-- Name: kirtan_titles_kirtan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kirtan_titles_kirtan_id_idx ON public.kirtan_titles USING btree (kirtan_id);


--
-- Name: kirtan_titles_one_first_line_per_kirtan; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX kirtan_titles_one_first_line_per_kirtan ON public.kirtan_titles USING btree (kirtan_id) WHERE (kind = 'first_line'::text);


--
-- Name: kirtan_titles_one_official_per_kirtan; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX kirtan_titles_one_official_per_kirtan ON public.kirtan_titles USING btree (kirtan_id) WHERE (kind = 'official'::text);


--
-- Name: kirtan_titles_searchable_normalized_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kirtan_titles_searchable_normalized_idx ON public.kirtan_titles USING gin (normalized_title public.gin_trgm_ops) WHERE (is_searchable = true);


--
-- Name: lead_singer_images_lead_singer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lead_singer_images_lead_singer_id_idx ON public.lead_singer_images USING btree (lead_singer_id, created_at DESC);


--
-- Name: kirtan_titles kirtan_titles_fill_derived_fields_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER kirtan_titles_fill_derived_fields_trigger BEFORE INSERT OR UPDATE ON public.kirtan_titles FOR EACH ROW EXECUTE FUNCTION public.kirtan_titles_fill_derived_fields();


--
-- Name: kirtan_titles kirtan_titles_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER kirtan_titles_set_updated_at BEFORE UPDATE ON public.kirtan_titles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: kirtans kirtans_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER kirtans_set_updated_at BEFORE UPDATE ON public.kirtans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: lead_singers lead_singers_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lead_singers_set_updated_at BEFORE UPDATE ON public.lead_singers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: audio_files audio_files_kirtan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audio_files
    ADD CONSTRAINT audio_files_kirtan_id_fkey FOREIGN KEY (kirtan_id) REFERENCES public.kirtans(id) ON DELETE CASCADE;


--
-- Name: kirtan_plays kirtan_plays_kirtan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kirtan_plays
    ADD CONSTRAINT kirtan_plays_kirtan_id_fkey FOREIGN KEY (kirtan_id) REFERENCES public.kirtans(id) ON DELETE CASCADE;


--
-- Name: kirtan_tags kirtan_tags_kirtan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kirtan_tags
    ADD CONSTRAINT kirtan_tags_kirtan_id_fkey FOREIGN KEY (kirtan_id) REFERENCES public.kirtans(id) ON DELETE CASCADE;


--
-- Name: kirtan_tags kirtan_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kirtan_tags
    ADD CONSTRAINT kirtan_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: kirtan_titles kirtan_titles_kirtan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kirtan_titles
    ADD CONSTRAINT kirtan_titles_kirtan_id_fkey FOREIGN KEY (kirtan_id) REFERENCES public.kirtans(id) ON DELETE CASCADE;


--
-- Name: kirtans kirtans_lead_singer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kirtans
    ADD CONSTRAINT kirtans_lead_singer_id_fkey FOREIGN KEY (lead_singer_id) REFERENCES public.lead_singers(id);


--
-- Name: kirtans kirtans_sanga_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kirtans
    ADD CONSTRAINT kirtans_sanga_id_fkey FOREIGN KEY (sanga_id) REFERENCES public.sangas(id);


--
-- Name: lead_singer_aliases lead_singer_aliases_lead_singer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_singer_aliases
    ADD CONSTRAINT lead_singer_aliases_lead_singer_id_fkey FOREIGN KEY (lead_singer_id) REFERENCES public.lead_singers(id) ON DELETE CASCADE;


--
-- Name: lead_singer_images lead_singer_images_lead_singer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_singer_images
    ADD CONSTRAINT lead_singer_images_lead_singer_id_fkey FOREIGN KEY (lead_singer_id) REFERENCES public.lead_singers(id) ON DELETE CASCADE;


--
-- Name: lead_singers lead_singers_home_sanga_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_singers
    ADD CONSTRAINT lead_singers_home_sanga_fkey FOREIGN KEY (home_sanga) REFERENCES public.sangas(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict U5Y0wuTAY0LEDrar7DYMKpldeCfuzbfpB0soTxAeSNYM06jHgGSFeyoztgXyRMr

