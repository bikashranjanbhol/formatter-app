import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrivacyIndicator } from '@/components/privacy/PrivacyIndicator';
import { StatusBar } from '@/components/editor/StatusBar';
import { ErrorList } from '@/components/validation/ErrorList';
import { PricingCard } from '@/components/monetization/PricingCard';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

describe('PrivacyIndicator', () => {
  it('shows the local-processing message linking to privacy', () => {
    render(<PrivacyIndicator />);
    const link = screen.getByRole('link', { name: /processed locally/i });
    expect(link).toHaveAttribute('href', '/privacy');
  });
});

describe('StatusBar', () => {
  it('renders document type, validity and stats', () => {
    render(
      <StatusBar
        documentType="JSON"
        validity="valid"
        stats={{ lines: 3, characters: 42, bytes: 42 }}
        processingMs={5}
        offloaded={false}
      />,
    );
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText(/Valid/)).toBeInTheDocument();
    expect(screen.getByText('3 lines')).toBeInTheDocument();
  });
});

describe('ErrorList', () => {
  it('announces errors and does not rely on color alone', () => {
    render(
      <ErrorList
        errors={[{ message: 'Unexpected token', line: 2, column: 5, severity: 'error' }]}
        warnings={[]}
      />,
    );
    // Icon + text convey severity, not just color.
    expect(screen.getByText(/1 error/)).toBeInTheDocument();
    expect(screen.getByText(/Unexpected token/)).toBeInTheDocument();
  });

  it('calls onSelectLocation when a location button is clicked', async () => {
    const onSelect = vi.fn();
    render(
      <ErrorList
        errors={[{ message: 'oops', line: 4, column: 1, severity: 'error' }]}
        warnings={[]}
        onSelectLocation={onSelect}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Line 4/ }));
    expect(onSelect).toHaveBeenCalledWith(4, 1);
  });

  it('renders nothing when there is no content', () => {
    const { container } = render(<ErrorList errors={[]} warnings={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('PricingCard', () => {
  it('disables the CTA for coming-soon plans', () => {
    render(
      <PricingCard
        plan={{
          name: 'Pro',
          price: '$6',
          tagline: 'test',
          features: [{ text: 'No ads' }, { text: 'Batch', soon: true }],
          cta: 'Coming soon',
          ctaHref: '/pricing',
          ctaDisabled: true,
        }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Coming soon' })).toBeDisabled();
    expect(screen.getByText('Coming soon', { selector: 'span' })).toBeInTheDocument();
  });
});

describe('ThemeToggle', () => {
  it('lets the user pick a theme preference', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const darkButton = screen.getByRole('button', { name: /dark theme/i });
    await userEvent.click(darkButton);
    expect(darkButton).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
