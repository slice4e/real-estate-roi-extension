// Optimized content script for property data extraction
console.log('🏠 Real Estate ROI Extension: Content script loaded');

// Enhanced data extraction with multiple fallback strategies
function extractPropertyData() {
  console.log('🏠 Starting property data extraction...');
  
  let price = null;
  let annualTax = null;
  
  // Determine which site we're on
  const isRedfin = window.location.hostname.includes('redfin.com');
  const isZillow = window.location.hostname.includes('zillow.com');
  
  console.log('🏠 Site detection:', { isRedfin, isZillow });
  
  if (isRedfin) {
    // Redfin price extraction with multiple selectors
    const redfinPriceSelectors = [
      '.price-section .statsValue',
      '.price .value',
      '.current-price .price-text',
      '.home-price',
      '.price-display',
      '[data-rf-test-id="abp-price"]'
    ];
    
    for (const selector of redfinPriceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent || element.innerText;
        console.log('🏠 Found price element:', selector, priceText);
        price = extractNumericValue(priceText);
        if (price) break;
      }
    }
    
    // Redfin tax extraction
    const redfinTaxSelectors = [
      '[data-rf-test-id="abp-taxHistory"] .value',
      '.tax-history .value',
      '.property-taxes .value',
      '.tax-amount'
    ];
    
    for (const selector of redfinTaxSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const taxText = element.textContent || element.innerText;
        console.log('🏠 Found tax element:', selector, taxText);
        let taxValue = extractNumericValue(taxText);
        if (taxValue) {
          // Check if this looks like a monthly amount (typically under $1000 for most properties)
          // Convert monthly to annual if needed
          if (taxValue < 1200) {
            console.log('🏠 Converting monthly tax to annual:', taxValue, '→', taxValue * 12);
            taxValue = taxValue * 12;
          }
          annualTax = taxValue;
          break;
        }
      }
    }
    
    // Fallback: Look for tax info in body text
    if (!annualTax) {
      const bodyText = document.body.innerText;
      const taxPattern = /(?:Annual|Yearly)?\s*(?:Property\s+)?Tax(?:es)?:?\s*\$?([\d,]+)/i;
      const taxMatch = bodyText.match(taxPattern);
      if (taxMatch) {
        console.log('🏠 Found tax in body text:', taxMatch[0]);
        let taxValue = extractNumericValue(taxMatch[1]);
        if (taxValue && taxValue < 1200) {
          console.log('🏠 Converting monthly tax from body text to annual:', taxValue, '→', taxValue * 12);
          taxValue = taxValue * 12;
        }
        annualTax = taxValue;
      }
    }
    
  } else if (isZillow) {
    // Zillow price extraction
    const zillowPriceSelectors = [
      '[data-testid="price"]',
      '.notranslate .Text-c11n-8-84-3__sc-aiai24-0',
      '.summary-container .notranslate',
      '.price-range',
      '.ds-price .ds-text'
    ];
    
    for (const selector of zillowPriceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent || element.innerText;
        console.log('🏠 Found price element:', selector, priceText);
        price = extractNumericValue(priceText);
        if (price) break;
      }
    }
    
    
    // Enhanced Zillow tax extraction - prioritize tax history over monthly payment calculations
    console.log('🏠 Starting Zillow tax extraction...');
    
    // Method 1: Try to find the most recent year in tax history table
    const tryExtractFromTaxTable = () => {
      console.log('🏠 Looking for Zillow tax history table...');
      
      // Look for tax history tables or sections
      const tableSelectors = [
        '[data-testid="tax-history-table"]',
        '.tax-history-table',
        '.tax-history',
        '[data-testid="tax-history"]'
      ];
      
      for (const selector of tableSelectors) {
        const table = document.querySelector(selector);
        if (table) {
          console.log('🏠 Found tax table:', selector);
          
          // Look for the most recent year (highest number)
          const yearPattern = /20\d{2}/g;
          const taxAmountPattern = /\$?([\d,]+)/g;
          
          const tableText = table.textContent || table.innerText;
          const years = tableText.match(yearPattern);
          
          if (years && years.length > 0) {
            const mostRecentYear = Math.max(...years.map(y => parseInt(y)));
            console.log('🏠 Most recent tax year found:', mostRecentYear);
            
            // Try to find tax amount for the most recent year
            const rows = table.querySelectorAll('tr, .tax-year-row, .ds-data-col');
            for (const row of rows) {
              const rowText = row.textContent || row.innerText;
              if (rowText.includes(mostRecentYear.toString())) {
                console.log('🏠 Found recent year row:', rowText);
                const taxMatches = rowText.match(/\$?([\d,]+)/g);
                if (taxMatches && taxMatches.length > 0) {
                  // Get the largest number in the row (likely the tax amount)
                  const amounts = taxMatches.map(m => extractNumericValue(m)).filter(a => a && a > 500);
                  if (amounts.length > 0) {
                    const taxAmount = Math.max(...amounts);
                    console.log('🏠 ✅ Tax from recent year row:', taxAmount);
                    return taxAmount;
                  }
                }
              }
            }
          }
        }
      }
      return null;
    };
    
    // Try tax table extraction first
    annualTax = tryExtractFromTaxTable();
    
    // Method 2: Look for tax history section specifically
    if (!annualTax) {
      const zillowTaxHistorySelectors = [
        // Tax history table or section
        '[data-testid="tax-history-table"] td:last-child',
        '[data-testid="tax-history"] .ds-text:last-child',
        '.tax-history-table td:last-child',
        '.tax-history .ds-text',
        
        // Property facts section
        '[data-testid="property-details-tax-info"] .Text-c11n-8-84-3__sc-aiai24-0',
        '.property-details-tax .ds-text',
        
        // Facts and features section
        '.facts-table td:contains("Tax") + td',
        '.property-facts .tax-amount',
        
        // Overview section tax info
        '.property-overview .tax-info .ds-text'
      ];
      
      for (const selector of zillowTaxHistorySelectors) {
        console.log('🏠 Trying tax history selector:', selector);
        const element = document.querySelector(selector);
        if (element) {
          const taxText = element.textContent || element.innerText;
          console.log('🏠 Found tax history element:', selector, taxText);
          let taxValue = extractNumericValue(taxText);
          if (taxValue && taxValue > 500) { // Must be reasonable annual tax amount
            // If it's clearly an annual amount (typically > $1200), use as is
            // If it looks monthly (< $1200), convert to annual
            if (taxValue < 1200) {
              console.log('🏠 Converting monthly tax to annual:', taxValue, '→', taxValue * 12);
              taxValue = taxValue * 12;
            }
            annualTax = taxValue;
            console.log('🏠 ✅ Tax from history section:', annualTax);
            break;
          }
        }
      }
    }
    
    // Method 3: If no tax history found, try XPath to find tax-related content that excludes monthly payments
    if (!annualTax) {
      console.log('🏠 Trying XPath for Zillow tax extraction...');
      const taxXPaths = [
        // Look for text that says "Property tax" followed by a dollar amount
        "//text()[contains(., 'Property tax')]/following::*[contains(text(), '$')][1]",
        "//text()[contains(., 'Annual tax')]/following::*[contains(text(), '$')][1]",
        
        // Look in tax history sections specifically
        "//*[contains(@class, 'tax-history')]//text()[contains(., '$')]",
        "//*[contains(@data-testid, 'tax')]//text()[contains(., '$')]",
        
        // Look for tax amounts in property details (avoid monthly payment sections)
        "//*[contains(text(), 'Property tax')]/ancestor::*[not(contains(@class, 'payment')) and not(contains(@class, 'mortgage'))]//*[contains(text(), '$')]"
      ];
      
      for (const xpath of taxXPaths) {
        try {
          console.log('🏠 Trying tax XPath:', xpath);
          const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          if (result.singleNodeValue) {
            const taxText = result.singleNodeValue.textContent || result.singleNodeValue.innerText;
            console.log('🏠 XPath found tax text:', taxText);
            let taxValue = extractNumericValue(taxText);
            if (taxValue && taxValue > 500) {
              if (taxValue < 1200) {
                console.log('🏠 Converting monthly tax to annual:', taxValue, '→', taxValue * 12);
                taxValue = taxValue * 12;
              }
              annualTax = taxValue;
              console.log('🏠 ✅ Tax from XPath:', annualTax);
              break;
            }
          }
        } catch (e) {
          console.log('🏠 XPath error:', e);
        }
      }
    }
    
    // Method 4: Look for tax information in text content, but exclude monthly payment sections
    if (!annualTax) {
      console.log('🏠 Trying text pattern matching for Zillow taxes...');
      
      // Get all text content but exclude monthly payment calculator sections
      const excludeSelectors = [
        '[data-testid="monthly-payment"]',
        '.monthly-payment',
        '.mortgage-calculator',
        '.payment-calculator',
        '.calculator-section'
      ];
      
      // Remove excluded sections temporarily for text extraction
      const excludedElements = [];
      excludeSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          excludedElements.push({ element: el, parent: el.parentNode });
          el.parentNode.removeChild(el);
        });
      });
      
      try {
        const bodyText = document.body.innerText;
        
        // Look for various tax patterns
        const taxPatterns = [
          /Property\s+tax\s*:?\s*\$?([\d,]+)\/?\s*year/i,
          /Annual\s+tax\s*:?\s*\$?([\d,]+)/i,
          /Tax\s+amount\s*:?\s*\$?([\d,]+)\/?\s*year/i,
          /Property\s+taxes?\s*:?\s*\$?([\d,]+)(?!\s*\/\s*mo)/i, // Exclude monthly
          /Tax\s*\(\d{4}\)\s*:?\s*\$?([\d,]+)/i // Tax (2023): $5,000 format
        ];
        
        for (const pattern of taxPatterns) {
          const taxMatch = bodyText.match(pattern);
          if (taxMatch) {
            console.log('🏠 Found tax pattern:', taxMatch[0]);
            let taxValue = extractNumericValue(taxMatch[1]);
            if (taxValue && taxValue > 500) {
              // Check if it's clearly marked as annual or if the amount suggests it's annual
              const isAnnual = /year|annual/i.test(taxMatch[0]) || taxValue > 1200;
              if (!isAnnual && taxValue < 1200) {
                console.log('🏠 Converting monthly tax to annual:', taxValue, '→', taxValue * 12);
                taxValue = taxValue * 12;
              }
              annualTax = taxValue;
              console.log('🏠 ✅ Tax from text pattern:', annualTax);
              break;
            }
          }
        }
      } finally {
        // Restore excluded elements
        excludedElements.forEach(({ element, parent }) => {
          parent.appendChild(element);
        });
      }
    }
    
    // Method 5: Fallback to generic selectors but with better validation
    if (!annualTax) {
      console.log('🏠 Trying fallback Zillow tax selectors...');
      const zillowFallbackTaxSelectors = [
        '[data-testid="property-tax-history"] .Text-c11n-8-84-3__sc-aiai24-0',
        '.property-tax .ds-text',
        '.tax-history .ds-text'
      ];
      
      for (const selector of zillowFallbackTaxSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const taxText = element.textContent || element.innerText;
          console.log('🏠 Found fallback tax element:', selector, taxText);
          let taxValue = extractNumericValue(taxText);
          if (taxValue && taxValue > 500) {
            // Be more conservative with monthly/annual detection
            if (taxValue < 1000) {
              console.log('🏠 Converting likely monthly tax to annual:', taxValue, '→', taxValue * 12);
              taxValue = taxValue * 12;
            }
            annualTax = taxValue;
            console.log('🏠 ⚠️ Tax from fallback (verify manually):', annualTax);
            break;
          }
        }
      }
    }
    
    // Final fallback: Look for tax info in body text with improved patterns
    if (!annualTax) {
      console.log('🏠 Trying improved body text tax extraction...');
      const bodyText = document.body.innerText;
      
      // More specific patterns that are less likely to match monthly payment calculations
      const improvedTaxPatterns = [
        /Property\s+tax\s*\(?\d{4}\)?\s*:?\s*\$?([\d,]+)(?!\s*\/\s*mo)/i, // Property tax (2023): $5000 but not $/mo
        /Annual\s+(?:property\s+)?tax(?:es)?\s*:?\s*\$?([\d,]+)/i,
        /Yearly\s+(?:property\s+)?tax(?:es)?\s*:?\s*\$?([\d,]+)/i,
        /Tax\s+assessment\s*:?\s*\$?([\d,]+)/i,
        /(?:Property\s+)?Tax(?:es)?\s*\$?([\d,]+)\s*\/\s*year/i,
        /(?:Property\s+)?Tax(?:es)?\s*\$?([\d,]+)\s*annually/i
      ];
      
      for (const pattern of improvedTaxPatterns) {
        const taxMatch = bodyText.match(pattern);
        if (taxMatch) {
          console.log('🏠 Found improved tax pattern:', taxMatch[0]);
          let taxValue = extractNumericValue(taxMatch[1]);
          if (taxValue && taxValue > 300) { // Very reasonable minimum
            // These patterns are designed to catch annual amounts
            // Only convert if it's very clearly a monthly amount
            if (taxValue < 800) {
              console.log('🏠 Converting likely monthly tax to annual:', taxValue, '→', taxValue * 12);
              taxValue = taxValue * 12;
            }
            annualTax = taxValue;
            console.log('🏠 ✅ Tax from improved pattern:', annualTax);
            break;
          }
        }
      }
    }
  }
  
  // XPath fallback for both sites
  if (!price) {
    console.log('🏠 Trying XPath fallback for price...');
    const priceXPaths = [
      "//span[contains(text(), '$') and contains(@class, 'price')]",
      "//div[contains(@class, 'price') and contains(text(), '$')]",
      "//*[contains(text(), '$') and string-length(translate(text(), '$,0123456789', '')) < 5]"
    ];
    
    for (const xpath of priceXPaths) {
      try {
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        if (result.singleNodeValue) {
          const priceText = result.singleNodeValue.textContent;
          console.log('🏠 XPath found price:', xpath, priceText);
          price = extractNumericValue(priceText);
          if (price && price > 50000) break; // Reasonable house price check
        }
      } catch (e) {
        console.log('🏠 XPath error:', e);
      }
    }
  }
  
  // Final validation and warning system for extracted tax amount
  if (annualTax) {
    if (!isValidTaxAmount(annualTax, true)) {
      console.log('🏠 ⚠️ Warning: Extracted tax amount seems unusual:', annualTax);
      console.log('🏠 ⚠️ Please verify this amount manually against the property tax history');
      
      // If the amount is extremely high, it might be a price instead of tax
      if (annualTax > 30000) {
        console.log('🏠 ❌ Tax amount too high, likely extracted wrong value. Setting to null.');
        annualTax = null;
      }
      // If it's very low, it might be monthly
      else if (annualTax < 600 && annualTax > 50) {
        console.log('🏠 🔄 Tax amount very low, converting from monthly:', annualTax, '→', annualTax * 12);
        annualTax = annualTax * 12;
      }
    } else {
      console.log('🏠 ✅ Tax amount passes validation:', annualTax);
    }
  } else {
    console.log('🏠 ❌ No property tax found. Will use estimated value in calculations.');
  }
  
  const result = { price, annualTax };
  console.log('🏠 Final extraction result:', result);
  
  // Add extraction metadata for debugging
  if (isZillow && annualTax) {
    result.extractionNote = 'Zillow tax extracted - please verify against tax history section';
  }
  
  return result;
}

// Enhanced numeric value extraction with better tax handling
function extractNumericValue(text) {
  if (!text) return null;
  
  // Remove all non-digit characters except commas and periods
  const cleanText = text.replace(/[^\d,.-]/g, '');
  
  // Handle cases like "1,250,000" or "1.25M"
  if (text.includes('M') || text.includes('million')) {
    const num = parseFloat(cleanText);
    return Math.round(num * 1000000);
  }
  
  if (text.includes('K') || text.includes('thousand')) {
    const num = parseFloat(cleanText);
    return Math.round(num * 1000);
  }
  
  // Regular number with commas
  const num = parseFloat(cleanText.replace(/,/g, ''));
  return isNaN(num) ? null : Math.round(num);
}

// Helper function to validate if a tax amount seems reasonable
function isValidTaxAmount(amount, isAnnual = true) {
  if (!amount || amount <= 0) return false;
  
  if (isAnnual) {
    // Annual tax should typically be between $500 and $50,000 for most properties
    return amount >= 500 && amount <= 50000;
  } else {
    // Monthly tax should typically be between $50 and $4,000
    return amount >= 50 && amount <= 4000;
  }
}

// Message listener for popup communication
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
  
  return true; // Keep message channel open for async response
});

// Initialize extraction when script loads
console.log('🏠 Content script ready on:', window.location.href);
