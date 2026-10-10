CREATE FUNCTION public.can_read_profile_photo(p_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.network_profiles p WHERE p.photo_path = p_path AND public.can_view_profile_photo(p.user_id));
$$;
REVOKE ALL ON FUNCTION public.can_read_profile_photo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_profile_photo(text) TO authenticated, service_role;
ALTER POLICY "profile photo authorized read" ON storage.objects USING (bucket_id = 'profile-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.can_read_profile_photo(name)));