import { useEffect, useCallback } from 'react';

type HotkeyHandler = () => void;

interface HotkeyConfig {
  key: string;
  handler: HotkeyHandler;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  disabled?: boolean;
}

export function useHotkeys(hotkeys: HotkeyConfig[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      for (const hotkey of hotkeys) {
        if (hotkey.disabled) continue;

        const keyMatch = event.key.toLowerCase() === hotkey.key.toLowerCase();
        const ctrlMatch = hotkey.ctrlKey ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = hotkey.shiftKey ? event.shiftKey : !event.shiftKey;
        const altMatch = hotkey.altKey ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          if (hotkey.key === 'Escape' || !isInput) {
            event.preventDefault();
            hotkey.handler();
            break;
          }
        }
      }
    },
    [hotkeys]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
