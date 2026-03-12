import { Helmet } from 'react-helmet-async';
import { Phone, ArrowLeft, Video, MessageCircle, Calendar, Star, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageLayout from '@/components/PageLayout';
import { Link } from 'react-router-dom';

const timeSlots = ['10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

const ConnectExpert = () => {
  return (
    <PageLayout>
      <Helmet>
        <title>Connect Expert - LegalCareAI</title>
        <meta name="description" content="One-on-one consultation with tax experts. Book a call or video session with our professionals." />
      </Helmet>

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <Link to="/tax-services" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm">Back to Tax Services</span>
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Phone size={28} className="text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Connect Expert</h1>
            <p className="text-muted-foreground mt-1">One-on-one consultation with tax professionals</p>
          </div>
        </div>

        {/* Consultation Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { icon: MessageCircle, title: 'Live Chat', desc: 'Quick queries' },
            { icon: Phone, title: 'Voice Call', desc: 'Detailed discussion' },
            { icon: Video, title: 'Video Call', desc: 'Face-to-face' },
          ].map((option, index) => (
            <Card key={index} className="bg-card border-border hover:bg-accent transition-colors cursor-pointer rounded-t-3xl">
              <CardContent className="p-4 sm:p-6 text-center">
                <option.icon size={28} className="mx-auto text-foreground mb-3" />
                <h3 className="font-medium text-foreground text-sm sm:text-base">{option.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{option.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Book a Slot */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Calendar size={20} />
              Book a Slot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Available slots for today:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {timeSlots.map((slot, index) => (
                <button
                  key={index}
                  className="bg-secondary border border-border rounded-lg p-3 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  {slot}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="bg-card border-border mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                { value: '50+', label: 'Tax Experts' },
                { value: '10k+', label: 'Consultations' },
                { value: '4.9★', label: 'Rating' },
                { value: '< 5 min', label: 'Avg Wait' },
              ].map((stat, index) => (
                <div key={index}>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12">
          Connect Now
          <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </PageLayout>
  );
};

export default ConnectExpert;
