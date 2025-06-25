'use client';

import 'ketcher-react/dist/index.css';
import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// We will dynamically import the service provider as well
// to ensure it's never on the server bundle.
import type { Ketcher } from 'ketcher-core';
import type { StandaloneStructServiceProvider } from 'ketcher-standalone';

const Editor = dynamic(
  () => import('ketcher-react').then((mod) => mod.Editor),
  {
    ssr: false,
    loading: () => <p>Loading Ketcher Editor...</p>,
  },
);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// SVGs as strings for Ketcher customButtons
const newCanvasSvg = `
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="11" y="4" width="2" height="16" fill="#333"/>
    <rect x="4" y="11" width="16" height="2" fill="#333"/>
  </svg>
`;
const shareSvg = `
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 8.59V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3.59" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="15 12 21 6 15 0" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

export default function CanvasPage() {
  const router = useRouter();
  const params = useParams();
  const uuid = params?.uuid as string;
  const ketcherRef = useRef<Ketcher | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Hold the provider in a ref, and only instantiate it on the client.
  const structServiceProviderRef = useRef<StandaloneStructServiceProvider | null>(null);
  if (typeof window !== 'undefined' && !structServiceProviderRef.current) {
    // This is the key: we import and instantiate inside the client-only block.
    const { StandaloneStructServiceProvider: Ssp } = require('ketcher-standalone');
    structServiceProviderRef.current = new Ssp();
  }

  const [initialKet, setInitialKet] = useState<string | null>(null);
  const [isKetLoaded, setIsKetLoaded] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    if (!uuid) {
      setIsKetLoaded(true); // Nothing to load
      return;
    }

    async function fetchKet() {
      const { data, error: dbError } = await supabase
        .from('canvases')
        .select('ket')
        .eq('id', uuid)
        .single();

      if (dbError || !data) {
        setError('Canvas not found or failed to load.');
      } else {
        setInitialKet(data.ket || '');
      }
      setIsKetLoaded(true);
    }
    fetchKet();
  }, [uuid]);

  useEffect(() => {
    // This is the key: delay rendering the editor by one tick.
    const timer = setTimeout(() => {
      setIsClient(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleOnInit = (ketcherInstance: Ketcher) => {
    ketcherRef.current = ketcherInstance;
    (window as any).ketcher = ketcherInstance;
    // Listen for both possible custom button events
    ketcherInstance.eventBus?.addListener('CUSTOM_BUTTON_CLICK', (buttonId: string) => {
      console.log('CUSTOM_BUTTON_CLICK event:', buttonId);
    });
    ketcherInstance.eventBus?.addListener('CUSTOM_BUTTON_PRESSED', async (buttonId: string) => {
      console.log('CUSTOM_BUTTON_PRESSED event:', buttonId);
      if (buttonId === 'new-canvas') {
        // New Canvas logic
        const { data } = await supabase.from('canvases').insert([{}]).select('id').single();
        if (data?.id) {
          window.location.href = `/canvas/${data.id}`;
        } else {
          setError('Failed to create a new canvas.');
        }
      } else if (buttonId === 'share') {
        // Share logic
        if (ketcherRef.current) {
          const ket = await ketcherRef.current.getKet();
          await supabase.from('canvases').update({ ket }).eq('id', uuid);
          navigator.clipboard.writeText(window.location.href);
          alert('Canvas saved and URL copied to clipboard!');
        }
      }
    });
    if (initialKet !== null) {
      // Add a small delay to ensure all internal Ketcher services are ready
      setTimeout(() => {
        ketcherInstance.setMolecule(initialKet);
      }, 100);
    }
  };

  // Restore the top button bar handlers for the visible buttons
  const handleNewCanvas = async () => {
    const { data } = await supabase.from('canvases').insert([{}]).select('id').single();
    if (data?.id) {
      window.location.href = `/canvas/${data.id}`;
    } else {
      setError('Failed to create a new canvas.');
    }
  };

  const handleShare = async () => {
    if (ketcherRef.current) {
      const ket = await ketcherRef.current.getKet();
      await supabase.from('canvases').update({ ket }).eq('id', uuid);
      navigator.clipboard.writeText(window.location.href);
      alert('Canvas saved and URL copied to clipboard!');
    }
  };

  if (!isKetLoaded || !structServiceProviderRef.current || !isClient) {
    return <div>Loading...</div>;
  }

  if (error) return <div>{error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '10px', borderBottom: '1px solid #ccc', display: 'flex', gap: '10px', height: '50px', flexShrink: 0 }}>
        <button onClick={handleNewCanvas} style={{ padding: '8px 12px', cursor: 'pointer' }}> New Canvas </button>
        <button onClick={handleShare} style={{ padding: '8px 12px', cursor: 'pointer' }}> Share </button>
      </div>
      <div style={{ height: 'calc(100vh - 50px)' }}>
        <Editor
          staticResourcesUrl={process.env.NEXT_PUBLIC_BASE_PATH || '/'}
          structServiceProvider={structServiceProviderRef.current as any}
          errorHandler={(message: string) => console.error('Ketcher Error:', message)}
          onInit={handleOnInit}
          customButtons={[
            { id: 'new-canvas', title: 'New Canvas', imageLink: '/icons/new-canvas.svg' },
            { id: 'share', title: 'Share', imageLink: '/icons/share.svg' },
          ]}
        />
      </div>
    </div>
  );
}