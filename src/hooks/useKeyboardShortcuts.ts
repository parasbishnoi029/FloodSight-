import { useEffect } from 'react';
import hotkeys from 'hotkeys-js';
import { NavigationTab } from '../types';

interface KeyboardShortcutsOptions {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onToggleHotkeyModal?: () => void;
  onCloseModal?: () => void;
}

export function useKeyboardShortcuts({
  onSelectTab,
  onToggleHotkeyModal,
  onCloseModal,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    // Configure hotkeys filter so inputs/textareas are not intercepted while typing
    hotkeys.filter = (event: KeyboardEvent) => {
      const target = (event.target || event.srcElement) as HTMLElement | null;
      if (!target) return true;
      const tagName = target.tagName;
      return !(
        target.isContentEditable ||
        tagName === 'INPUT' ||
        tagName === 'SELECT' ||
        tagName === 'TEXTAREA'
      );
    };

    // Define navigation shortcuts mapping
    const navShortcuts: { key: string; tab: NavigationTab }[] = [
      { key: 'd', tab: 'dashboard' },
      { key: 'm', tab: 'map' },
      { key: 'a', tab: 'analyze' },
      { key: 'r', tab: 'reports' },
      { key: 'h', tab: 'landing' },
    ];

    // Register tab shortcuts
    navShortcuts.forEach(({ key, tab }) => {
      hotkeys(key, (event) => {
        event.preventDefault();
        onSelectTab(tab);
      });
    });

    // Register Modal & Help shortcuts: '?' or 'shift+/' or 'ctrl+k' or 'cmd+k'
    hotkeys('?, shift+/, ctrl+k, cmd+k', (event) => {
      event.preventDefault();
      if (onToggleHotkeyModal) {
        onToggleHotkeyModal();
      }
    });

    // Register Escape key to close active modal
    hotkeys('esc, escape', () => {
      if (onCloseModal) {
        onCloseModal();
      }
    });

    return () => {
      // Clean up hotkey bindings
      navShortcuts.forEach(({ key }) => {
        hotkeys.unbind(key);
      });
      hotkeys.unbind('?, shift+/, ctrl+k, cmd+k');
      hotkeys.unbind('esc, escape');
    };
  }, [onSelectTab, onToggleHotkeyModal, onCloseModal]);
}
