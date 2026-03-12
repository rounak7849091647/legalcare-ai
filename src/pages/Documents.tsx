import { useState } from 'react';
import { Search, FileText, Eye, Download, Star, Copy, Check, Briefcase, Home, Users, Scale, Building, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import PageLayout from '@/components/PageLayout';
import SEOHead from '@/components/SEOHead';

const documentsSchema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Legal Document Templates',
  description: 'Free legal document templates for Indian law including rental agreements, employment contracts, NDAs, and more.',
  numberOfItems: 18,
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'House Rental Agreement',
      description: 'Standard house rental agreement template for residential properties in India',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Employment Contract',
      description: 'Comprehensive employment contract template for hiring employees',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Non-Disclosure Agreement',
      description: 'NDA template for protecting confidential business information',
    },
  ],
};

interface DocumentTemplate {
  id: number;
  name: string;
  downloads: string;
  rating: number;
  category: string;
  description: string;
  content: string;
}

const documents: DocumentTemplate[] = [
  { 
    id: 1, 
    name: 'House Rental Agreement', 
    downloads: '12.5k', 
    rating: 4.8, 
    category: 'Property',
    description: 'Standard house rental agreement for residential properties.',
    content: `HOUSE RENTAL AGREEMENT

This Rental Agreement is made on _____ day of __________, 20__

BETWEEN

[LANDLORD NAME], residing at ___________________________ (hereinafter called the "LANDLORD")

AND

[TENANT NAME], residing at ___________________________ (hereinafter called the "TENANT")

TERMS AND CONDITIONS:

1. TERM: The tenancy shall be for _____ months from __________ to __________.

2. RENT: Monthly rent of Rs. ________/- payable by the 5th of each month.

3. SECURITY DEPOSIT: Rs. ________/- refundable upon vacating.

4. MAINTENANCE: Rs. ________/- per month separately.

5. USE: For residential purposes only. No subletting allowed.

6. UTILITIES: Electricity and water charges borne by Tenant.

7. NOTICE: _____ month(s) prior written notice for termination.

LANDLORD                           TENANT
Signature: ____________          Signature: ____________
Date: ____________               Date: ____________

WITNESSES:
1. ____________  2. ____________`
  },
  { 
    id: 2, 
    name: 'Employment Contract', 
    downloads: '8.2k', 
    rating: 4.9, 
    category: 'Employment',
    description: 'Comprehensive employment contract for hiring employees.',
    content: `EMPLOYMENT CONTRACT

Date: __________, 20__

BETWEEN
[COMPANY NAME] ("EMPLOYER")
AND
[EMPLOYEE NAME] ("EMPLOYEE")

1. POSITION: [JOB TITLE]
2. START DATE: __________
3. COMPENSATION:
   - Basic: Rs. ________/- per month
   - HRA: Rs. ________/- per month
   - Total CTC: Rs. ________/- per annum

4. WORKING HOURS: _____ AM to _____ PM
5. PROBATION: _____ months
6. LEAVE: EL: ____ days, SL: ____ days, CL: ____ days
7. NOTICE PERIOD: _____ days

EMPLOYER                           EMPLOYEE
Signature: ____________          Signature: ____________`
  },
  { 
    id: 3, 
    name: 'Non-Disclosure Agreement', 
    downloads: '15.3k', 
    rating: 4.7, 
    category: 'Business',
    description: 'NDA for protecting confidential business information.',
    content: `NON-DISCLOSURE AGREEMENT

Date: __________, 20__

BETWEEN
[DISCLOSING PARTY] AND [RECEIVING PARTY]

1. CONFIDENTIAL INFORMATION includes business plans, financial data, trade secrets, and proprietary processes.

2. OBLIGATIONS: Receiving Party shall maintain strict confidence and not disclose without written consent.

3. TERM: This Agreement remains in effect for _____ years.

4. RETURN: All materials to be returned upon termination.

DISCLOSING PARTY                   RECEIVING PARTY
Signature: ____________          Signature: ____________`
  },
  { 
    id: 4, 
    name: 'Power of Attorney', 
    downloads: '6.8k', 
    rating: 4.6, 
    category: 'Legal',
    description: 'General POA for authorizing someone to act on your behalf.',
    content: `GENERAL POWER OF ATTORNEY

I, [PRINCIPAL NAME], appoint [ATTORNEY NAME] as my lawful Attorney.

AUTHORITY GRANTED:
1. Property matters
2. Banking operations
3. Legal proceedings
4. Government matters

This remains in force until revoked in writing.

PRINCIPAL                          ATTORNEY
Signature: ____________          Signature: ____________`
  },
  { 
    id: 5, 
    name: 'Sale Deed', 
    downloads: '9.1k', 
    rating: 4.8, 
    category: 'Property',
    description: 'Sale deed template for property transfer.',
    content: `SALE DEED

Date: __________, 20__

[SELLER] hereby sells and transfers to [BUYER] the property for Rs. ________/-.

SCHEDULE OF PROPERTY:
[Address and details]

VENDOR                             VENDEE
Signature: ____________          Signature: ____________`
  },
  { 
    id: 6, 
    name: 'Loan Agreement', 
    downloads: '7.4k', 
    rating: 4.5, 
    category: 'Business',
    description: 'Loan agreement between lender and borrower.',
    content: `LOAN AGREEMENT

Date: __________, 20__

BETWEEN [LENDER] AND [BORROWER]

1. Loan Amount: Rs. ________/-
2. Interest: ____% per annum
3. Repayment: ____ months
4. EMI: Rs. ________/-

LENDER                             BORROWER
Signature: ____________          Signature: ____________`
  },
  { 
    id: 7, 
    name: 'Will/Testament', 
    downloads: '5.2k', 
    rating: 4.9, 
    category: 'Family',
    description: 'Last will and testament for asset distribution.',
    content: `LAST WILL AND TESTAMENT

I, [NAME], being of sound mind, declare this my Last Will.

1. I revoke all previous Wills.
2. EXECUTOR: [NAME]
3. BEQUESTS:
   - [Asset 1] to [Beneficiary 1]
   - [Asset 2] to [Beneficiary 2]

TESTATOR: ____________
Date: ____________

WITNESSES:
1. ____________  2. ____________`
  },
  { 
    id: 8, 
    name: 'Partnership Deed', 
    downloads: '4.8k', 
    rating: 4.7, 
    category: 'Business',
    description: 'Partnership deed for starting a business partnership.',
    content: `PARTNERSHIP DEED

Date: __________, 20__

PARTNERS:
1. [Partner 1] - ___% share
2. [Partner 2] - ___% share

TERMS:
1. FIRM NAME: __________
2. BUSINESS: __________
3. CAPITAL: Rs. ________/-
4. PROFIT SHARING: As per ownership

Partner 1: ____________
Partner 2: ____________`
  },
  { 
    id: 9, 
    name: 'Divorce Petition', 
    downloads: '3.5k', 
    rating: 4.4, 
    category: 'Family',
    description: 'Mutual consent divorce petition format.',
    content: `PETITION FOR DIVORCE BY MUTUAL CONSENT

IN THE FAMILY COURT AT __________

PETITIONER NO. 1: [HUSBAND]
PETITIONER NO. 2: [WIFE]

PRAYER: Dissolution of marriage solemnized on __________

GROUNDS: Mutual consent as per Section 13-B of Hindu Marriage Act.

Petitioner 1: ____________
Petitioner 2: ____________`
  },
  { 
    id: 10, 
    name: 'Commercial Lease', 
    downloads: '6.1k', 
    rating: 4.6, 
    category: 'Property',
    description: 'Commercial property lease agreement.',
    content: `COMMERCIAL LEASE AGREEMENT

Date: __________, 20__

LESSOR: [LANDLORD]
LESSEE: [TENANT]
PROPERTY: [ADDRESS]

TERMS:
1. Period: _____ years
2. Rent: Rs. ________/- per month
3. Security: Rs. ________/-
4. Use: Commercial purposes only

LESSOR: ____________
LESSEE: ____________`
  },
  { 
    id: 11, 
    name: 'Service Agreement', 
    downloads: '8.9k', 
    rating: 4.8, 
    category: 'Business',
    description: 'Service agreement for freelancers and contractors.',
    content: `SERVICE AGREEMENT

Date: __________, 20__

CLIENT: [NAME]
SERVICE PROVIDER: [NAME]

SCOPE OF SERVICES:
[Description of services]

COMPENSATION: Rs. ________/-
DURATION: __________
PAYMENT TERMS: __________

CLIENT: ____________
PROVIDER: ____________`
  },
  { 
    id: 12, 
    name: 'Affidavit Format', 
    downloads: '11.2k', 
    rating: 4.5, 
    category: 'Legal',
    description: 'General affidavit format for legal declarations.',
    content: `AFFIDAVIT

I, [NAME], S/o D/o [PARENT], aged ____, residing at __________, do hereby solemnly affirm and declare:

1. That I am the deponent herein.
2. That [STATEMENT OF FACTS].
3. That the above statements are true to my knowledge.

DEPONENT

Verified at __________ on __________

Before me,
Notary Public`
  },
  { 
    id: 13, 
    name: 'Indemnity Bond', 
    downloads: '4.3k', 
    rating: 4.6, 
    category: 'Legal',
    description: 'Indemnity bond for protection against loss.',
    content: `INDEMNITY BOND

Date: __________, 20__

I, [INDEMNIFIER], agree to indemnify [BENEFICIARY] against all losses arising from __________.

Amount: Rs. ________/-

This bond is binding upon my heirs and successors.

INDEMNIFIER: ____________
WITNESS: ____________`
  },
  { 
    id: 14, 
    name: 'Gift Deed', 
    downloads: '5.7k', 
    rating: 4.7, 
    category: 'Property',
    description: 'Gift deed for transferring property as gift.',
    content: `GIFT DEED

Date: __________, 20__

DONOR: [NAME]
DONEE: [NAME]

The Donor gifts the property at [ADDRESS] to the Donee out of natural love and affection.

DONOR: ____________
DONEE: ____________

WITNESSES:
1. ____________  2. ____________`
  },
  { 
    id: 15, 
    name: 'Appointment Letter', 
    downloads: '7.8k', 
    rating: 4.8, 
    category: 'Employment',
    description: 'Job appointment letter for new employees.',
    content: `APPOINTMENT LETTER

Date: __________

Dear [EMPLOYEE NAME],

We are pleased to offer you the position of [DESIGNATION] at [COMPANY].

CTC: Rs. ________/- per annum
Start Date: __________
Location: __________

Please sign and return the acceptance.

HR Manager
[COMPANY NAME]`
  },
  { 
    id: 16, 
    name: 'Termination Letter', 
    downloads: '3.9k', 
    rating: 4.3, 
    category: 'Employment',
    description: 'Employment termination letter format.',
    content: `TERMINATION LETTER

Date: __________

To: [EMPLOYEE NAME]

This letter confirms termination of your employment effective __________.

Reason: __________

Final settlement will be processed within 30 days.

HR Manager
[COMPANY NAME]`
  },
  { 
    id: 17, 
    name: 'Experience Letter', 
    downloads: '9.4k', 
    rating: 4.9, 
    category: 'Employment',
    description: 'Work experience certificate format.',
    content: `EXPERIENCE LETTER

Date: __________

TO WHOM IT MAY CONCERN

This is to certify that [NAME] was employed with [COMPANY] as [DESIGNATION] from __________ to __________.

During this period, their performance was satisfactory.

We wish them success.

HR Manager
[COMPANY NAME]`
  },
  { 
    id: 18, 
    name: 'Legal Notice', 
    downloads: '6.5k', 
    rating: 4.6, 
    category: 'Legal',
    description: 'Legal notice format for disputes.',
    content: `LEGAL NOTICE

Date: __________

To: [RECIPIENT]
From: [SENDER] through Advocate

NOTICE is hereby given that:

[Statement of facts and grievance]

You are called upon to [remedy required] within 15 days.

Advocate for Sender`
  },
];

const categories = [
  { name: 'All', icon: FileText },
  { name: 'Property', icon: Home },
  { name: 'Business', icon: Briefcase },
  { name: 'Employment', icon: Users },
  { name: 'Legal', icon: Scale },
  { name: 'Family', icon: Heart },
];

const Documents = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDocument, setSelectedDocument] = useState<DocumentTemplate | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopy = async (doc: DocumentTemplate) => {
    try {
      await navigator.clipboard.writeText(doc.content);
      setCopiedId(doc.id);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDownload = (doc: DocumentTemplate) => {
    const blob = new Blob([doc.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded');
  };

  return (
    <PageLayout>
      <SEOHead
        title="Legal Document Templates India - 100+ Free Downloads"
        description="Download 100+ free legal document templates for India. Rental agreements, employment contracts, NDAs, power of attorney, sale deeds, and more. Ready to use formats."
        keywords="legal documents India, rental agreement template, employment contract template, NDA template, power of attorney format, sale deed, legal templates free download"
        canonicalUrl="/documents"
        structuredData={documentsSchema}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Legal Documents', url: '/documents' },
        ]}
      />

      <div className="p-3 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-foreground">Legal Documents</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{documents.length}+ professional templates</p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border text-foreground text-sm h-10"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all ${
                selectedCategory === cat.name 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              <cat.icon size={12} />
              {cat.name}
            </button>
          ))}
        </div>

        {/* Results Count */}
        <p className="text-xs text-muted-foreground mb-3">
          {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} found
        </p>

        {/* Documents List - Optimized for mobile */}
        <div className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-3">
          {filteredDocuments.map((doc) => (
            <div 
              key={doc.id}
              className="bg-card border border-border rounded-xl p-3 hover:bg-accent transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-foreground text-sm leading-tight line-clamp-1">{doc.name}</h3>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Star size={10} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-xs text-foreground">{doc.rating}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{doc.description}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                    <span className="bg-secondary px-1.5 py-0.5 rounded">{doc.category}</span>
                    <span>{doc.downloads}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 mt-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 bg-secondary border-border text-foreground hover:bg-accent text-xs h-8"
                  onClick={() => setSelectedDocument(doc)}
                >
                  <Eye size={12} className="mr-1" />
                  View
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-8"
                  onClick={() => handleDownload(doc)}
                >
                  <Download size={12} className="mr-1" />
                  Get
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <FileText size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No documents found</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3 bg-secondary border-border"
              onClick={() => {setSearchQuery(''); setSelectedCategory('All');}}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Document Preview Dialog */}
      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] bg-background border-border p-0 gap-0">
          <DialogHeader className="p-3 sm:p-4 border-b border-border">
            <DialogTitle className="text-sm sm:text-base text-foreground pr-8 line-clamp-1">
              {selectedDocument?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-auto flex-1 max-h-[60vh] p-3 sm:p-4">
            <pre className="text-xs sm:text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed bg-secondary rounded-lg p-3">
              {selectedDocument?.content}
            </pre>
          </div>

          <div className="p-3 sm:p-4 border-t border-border flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedDocument && handleCopy(selectedDocument)}
              className="flex-1 bg-secondary border-border text-foreground hover:bg-accent text-xs h-9"
            >
              {copiedId === selectedDocument?.id ? (
                <><Check size={14} className="mr-1.5" /> Copied</>
              ) : (
                <><Copy size={14} className="mr-1.5" /> Copy</>
              )}
            </Button>
            <Button
              size="sm"
              onClick={() => selectedDocument && handleDownload(selectedDocument)}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-9"
            >
              <Download size={14} className="mr-1.5" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default Documents;
