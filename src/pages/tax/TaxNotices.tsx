import { Helmet } from 'react-helmet-async';
import { Bell, ArrowLeft, AlertTriangle, FileText, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageLayout from '@/components/PageLayout';
import { Link } from 'react-router-dom';

const noticeTypes = [
  { code: '143(1)', title: 'Intimation Notice', severity: 'low', desc: 'Summary of processing with adjustments' },
  { code: '143(2)', title: 'Scrutiny Notice', severity: 'high', desc: 'Detailed examination of your return' },
  { code: '148', title: 'Income Escaping Assessment', severity: 'high', desc: 'Re-assessment notice' },
  { code: '139(9)', title: 'Defective Return', severity: 'medium', desc: 'Return filed with errors' },
  { code: '245', title: 'Adjustment Notice', severity: 'medium', desc: 'Outstanding demand adjustment' },
];

const TaxNotices = () => {
  return (
    <PageLayout>
      <Helmet>
        <title>Tax Notices - LegalCareAI</title>
        <meta name="description" content="Expert help with income tax notices. Understand and respond to IT department notices." />
      </Helmet>

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <Link to="/tax-services" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm">Back to Tax Services</span>
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Bell size={28} className="text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Tax Notices</h1>
            <p className="text-muted-foreground mt-1">Notice response help from experts</p>
          </div>
        </div>

        {/* Alert */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Don't Ignore Notices</p>
            <p className="text-xs text-muted-foreground mt-1">Non-response can lead to penalties and further legal action</p>
          </div>
        </div>

        {/* Notice Types */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <FileText size={20} />
              Common Notice Types
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {noticeTypes.map((notice, index) => (
              <div key={index} className="bg-secondary rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm bg-accent px-2 py-1 rounded text-foreground">
                      Sec {notice.code}
                    </span>
                    <span className="font-medium text-foreground">{notice.title}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    notice.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                    notice.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {notice.severity === 'high' ? 'Urgent' : notice.severity === 'medium' ? 'Important' : 'Normal'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{notice.desc}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Our Help */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">How We Help</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: FileText, title: 'Notice Analysis', desc: 'Understand what the notice means' },
                { icon: Clock, title: 'Deadline Tracking', desc: 'Never miss a response deadline' },
                { icon: CheckCircle, title: 'Response Drafting', desc: 'Professional reply preparation' },
                { icon: Bell, title: 'Follow-up', desc: 'Track resolution status' },
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3 bg-secondary rounded-lg p-4">
                  <item.icon size={20} className="text-foreground shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12">
          Get Notice Help
          <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </PageLayout>
  );
};

export default TaxNotices;
