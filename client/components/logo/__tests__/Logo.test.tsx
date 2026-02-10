import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Logo } from '@client/components/logo/Logo';
import type { IProps } from '@client/components/logo/Logo';

describe('Logo Component', () => {
  describe('rendering', () => {
    test('should render logo container', () => {
      const { container } = render(<Logo />);

      const logoContainer = container.querySelector('div');
      expect(logoContainer).toBeInTheDocument();
      expect(logoContainer).toHaveClass('flex', 'items-center', 'gap-2');
    });

    test('should render logo icon', () => {
      const { container } = render(<Logo />);

      const iconContainer = container.querySelector('.bg-brand-600');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveClass('p-1.5', 'rounded-lg');
    });

    test('should render SVG element', () => {
      const { container } = render(<Logo />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 40 40');
      expect(svg).toHaveAttribute('width', '20');
      expect(svg).toHaveAttribute('height', '20');
    });

    test('should render full variant by default', () => {
      render(<Logo />);

      expect(screen.getByText(/Autopilot/)).toBeInTheDocument();
      expect(screen.getByText(/Rank/)).toBeInTheDocument();
    });

    test('should render Autopilot text in white', () => {
      const { container } = render(<Logo />);

      const textElement = container.querySelector('.font-bold');
      expect(textElement).toBeInTheDocument();
      expect(textElement).toHaveClass('text-white');
    });

    test('should render Rank with accent color', () => {
      const { container } = render(<Logo />);

      const accentText = container.querySelector('.text-accent');
      expect(accentText).toBeInTheDocument();
      expect(accentText).toHaveTextContent('Rank');
    });

    test('should render lightning bolt/arrow path', () => {
      const { container } = render(<Logo />);

      const path = container.querySelector('path');
      expect(path).toBeInTheDocument();
      expect(path).toHaveAttribute('fill', 'white');
      expect(path).toHaveAttribute('stroke', 'white');
    });
  });

  describe('variants', () => {
    test('should render full variant text', () => {
      render(<Logo variant="full" />);

      expect(screen.getByText('Autopilot')).toBeInTheDocument();
      expect(screen.getByText('Rank')).toBeInTheDocument();
    });

    test('should render compact variant without text', () => {
      const { container } = render(<Logo variant="compact" />);

      expect(screen.queryByText('Autopilot')).not.toBeInTheDocument();
      expect(screen.queryByText('Rank')).not.toBeInTheDocument();

      // Icon should still be present
      const iconContainer = container.querySelector('.bg-brand-600');
      expect(iconContainer).toBeInTheDocument();
    });

    test('should have icon in both variants', () => {
      const { container: fullContainer } = render(<Logo variant="full" />);
      const { container: compactContainer } = render(<Logo variant="compact" />);

      const fullIcon = fullContainer.querySelector('.bg-brand-600');
      const compactIcon = compactContainer.querySelector('.bg-brand-600');

      expect(fullIcon).toBeInTheDocument();
      expect(compactIcon).toBeInTheDocument();
    });
  });

  describe('className prop', () => {
    test('should apply custom className', () => {
      const { container } = render(<Logo className="custom-logo-class" />);

      const logoContainer = container.querySelector('.custom-logo-class');
      expect(logoContainer).toBeInTheDocument();
    });

    test('should merge className with default classes', () => {
      const { container } = render(<Logo className="extra-class" />);

      const logoContainer = container.querySelector('.extra-class');
      expect(logoContainer).toHaveClass('flex', 'items-center', 'gap-2', 'extra-class');
    });

    test('should apply empty className by default', () => {
      const { container } = render(<Logo />);

      const logoContainer = container.querySelector('div');
      expect(logoContainer).toHaveClass('flex', 'items-center', 'gap-2');
      expect(logoContainer).not.toHaveClass('custom-class');
    });
  });

  describe('accessibility', () => {
    test('should have proper SVG attributes for accessibility', () => {
      const { container } = render(<Logo />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('fill', 'none');
      expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
    });

    test('should have flex-shrink-0 on SVG', () => {
      const { container } = render(<Logo />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('flex-shrink-0');
    });
  });

  describe('styling', () => {
    test('should have proper text styling for brand name', () => {
      const { container } = render(<Logo />);

      const textSpan = container.querySelector('.text-xl');
      expect(textSpan).toBeInTheDocument();
      expect(textSpan).toHaveClass('font-bold', 'tracking-tight');
    });

    test('should have proper icon container styling', () => {
      const { container } = render(<Logo />);

      const iconContainer = container.querySelector('.bg-brand-600');
      expect(iconContainer).toHaveClass('p-1.5', 'rounded-lg');
    });

    test('should have proper path stroke styling', () => {
      const { container } = render(<Logo />);

      const path = container.querySelector('path');
      expect(path).toHaveAttribute('stroke-linejoin', 'round');
      expect(path).toHaveAttribute('stroke-width', '1');
    });
  });

  describe('props interface', () => {
    test('should accept IProps with className', () => {
      const props: IProps = { className: 'test-class' };
      const { container } = render(<Logo {...props} />);

      expect(container.querySelector('.test-class')).toBeInTheDocument();
    });

    test('should accept IProps with variant full', () => {
      const props: IProps = { variant: 'full' };
      render(<Logo {...props} />);

      expect(screen.getByText('Autopilot')).toBeInTheDocument();
    });

    test('should accept IProps with variant compact', () => {
      const props: IProps = { variant: 'compact' };
      const { container } = render(<Logo {...props} />);

      expect(screen.queryByText('Autopilot')).not.toBeInTheDocument();
      expect(container.querySelector('.bg-brand-600')).toBeInTheDocument();
    });

    test('should accept IProps with both variant and className', () => {
      const props: IProps = { variant: 'compact', className: 'test-class' };
      const { container } = render(<Logo {...props} />);

      expect(container.querySelector('.test-class')).toBeInTheDocument();
      expect(container.querySelector('.bg-brand-600')).toBeInTheDocument();
    });

    test('should handle empty props', () => {
      const props: IProps = {};
      const { container } = render(<Logo {...props} />);

      expect(container.querySelector('.bg-brand-600')).toBeInTheDocument();
      expect(screen.getByText('Autopilot')).toBeInTheDocument();
    });

    test('should handle undefined className', () => {
      const props: IProps = { className: undefined };
      const { container } = render(<Logo {...props} />);

      expect(container.querySelector('.bg-brand-600')).toBeInTheDocument();
    });

    test('should handle undefined variant', () => {
      const props: IProps = { variant: undefined };
      render(<Logo {...props} />);

      expect(screen.getByText('Autopilot')).toBeInTheDocument();
    });
  });

  describe('component structure', () => {
    test('should render as single root div', () => {
      const { container } = render(<Logo />);

      // The render creates a wrapper div, so we check for the component's root div
      const logoDiv = container.querySelector('.flex.items-center.gap-2');
      expect(logoDiv).toBeInTheDocument();
    });

    test('should have SVG inside colored div', () => {
      const { container } = render(<Logo />);

      const coloredDiv = container.querySelector('.bg-brand-600');
      expect(coloredDiv).toBeInTheDocument();
      expect(coloredDiv?.querySelector('svg')).toBeInTheDocument();
    });

    test('should have text span as sibling to icon', () => {
      const { container } = render(<Logo variant="full" />);

      const rootDiv = container.querySelector('div');
      const children = rootDiv?.children;
      expect(children?.length).toBe(2);
    });
  });
});
