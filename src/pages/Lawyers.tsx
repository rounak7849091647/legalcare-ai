import { useState, useMemo } from 'react';
import { Search, Users, CheckCircle, Globe, Star, BadgeCheck, MapPin, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import PageLayout from '@/components/PageLayout';
import SEOHead from '@/components/SEOHead';
import { lawyers, indianStates, citiesByState, practiceAreas } from '@/data/lawyersData';

const lawyerDirectorySchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Find a Lawyer - LegalCareAI',
  description: 'Connect with Bar Council verified legal experts across India. 10M+ verified lawyers covering all states and practice areas.',
  provider: {
    '@type': 'Organization',
    name: 'LegalCareAI',
  },
  areaServed: {
    '@type': 'Country',
    name: 'India',
  },
  serviceType: 'Legal Professional Directory',
};

const Lawyers = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('All States');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedPractice, setSelectedPractice] = useState('All Practice Areas');
  const [pincode, setPincode] = useState('');

  // Get cities for selected state
  const availableCities = useMemo(() => {
    return citiesByState[selectedState] || ['All Cities'];
  }, [selectedState]);

  // Reset city when state changes
  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedCity('All Cities');
  };

  const filteredLawyers = useMemo(() => {
    return lawyers.filter(lawyer => {
      const matchesSearch = searchQuery === '' || 
        lawyer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lawyer.practiceAreas.some(area => area.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesState = selectedState === 'All States' || lawyer.state === selectedState;
      
      const matchesCity = selectedCity === 'All Cities' || lawyer.city === selectedCity;
      
      const matchesPractice = selectedPractice === 'All Practice Areas' || 
        lawyer.practiceAreas.some(area => area === selectedPractice);
      
      return matchesSearch && matchesState && matchesCity && matchesPractice;
    });
  }, [searchQuery, selectedState, selectedCity, selectedPractice]);

  return (
    <PageLayout>
      <SEOHead
        title="Find a Lawyer in India - 10M+ Verified Lawyers"
        description="Connect with Bar Council verified legal experts across India. Search 10M+ lawyers by state, city, and practice area. 100% verified, 4.8★ average rating."
        keywords="find lawyer India, Bar Council verified lawyers, legal experts, advocate near me, lawyer directory, criminal lawyer, civil lawyer, corporate lawyer"
        canonicalUrl="/lawyers"
        structuredData={lawyerDirectorySchema}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Find a Lawyer', url: '/lawyers' },
        ]}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-foreground" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Find a Lawyer</h1>
          <p className="text-muted-foreground mt-2">Connect with Bar Council verified legal experts across India</p>
          <div className="flex justify-center gap-3 mt-4">
            <Badge variant="outline" className="bg-secondary border-border text-foreground">
              <CheckCircle size={12} className="mr-1" /> Verified
            </Badge>
            <Badge variant="outline" className="bg-secondary border-border text-foreground">
              <BadgeCheck size={12} className="mr-1" /> Bar Council
            </Badge>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Users size={20} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-xl font-bold text-foreground">10M+</p>
            <p className="text-xs text-muted-foreground">Verified Lawyers</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <CheckCircle size={20} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-xl font-bold text-foreground">100%</p>
            <p className="text-xs text-muted-foreground">Bar Council Verified</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Globe size={20} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-xl font-bold text-foreground">{indianStates.length - 1}</p>
            <p className="text-xs text-muted-foreground">States & UTs</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Star size={20} className="mx-auto text-yellow-500 fill-yellow-500 mb-2" />
            <p className="text-xl font-bold text-foreground">4.8★</p>
            <p className="text-xs text-muted-foreground">Average Rating</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">State</label>
              <Select value={selectedState} onValueChange={handleStateChange}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border max-h-[300px]">
                  {indianStates.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">City</label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border max-h-[300px]">
                  {availableCities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Practice Area</label>
              <Select value={selectedPractice} onValueChange={setSelectedPractice}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border max-h-[300px]">
                  {practiceAreas.map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Pincode</label>
              <Input 
                placeholder="Pincode" 
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Search by lawyer name or practice area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-border text-foreground"
            />
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{filteredLawyers.length} lawyers found</span>
          </div>
        </div>

        {/* Lawyers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLawyers.map((lawyer) => (
            <div 
              key={lawyer.id}
              className="bg-card border border-border rounded-xl p-4 hover:bg-accent transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-lg font-semibold text-foreground">
                  {lawyer.name.charAt(5)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{lawyer.name}</h3>
                    {lawyer.verified && <BadgeCheck size={16} className="text-blue-400" />}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-foreground">{lawyer.rating}</span>
                    <span className="text-muted-foreground">({lawyer.reviews})</span>
                  </div>
                </div>
              </div>

              <Badge variant="outline" className="bg-secondary border-border text-foreground text-xs mb-3">
                {lawyer.experience} yrs
              </Badge>

              <div className="space-y-2 text-sm mb-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase size={14} />
                  <span>Bar Council</span>
                </div>
                <p className="text-foreground font-mono text-xs">{lawyer.barCouncil}</p>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <MapPin size={12} />
                <span>{lawyer.city}, {lawyer.state}</span>
              </div>

              <div className="flex flex-wrap gap-1">
                {lawyer.practiceAreas.map(area => (
                  <Badge key={area} variant="secondary" className="bg-secondary text-foreground text-xs">
                    {area}
                  </Badge>
                ))}
              </div>

              <Button className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
                Contact Lawyer
              </Button>
            </div>
          ))}
        </div>

        {filteredLawyers.length === 0 && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No lawyers found matching your criteria</p>
            <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default Lawyers;
