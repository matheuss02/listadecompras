// Importa a função de criação do client Supabase via CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Cria o client com a URL e a chave fornecidas
export const supabase = createClient(
  'https://gwivzydllcthkqeulebf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3aXZ6eWRsbGN0aGtxZXVsZWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTI1MzgsImV4cCI6MjA4NzY4ODUzOH0.MwWBP1RJkBLxy42QbJPdwkFBjjBYrX53d-O9HwtLFgA'
)
    