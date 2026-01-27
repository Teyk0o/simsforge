/**
 * Unit tests for Local Mod UI Components
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocalModAvatar } from '@/app/library/components/LocalModAvatar';
import { LocalModBadge } from '@/app/library/components/LocalModBadge';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'library.local_badge': 'Local',
      };
      return translations[key] || key;
    },
  }),
}));

describe('LocalModAvatar', () => {
  it('should render with first letter of mod name', () => {
    const { container } = render(<LocalModAvatar modName="MyMod" />);
    expect(container.textContent).toBe('M');
  });

  it('should render uppercase letter', () => {
    const { container } = render(<LocalModAvatar modName="awesome" />);
    expect(container.textContent).toBe('A');
  });

  it('should handle empty mod name gracefully', () => {
    const { container } = render(<LocalModAvatar modName="" />);
    expect(container.textContent).toBe('M'); // Default
  });

  it('should use default size of 64px when not specified', () => {
    const { container } = render(<LocalModAvatar modName="Test" />);
    const avatar = container.querySelector('.local-mod-avatar');
    expect(avatar).toHaveStyle({ width: '64px', height: '64px' });
  });

  it('should accept custom size', () => {
    const { container } = render(<LocalModAvatar modName="Test" size={100} />);
    const avatar = container.querySelector('.local-mod-avatar');
    expect(avatar).toHaveStyle({ width: '100px', height: '100px' });
  });

  it('should apply deterministic color based on first letter', () => {
    const { container: containerA } = render(<LocalModAvatar modName="Alpha" />);
    const { container: containerB } = render(<LocalModAvatar modName="Bravo" />);

    const avatarA = containerA.querySelector('.local-mod-avatar') as HTMLElement;
    const avatarB = containerB.querySelector('.local-mod-avatar') as HTMLElement;

    // Different letters should have different colors
    expect(avatarA.style.backgroundColor).not.toBe(avatarB.style.backgroundColor);
  });

  it('should have consistent color for same starting letter', () => {
    const { container: container1 } = render(<LocalModAvatar modName="Test1" />);
    const { container: container2 } = render(<LocalModAvatar modName="Test2" />);

    const avatar1 = container1.querySelector('.local-mod-avatar') as HTMLElement;
    const avatar2 = container2.querySelector('.local-mod-avatar') as HTMLElement;

    // Same starting letter should have same color
    expect(avatar1.style.backgroundColor).toBe(avatar2.style.backgroundColor);
  });

  it('should render as circular', () => {
    const { container } = render(<LocalModAvatar modName="Test" />);
    const avatar = container.querySelector('.local-mod-avatar');
    expect(avatar).toHaveStyle({ borderRadius: '50%' });
  });

  it('should center text', () => {
    const { container } = render(<LocalModAvatar modName="Test" />);
    const avatar = container.querySelector('.local-mod-avatar');
    expect(avatar).toHaveStyle({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });
  });

  it('should use white text color', () => {
    const { container } = render(<LocalModAvatar modName="Test" />);
    const avatar = container.querySelector('.local-mod-avatar');
    expect(avatar).toHaveStyle({ color: '#FFFFFF' });
  });

  it('should use bold font weight', () => {
    const { container } = render(<LocalModAvatar modName="Test" />);
    const avatar = container.querySelector('.local-mod-avatar');
    expect(avatar).toHaveStyle({ fontWeight: 'bold' });
  });

  it('should scale font size with avatar size', () => {
    const { container } = render(<LocalModAvatar modName="Test" size={100} />);
    const avatar = container.querySelector('.local-mod-avatar');
    // Font size should be 45% of avatar size (100 * 0.45 = 45)
    expect(avatar).toHaveStyle({ fontSize: '45px' });
  });
});

describe('LocalModBadge', () => {
  it('should render with "Local" text', () => {
    render(<LocalModBadge />);
    expect(screen.getByText('Local')).toBeInTheDocument();
  });

  it('should have correct styling classes', () => {
    const { container } = render(<LocalModBadge />);
    const badge = container.querySelector('.local-mod-badge');
    expect(badge).toBeInTheDocument();
  });

  it('should use small font size', () => {
    const { container } = render(<LocalModBadge />);
    const badge = container.querySelector('.local-mod-badge');
    expect(badge).toHaveStyle({ fontSize: '0.75rem' });
  });

  it('should have padding', () => {
    const { container } = render(<LocalModBadge />);
    const badge = container.querySelector('.local-mod-badge');
    expect(badge).toHaveStyle({
      padding: '0.125rem 0.5rem',
    });
  });

  it('should be rounded', () => {
    const { container } = render(<LocalModBadge />);
    const badge = container.querySelector('.local-mod-badge');
    expect(badge).toHaveStyle({ borderRadius: '0.25rem' });
  });

  it('should have medium font weight', () => {
    const { container } = render(<LocalModBadge />);
    const badge = container.querySelector('.local-mod-badge');
    expect(badge).toHaveStyle({ fontWeight: '500' });
  });

  it('should have left margin', () => {
    const { container } = render(<LocalModBadge />);
    const badge = container.querySelector('.local-mod-badge');
    expect(badge).toHaveStyle({ marginLeft: '0.5rem' });
  });
});
