'use client';

import { useEffect, useRef } from 'react';
import { incrementViewCount } from './actions';

export default function ViewCounter({ pollId }: { pollId: string }) {
  const called = useRef(false);
  useEffect(() => {
    if (called.current) return;
    called.current = true;
    incrementViewCount(pollId).catch(() => {});
  }, [pollId]);
  return null;
}
