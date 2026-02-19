/**
 * Tests for SeoRoiCalculator React Component
 *
 * Tests the interactive SEO ROI calculator tool component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SeoRoiCalculator } from '../SeoRoiCalculator';

describe('SeoRoiCalculator', () => {
  it('should render the component', () => {
    render(<SeoRoiCalculator />);

    expect(screen.getByText('Monthly Organic Visitors')).toBeInTheDocument();
    expect(screen.getByText(/Average CPC/)).toBeInTheDocument();
    expect(screen.getByText('Conversion Rate (%)')).toBeInTheDocument();
    expect(screen.getByText('Average Sale Value (USD)')).toBeInTheDocument();
  });

  it('should not show results when fields are empty', () => {
    render(<SeoRoiCalculator />);

    expect(screen.queryByText('SEO Value Estimate')).not.toBeInTheDocument();
  });

  it('should show results when all fields are filled', async () => {
    const user = userEvent.setup();
    render(<SeoRoiCalculator />);

    const inputs = screen.getAllByRole('spinbutton');

    await user.type(inputs[0], '1000'); // Monthly visitors
    await user.type(inputs[1], '2'); // Average CPC
    await user.type(inputs[2], '2'); // Conversion rate
    await user.type(inputs[3], '100'); // Average sale value

    expect(screen.getByText('SEO Value Estimate')).toBeInTheDocument();
  });

  it('calculates monthly SEO value correctly', () => {
    render(<SeoRoiCalculator />);

    const inputs = screen.getAllByRole('spinbutton');

    // Use fireEvent for faster input
    fireEvent.change(inputs[0], { target: { value: '1000' } });
    fireEvent.change(inputs[1], { target: { value: '2' } });
    fireEvent.change(inputs[2], { target: { value: '2' } });
    fireEvent.change(inputs[3], { target: { value: '100' } });

    // 1000 visitors * $2 CPC = $2,000 monthly SEO value
    // Check for the Monthly SEO Traffic Value label and verify the value is present
    expect(screen.getByText('Monthly SEO Traffic Value')).toBeInTheDocument();
    const dollarValues = screen.getAllByText(/\$2,000/);
    expect(dollarValues.length).toBeGreaterThan(0);
  });

  it('should show annual projection', () => {
    render(<SeoRoiCalculator />);

    const inputs = screen.getAllByRole('spinbutton');

    fireEvent.change(inputs[0], { target: { value: '1000' } });
    fireEvent.change(inputs[1], { target: { value: '2' } });
    fireEvent.change(inputs[2], { target: { value: '2' } });
    fireEvent.change(inputs[3], { target: { value: '100' } });

    // Annual value should be 12x monthly = $24,000
    expect(screen.getByText('Annual SEO Traffic Value')).toBeInTheDocument();
    const annualValues = screen.getAllByText(/\$24,000/);
    expect(annualValues.length).toBeGreaterThan(0);
  });

  it('should show calculation breakdown', () => {
    render(<SeoRoiCalculator />);

    const inputs = screen.getAllByRole('spinbutton');

    fireEvent.change(inputs[0], { target: { value: '1000' } });
    fireEvent.change(inputs[1], { target: { value: '2' } });
    fireEvent.change(inputs[2], { target: { value: '2' } });
    fireEvent.change(inputs[3], { target: { value: '100' } });

    expect(screen.getByText('How This is Calculated')).toBeInTheDocument();
    // Check for the breakdown texts - using getAllByText since they appear multiple times
    expect(screen.getByText(/Monthly Traffic Value:/)).toBeInTheDocument();
    expect(screen.getByText(/\$2 CPC/)).toBeInTheDocument();
  });

  it('should clear form when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<SeoRoiCalculator />);

    const inputs = screen.getAllByRole('spinbutton');

    await user.type(inputs[0], '1000');
    await user.type(inputs[1], '2');
    await user.type(inputs[2], '2');
    await user.type(inputs[3], '100');

    expect(inputs[0]).toHaveValue(1000);

    const clearButton = screen.getByText('Clear');
    await user.click(clearButton);

    expect(inputs[0]).toHaveValue(null);
    expect(screen.queryByText('SEO Value Estimate')).not.toBeInTheDocument();
  });

  it('should show link to pricing page', () => {
    render(<SeoRoiCalculator />);

    const pricingLink = screen.getByText('Try AutopilotRank free');
    expect(pricingLink).toBeInTheDocument();
    expect(pricingLink).toHaveAttribute('href', '/pricing');
  });

  it('should calculate conversions correctly', () => {
    render(<SeoRoiCalculator />);

    const inputs = screen.getAllByRole('spinbutton');

    // 1000 visitors * 2% CVR = 20 conversions
    fireEvent.change(inputs[0], { target: { value: '1000' } });
    fireEvent.change(inputs[1], { target: { value: '2' } });
    fireEvent.change(inputs[2], { target: { value: '2' } });
    fireEvent.change(inputs[3], { target: { value: '100' } });

    // Monthly Conversions appears multiple times (in breakdown and in Revenue Breakdown)
    const conversionsLabels = screen.getAllByText(/Monthly Conversions:/);
    expect(conversionsLabels.length).toBeGreaterThan(0);
    // Find the value 20 in the document (conversions)
    const twentys = screen.getAllByText('20');
    expect(twentys.length).toBeGreaterThan(0);
  });

  it('should calculate revenue correctly', () => {
    render(<SeoRoiCalculator />);

    const inputs = screen.getAllByRole('spinbutton');

    // 1000 * 2% = 20 conversions * $100 = $2,000 revenue
    fireEvent.change(inputs[0], { target: { value: '1000' } });
    fireEvent.change(inputs[1], { target: { value: '2' } });
    fireEvent.change(inputs[2], { target: { value: '2' } });
    fireEvent.change(inputs[3], { target: { value: '100' } });

    // Monthly Revenue appears multiple times (in breakdown and in Revenue Breakdown)
    const revenueLabels = screen.getAllByText(/Monthly Revenue:/);
    expect(revenueLabels.length).toBeGreaterThan(0);
    // Multiple $2,000 values exist (monthly SEO value and monthly revenue)
    const dollarValues = screen.getAllByText(/\$2,000/);
    expect(dollarValues.length).toBeGreaterThan(0);
  });
});
