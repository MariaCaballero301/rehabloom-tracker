ALTER TABLE public.network_profiles ADD COLUMN photo_path text;
ALTER TABLE public.network_profiles ADD CONSTRAINT own_profile_photo_path CHECK (photo_path IS NULL OR photo_path LIKE user_id::text || '/%');
CREATE FUNCTION public.can_view_profile_photo(p_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    auth.uid() = p_user_id OR (
      NOT public.network_is_blocked(auth.uid(), p_user_id) AND (
        EXISTS (SELECT 1 FROM public.network_profiles p WHERE p.user_id = p_user_id AND p.display_name <> '' AND (p.discoverable OR p.is_mentor))
        OR EXISTS (SELECT 1 FROM public.support_contacts c WHERE (c.user_id = auth.uid() AND c.connected_user_id = p_user_id) OR (c.user_id = p_user_id AND c.connected_user_id = auth.uid()))
      )
    )
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_profile_photo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_profile_photo(uuid) TO authenticated, service_role;
CREATE FUNCTION public.visible_profile_photo(p_user_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.photo_path FROM public.network_profiles p WHERE p.user_id = p_user_id AND public.can_view_profile_photo(p.user_id);
$$;
REVOKE ALL ON FUNCTION public.visible_profile_photo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.visible_profile_photo(uuid) TO authenticated, service_role;
CREATE POLICY "profile photo owner insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp'));
CREATE POLICY "profile photo owner delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "profile photo authorized read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'profile-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR EXISTS (SELECT 1 FROM public.network_profiles p WHERE p.photo_path = name AND public.can_view_profile_photo(p.user_id))));