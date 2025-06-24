'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function NewCanvasPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isCreating) return;

    async function createCanvas() {
      setIsCreating(true);
      console.log('Attempting to create new canvas...');
      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase URL or Anon Key is missing. Make sure .env.local is set up correctly.');
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      const { data, error } = await supabase
        .from('canvases')
        .insert([{}])
        .select('id')
        .single();

      if (error) {
        console.error('Error creating new canvas in Supabase:', error);
        return;
      }

      if (data && data.id) {
        console.log('Successfully created canvas with ID:', data.id);
        router.replace(`/canvas/${data.id}`);
      } else {
        console.error('No data or ID returned from Supabase after insert.');
      }
    }
    createCanvas();
  }, [router, isCreating]);

  return <div>Creating new canvas...</div>;
} 