export interface GovScheme {
  id: string;
  name: string;
  ministry: string;
  category: "savings" | "investment" | "insurance" | "tax" | "social";
  benefit: string;
  eligibility: string;
  url: string;
  tag: string;
  highlight: boolean;
}

export const GOV_SCHEMES: GovScheme[] = [
  {
    id: "ppf",
    name: "Public Provident Fund (PPF)",
    ministry: "Ministry of Finance",
    category: "savings",
    benefit: "Tax-free returns at 7.1% p.a., ₹500–₹1.5L/year, 80C deduction",
    eligibility: "Any Indian resident, 15-year lock-in",
    url: "https://www.myscheme.gov.in/schemes/ppf",
    tag: "7.1% tax-free returns",
    highlight: true,
  },
  {
    id: "nps",
    name: "National Pension System (NPS)",
    ministry: "Ministry of Finance / PFRDA",
    category: "investment",
    benefit: "80C + extra ₹50,000 deduction under 80CCD(1B), market-linked returns",
    eligibility: "Indian citizens aged 18–70",
    url: "https://www.myscheme.gov.in/schemes/nps",
    tag: "Extra ₹50K tax benefit",
    highlight: true,
  },
  {
    id: "pmjjby",
    name: "PM Jeevan Jyoti Bima Yojana",
    ministry: "Ministry of Finance",
    category: "insurance",
    benefit: "₹2 lakh life insurance cover at just ₹436/year",
    eligibility: "Age 18–50 with bank account",
    url: "https://www.myscheme.gov.in/schemes/pmjjby",
    tag: "₹2L cover at ₹436/yr",
    highlight: true,
  },
  {
    id: "pmsby",
    name: "PM Suraksha Bima Yojana",
    ministry: "Ministry of Finance",
    category: "insurance",
    benefit: "₹2 lakh accident insurance at just ₹20/year",
    eligibility: "Age 18–70 with bank account",
    url: "https://www.myscheme.gov.in/schemes/pmsby",
    tag: "₹2L accident cover at ₹20/yr",
    highlight: false,
  },
  {
    id: "scss",
    name: "Senior Citizens Savings Scheme (SCSS)",
    ministry: "Ministry of Finance",
    category: "savings",
    benefit: "8.2% p.a. interest, quarterly payout, 80C deduction up to ₹1.5L",
    eligibility: "Age 60+ (or 55+ retired)",
    url: "https://www.myscheme.gov.in/schemes/scss",
    tag: "8.2% p.a. for seniors",
    highlight: false,
  },
  {
    id: "sukanya",
    name: "Sukanya Samriddhi Yojana",
    ministry: "Ministry of Finance",
    category: "savings",
    benefit: "8.2% p.a. tax-free, for girl child education/marriage",
    eligibility: "Girl child below age 10",
    url: "https://www.myscheme.gov.in/schemes/ssy",
    tag: "8.2% for girl child",
    highlight: false,
  },
  {
    id: "pmkvy",
    name: "PM Kaushal Vikas Yojana",
    ministry: "Ministry of Skill Development",
    category: "social",
    benefit: "Free skill training + government certification + placement support",
    eligibility: "Indian youth, 15–45 years",
    url: "https://www.myscheme.gov.in/schemes/pmkvy",
    tag: "Free skill training",
    highlight: false,
  },
  {
    id: "mudra",
    name: "PM MUDRA Yojana",
    ministry: "Ministry of Finance",
    category: "investment",
    benefit: "Collateral-free loans up to ₹10L for small businesses",
    eligibility: "Small business owners, self-employed",
    url: "https://www.myscheme.gov.in/schemes/pmmy",
    tag: "Loans up to ₹10L",
    highlight: false,
  },
  {
    id: "ayushman",
    name: "Ayushman Bharat (PMJAY)",
    ministry: "Ministry of Health",
    category: "insurance",
    benefit: "₹5 lakh health cover per family per year, 1900+ hospitals",
    eligibility: "Economically weaker sections (SECC database)",
    url: "https://www.myscheme.gov.in/schemes/pmjay",
    tag: "₹5L health cover",
    highlight: false,
  },
  {
    id: "elss",
    name: "ELSS Mutual Funds (Tax Saver)",
    ministry: "SEBI / AMFI",
    category: "tax",
    benefit: "Market-linked returns + 80C deduction up to ₹1.5L, shortest 3yr lock-in",
    eligibility: "Any Indian resident",
    url: "https://www.amfiindia.com/investor-corner/knowledge-center/elss.html",
    tag: "Best 80C + market returns",
    highlight: true,
  },
];
