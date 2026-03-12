import { Helmet } from 'react-helmet-async';
import { RefreshCw, ArrowLeft, Search, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageLayout from '@/components/PageLayout';
import { Link } from 'react-router-dom';
import { useState } from 'react';

const statusSteps = [
  { status: 'Filed', description: 'ITR submitted successfully', completed: true },
  { status: 'Verified', description: 'E-verification completed', completed: true },
  { status: 'Processing', description: 'Under assessment', completed: false, current: true },
  { status: 'Refund Initiated', description: 'Amount calculated', completed: false },
  { status: 'Credited', description: 'Refund in bank account', completed: false },
];

const RefundStatus = () => {
  const [pan, setPan] = useState('');
  const [assessmentYear, setAssessmentYear] = useState('2024-25');
  const [showStatus, setShowStatus] = useState(false);

  return (
    <PageLayout>
      <Helmet>
        <title>Refund Status - LegalCareAI</title>
        <meta name="description" content="Track your income tax refund status. Check the processing status of your ITR refund." />
      </Helmet>

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <Link to="/tax-services" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm">Back to Tax Services</span>
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <RefreshCw size={28} className="text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Refund Status</h1>
            <p className="text-muted-foreground mt-1">Track your income tax refund</p>
          </div>
        </div>

        {/* Search Form */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Search size={20} />
              Check Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">PAN Number</label>
                <Input
                  placeholder="Enter PAN"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="bg-secondary border-border text-foreground uppercase"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Assessment Year</label>
                <select
                  value={assessmentYear}
                  onChange={(e) => setAssessmentYear(e.target.value)}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-foreground"
                >
                  <option value="2024-25">2024-25</option>
                  <option value="2023-24">2023-24</option>
                  <option value="2022-23">2022-23</option>
                </select>
              </div>
            </div>
            <Button 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12"
              onClick={() => setShowStatus(true)}
              disabled={pan.length !== 10}
            >
              Check Refund Status
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Status Timeline */}
        {showStatus && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Clock size={20} />
                Refund Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {statusSteps.map((step, index) => (
                  <div key={index} className="flex gap-4 pb-6 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step.completed ? 'bg-green-500' : step.current ? 'bg-yellow-500' : 'bg-secondary'
                      }`}>
                        {step.completed ? (
                          <CheckCircle size={16} className="text-white" />
                        ) : step.current ? (
                          <Clock size={16} className="text-white" />
                        ) : (
                          <AlertCircle size={16} className="text-muted-foreground" />
                        )}
                      </div>
                      {index < statusSteps.length - 1 && (
                        <div className={`w-0.5 flex-1 mt-2 ${step.completed ? 'bg-green-500' : 'bg-border'}`} />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <h3 className={`font-medium ${step.completed || step.current ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.status}
                      </h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                      {step.current && (
                        <p className="text-xs text-yellow-500 mt-1">Expected: 15-30 days</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
};

export default RefundStatus;
