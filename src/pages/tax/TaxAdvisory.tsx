import { Helmet } from 'react-helmet-async';
import { MessageSquare, ArrowLeft, Clock, Star, Phone, Video, MessageCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageLayout from '@/components/PageLayout';
import { Link } from 'react-router-dom';

const experts = [
  { name: 'CA Priya Sharma', specialty: 'Income Tax & GST', rating: 4.9, experience: 12 },
  { name: 'CA Rajesh Gupta', specialty: 'Corporate Tax', rating: 4.8, experience: 15 },
  { name: 'CA Anita Desai', specialty: 'International Tax', rating: 4.9, experience: 10 },
];

const TaxAdvisory = () => {
  return (
    <PageLayout>
      <Helmet>
        <title>Tax Advisory - LegalCareAI</title>
        <meta name="description" content="Expert tax consultation from certified chartered accountants. Get personalized tax advice." />
      </Helmet>

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <Link to="/tax-services" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm">Back to Tax Services</span>
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <MessageSquare size={28} className="text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Tax Advisory</h1>
            <p className="text-muted-foreground mt-1">Expert consultation for your tax queries</p>
          </div>
        </div>

        {/* Consultation Types */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { icon: MessageCircle, title: 'Chat', desc: 'Quick text-based queries' },
            { icon: Phone, title: 'Call', desc: 'Voice consultation' },
            { icon: Video, title: 'Video', desc: 'Face-to-face session' },
          ].map((type, index) => (
            <Card key={index} className="bg-card border-border hover:bg-accent transition-colors cursor-pointer">
              <CardContent className="p-4 sm:p-6 text-center">
                <type.icon size={28} className="mx-auto text-foreground mb-3" />
                <h3 className="font-medium text-foreground text-sm sm:text-base">{type.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{type.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Available Experts */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">Available Experts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {experts.map((expert, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between bg-secondary rounded-lg p-3 sm:p-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent flex items-center justify-center text-sm sm:text-lg font-medium text-foreground shrink-0">
                    {expert.name.split(' ')[1][0]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-foreground text-sm sm:text-base truncate">{expert.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{expert.specialty}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Star size={12} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-xs text-foreground">{expert.rating}</span>
                      <span className="text-xs text-muted-foreground">• {expert.experience} yrs exp</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
                  Connect
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* FAQ Topics */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Common Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {['ITR Filing', 'Tax Saving', 'Capital Gains', 'GST', 'TDS', 'NRI Taxation', 'Business Tax', 'Audit'].map((topic) => (
                <span key={topic} className="bg-secondary px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent cursor-pointer transition-colors">
                  {topic}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default TaxAdvisory;
