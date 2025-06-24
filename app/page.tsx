'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/canvas/new');
  }, [router]);
  return <div>Redirecting to new canvas...</div>;
}
