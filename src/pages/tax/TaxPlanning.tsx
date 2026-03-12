import { Helmet } from 'react-helmet-async';
import { TrendingUp, ArrowLeft, PiggyBank, Target, ArrowRight, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageLayout from '@/components/PageLayout';
import { Link } from 'react-router-dom';

const deductions = [
  { section: '80C', limit: '₹1,50,000', items: 'PPF, ELSS, LIC, NSC, Home Loan Principal' },
  { section: '80D', limit: '₹25,000-₹1,00,000', items: 'Health Insurance Premiums' },
  { section: '80E', limit: 'No Limit', items: 'Education Loan Interest' },
  { section: '80G', limit: '50-100%', items: 'Donations to Charitable Institutions' },
  { section: '24(b)', limit: '₹2,00,000', items: 'Home Loan Interest (Self-occupied)' },
  { section: 'HRA', limit: 'As per formula', items: 'House Rent Allowance Exemption' },
];

const TaxPlanning = () => {
  return (
    <PageLayout>
      <Helmet>
        <title>Tax Planning - LegalCareAI</title>
        <meta name="description" content="Optimize your tax savings with expert tax planning advice. Know all deductions and exemptions available." />
      </Helmet>

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <Link to="/tax-services" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm">Back to Tax Services</span>
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <TrendingUp size={28} className="text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Tax Planning</h1>
            <p className="text-muted-foreground mt-1">Optimize your savings legally</p>
          </div>
        </div>

        {/* Savings Potential */}
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20 mb-6">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <PiggyBank size={40} className="text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Maximum Savings Potential</p>
                <p className="text-2xl font-bold text-foreground">Up to ₹78,000</p>
              </div>
            </div>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
              Get Personalized Plan
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Deductions */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Target size={20} />
              Key Deductions (Old Regime)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deductions.map((d, index) => (
                <div key={index} className="bg-secondary rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <span className="font-medium text-foreground">Section {d.section}</span>
                    <span className="text-sm bg-accent px-2 py-1 rounded text-foreground">{d.limit}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{d.items}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <IndianRupee size={40} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Need Personalized Advice?</h3>
          <p className="text-sm text-muted-foreground mb-4">Our tax experts can help you maximize your savings</p>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            Consult Tax Expert
          </Button>
        </div>
      </div>
    </PageLayout>
  );
};

export default TaxPlanning;
