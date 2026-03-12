import { Helmet } from 'react-helmet-async';
import { BarChart3, ArrowLeft, TrendingUp, TrendingDown, Calculator, ArrowRight, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageLayout from '@/components/PageLayout';
import { Link } from 'react-router-dom';
import { useState } from 'react';

const CapitalGains = () => {
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [holdingPeriod, setHoldingPeriod] = useState<'short' | 'long'>('short');

  const calculateGains = () => {
    const buy = parseFloat(buyPrice.replace(/,/g, '')) || 0;
    const sell = parseFloat(sellPrice.replace(/,/g, '')) || 0;
    const gain = sell - buy;
    const taxRate = holdingPeriod === 'short' ? 0.15 : 0.10;
    const tax = gain > 0 ? gain * taxRate : 0;
    return { gain, tax };
  };

  const { gain, tax } = calculateGains();

  return (
    <PageLayout>
      <Helmet>
        <title>Capital Gains - LegalCareAI</title>
        <meta name="description" content="Calculate and file capital gains tax. STCG and LTCG calculation for stocks, mutual funds, and property." />
      </Helmet>

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <Link to="/tax-services" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm">Back to Tax Services</span>
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <BarChart3 size={28} className="text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Capital Gains</h1>
            <p className="text-muted-foreground mt-1">STCG & LTCG calculation and filing</p>
          </div>
        </div>

        {/* Calculator */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Calculator size={20} />
              Capital Gains Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Purchase Price</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    placeholder="Enter buy price"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    className="pl-9 bg-secondary border-border text-foreground"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Sale Price</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    placeholder="Enter sell price"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    className="pl-9 bg-secondary border-border text-foreground"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Holding Period</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={holdingPeriod === 'short' ? 'default' : 'outline'}
                  onClick={() => setHoldingPeriod('short')}
                  className={holdingPeriod === 'short' 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                    : 'bg-secondary border-border text-foreground hover:bg-accent'
                  }
                >
                  <TrendingDown size={16} className="mr-2" />
                  Short Term (&lt;12 months)
                </Button>
                <Button
                  variant={holdingPeriod === 'long' ? 'default' : 'outline'}
                  onClick={() => setHoldingPeriod('long')}
                  className={holdingPeriod === 'long' 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                    : 'bg-secondary border-border text-foreground hover:bg-accent'
                  }
                >
                  <TrendingUp size={16} className="mr-2" />
                  Long Term (&gt;12 months)
                </Button>
              </div>
            </div>

            {(buyPrice && sellPrice) && (
              <div className="bg-secondary rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capital Gain</span>
                  <span className={gain >= 0 ? 'text-green-500' : 'text-red-500'}>
                    ₹{gain.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax Rate ({holdingPeriod === 'short' ? 'STCG 15%' : 'LTCG 10%'})</span>
                  <span className="text-foreground">₹{tax.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tax Rates Info */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">Tax Rates (Equity/Mutual Funds)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-secondary rounded-lg p-4">
                <h3 className="font-medium text-foreground mb-2">STCG (Short Term)</h3>
                <p className="text-2xl font-bold text-foreground">15%</p>
                <p className="text-xs text-muted-foreground mt-1">Holding &lt; 12 months</p>
              </div>
              <div className="bg-secondary rounded-lg p-4">
                <h3 className="font-medium text-foreground mb-2">LTCG (Long Term)</h3>
                <p className="text-2xl font-bold text-foreground">10%</p>
                <p className="text-xs text-muted-foreground mt-1">Above ₹1 lakh exemption</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12">
          File Capital Gains Return
          <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </PageLayout>
  );
};

export default CapitalGains;
