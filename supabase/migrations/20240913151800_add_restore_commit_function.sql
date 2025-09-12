-- Create a function to handle atomic commit restoration
CREATE OR REPLACE FUNCTION public.restore_commit_files(
  p_project_id uuid,
  p_commit_id uuid,
  p_files jsonb[]
) 
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_result jsonb;
  v_file_record jsonb;
  v_file_id uuid;
  v_error_message text;
  v_error_detail text;
  v_error_hint text;
  v_error_context text;
BEGIN
  -- Start transaction
  BEGIN
    -- First, delete existing files within the transaction
    DELETE FROM public.project_files 
    WHERE project_id = p_project_id;

    -- Insert the new files from the commit
    FOREACH v_file_record IN ARRAY p_files
    LOOP
      INSERT INTO public.project_files (
        project_id,
        name,
        path,
        content,
        file_type,
        size,
        created_at,
        updated_at
      ) VALUES (
        p_project_id,
        v_file_record->>'name',
        v_file_record->>'path',
        v_file_record->>'content',
        v_file_record->>'file_type',
        (v_file_record->>'size')::integer,
        NOW(),
        NOW()
      )
      RETURNING id INTO v_file_id;
    END LOOP;

    -- Get the count of restored files
    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- Return success with count
    RETURN jsonb_build_object(
      'success', true,
      'files_restored', v_count,
      'project_id', p_project_id,
      'commit_id', p_commit_id
    );

  EXCEPTION
    WHEN OTHERS THEN
      -- Get error details
      GET STACKED DIAGNOSTICS 
        v_error_message = MESSAGE_TEXT,
        v_error_detail = PG_EXCEPTION_DETAIL,
        v_error_hint = PG_EXCEPTION_HINT,
        v_error_context = PG_EXCEPTION_CONTEXT;

      -- Rollback the transaction
      RAISE EXCEPTION '
        Error restoring commit: %
        Detail: %
        Hint: %
        Context: %', 
        v_error_message, v_error_detail, v_error_hint, v_error_context;
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.restore_commit_files(uuid, uuid, jsonb[]) TO authenticated;

-- Add a comment for documentation
COMMENT ON FUNCTION public.restore_commit_files IS 'Safely restores project files to a specific commit state using a transaction to ensure data consistency.';
