-- Function to get commit with its files
CREATE OR REPLACE FUNCTION public.get_commit_with_files(
  p_commit_id uuid,
  p_project_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_commit_id uuid;
  v_message text;
  v_created_at timestamp with time zone;
  v_files jsonb;
  v_result jsonb;
BEGIN
  -- Get basic commit info
  SELECT id, message, created_at
  INTO v_commit_id, v_message, v_created_at
  FROM commits 
  WHERE id = p_commit_id 
  AND project_id = p_project_id;
  
  IF v_commit_id IS NULL THEN
    RAISE EXCEPTION 'Commit not found or does not belong to project';
  END IF;
  
  -- Get files for the commit
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'file_name', file_name,
        'file_path', file_path,
        'file_content', file_content,
        'file_type', file_type
      )
    ),
    '[]'::jsonb
  ) INTO v_files
  FROM commit_files
  WHERE commit_id = p_commit_id;
  
  -- Build the result
  v_result := jsonb_build_object(
    'commit_id', v_commit_id,
    'message', v_message,
    'created_at', v_created_at,
    'files', v_files
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error getting commit with files: %', SQLERRM;
END;
$$;

-- Function to restore a commit
CREATE OR REPLACE FUNCTION public.restore_commit(
  p_project_id uuid,
  p_commit_id uuid,
  p_files jsonb[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_files_added integer := 0;
  v_files_updated integer := 0;
  v_files_removed integer := 0;
  v_file jsonb;
  v_existing_file_id uuid;
  v_current_files uuid[] := '{}';
  v_file_path text;
  v_file_name text;
  v_file_content text;
  v_file_type text;
  v_file_size integer;
  v_files_to_keep uuid[] := '{}';
BEGIN
  -- Start transaction
  BEGIN
    -- Get current files to track what needs to be removed
    SELECT COALESCE(array_agg(id), '{}'::uuid[])
    INTO v_current_files
    FROM project_files
    WHERE project_id = p_project_id;
    
    -- Process each file in the commit
    FOREACH v_file IN ARRAY p_files
    LOOP
      -- Extract file properties
      v_file_path := v_file->>'path';
      v_file_name := v_file->>'name';
      v_file_content := v_file->>'content';
      v_file_type := v_file->>'file_type';
      v_file_size := (v_file->>'size')::integer;
      
      -- Check if file exists
      SELECT id INTO v_existing_file_id
      FROM project_files
      WHERE project_id = p_project_id
      AND path = v_file_path
      LIMIT 1;
      
      IF v_existing_file_id IS NOT NULL THEN
        -- Update existing file
        UPDATE project_files
        SET 
          name = v_file_name,
          content = v_file_content,
          file_type = v_file_type,
          size = v_file_size,
          updated_at = NOW()
        WHERE id = v_existing_file_id;
        
        v_files_updated := v_files_updated + 1;
        v_files_to_keep := v_files_to_keep || v_existing_file_id;
      ELSE
        -- Insert new file
        INSERT INTO project_files (
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
          v_file_name,
          v_file_path,
          v_file_content,
          v_file_type,
          v_file_size,
          NOW(),
          NOW()
        )
        RETURNING id INTO v_existing_file_id;
        
        v_files_added := v_files_added + 1;
        v_files_to_keep := v_files_to_keep || v_existing_file_id;
      END IF;
    END LOOP;
    
    -- Only remove files that are not in the commit and not in the keep list
    IF array_length(v_current_files, 1) > 0 THEN
      DELETE FROM project_files
      WHERE project_id = p_project_id
      AND id = ANY(v_current_files)
      AND NOT (id = ANY(v_files_to_keep));
      
      GET DIAGNOSTICS v_files_removed = ROW_COUNT;
    END IF;
    
    -- Update project's last_commit_id
    UPDATE projects
    SET 
      last_commit_id = p_commit_id,
      updated_at = NOW()
    WHERE id = p_project_id;
    
    -- Return results as JSON
    RETURN jsonb_build_object(
      'files_restored', v_files_added + v_files_updated,
      'files_added', v_files_added,
      'files_updated', v_files_updated,
      'files_removed', v_files_removed,
      'files_kept', array_length(v_files_to_keep, 1)
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Error restoring commit: %', SQLERRM;
  END;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_commit_with_files(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_commit(uuid, uuid, jsonb[]) TO authenticated;
