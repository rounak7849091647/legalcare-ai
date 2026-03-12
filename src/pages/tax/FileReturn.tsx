import { Helmet } from 'react-helmet-async';
import { FileText, ArrowLeft, CheckCircle, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageLayout from '@/components/PageLayout';
import { Link } from 'react-router-dom';

const steps = [
  { title: 'Gather Documents', description: 'Form 16, bank statements, investment proofs' },
  { title: 'Choose ITR Form', description: 'ITR-1 for salary, ITR-2 for capital gains, etc.' },
  { title: 'Fill Details', description: 'Personal info, income sources, deductions' },
  { title: 'Verify & Submit', description: 'E-verify using Aadhaar OTP or DSC' },
];

const itrForms = [
  { name: 'ITR-1 (Sahaj)', eligibility: 'Salaried individuals with income up to ₹50 lakh' },
  { name: 'ITR-2', eligibility: 'Individuals with capital gains, foreign income' },
  { name: 'ITR-3', eligibility: 'Individuals with business/profession income' },
  { name: 'ITR-4 (Sugam)', eligibility: 'Presumptive income scheme (44AD/44ADA)' },
];

const FileReturn = () => {
  return (
    <PageLayout>
      <Helmet>
        <title>File Your Return - LegalCareAI</title>
        <meta name="description" content="File your Income Tax Return with step-by-step guidance. Easy ITR filing for salaried individuals and businesses." />
      </Helmet>

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Back Button */}
        <Link to="/tax-services" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm">Back to Tax Services</span>
        </Link>

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <FileText size={28} className="text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">File Your Return</h1>
            <p className="text-muted-foreground mt-1">ITR filing with step-by-step guidance</p>
          </div>
        </div>

        {/* Due Date Alert */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle size={20} className="text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Due Date: 31st July 2025</p>
            <p className="text-xs text-muted-foreground mt-1">File your ITR for FY 2024-25 before the deadline to avoid penalties</p>
          </div>
        </div>

        {/* Steps */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Clock size={20} />
              Filing Process
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-sm font-medium text-foreground">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ITR Forms */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">Choose Your ITR Form</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {itrForms.map((form, index) => (
                <div key={index} className="bg-secondary border border-border rounded-lg p-4">
                  <h3 className="font-medium text-foreground">{form.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{form.eligibility}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-12">
            <FileText size={18} className="mr-2" />
            Start Filing Now
            <ArrowRight size={16} className="ml-2" />
          </Button>
          <Button variant="outline" className="flex-1 bg-secondary border-border text-foreground hover:bg-accent h-12">
            <CheckCircle size={18} className="mr-2" />
            Get CA Assistance
          </Button>
        </div>
      </div>
    </PageLayout>
  );
};

export default FileReturn;
