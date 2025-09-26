// Real Estate ROI Extension - Content Script
console.log('🏠 Real Estate ROI Extension: Content script loaded');

// =====================================================
// CONFIGURATION & CONSTANTS
// =====================================================

const SELECTORS = {
  redfin: {
    price: [
      '.price-section .statsValue',
      '.price .value',
      '.current-price .price-text',
      '.home-price',
      '.price-display',
      '[data-rf-test-id="abp-price"]'
    ],
    tax: [
      '[data-rf-test-id="abp-taxHistory"] .value',
      '.tax-history .value',
      '.property-taxes .value',
      '.tax-amount',
      // Enhanced selectors for more coverage
      '.keyDetail-value',
      '.amenity-value',
      '.fact-value',
      '.property-history .value',
      '[class*="tax" i] .value',
      '[class*="property" i] [class*="tax" i]',
      '.keyDetail span',
      '.amenity span',
      '.fact span',
      // Generic fallbacks
      'span[title*="tax" i]',
      'div[title*="tax" i]',
      'li[title*="tax" i]'
    ],
    insurance: [
      '[data-rf-test-id*="insurance" i] .value',
      '.insurance .value',
      '.home-insurance .value',
      '.property-insurance .value',
      '.hazard-insurance .value',
      '[class*="insurance"] .value',
      // Enhanced selectors for more coverage
      '.keyDetail-value',
      '.amenity-value',
      '.fact-value',
      '[class*="insurance" i] .value',
      '[class*="homeowners" i] .value',
      '.keyDetail span',
      '.amenity span',
      '.fact span',
      // Generic fallbacks
      'span[title*="insurance" i]',
      'div[title*="insurance" i]',
      'li[title*="insurance" i]'
    ]
  },
  zillow: {
    price: [
      '[data-testid="price"]',
      '.notranslate .Text-c11n-8-84-3__sc-aiai24-0',
      '.summary-container .notranslate',
      '.price-range',
      '.ds-price .ds-text'
    ],
    tax: [
      '[data-testid="property-tax-history"] span',
      '[data-testid="property-tax-history"] .Text-c11n-8-84-3__sc-aiai24-0',
      '[data-testid="tax-assessments"] .Text-c11n-8-84-3__sc-aiai24-0',
      '[data-testid="property-details"] [class*="tax"] span',
      '[data-testid="home-details"] [class*="tax"] span',
      '[data-testid="facts-and-features"] [class*="tax"] span',
      '[data-testid*="tax" i] span',
      '.tax-history-container .Text-c11n-8-84-3__sc-aiai24-0',
      '.property-tax-container .Text-c11n-8-84-3__sc-aiai24-0'
    ],
    insurance: [
      '[data-testid*="insurance" i] span',
      '[data-testid="property-details"] [class*="insurance"] span',
      '[data-testid="home-details"] [class*="insurance"] span',
      '[data-testid="facts-and-features"] [class*="insurance"] span',
      '.insurance-container .Text-c11n-8-84-3__sc-aiai24-0',
      '.home-insurance-container .Text-c11n-8-84-3__sc-aiai24-0',
      '[class*="insurance"] .Text-c11n-8-84-3__sc-aiai24-0'
    ],
    rent: [
      '[data-testid="rent-zestimate"] span',
      '[data-testid="rent-zestimate"] .Text-c11n-8-84-3__sc-aiai24-0',
      '[data-testid="rental-estimate"] span',
      '[data-testid="rental-estimate"] .Text-c11n-8-84-3__sc-aiai24-0',
      '[class*="rent" i] .Text-c11n-8-84-3__sc-aiai24-0',
      '[class*="rental" i] .Text-c11n-8-84-3__sc-aiai24-0',
      '[class*="zestimate" i] .Text-c11n-8-84-3__sc-aiai24-0',
      '[data-testid="property-details"] [class*="rent"] span',
      '[data-testid="home-details"] [class*="rent"] span',
      '[data-testid="facts-and-features"] [class*="rent"] span',
      '.rent-estimate-container .Text-c11n-8-84-3__sc-aiai24-0',
      '.rental-estimate-container .Text-c11n-8-84-3__sc-aiai24-0'
    ]
  }
};

const TAX_PATTERNS = [
  // Specific patterns for payment calculator format
  /Property\s+taxes\s*[\r\n]+\s*\$([0-9,]+)/i,
  /Property\s+taxes\s*\$([0-9,]+)/i,
  
  // Original patterns with more precise matching
  /Annual\s+tax(?:es|[\s]*amount)?\s*:?\s*\$([0-9,]+)/i,
  /Property\s+tax(?:es)?\s*:?\s*\$([0-9,]+)/i,
  /Tax\s*\(\d{4}\)\s*:?\s*\$([0-9,]+)/i,
  /(?:Tax\s+)?Assessment\s*:?\s*\$([0-9,]+)/i,
  /Property\s+tax\s*\(?\d{4}\)?\s*:?\s*\$([0-9,]+)(?!\s*\/\s*mo)/i,
  
  // Enhanced patterns for more flexibility  
  /Tax(?:es)?\s*amount\s*\$([0-9,]+)/i,
  /Annual\s*property\s*tax\s*\$([0-9,]+)/i,
  /County\s*tax(?:es)?\s*\$([0-9,]+)/i,
  /Real\s*estate\s*tax(?:es)?\s*\$([0-9,]+)/i,
  
  // More precise patterns that don't cross lines unexpectedly
  /tax(?:es)?\s*[:]*\s*\$([0-9,]+)(?!\s*\/\s*mo)(?!\s*per)/i
];

const INSURANCE_PATTERNS = [
  // Specific patterns for payment calculator format
  /Homeowners\s+insurance\s*[\r\n]+\s*\$([0-9,]+)/i,
  /Home\s+insurance\s*[\r\n]+\s*\$([0-9,]+)/i,
  /Homeowners\s+insurance\s*\$([0-9,]+)/i,
  /Home\s+insurance\s*\$([0-9,]+)/i,
  
  // Original patterns
  /Home(?:owners?)?[\s\-]*insurance\s*:?\s*\$([0-9,]+)/i,
  /Property\s+insurance\s*:?\s*\$([0-9,]+)/i,
  /Hazard\s+insurance\s*:?\s*\$([0-9,]+)/i,
  /Insurance\s*\(\d{4}\)\s*:?\s*\$([0-9,]+)/i,
  /Annual\s+insurance\s*:?\s*\$([0-9,]+)/i,
  /Monthly\s+insurance\s*:?\s*\$([0-9,]+)/i,
  /Insurance\s+cost\s*:?\s*\$([0-9,]+)/i,
  
  // Enhanced patterns for more flexibility
  /Property\s*insurance\s*\$([0-9,]+)/i,
  /Insurance\s*amount\s*\$([0-9,]+)/i,
  
  // More precise patterns
  /insurance\s*[:]*\s*\$([0-9,]+)/i
];

const RENT_PATTERNS = [
  // Rent Zestimate patterns (most common)
  /Rent\s+Zestimate\s*[\r\n]+\s*\$([0-9,]+)/i,
  /Rent\s+Zestimate\s*:?\s*\$([0-9,]+)/i,
  /Rental\s+estimate\s*:?\s*\$([0-9,]+)/i,
  /Rent\s+estimate\s*:?\s*\$([0-9,]+)/i,
  
  // Monthly rent patterns
  /Monthly\s+rent\s*:?\s*\$([0-9,]+)/i,
  /Estimated\s+rent\s*:?\s*\$([0-9,]+)/i,
  /Rental\s+income\s*:?\s*\$([0-9,]+)/i,
  /Market\s+rent\s*:?\s*\$([0-9,]+)/i,
  
  // Generic rent patterns
  /rent\s*[:]*\s*\$([0-9,]+)(?:\s*\/\s*mo(?:nth)?)?/i,
  /rental\s*[:]*\s*\$([0-9,]+)(?:\s*\/\s*mo(?:nth)?)?/i
];

const TAX_KEYWORDS = ['tax', 'property tax', 'annual tax', 'county tax', 'assessment', 'levy'];
const INSURANCE_KEYWORDS = ['insurance', 'homeowners insurance', 'home insurance', 'property insurance', 'hazard insurance', 'coverage'];
const RENT_KEYWORDS = ['rent', 'rental', 'zestimate', 'rent estimate', 'rental estimate', 'monthly rent'];
const PAYMENT_KEYWORDS = ['monthly', 'payment', 'mortgage', 'principal', 'interest', 'pmi', 'insurance'];

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function extractNumericValue(text) {
  if (!text) return null;
  
  const cleanText = text.replace(/[^\d,.-]/g, '');
  
  if (text.includes('M') || text.includes('million')) {
    const num = parseFloat(cleanText);
    return Math.round(num * 1000000);
  }
  
  if (text.includes('K') || text.includes('thousand')) {
    const num = parseFloat(cleanText);
    return Math.round(num * 1000);
  }
  
  const num = parseFloat(cleanText.replace(/,/g, ''));
  return isNaN(num) ? null : Math.round(num);
}

function isValidTaxAmount(amount, isAnnual = true) {
  if (!amount || amount <= 0) return false;
  
  if (isAnnual) {
    return amount >= 500 && amount <= 50000;
  } else {
    return amount >= 50 && amount <= 4000;
  }
}

function isValidRentAmount(amount) {
  if (!amount || amount <= 0) return false;
  
  // Reasonable monthly rent range for US properties
  return amount >= 500 && amount <= 15000;
}

function convertToAnnualTax(taxValue, context = '', propertyPrice = null) {
  // Enhanced logic to detect monthly taxes
  const isMonthlyByValue = taxValue < 1500; // Increased threshold
  const isMonthlyByContext = /month|mo\b|\/mo\b|monthly/i.test(context);
  
  // If we have property price, use it to validate tax rate
  if (propertyPrice && taxValue > 0) {
    const taxRate = taxValue / propertyPrice;
    const isUnrealisticAnnualRate = taxRate < 0.008; // Less than 0.8% annually is suspicious
    
    console.log('🏠 Tax rate analysis:', {
      taxValue,
      propertyPrice,
      taxRate: (taxRate * 100).toFixed(2) + '%',
      isUnrealistic: isUnrealisticAnnualRate
    });
    
    if (isUnrealisticAnnualRate || isMonthlyByValue || isMonthlyByContext) {
      console.log('🏠 Converting monthly tax to annual:', taxValue, '→', taxValue * 12);
      return taxValue * 12;
    }
  } else {
    // Fallback to original logic if no property price
    if (isMonthlyByValue || isMonthlyByContext) {
      console.log('🏠 Converting monthly tax to annual:', taxValue, '→', taxValue * 12);
      return taxValue * 12;
    }
  }
  
  return taxValue;
}

function convertToAnnualInsurance(insuranceValue, text) {
  // Check if the text indicates monthly insurance
  if (/month|mo\b|\/mo\b|monthly/i.test(text) || insuranceValue < 500) {
    console.log('🏠 Converting monthly insurance to annual:', insuranceValue, '→', insuranceValue * 12);
    return insuranceValue * 12;
  }
  return insuranceValue;
}

function getSafeText(element) {
  return (element?.textContent || element?.innerText || '').trim();
}

function detectSite() {
  const hostname = window.location.hostname;
  return {
    isRedfin: hostname.includes('redfin.com'),
    isZillow: hostname.includes('zillow.com')
  };
}

// =====================================================
// PAGE CONTENT LOADER (handles lazy loading)
// =====================================================

class PageContentLoader {
  static async ensureContentLoaded() {
    console.log('🏠 Ensuring all page content is loaded...');
    
    // First, scroll through the page to trigger lazy loading
    await this.scrollThroughPage();
    
    // Then wait for any dynamic content to settle
    await this.waitForContentStabilization();
    
    console.log('🏠 Page content loading complete');
  }
  
  static async scrollThroughPage() {
    return new Promise((resolve) => {
      console.log('🏠 Auto-scrolling to load lazy content...');
      
      const scrollHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      let currentPosition = 0;
      const scrollStep = viewportHeight * 0.7; // Scroll 70% of viewport each time
      
      const scrollInterval = setInterval(() => {
        currentPosition += scrollStep;
        window.scrollTo(0, currentPosition);
        
        // If we've reached the bottom, scroll back to top and finish
        if (currentPosition >= scrollHeight) {
          setTimeout(() => {
            window.scrollTo(0, 0); // Return to top
            clearInterval(scrollInterval);
            console.log('🏠 Auto-scroll complete');
            resolve();
          }, 500);
        }
      }, 300); // Wait 300ms between scrolls
    });
  }
  
  static async waitForContentStabilization() {
    return new Promise((resolve) => {
      console.log('🏠 Waiting for content stabilization...');
      
      let lastDOMSize = document.querySelectorAll('*').length;
      let stableCount = 0;
      
      const checkStability = setInterval(() => {
        const currentDOMSize = document.querySelectorAll('*').length;
        
        if (currentDOMSize === lastDOMSize) {
          stableCount++;
          if (stableCount >= 3) { // DOM stable for 3 checks (1.5 seconds)
            clearInterval(checkStability);
            console.log('🏠 Content stabilized');
            resolve();
          }
        } else {
          stableCount = 0;
        }
        
        lastDOMSize = currentDOMSize;
      }, 500);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkStability);
        console.log('🏠 Content stabilization timeout - proceeding anyway');
        resolve();
      }, 10000);
    });
  }
  
  static async waitForSpecificContent() {
    return new Promise((resolve) => {
      console.log('🏠 Waiting for payment calculator or tax/insurance elements...');
      
      const checkForContent = () => {
        // Look for payment calculator
        const hasPaymentCalc = document.body.innerText.includes('Payment calculator') ||
                              document.body.innerText.includes('Principal and interest');
        
        // Look for tax/insurance keywords
        const hasTaxInfo = /property tax|annual tax|tax amount/i.test(document.body.innerText);
        const hasInsuranceInfo = /homeowners insurance|home insurance|property insurance/i.test(document.body.innerText);
        
        if (hasPaymentCalc || (hasTaxInfo && hasInsuranceInfo)) {
          console.log('🏠 Found expected content elements');
          resolve();
          return true;
        }
        return false;
      };
      
      // Check immediately
      if (checkForContent()) return;
      
      // Check every 500ms for up to 8 seconds
      let attempts = 0;
      const contentCheck = setInterval(() => {
        attempts++;
        if (checkForContent() || attempts >= 16) {
          clearInterval(contentCheck);
          if (attempts >= 16) {
            console.log('🏠 Content check timeout - proceeding with extraction');
          }
          resolve();
        }
      }, 500);
    });
  }
}

// =====================================================
// EXTRACTION STRATEGIES
// =====================================================

class PropertyDataExtractor {
  constructor() {
    const { isRedfin, isZillow } = detectSite();
    this.isRedfin = isRedfin;
    this.isZillow = isZillow;
    this.selectors = isRedfin ? SELECTORS.redfin : SELECTORS.zillow;
  }

  // Extract price using selectors
  extractPrice() {
    console.log('🏠 Extracting price...');
    
    for (const selector of this.selectors.price) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = getSafeText(element);
        console.log('🏠 Found price element:', selector, priceText);
        const price = extractNumericValue(priceText);
        if (price && price > 50000) {
          console.log('🏠 ✅ Price extracted:', price);
          return price;
        }
      }
    }
    
    console.log('🏠 ❌ No price found with selectors');
    return null;
  }

  // Extract tax using selectors
  extractTaxFromSelectors() {
    console.log('🏠 Extracting tax from selectors...');
    
    for (const selector of this.selectors.tax) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const taxText = getSafeText(element);
          console.log('🏠 Found tax element:', selector, taxText);
          const taxValue = extractNumericValue(taxText);
          if (taxValue && isValidTaxAmount(taxValue)) {
            const annualTax = convertToAnnualTax(taxValue);
            console.log('🏠 ✅ Tax from selector:', annualTax);
            return annualTax;
          }
        }
      } catch (e) {
        console.log('🏠 Selector error:', selector, e.message);
      }
    }
    
    return null;
  }

  // Extract insurance using selectors
  extractInsuranceFromSelectors() {
    console.log('🏠 Extracting insurance from selectors...');
    
    for (const selector of this.selectors.insurance) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const insuranceText = getSafeText(element);
          console.log('🏠 Found insurance element:', selector, insuranceText);
          const insuranceValue = extractNumericValue(insuranceText);
          if (insuranceValue && insuranceValue > 0) {
            // Convert monthly to annual if needed
            const annualInsurance = convertToAnnualInsurance(insuranceValue, insuranceText);
            console.log('🏠 ✅ Insurance from selector:', annualInsurance);
            return annualInsurance;
          }
        }
      } catch (e) {
        console.log('🏠 Insurance selector error:', selector, e.message);
      }
    }
    
    return null;
  }

  // Extract rent using selectors (Zillow only)
  extractRentFromSelectors() {
    if (!this.isZillow) return null;
    
    console.log('🏠 Extracting rent from selectors...');
    
    for (const selector of this.selectors.rent) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const rentText = getSafeText(element);
          console.log('🏠 Found rent element:', selector, rentText);
          const rentValue = extractNumericValue(rentText);
          if (rentValue && isValidRentAmount(rentValue)) {
            console.log('🏠 ✅ Rent from selector:', rentValue);
            return rentValue;
          }
        }
      } catch (e) {
        console.log('🏠 Rent selector error:', selector, e.message);
      }
    }
    
    return null;
  }

  // Smart search for tax amounts with context validation
  extractTaxFromContext() {
    console.log('🏠 Smart tax search with context validation...');
    
    const allElements = document.querySelectorAll('*');
    const potentialTaxElements = [];
    
    for (const element of allElements) {
      const text = getSafeText(element);
      
      // Skip elements with children (avoid duplicates) or very long text
      if (element.children.length > 0 || text.length > 100) continue;
      
      // Look for dollar amounts that could be taxes
      if (text.includes('$')) {
        const amount = extractNumericValue(text);
        if (amount && amount >= 500 && amount <= 50000) {
          
          // Check context for tax-related keywords
          const parentText = getSafeText(element.parentElement).toLowerCase();
          const contextText = parentText.substring(0, 200);
          
          const hasKeyword = TAX_KEYWORDS.some(keyword => contextText.includes(keyword));
          const isPaymentContext = PAYMENT_KEYWORDS.some(keyword => contextText.includes(keyword));
          
          if (hasKeyword && !isPaymentContext) {
            potentialTaxElements.push({
              amount,
              context: contextText.substring(0, 100),
              text: text,
              priority: amount > 1200 ? 1 : 0 // Prioritize annual amounts
            });
            console.log('🏠 Found potential tax:', amount, 'Context:', contextText.substring(0, 60));
          }
        }
      }
    }
    
    // Sort by priority (annual first), then by amount
    potentialTaxElements.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return b.amount - a.amount;
    });
    
    if (potentialTaxElements.length > 0) {
      const best = potentialTaxElements[0];
      const annualTax = convertToAnnualTax(best.amount);
      console.log('🏠 ✅ Tax from context search:', annualTax, 'Source:', best.text);
      return annualTax;
    }
    
    return null;
  }

  // Smart search for insurance amounts with context validation
  extractInsuranceFromContext() {
    console.log('🏠 Smart insurance search with context validation...');
    
    const allElements = document.querySelectorAll('*');
    const potentialInsuranceElements = [];
    
    for (const element of allElements) {
      const text = getSafeText(element);
      
      // Skip elements with children (avoid duplicates) or very long text
      if (element.children.length > 0 || text.length > 100) continue;
      
      // Look for dollar amounts that could be insurance
      if (text.includes('$')) {
        const amount = extractNumericValue(text);
        if (amount && amount >= 50 && amount <= 15000) {
          
          // Check context for insurance-related keywords
          const parentText = getSafeText(element.parentElement).toLowerCase();
          const contextText = parentText.substring(0, 200);
          
          const hasKeyword = INSURANCE_KEYWORDS.some(keyword => contextText.includes(keyword));
          const isPaymentContext = PAYMENT_KEYWORDS.some(keyword => contextText.includes(keyword));
          
          if (hasKeyword && !isPaymentContext) {
            potentialInsuranceElements.push({
              amount,
              context: contextText.substring(0, 100),
              text: text,
              priority: amount > 1000 ? 1 : 0 // Prioritize annual amounts
            });
            console.log('🏠 Found potential insurance:', amount, 'Context:', contextText.substring(0, 60));
          }
        }
      }
    }
    
    // Sort by priority (annual first), then by amount
    potentialInsuranceElements.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return b.amount - a.amount;
    });
    
    if (potentialInsuranceElements.length > 0) {
      const best = potentialInsuranceElements[0];
      const annualInsurance = convertToAnnualInsurance(best.amount, best.text);
      console.log('🏠 ✅ Insurance from context search:', annualInsurance, 'Source:', best.text);
      return annualInsurance;
    }
    
    return null;
  }

  // Smart search for rent amounts with context validation (Zillow only)
  extractRentFromContext() {
    if (!this.isZillow) return null;
    
    console.log('🏠 Smart rent search with context validation...');
    
    const allElements = document.querySelectorAll('*');
    const potentialRentElements = [];
    
    for (const element of allElements) {
      const text = getSafeText(element);
      
      // Skip elements with children (avoid duplicates) or very long text
      if (element.children.length > 0 || text.length > 100) continue;
      
      // Look for dollar amounts that could be rent
      if (text.includes('$')) {
        const amount = extractNumericValue(text);
        if (amount && isValidRentAmount(amount)) {
          
          // Check context for rent-related keywords
          const parentText = getSafeText(element.parentElement).toLowerCase();
          const contextText = parentText.substring(0, 200);
          
          const hasKeyword = RENT_KEYWORDS.some(keyword => contextText.includes(keyword));
          const isPaymentContext = PAYMENT_KEYWORDS.some(keyword => contextText.includes(keyword));
          
          if (hasKeyword && !isPaymentContext) {
            potentialRentElements.push({
              amount,
              context: contextText.substring(0, 100),
              text: text,
              priority: contextText.includes('zestimate') ? 2 : 1 // Prioritize Zestimate
            });
            console.log('🏠 Found potential rent:', amount, 'Context:', contextText.substring(0, 60));
          }
        }
      }
    }
    
    // Sort by priority (Zestimate first), then by amount (higher rent = more likely correct)
    potentialRentElements.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return b.amount - a.amount;
    });
    
    if (potentialRentElements.length > 0) {
      const best = potentialRentElements[0];
      console.log('🏠 ✅ Rent from context search:', best.amount, 'Source:', best.text);
      return best.amount;
    }
    
    return null;
  }

  // Extract tax using text patterns
  extractTaxFromPatterns() {
    console.log('🏠 Extracting tax from text patterns...');
    
    // First try payment calculator extraction
    const paymentCalcResult = this.extractFromPaymentCalculator();
    if (paymentCalcResult.tax) {
      console.log('🏠 ✅ Tax from payment calculator:', paymentCalcResult.tax);
      return paymentCalcResult.tax;
    }
    
    const searchAreas = [
      document.querySelector('[data-testid="property-details"]'),
      document.querySelector('[data-testid="home-details"]'),
      document.querySelector('.summary-container'),
      document.querySelector('[data-testid="facts-and-features"]'),
      document.body
    ].filter(Boolean);
    
    for (const area of searchAreas) {
      const areaText = getSafeText(area);
      
      for (const pattern of TAX_PATTERNS) {
        const match = areaText.match(pattern);
        if (match) {
          const taxValue = extractNumericValue(match[1]);
          if (taxValue && taxValue >= 50) { // Lowered threshold to catch monthly amounts
            const annualTax = convertToAnnualTax(taxValue);
            console.log('🏠 ✅ Tax from pattern:', match[0], '→', annualTax);
            return annualTax;
          }
        }
      }
    }
    
    return null;
  }

  // Extract insurance using text patterns
  extractInsuranceFromPatterns() {
    console.log('🏠 Extracting insurance from text patterns...');
    
    // First try payment calculator extraction
    const paymentCalcResult = this.extractFromPaymentCalculator();
    if (paymentCalcResult.insurance) {
      console.log('🏠 ✅ Insurance from payment calculator:', paymentCalcResult.insurance);
      return paymentCalcResult.insurance;
    }
    
    const searchAreas = [
      document.querySelector('[data-testid="property-details"]'),
      document.querySelector('[data-testid="home-details"]'),
      document.querySelector('.summary-container'),
      document.querySelector('[data-testid="facts-and-features"]'),
      document.querySelector('[data-testid="mortgage-calculator"]'),
      document.body
    ].filter(Boolean);
    
    for (const area of searchAreas) {
      const areaText = getSafeText(area);
      
      for (const pattern of INSURANCE_PATTERNS) {
        const match = areaText.match(pattern);
        if (match) {
          const insuranceValue = extractNumericValue(match[1]);
          if (insuranceValue && insuranceValue >= 30) { // Lowered threshold to catch monthly amounts
            const annualInsurance = convertToAnnualInsurance(insuranceValue, match[0]);
            console.log('🏠 ✅ Insurance from pattern:', match[0], '→', annualInsurance);
            return annualInsurance;
          }
        }
      }
    }
    
    return null;
  }

  // Extract rent using text patterns (Zillow only)
  extractRentFromPatterns() {
    if (!this.isZillow) return null;
    
    console.log('🏠 Extracting rent from text patterns...');
    
    const searchAreas = [
      document.querySelector('[data-testid="property-details"]'),
      document.querySelector('[data-testid="home-details"]'),
      document.querySelector('.summary-container'),
      document.querySelector('[data-testid="facts-and-features"]'),
      document.querySelector('[data-testid="rental-calculator"]'),
      document.querySelector('[data-testid="rent-zestimate"]'),
      document.body
    ].filter(Boolean);
    
    for (const area of searchAreas) {
      const areaText = getSafeText(area);
      
      for (const pattern of RENT_PATTERNS) {
        const match = areaText.match(pattern);
        if (match) {
          const rentValue = extractNumericValue(match[1]);
          if (rentValue && isValidRentAmount(rentValue)) {
            console.log('🏠 ✅ Rent from pattern:', match[0], '→', rentValue);
            return rentValue;
          }
        }
      }
    }
    
    return null;
  }

  // Extract from payment calculator sections specifically
  extractFromPaymentCalculator() {
    console.log('🏠 Extracting from payment calculator...');
    
    const results = { tax: null, insurance: null };
    
    // Look for payment calculator sections - be more specific
    const allText = document.body.innerText || document.body.textContent || '';
    
    // Look for the specific payment calculator pattern
    const paymentCalcMatch = allText.match(/Payment calculator[\s\S]*?\$[\d,]+\s*per month[\s\S]*?Principal and interest\s*\$[\d,]+[\s\S]*?Property taxes[\s\S]*?Homeowners insurance/i);
    
    if (paymentCalcMatch) {
      console.log('🏠 Found payment calculator section');
      
      const calcText = paymentCalcMatch[0];
      
      // Extract property taxes with more precise matching
      const taxPatterns = [
        /Property taxes[\s\r\n]+\$([0-9,]+)/i,
        /Property taxes\s*\$([0-9,]+)/i,
        /Property taxes[\s\S]{1,20}\$([0-9,]+)/i
      ];
      
      for (const pattern of taxPatterns) {
        const taxMatch = calcText.match(pattern);
        if (taxMatch) {
          const amount = extractNumericValue(taxMatch[1]);
          // Be very specific about tax amounts - should be reasonable monthly tax
          if (amount && amount >= 100 && amount <= 1500) {
            results.tax = convertToAnnualTax(amount);
            console.log('🏠 ✅ Found property tax in payment calc:', amount, '→', results.tax);
            break;
          }
        }
      }
      
      // Extract homeowners insurance with more precise matching
      const insurancePatterns = [
        /Homeowners insurance[\s\r\n]+\$([0-9,]+)/i,
        /Homeowners insurance\s*\$([0-9,]+)/i,
        /Homeowners insurance[\s\S]{1,20}\$([0-9,]+)/i
      ];
      
      for (const pattern of insurancePatterns) {
        const insuranceMatch = calcText.match(pattern);
        if (insuranceMatch) {
          const amount = extractNumericValue(insuranceMatch[1]);
          // Be specific about insurance amounts - should be reasonable monthly insurance
          if (amount && amount >= 50 && amount <= 500) {
            results.insurance = convertToAnnualInsurance(amount, insuranceMatch[0]);
            console.log('🏠 ✅ Found homeowners insurance in payment calc:', amount, '→', results.insurance);
            break;
          }
        }
      }
    } else {
      console.log('🏠 No payment calculator pattern found in page text');
    }
    
    return results;
  }

  // Extract tax from Zillow's tax history table (fallback only)
  extractTaxFromTable() {
    if (!this.isZillow) return null;
    
    console.log('🏠 Fallback: Extracting from tax history table...');
    
    // Look for "Public tax history" section
    const publicTaxElements = document.querySelectorAll('*');
    for (const element of publicTaxElements) {
      const text = getSafeText(element);
      if (text.includes('Public tax history')) {
        console.log('🏠 Found "Public tax history" section');
        
        const parent = element.closest('section, div, [class*="section"]') || element.parentElement;
        if (parent) {
          const rows = parent.querySelectorAll('tr, [role="row"], [class*="row"]');
          let mostRecentTax = null;
          let mostRecentYear = 0;
          
          for (const row of rows) {
            const rowText = getSafeText(row);
            const yearMatch = rowText.match(/20\d{2}/);
            
            if (yearMatch) {
              const year = parseInt(yearMatch[0]);
              const taxMatch = rowText.match(/\$([0-9,]+)/g);
              
              if (taxMatch && taxMatch.length > 0) {
                const taxAmount = extractNumericValue(taxMatch[0]);
                // Validate: reasonable tax amount (not listing prices)
                if (taxAmount && taxAmount > 500 && taxAmount < 30000) {
                  if (year > mostRecentYear) {
                    mostRecentYear = year;
                    mostRecentTax = taxAmount;
                  }
                }
              }
            }
          }
          
          if (mostRecentTax) {
            console.log(`🏠 ✅ Tax from table: ${mostRecentYear} = $${mostRecentTax}`);
            return mostRecentTax;
          }
        }
      }
    }
    
    return null;
  }

  // Comprehensive fallback extraction for both tax and insurance
  extractFromAllPageText() {
    console.log('🏠 Fallback: Scanning all page text for tax/insurance data...');
    
    const results = { tax: null, insurance: null, rent: null };
    
    // Get all text content from the page
    const allText = document.body.innerText || document.body.textContent || '';
    
    // Look for any dollar amounts with tax-related keywords nearby
    const dollarMatches = allText.match(/(?:tax|property tax|annual tax|county tax|assessment|levy)[\s\S]{0,50}\$([0-9,]+)|\$([0-9,]+)[\s\S]{0,50}(?:tax|property tax|annual tax|county tax|assessment|levy)/gi);
    
    if (dollarMatches) {
      for (const match of dollarMatches) {
        const amounts = match.match(/\$([0-9,]+)/g);
        if (amounts) {
          for (const amountStr of amounts) {
            const amount = extractNumericValue(amountStr);
            if (amount && isValidTaxAmount(amount, true) && !results.tax) {
              results.tax = convertToAnnualTax(amount);
              console.log('🏠 ✅ Tax from full page scan:', results.tax, 'Context:', match.substring(0, 60));
              break;
            }
          }
        }
      }
    }
    
    // Look for any dollar amounts with insurance-related keywords nearby
    const insuranceMatches = allText.match(/(?:insurance|homeowner|home insurance|property insurance|hazard insurance)[\s\S]{0,50}\$([0-9,]+)|\$([0-9,]+)[\s\S]{0,50}(?:insurance|homeowner|home insurance|property insurance|hazard insurance)/gi);
    
    if (insuranceMatches) {
      for (const match of insuranceMatches) {
        const amounts = match.match(/\$([0-9,]+)/g);
        if (amounts) {
          for (const amountStr of amounts) {
            const amount = extractNumericValue(amountStr);
            if (amount && amount >= 50 && amount <= 15000 && !results.insurance) {
              results.insurance = convertToAnnualInsurance(amount, match);
              console.log('🏠 ✅ Insurance from full page scan:', results.insurance, 'Context:', match.substring(0, 60));
              break;
            }
          }
        }
      }
    }
    
    // Look for any dollar amounts with rent-related keywords nearby (Zillow only)
    if (this.isZillow) {
      const rentMatches = allText.match(/(?:rent|rental|zestimate|rent estimate|rental estimate)[\s\S]{0,50}\$([0-9,]+)|\$([0-9,]+)[\s\S]{0,50}(?:rent|rental|zestimate|rent estimate|rental estimate)/gi);
      
      if (rentMatches) {
        for (const match of rentMatches) {
          const amounts = match.match(/\$([0-9,]+)/g);
          if (amounts) {
            for (const amountStr of amounts) {
              const amount = extractNumericValue(amountStr);
              if (amount && isValidRentAmount(amount) && !results.rent) {
                results.rent = amount;
                console.log('🏠 ✅ Rent from full page scan:', results.rent, 'Context:', match.substring(0, 60));
                break;
              }
            }
          }
        }
      }
    }
    
    return results;
  }

  // Main extraction method
  extract() {
    console.log('🏠 Starting property data extraction...');
    
    let price = this.extractPrice();
    let annualTax = null;
    let annualInsurance = null;
    let monthlyRent = null;
    
  // Try tax extraction methods in order of reliability
    const taxMethods = [
      () => this.extractTaxFromSelectors(price),
      () => this.extractTaxFromContext(price),
      () => this.extractTaxFromPatterns(price),
      () => this.extractTaxFromTable(price)
    ];
    
    for (const method of taxMethods) {
      try {
        annualTax = method();
        if (annualTax) break;
      } catch (error) {
        console.log('🏠 Tax extraction method failed:', error.message);
      }
    }

    // Try insurance extraction methods in order of reliability
    const insuranceMethods = [
      () => this.extractInsuranceFromSelectors(),
      () => this.extractInsuranceFromContext(),
      () => this.extractInsuranceFromPatterns()
    ];
    
    for (const method of insuranceMethods) {
      try {
        annualInsurance = method();
        if (annualInsurance) break;
      } catch (error) {
        console.log('🏠 Insurance extraction method failed:', error.message);
      }
    }

    // Try rent extraction methods (Zillow only)
    if (this.isZillow) {
      const rentMethods = [
        () => this.extractRentFromSelectors(),
        () => this.extractRentFromContext(),
        () => this.extractRentFromPatterns()
      ];
      
      for (const method of rentMethods) {
        try {
          monthlyRent = method();
          if (monthlyRent) break;
        } catch (error) {
          console.log('🏠 Rent extraction method failed:', error.message);
        }
      }
    }

    // Final fallback: comprehensive page text scan
    if (!annualTax || !annualInsurance || (!monthlyRent && this.isZillow)) {
      console.log('🏠 Using comprehensive fallback extraction...');
      try {
        const fallbackResults = this.extractFromAllPageText();
        if (!annualTax && fallbackResults.tax) {
          annualTax = fallbackResults.tax;
        }
        if (!annualInsurance && fallbackResults.insurance) {
          annualInsurance = fallbackResults.insurance;
        }
        if (!monthlyRent && fallbackResults.rent && this.isZillow) {
          monthlyRent = fallbackResults.rent;
        }
      } catch (error) {
        console.log('🏠 Fallback extraction failed:', error.message);
      }
    }
    
    // Final validation
    if (annualTax && !isValidTaxAmount(annualTax, true)) {
      console.log('🏠 ⚠️ Warning: Extracted tax amount seems unusual:', annualTax);
      if (annualTax > 30000) {
        console.log('🏠 ❌ Tax amount too high, likely extracted wrong value.');
        annualTax = null;
      }
    }

    // Validate insurance amount
    if (annualInsurance) {
      if (annualInsurance < 200 || annualInsurance > 15000) {
        console.log('🏠 ⚠️ Warning: Extracted insurance amount seems unusual:', annualInsurance);
        if (annualInsurance > 15000) {
          console.log('🏠 ❌ Insurance amount too high, likely extracted wrong value.');
          annualInsurance = null;
        }
      }
    }

    // Validate rent amount
    if (monthlyRent && !isValidRentAmount(monthlyRent)) {
      console.log('🏠 ⚠️ Warning: Extracted rent amount seems unusual:', monthlyRent);
      if (monthlyRent > 15000 || monthlyRent < 500) {
        console.log('🏠 ❌ Rent amount outside reasonable range, likely extracted wrong value.');
        monthlyRent = null;
      }
    }
    
    // Detect red flags in the property listing
    const redFlags = this.detectRedFlags();
    
    const result = { price, annualTax, annualInsurance, monthlyRent, redFlags };
    console.log('🏠 Final extraction result:', result);
    
    return result;
  }
  
  // Red flag detection method
  detectRedFlags() {
    console.log('🏠 Scanning for red flags...');
    
    const redFlags = [];
    const allText = document.body.innerText || document.body.textContent || '';
    const lowerText = allText.toLowerCase();
    
    // Define red flag patterns
    const redFlagPatterns = [
      {
        pattern: /septic|sewage system|on-site waste|septic tank/i,
        flag: 'SEPTIC_SYSTEM',
        message: 'Property may have septic system - inspect condition, pumping costs ($300-600), and replacement potential ($3,000-7,000)',
        severity: 'high'
      },
      {
        pattern: /well water|private well|water well/i,
        flag: 'WELL_WATER',
        message: 'Property uses well water - test water quality and inspect well system',
        severity: 'medium'
      },
      {
        pattern: /asbestos|lead\s+paint|lead-based paint/i,
        flag: 'HAZARDOUS_MATERIALS',
        message: 'Property may contain hazardous materials - professional inspection recommended',
        severity: 'high'
      },
      {
        pattern: /structural\s+issues|foundation\s+problems|structural\s+damage|foundation\s+repair/i,
        flag: 'STRUCTURAL_ISSUES',
        message: 'Potential structural issues mentioned - detailed inspection required',
        severity: 'high'
      },
      {
        pattern: /as-is|sold\s+as\s+is|cash\s+only|no\s+financing/i,
        flag: 'AS_IS_SALE',
        message: 'Property sold as-is - may indicate issues, inspect thoroughly before purchase',
        severity: 'medium'
      },
      {
        pattern: /short\s+sale|foreclosure|bank\s+owned|reo\s+property/i,
        flag: 'DISTRESSED_SALE',
        message: 'Distressed property - may have title issues, damage, or delayed closing',
        severity: 'medium'
      },
      {
        pattern: /oil\s+tank|heating\s+oil|underground\s+tank/i,
        flag: 'OIL_TANK',
        message: 'Property may have oil tank - check for leaks and environmental issues',
        severity: 'medium'
      },
      {
        pattern: /mobile\s+home|manufactured\s+home|trailer/i,
        flag: 'MOBILE_HOME',
        message: 'Mobile/manufactured home - different financing and insurance requirements',
        severity: 'medium'
      },
      {
        pattern: /estate\s+sale|probate|deceased/i,
        flag: 'ESTATE_SALE',
        message: 'Estate sale - may have title complications or extended closing timeline',
        severity: 'low'
      }
    ];
    
    // Check for each red flag pattern
    redFlagPatterns.forEach(({ pattern, flag, message, severity }) => {
      if (pattern.test(allText)) {
        redFlags.push({
          type: flag,
          message: message,
          severity: severity
        });
        console.log(`🏠 🚩 Red flag detected: ${flag}`);
      }
    });
    
    // Special check for flood zone with rating > 1/10
    this.checkFloodZone(allText, redFlags);
    
    // Special check for HOA with non-zero fees
    this.checkHOAFees(allText, redFlags);
    
    return redFlags;
  }
  
  // Check for flood zone with rating greater than 1/10
  checkFloodZone(allText, redFlags) {
    const floodZonePatterns = [
      /flood\s+zone\s+rating?\s*:?\s*([0-9]+)\s*\/\s*10/i,
      /flood\s+risk\s+rating?\s*:?\s*([0-9]+)\s*\/\s*10/i,
      /flood\s+score\s*:?\s*([0-9]+)\s*\/\s*10/i,
      /flood\s+rating?\s*:?\s*([0-9]+)\s*\/\s*10/i,
      /flood\s+risk\s*:?\s*([0-9]+)\s*\/\s*10/i
    ];
    
    for (const pattern of floodZonePatterns) {
      const match = allText.match(pattern);
      if (match) {
        const rating = parseInt(match[1], 10);
        
        console.log(`🏠 Flood zone rating found: ${rating}/10`);
        
        if (rating > 1) {
          redFlags.push({
            type: 'FLOOD_ZONE',
            message: `Property has flood zone rating: ${rating}/10 - verify flood insurance requirements and costs`,
            severity: 'high'
          });
          console.log(`🏠 🚩 Red flag detected: FLOOD_ZONE (${rating}/10)`);
        } else {
          console.log(`🏠 ✓ Flood zone rating ${rating}/10 is low - no red flag`);
        }
        break; // Only check once even if multiple patterns match
      }
    }
    
    // Also check for general flood zone mentions without specific ratings
    const generalFloodPatterns = [
      /flood\s+zone\s+[A-Z]\b/i,  // Flood Zone A, B, etc.
      /FEMA\s+flood\s+zone/i,
      /special\s+flood\s+hazard\s+area/i,
      /100-year\s+flood\s+plain/i,
      /500-year\s+flood\s+plain/i
    ];
    
    for (const pattern of generalFloodPatterns) {
      if (pattern.test(allText)) {
        redFlags.push({
          type: 'FLOOD_ZONE',
          message: 'Property may be in designated flood zone - verify flood insurance requirements and costs',
          severity: 'high'
        });
        console.log(`🏠 🚩 Red flag detected: FLOOD_ZONE (general)`);
        break; // Only add once
      }
    }
  }
  
  // Check for HOA with actual fees (not $0 or N/A)
  checkHOAFees(allText, redFlags) {
    const hoaPatterns = [
      /HOA\s+dues?\s*[\s\n\r]*\$\s*([0-9,]+)/i,
      /homeowners?\s+association\s+dues?\s*[\s\n\r]*\$\s*([0-9,]+)/i,
      /association\s+fee\s*[\s\n\r]*\$\s*([0-9,]+)/i,
      /HOA\s+fee\s*[\s\n\r]*\$\s*([0-9,]+)/i,
      /community\s+fee\s*[\s\n\r]*\$\s*([0-9,]+)/i,
      /condo\s+fee\s*[\s\n\r]*\$\s*([0-9,]+)/i,
      /monthly\s+HOA\s*[\s\n\r]*\$\s*([0-9,]+)/i
    ];
    
    // Check if HOA is mentioned as N/A, None, or $0 (these indicate no HOA)
    const noHOAPatterns = [
      /HOA\s+dues?\s*[\s\n\r]*(?:N\/A|None|--|\$\s*0)/i,
      /homeowners?\s+association\s+dues?\s*[\s\n\r]*(?:N\/A|None|--|\$\s*0)/i,
      /association\s+fee\s*[\s\n\r]*(?:N\/A|None|--|\$\s*0)/i,
      /HOA\s+fee\s*[\s\n\r]*(?:N\/A|None|--|\$\s*0)/i
    ];
    
    // First check if HOA is explicitly marked as N/A or $0 (no flag needed)
    for (const pattern of noHOAPatterns) {
      if (pattern.test(allText)) {
        console.log(`🏠 ✓ HOA marked as N/A, None, or $0 - no red flag`);
        return; // Exit early - no HOA fees
      }
    }
    
    // Then check for actual dollar amounts
    for (const pattern of hoaPatterns) {
      const match = allText.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseInt(amountStr, 10);
        
        console.log(`🏠 HOA fee found: $${amount}`);
        
        if (amount > 0) {
          redFlags.push({
            type: 'HOA_FEES',
            message: `Property has HOA fees: $${amount}/month - ongoing costs, renovation restrictions, potential rental limitations, and special assessments`,
            severity: 'high'
          });
          console.log(`🏠 🚩 Red flag detected: HOA_FEES ($${amount})`);
          break; // Only add once even if multiple patterns match
        }
      }
    }
  }
}

// =====================================================
// MAIN EXTRACTION FUNCTION
// =====================================================

async function extractPropertyData() {
  try {
    console.log('🏠 Starting enhanced property data extraction...');
    
    // Ensure all content is loaded before extraction
    await PageContentLoader.ensureContentLoaded();
    
    // Additional wait for specific content
    await PageContentLoader.waitForSpecificContent();
    
    // Now extract data
    const extractor = new PropertyDataExtractor();
    return extractor.extract();
  } catch (error) {
    console.error('🏠 ❌ Extraction error:', error);
    return { 
      price: null, 
      annualTax: null, 
      annualInsurance: null,
      error: 'Extraction failed: ' + error.message 
    };
  }
}

// =====================================================
// MESSAGE LISTENER
// =====================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🏠 Received message:', request);
  
  if (request.type === "getListingData") {
    // Handle async extraction
    extractPropertyData().then((data) => {
      console.log('🏠 Sending data to popup:', data);
      sendResponse(data);
    }).catch((error) => {
      console.error('🏠 Error extracting data:', error);
      sendResponse({ error: error.message });
    });
    
    return true; // Keep message channel open for async response
  }
  
  return true;
});

// Initialize
console.log('🏠 Content script ready on:', window.location.href);
