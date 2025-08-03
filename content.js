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
    
    // Zillow tax extraction
    const zillowTaxSelectors = [
      '[data-testid="property-tax-history"] .Text-c11n-8-84-3__sc-aiai24-0',
      '.property-tax .ds-text',
      '.tax-history .ds-text'
    ];
    
    for (const selector of zillowTaxSelectors) {
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
      const taxPattern = /(?:Annual|Property)\s+tax(?:es)?:?\s*\$?([\d,]+)/i;
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
  
  const result = { price, annualTax };
  console.log('🏠 Extraction result:', result);
  
  return result;
}

// Enhanced numeric value extraction
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
