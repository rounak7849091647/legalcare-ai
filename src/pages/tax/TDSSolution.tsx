import { Helmet } from 'react-helmet-async';
import { Receipt, ArrowLeft, FileText, Download, Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageLayout from '@/components/PageLayout';
import { Link } from 'react-router-dom';

const services = [
  { title: 'TDS Return Filing', description: 'File Form 24Q, 26Q, 27Q, 27EQ', icon: FileText },
  { title: 'TDS Certificates', description: 'Generate Form 16, 16A, 16B', icon: Download },
  { title: 'TDS Compliance', description: 'Quarterly returns & challans', icon: Calendar },
];

const TDSSolution = () => {
  return (
    <PageLayout>
      <Helmet>
        <title>TDS Solution - LegalCareAI</title>
        <meta name="description" content="Complete TDS solutions - filing, certificates, and compliance management for businesses." />
      </Helmet>

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <Link to="/tax-services" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm">Back to Tax Services</span>
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Receipt size={28} className="text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">TDS Solution</h1>
            <p className="text-muted-foreground mt-1">Complete TDS filing & certificate management</p>
          </div>
        </div>

        {/* Services */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {services.map((service, index) => (
            <Card key={index} className="bg-card border-border hover:bg-accent transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-4">
                  <service.icon size={24} className="text-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-2">{service.title}</h3>
                <p className="text-sm text-muted-foreground">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* TDS Rates */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">Common TDS Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { section: '194A', desc: 'Interest other than securities', rate: '10%' },
                { section: '194C', desc: 'Contractor payments', rate: '1-2%' },
                { section: '194H', desc: 'Commission/Brokerage', rate: '5%' },
                { section: '194I', desc: 'Rent', rate: '2-10%' },
                { section: '194J', desc: 'Professional/Technical fees', rate: '10%' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                  <div>
                    <span className="font-medium text-foreground">Section {item.section}</span>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <span className="bg-accent px-3 py-1 rounded text-sm text-foreground">{item.rate}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12">
          Get Started with TDS
          <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </PageLayout>
  );
};

export default TDSSolution;
