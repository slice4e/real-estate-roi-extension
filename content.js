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

const TAX_KEYWORDS = ['tax', 'property tax', 'annual tax', 'county tax', 'assessment', 'levy'];
const INSURANCE_KEYWORDS = ['insurance', 'homeowners insurance', 'home insurance', 'property insurance', 'hazard insurance', 'coverage'];
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
    
    const results = { tax: null, insurance: null };
    
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
    
    return results;
  }

  // Main extraction method
  extract() {
    console.log('🏠 Starting property data extraction...');
    
    let price = this.extractPrice();
    let annualTax = null;
    let annualInsurance = null;
    
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

    // Final fallback: comprehensive page text scan
    if (!annualTax || !annualInsurance) {
      console.log('🏠 Using comprehensive fallback extraction...');
      try {
        const fallbackResults = this.extractFromAllPageText();
        if (!annualTax && fallbackResults.tax) {
          annualTax = fallbackResults.tax;
        }
        if (!annualInsurance && fallbackResults.insurance) {
          annualInsurance = fallbackResults.insurance;
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
    
    const result = { price, annualTax, annualInsurance };
    console.log('🏠 Final extraction result:', result);
    
    return result;
  }
}

// =====================================================
// MAIN EXTRACTION FUNCTION
// =====================================================

function extractPropertyData() {
  try {
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
    try {
      const data = extractPropertyData();
      console.log('🏠 Sending data to popup:', data);
      sendResponse(data);
    } catch (error) {
      console.error('🏠 Error extracting data:', error);
      sendResponse({ error: error.message });
    }
  }
  
  return true;
});

// Initialize
console.log('🏠 Content script ready on:', window.location.href);
