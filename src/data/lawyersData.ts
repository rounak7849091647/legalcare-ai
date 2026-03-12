// All Indian States and Union Territories
export const indianStates = [
  'All States',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry'
];

// Cities by State
export const citiesByState: Record<string, string[]> = {
  'All States': ['All Cities'],
  'Andhra Pradesh': ['All Cities', 'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati', 'Rajahmundry', 'Kakinada', 'Anantapur'],
  'Arunachal Pradesh': ['All Cities', 'Itanagar', 'Naharlagun', 'Pasighat', 'Tawang'],
  'Assam': ['All Cities', 'Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur'],
  'Bihar': ['All Cities', 'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Arrah', 'Begusarai'],
  'Chhattisgarh': ['All Cities', 'Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon'],
  'Goa': ['All Cities', 'Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
  'Gujarat': ['All Cities', 'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand'],
  'Haryana': ['All Cities', 'Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat'],
  'Himachal Pradesh': ['All Cities', 'Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Kullu', 'Manali', 'Hamirpur'],
  'Jharkhand': ['All Cities', 'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh', 'Giridih'],
  'Karnataka': ['All Cities', 'Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum', 'Gulbarga', 'Davangere', 'Bellary', 'Shimoga'],
  'Kerala': ['All Cities', 'Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha', 'Palakkad', 'Malappuram'],
  'Madhya Pradesh': ['All Cities', 'Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam'],
  'Maharashtra': ['All Cities', 'Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Navi Mumbai', 'Amravati'],
  'Manipur': ['All Cities', 'Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur'],
  'Meghalaya': ['All Cities', 'Shillong', 'Tura', 'Jowai', 'Nongstoin'],
  'Mizoram': ['All Cities', 'Aizawl', 'Lunglei', 'Champhai', 'Serchhip'],
  'Nagaland': ['All Cities', 'Kohima', 'Dimapur', 'Mokokchung', 'Tuensang'],
  'Odisha': ['All Cities', 'Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore'],
  'Punjab': ['All Cities', 'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot', 'Hoshiarpur'],
  'Rajasthan': ['All Cities', 'Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Bhilwara', 'Alwar', 'Sikar'],
  'Sikkim': ['All Cities', 'Gangtok', 'Namchi', 'Mangan', 'Gyalshing'],
  'Tamil Nadu': ['All Cities', 'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi'],
  'Telangana': ['All Cities', 'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam', 'Secunderabad'],
  'Tripura': ['All Cities', 'Agartala', 'Udaipur', 'Dharmanagar', 'Kailasahar'],
  'Uttar Pradesh': ['All Cities', 'Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Prayagraj', 'Meerut', 'Ghaziabad', 'Noida', 'Bareilly', 'Aligarh', 'Moradabad', 'Gorakhpur'],
  'Uttarakhand': ['All Cities', 'Dehradun', 'Haridwar', 'Rishikesh', 'Roorkee', 'Haldwani', 'Nainital', 'Mussoorie'],
  'West Bengal': ['All Cities', 'Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda', 'Kharagpur'],
  'Andaman and Nicobar Islands': ['All Cities', 'Port Blair', 'Diglipur', 'Rangat'],
  'Chandigarh': ['All Cities', 'Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['All Cities', 'Daman', 'Diu', 'Silvassa'],
  'Delhi': ['All Cities', 'New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Central Delhi', 'Dwarka', 'Rohini', 'Saket'],
  'Jammu and Kashmir': ['All Cities', 'Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Sopore', 'Kathua'],
  'Ladakh': ['All Cities', 'Leh', 'Kargil'],
  'Lakshadweep': ['All Cities', 'Kavaratti', 'Agatti', 'Minicoy'],
  'Puducherry': ['All Cities', 'Puducherry', 'Karaikal', 'Mahe', 'Yanam']
};

export const practiceAreas = [
  'All Practice Areas',
  'Criminal Law',
  'Family Law',
  'Corporate Law',
  'Property Law',
  'Labour Law',
  'Intellectual Property',
  'Civil Law',
  'Constitutional Law',
  'Tax Law',
  'Cyber Law',
  'Banking Law',
  'Insurance Law',
  'Consumer Law',
  'Environmental Law',
  'Immigration Law',
  'Arbitration',
  'Human Rights',
  'Medical Law',
  'Sports Law'
];

// Generate 75+ lawyers across India
export interface Lawyer {
  id: number;
  name: string;
  rating: number;
  reviews: number;
  experience: number;
  barCouncil: string;
  practiceAreas: string[];
  state: string;
  city: string;
  verified: boolean;
}

const firstNames = ['Rajesh', 'Anita', 'Arjun', 'Priya', 'Vikram', 'Meera', 'Suresh', 'Kavita', 'Anil', 'Deepika', 'Rahul', 'Sunita', 'Amit', 'Neha', 'Sanjay', 'Pooja', 'Manoj', 'Rekha', 'Vivek', 'Shweta', 'Ashok', 'Anu', 'Ravi', 'Divya', 'Nitin', 'Smita', 'Prakash', 'Geeta', 'Mukesh', 'Ritu', 'Vijay', 'Anjali', 'Sunil', 'Komal', 'Harish', 'Bhavna', 'Ramesh', 'Pallavi', 'Dinesh', 'Swati'];
const lastNames = ['Kumar', 'Sharma', 'Singh', 'Patel', 'Desai', 'Malhotra', 'Gupta', 'Verma', 'Reddy', 'Rao', 'Nair', 'Menon', 'Iyer', 'Pillai', 'Chatterjee', 'Banerjee', 'Mukherjee', 'Das', 'Bose', 'Sen', 'Joshi', 'Kulkarni', 'Patil', 'Jadhav', 'More', 'Shinde', 'Pawar', 'Thakur', 'Chauhan', 'Yadav', 'Mishra', 'Pandey', 'Dubey', 'Tiwari', 'Srivastava', 'Agarwal', 'Jain', 'Kapoor', 'Khanna', 'Mehra'];

const stateBarCodes: Record<string, string> = {
  'Delhi': 'D', 'Maharashtra': 'MAH', 'Karnataka': 'KAR', 'Tamil Nadu': 'TN', 'Gujarat': 'GUJ',
  'Uttar Pradesh': 'UP', 'West Bengal': 'WB', 'Rajasthan': 'RAJ', 'Kerala': 'KER', 'Telangana': 'TEL',
  'Andhra Pradesh': 'AP', 'Punjab': 'PB', 'Haryana': 'HR', 'Bihar': 'BH', 'Madhya Pradesh': 'MP',
  'Odisha': 'OD', 'Jharkhand': 'JH', 'Chhattisgarh': 'CG', 'Assam': 'AS', 'Goa': 'GOA',
  'Himachal Pradesh': 'HP', 'Uttarakhand': 'UK', 'Chandigarh': 'CHD', 'Jammu and Kashmir': 'JK',
  'Puducherry': 'PY', 'Sikkim': 'SK', 'Meghalaya': 'ML', 'Manipur': 'MN', 'Tripura': 'TR',
  'Mizoram': 'MZ', 'Nagaland': 'NL', 'Arunachal Pradesh': 'AR'
};

const generateLawyers = (): Lawyer[] => {
  const lawyers: Lawyer[] = [];
  let id = 1;

  const lawyerDistribution = [
    { state: 'Delhi', city: 'New Delhi', count: 8 },
    { state: 'Maharashtra', city: 'Mumbai', count: 7 },
    { state: 'Maharashtra', city: 'Pune', count: 4 },
    { state: 'Karnataka', city: 'Bangalore', count: 6 },
    { state: 'Tamil Nadu', city: 'Chennai', count: 5 },
    { state: 'Gujarat', city: 'Ahmedabad', count: 4 },
    { state: 'Gujarat', city: 'Surat', count: 2 },
    { state: 'Telangana', city: 'Hyderabad', count: 5 },
    { state: 'West Bengal', city: 'Kolkata', count: 4 },
    { state: 'Uttar Pradesh', city: 'Lucknow', count: 3 },
    { state: 'Uttar Pradesh', city: 'Noida', count: 3 },
    { state: 'Uttar Pradesh', city: 'Varanasi', count: 2 },
    { state: 'Rajasthan', city: 'Jaipur', count: 3 },
    { state: 'Kerala', city: 'Kochi', count: 3 },
    { state: 'Kerala', city: 'Thiruvananthapuram', count: 2 },
    { state: 'Punjab', city: 'Ludhiana', count: 2 },
    { state: 'Punjab', city: 'Chandigarh', count: 2 },
    { state: 'Haryana', city: 'Gurugram', count: 3 },
    { state: 'Bihar', city: 'Patna', count: 2 },
    { state: 'Madhya Pradesh', city: 'Bhopal', count: 2 },
    { state: 'Madhya Pradesh', city: 'Indore', count: 2 },
    { state: 'Odisha', city: 'Bhubaneswar', count: 2 },
    { state: 'Jharkhand', city: 'Ranchi', count: 1 },
    { state: 'Chhattisgarh', city: 'Raipur', count: 1 },
    { state: 'Assam', city: 'Guwahati', count: 1 },
    { state: 'Goa', city: 'Panaji', count: 1 },
    { state: 'Himachal Pradesh', city: 'Shimla', count: 1 },
    { state: 'Uttarakhand', city: 'Dehradun', count: 1 },
    { state: 'Jammu and Kashmir', city: 'Srinagar', count: 1 },
  ];

  lawyerDistribution.forEach(({ state, city, count }) => {
    for (let i = 0; i < count; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const experience = Math.floor(Math.random() * 20) + 3;
      const year = 2024 - experience;
      const barCode = stateBarCodes[state] || 'IND';
      const regNum = String(Math.floor(Math.random() * 90000) + 10000);
      
      // Assign 1-3 practice areas
      const numAreas = Math.floor(Math.random() * 2) + 1;
      const shuffledAreas = practiceAreas.slice(1).sort(() => Math.random() - 0.5);
      const selectedAreas = shuffledAreas.slice(0, numAreas);

      lawyers.push({
        id: id++,
        name: `Adv. ${firstName} ${lastName}`,
        rating: Number((Math.random() * 0.8 + 4.2).toFixed(1)),
        reviews: Math.floor(Math.random() * 300) + 50,
        experience,
        barCouncil: `${barCode}/${year}/${regNum}`,
        practiceAreas: selectedAreas,
        state,
        city,
        verified: true
      });
    }
  });

  return lawyers;
};

export const lawyers = generateLawyers();
