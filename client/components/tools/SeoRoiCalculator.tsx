/**
 * SEO ROI Calculator Tool
 *
 * Interactive React component for calculating the estimated value of SEO traffic.
 * Hydrated as an Astro island on the /tools/seo-roi-calculator page.
 */

import { useState, useMemo } from 'react';

interface ISeoRoiCalculatorProps {
  className?: string;
}

interface IRoiResult {
  monthlySeoValue: number;
  annualSeoValue: number;
  monthlyConversions: number;
  annualConversions: number;
  monthlyRevenue: number;
  annualRevenue: number;
}

export function SeoRoiCalculator({ className = '' }: ISeoRoiCalculatorProps): JSX.Element {
  const [monthlyVisitors, setMonthlyVisitors] = useState('');
  const [avgCpc, setAvgCpc] = useState('');
  const [conversionRate, setConversionRate] = useState('');
  const [avgSaleValue, setAvgSaleValue] = useState('');

  const result = useMemo((): IRoiResult | null => {
    const visitors = parseFloat(monthlyVisitors);
    const cpc = parseFloat(avgCpc);
    const cvr = parseFloat(conversionRate) / 100; // Convert percentage to decimal
    const saleValue = parseFloat(avgSaleValue);

    if (!visitors || !cpc || !cvr || !saleValue) {
      return null;
    }

    // Monthly SEO Value = visitors * CPC * conversion_rate * avg_sale_value
    // This represents the equivalent PPC cost for the same traffic value
    const monthlyConversions = visitors * cvr;
    const monthlyRevenue = monthlyConversions * saleValue;
    const monthlySeoValue = visitors * cpc; // Traffic value in PPC equivalent

    return {
      monthlySeoValue,
      annualSeoValue: monthlySeoValue * 12,
      monthlyConversions,
      annualConversions: monthlyConversions * 12,
      monthlyRevenue,
      annualRevenue: monthlyRevenue * 12,
    };
  }, [monthlyVisitors, avgCpc, conversionRate, avgSaleValue]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleClear = () => {
    setMonthlyVisitors('');
    setAvgCpc('');
    setConversionRate('');
    setAvgSaleValue('');
  };

  const isFormValid = monthlyVisitors && avgCpc && conversionRate && avgSaleValue;

  return (
    <div className={`bg-surface rounded-lg p-6 ${className}`}>
      <div className="space-y-4">
        {/* Monthly Organic Visitors */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Monthly Organic Visitors
          </label>
          <input
            type="number"
            value={monthlyVisitors}
            onChange={e => setMonthlyVisitors(e.target.value)}
            placeholder="e.g., 10000"
            min="0"
            className="w-full bg-main border border-border rounded-lg p-3 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Average CPC */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Average CPC (Cost Per Click) in USD
          </label>
          <input
            type="number"
            value={avgCpc}
            onChange={e => setAvgCpc(e.target.value)}
            placeholder="e.g., 2.50"
            min="0"
            step="0.01"
            className="w-full bg-main border border-border rounded-lg p-3 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <p className="text-xs text-muted-foreground mt-1">
            What you would pay per click in Google Ads for similar keywords
          </p>
        </div>

        {/* Conversion Rate */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">Conversion Rate (%)</label>
          <input
            type="number"
            value={conversionRate}
            onChange={e => setConversionRate(e.target.value)}
            placeholder="e.g., 2.5"
            min="0"
            max="100"
            step="0.1"
            className="w-full bg-main border border-border rounded-lg p-3 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Percentage of visitors who convert (purchase, sign up, etc.)
          </p>
        </div>

        {/* Average Sale Value */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Average Sale Value (USD)
          </label>
          <input
            type="number"
            value={avgSaleValue}
            onChange={e => setAvgSaleValue(e.target.value)}
            placeholder="e.g., 100"
            min="0"
            step="0.01"
            className="w-full bg-main border border-border rounded-lg p-3 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <p className="text-xs text-muted-foreground mt-1">Average revenue per conversion</p>
        </div>

        {/* Clear Button */}
        {isFormValid && (
          <div className="flex justify-end">
            <button
              onClick={handleClear}
              className="px-4 py-2 border border-border rounded-lg text-muted-foreground hover:text-white hover:border-white/30 transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="mt-6 p-4 rounded-lg border bg-brand-500/10 border-brand-500/30">
          <h3 className="text-lg font-semibold text-white mb-4">SEO Value Estimate</h3>

          {/* Primary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-main/50 rounded-lg p-4">
              <span className="text-sm text-muted-foreground">Monthly SEO Traffic Value</span>
              <p className="text-3xl font-bold text-brand-400">
                {formatCurrency(result.monthlySeoValue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Equivalent PPC cost for same traffic
              </p>
            </div>
            <div className="bg-main/50 rounded-lg p-4">
              <span className="text-sm text-muted-foreground">Annual SEO Traffic Value</span>
              <p className="text-3xl font-bold text-brand-400">
                {formatCurrency(result.annualSeoValue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Projected yearly value</p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="border-t border-border pt-4 mt-4">
            <h4 className="text-sm font-medium text-white mb-3">Revenue Breakdown</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Conversions:</span>
                <span className="text-white font-medium">
                  {formatNumber(result.monthlyConversions)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Annual Conversions:</span>
                <span className="text-white font-medium">
                  {formatNumber(result.annualConversions)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Revenue:</span>
                <span className="text-white font-medium">
                  {formatCurrency(result.monthlyRevenue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Annual Revenue:</span>
                <span className="text-white font-medium">
                  {formatCurrency(result.annualRevenue)}
                </span>
              </div>
            </div>
          </div>

          {/* Calculation Explanation */}
          <div className="border-t border-border pt-4 mt-4">
            <h4 className="text-sm font-medium text-white mb-2">How This is Calculated</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong>Monthly Traffic Value:</strong> {formatNumber(parseFloat(monthlyVisitors))}{' '}
                visitors x ${avgCpc} CPC = {formatCurrency(result.monthlySeoValue)}
              </p>
              <p>
                <strong>Monthly Conversions:</strong> {formatNumber(parseFloat(monthlyVisitors))}{' '}
                visitors x {conversionRate}% CVR = {formatNumber(result.monthlyConversions)}
              </p>
              <p>
                <strong>Monthly Revenue:</strong> {formatNumber(result.monthlyConversions)}{' '}
                conversions x ${avgSaleValue} = {formatCurrency(result.monthlyRevenue)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-sm text-muted-foreground text-center">
          Want to increase your organic traffic and ROI?{' '}
          <a href="/pricing" className="text-accent hover:underline">
            Try AutopilotRank free
          </a>
        </p>
      </div>
    </div>
  );
}
