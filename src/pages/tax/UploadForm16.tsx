import { Helmet } from 'react-helmet-async';
import { Upload, ArrowLeft, FileText, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageLayout from '@/components/PageLayout';
import { Link } from 'react-router-dom';
import { useState } from 'react';

const UploadForm16 = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <PageLayout>
      <Helmet>
        <title>Upload Form 16 - LegalCareAI</title>
        <meta name="description" content="Upload your Form 16 and auto-populate your ITR. Quick and easy tax filing with automatic data extraction." />
      </Helmet>

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <Link to="/tax-services" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm">Back to Tax Services</span>
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Upload size={28} className="text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Upload Form 16</h1>
            <p className="text-muted-foreground mt-1">Auto-populate your ITR from Form 16</p>
          </div>
        </div>

        {/* Upload Area */}
        <Card className="bg-card border-border mb-6">
          <CardContent className="p-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragging ? 'border-primary/50 bg-accent' : 'border-border hover:border-primary/30'
              }`}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="form16-upload"
              />
              <label htmlFor="form16-upload" className="cursor-pointer">
                <Upload size={48} className="mx-auto text-muted-foreground mb-4" />
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-foreground">
                    <FileText size={20} />
                    <span>{file.name}</span>
                  </div>
                ) : (
                  <>
                    <p className="text-foreground font-medium">Drop your Form 16 here</p>
                    <p className="text-sm text-muted-foreground mt-1">or click to browse (PDF only)</p>
                  </>
                )}
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">What We Extract</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                'Gross Salary & Allowances',
                'TDS Deducted',
                'Section 80C Deductions',
                'HRA & LTA Details',
                'Employer Information',
                'PAN & TAN Numbers'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-green-500 shrink-0" />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button 
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12"
          disabled={!file}
        >
          Extract & Continue
          <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </PageLayout>
  );
};

export default UploadForm16;
