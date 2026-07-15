import { useEffect, useState } from 'react';
import axios from 'axios';

const DEBOUNCE_MS = 500;

// Debounced check against GET /api/documents/check-duplicate — warns the user that a
// unique_id/pt_index value is already taken before they submit the form, instead of only
// finding out from the server's validation error after posting.
export function useDuplicateCheck(field: 'unique_id' | 'pt_index', value: string | undefined, ignoreId?: string) {
  const [duplicate, setDuplicate] = useState(false);
  const [checking, setChecking]   = useState(false);

  useEffect(() => {
    const trimmed = (value ?? '').trim();
    if (!trimmed) {
      setDuplicate(false);
      setChecking(false);
      return;
    }

    setChecking(true);
    const timer = setTimeout(() => {
      axios
        .get<{ duplicate: boolean }>('/api/documents/check-duplicate', {
          params: { field, value: trimmed, ignore_id: ignoreId },
        })
        .then(({ data }) => setDuplicate(data.duplicate))
        .catch(() => setDuplicate(false))
        .finally(() => setChecking(false));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [field, value, ignoreId]);

  return { duplicate, checking };
}
