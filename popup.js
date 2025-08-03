// ROI Calculation Strategies with dynamic parameters

let currentData = null;
let currentStrategy = 'conventional';

function getFormParameters() {
  const params = {
    rent: parseFloat(document.getElementById('rent').value) || 1800,
    improvements: parseFloat(document.getElementById('improvements').value) || 10000,
    renovationPeriod: parseFloat(document.getElementById('renovationPeriod').value) || 4,
    targetROI: 10, // Hardcoded to 10%
    targetPurchasePrice: parseFloat(document.getElementById('targetPurchasePrice').value) || 0, // Changed from null to 0
    interestRate: parseFloat(document.getElementById('interestRate').value) || 7.5,
    percentDown: parseFloat(document.getElementById('percentDown').value) || 20,
    loanTerm: parseFloat(document.getElementById('loanTerm').value) || 30,
    closingCosts: parseFloat(document.getElementById('closingCosts').value) || 5000,
    insurance: parseFloat(document.getElementById('insurance').value) || 120,
    otherMisc: parseFloat(document.getElementById('otherMisc').value) || 200
  };
  
  // HELOC specific parameters
  if (currentStrategy === 'heloc') {
    params.helocRate = parseFloat(document.getElementById('helocRate').value) || 9.25;
    params.helocAmount = parseFloat(document.getElementById('helocAmount').value) || 60000;
    params.helocTerm = parseFloat(document.getElementById('helocTerm').value) || 10;
    params.seasoningPeriod = parseFloat(document.getElementById('seasoningPeriod').value) || 2;
    params.refinanceRate = parseFloat(document.getElementById('refinanceRate').value) || 7.63;
    params.arv = parseFloat(document.getElementById('arv').value) || 220000;
  }
  
  return params;
}

function populateFormDefaults(strategy) {
  // Get current values for cross-tab sync
  const currentRent = parseFloat(document.getElementById('rent').value) || 0;
  const currentImprovements = parseFloat(document.getElementById('improvements').value) || 0;
  
  // Set strategy-specific defaults
  if (strategy === 'conventional') {
    // Only set defaults if fields are empty (first load)
    if (!currentRent) document.getElementById('rent').value = 1800;
    if (!currentImprovements) document.getElementById('improvements').value = 10000;
    document.getElementById('renovationPeriod').value = 4;
    document.getElementById('interestRate').value = 7.5;
    document.getElementById('percentDown').value = 20;
    document.getElementById('closingCosts').value = 5000;
    document.getElementById('insurance').value = 120;
    document.getElementById('otherMisc').value = 200;
  } else {
    // Preserve rent and improvements values when switching tabs
    if (!currentRent) document.getElementById('rent').value = 1700;
    if (!currentImprovements) document.getElementById('improvements').value = 10000;
    document.getElementById('renovationPeriod').value = 2;
    document.getElementById('closingCosts').value = 1000;
    document.getElementById('insurance').value = 75;
    document.getElementById('otherMisc').value = 200;
    
    // HELOC specific - set HELOC amount to match renovation budget
    document.getElementById('helocRate').value = 9.25;
    const improvementsValue = parseFloat(document.getElementById('improvements').value) || 10000;
    document.getElementById('helocAmount').value = improvementsValue;
    document.getElementById('helocTerm').value = 10;
    document.getElementById('seasoningPeriod').value = 2;
    document.getElementById('refinanceRate').value = 7.63;
    document.getElementById('arv').value = 220000;
  }
}

// Function to calculate target purchase price for desired ROI (Conventional)
function calculateTargetPurchasePriceConventional(askingPrice, annualTax, params) {
  const targetROI = params.targetROI / 100;
  
  console.log('🏠 Calculating target price for conventional, targetROI:', targetROI);
  
  // Binary search to find the purchase price that yields target ROI
  let low = askingPrice * 0.5; // Start at 50% of asking
  let high = askingPrice * 1.2; // Up to 120% of asking
  let bestPrice = askingPrice;
  
  for (let iterations = 0; iterations < 50; iterations++) {
    const testPrice = (low + high) / 2;
    // Create a copy of params with the test price as a manual override
    const testParams = { ...params, targetPurchasePrice: testPrice };
    const result = calculateConventionalROI(askingPrice, annualTax, testParams);
    
    if (Math.abs(result.roi / 100 - targetROI) < 0.001) {
      bestPrice = testPrice;
      break;
    }
    
    if (result.roi / 100 < targetROI) {
      high = testPrice; // Need lower purchase price
    } else {
      low = testPrice; // Can afford higher purchase price
    }
    
    bestPrice = testPrice;
  }
  
  console.log('🏠 Target price calculation result:', bestPrice);
  return bestPrice;
}

// Function to calculate target purchase price for desired ROI (HELOC)
function calculateTargetPurchasePriceHeloc(askingPrice, annualTax, params) {
  const targetROI = params.targetROI / 100;
  
  console.log('🏠 Calculating target price for HELOC, targetROI:', targetROI);
  
  // Binary search to find the purchase price that yields target ROI
  let low = askingPrice * 0.5; // Start at 50% of asking
  let high = askingPrice * 1.2; // Up to 120% of asking
  let bestPrice = askingPrice;
  
  for (let iterations = 0; iterations < 50; iterations++) {
    const testPrice = (low + high) / 2;
    // Create a copy of params with the test price as a manual override
    const testParams = { ...params, targetPurchasePrice: testPrice };
    const result = calculateHelocROI(askingPrice, annualTax, testParams);
    
    if (Math.abs(result.roi / 100 - targetROI) < 0.001) {
      bestPrice = testPrice;
      break;
    }
    
    if (result.roi / 100 < targetROI) {
      high = testPrice; // Need lower purchase price
    } else {
      low = testPrice; // Can afford higher purchase price
    }
    
    bestPrice = testPrice;
  }
  
  console.log('🏠 Target price calculation result:', bestPrice);
  return bestPrice;
}

function calculateConventionalROI(askingPrice, annualTax, params) {
  // Determine purchase price
  let purchasePrice;
  let isTargetPrice = false;
  
  if (params.targetPurchasePrice && params.targetPurchasePrice > 0) {
    // User manually entered a price - use it
    purchasePrice = params.targetPurchasePrice;
  } else {
    // Auto-calculate target price for 10% ROI
    purchasePrice = calculateTargetPurchasePriceConventional(askingPrice, annualTax, params);
    isTargetPrice = true;
  }
  
  const downPayment = purchasePrice * (params.percentDown / 100);
  const loanAmount = purchasePrice - downPayment;
  
  // Calculate mortgage payment (P&I only)
  const monthlyRate = (params.interestRate / 100) / 12;
  const numPayments = params.loanTerm * 12;
  const mortgagePayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                         (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  // Calculate holding costs during renovation
  const holdingCosts = mortgagePayment * params.renovationPeriod;
  
  // Total cash invested
  const totalCashIn = downPayment + params.closingCosts + params.improvements + holdingCosts;
  
  // Monthly breakdown
  const monthlyTax = annualTax / 12;
  const monthlyCashFlow = params.rent - mortgagePayment - monthlyTax - 
                         params.insurance - params.otherMisc;
  
  const annualCashFlow = monthlyCashFlow * 12;
  const roi = (annualCashFlow / totalCashIn) * 100;
  const paybackPeriod = totalCashIn / annualCashFlow;
  
  // Calculate discount from asking price
  const discountPercent = ((askingPrice - purchasePrice) / askingPrice) * 100;
  
  return {
    strategy: "Conventional Financing",
    askingPrice,
    purchasePrice,
    discountPercent,
    downPayment,
    loanAmount,
    mortgagePayment,
    totalCashIn,
    monthlyCashFlow,
    annualCashFlow,
    roi,
    paybackPeriod,
    holdingCosts,
    isTargetPrice,
    details: {
      rent: params.rent,
      taxes: monthlyTax,
      insurance: params.insurance,
      other: params.otherMisc
    }
  };
}

function calculateHelocROI(askingPrice, annualTax, params) {
  // Determine purchase price
  let purchasePrice;
  let isTargetPrice = false;
  
  if (params.targetPurchasePrice && params.targetPurchasePrice > 0) {
    // User manually entered a price - use it
    purchasePrice = params.targetPurchasePrice;
  } else {
    // Auto-calculate target price for 10% ROI
    purchasePrice = calculateTargetPurchasePriceHeloc(askingPrice, annualTax, params);
    isTargetPrice = true;
  }
  
  const totalHoldingPeriod = params.renovationPeriod + params.seasoningPeriod;
  
  // Initial cash investment (all cash purchase)
  const initialCashIn = purchasePrice + params.closingCosts + params.improvements;
  
  // HELOC holding costs during renovation + seasoning
  const helocMonthlyRate = (params.helocRate / 100) / 12;
  const helocPayments = params.helocTerm * 12;
  const helocMonthlyPayment = (params.helocAmount * helocMonthlyRate * Math.pow(1 + helocMonthlyRate, helocPayments)) / 
                            (Math.pow(1 + helocMonthlyRate, helocPayments) - 1);
  const holdingCosts = helocMonthlyPayment * totalHoldingPeriod;
  const totalCashIn = initialCashIn + holdingCosts;
  
  // Refinance calculations
  const refinanceLoanAmount = params.arv * 0.70; // 70% LTV typical for investment property
  const refinanceClosingCosts = 5000; // Fixed from original spreadsheet
  const cashOut = refinanceLoanAmount - refinanceClosingCosts;
  const finalCashIn = totalCashIn - cashOut;
  
  // Calculate refinance mortgage payment
  const monthlyRate = (params.refinanceRate / 100) / 12;
  const numPayments = 30 * 12; // 30-year refinance
  const mortgagePayment = (refinanceLoanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                         (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  // Monthly breakdown (with additional financing)
  const monthlyTax = annualTax / 12;
  const monthlyCashFlowWithHeloc = params.rent - mortgagePayment - monthlyTax - 
                                  params.insurance - params.otherMisc - helocMonthlyPayment;
  
  // Monthly breakdown (after HELOC paid off)
  const monthlyCashFlowAfterHeloc = params.rent - mortgagePayment - monthlyTax - 
                                   params.insurance - params.otherMisc;
  
  const annualCashFlow = monthlyCashFlowWithHeloc * 12;
  const roi = (annualCashFlow / finalCashIn) * 100;
  const paybackPeriod = finalCashIn / annualCashFlow;
  
  // Calculate discount from asking price
  const discountPercent = ((askingPrice - purchasePrice) / askingPrice) * 100;
  
  return {
    strategy: "Cash Offer + HELOC Refinance",
    askingPrice,
    purchasePrice,
    discountPercent,
    totalCashIn,
    cashOut,
    finalCashIn,
    arv: params.arv,
    mortgagePayment,
    helocPayment: helocMonthlyPayment,
    monthlyCashFlowWithHeloc,
    monthlyCashFlowAfterHeloc,
    annualCashFlow,
    roi,
    paybackPeriod,
    holdingCosts,
    isTargetPrice,
    details: {
      rent: params.rent,
      taxes: monthlyTax,
      insurance: params.insurance,
      other: params.otherMisc
    }
  };
}

function formatResults(calculation, isHeloc) {
  const roiColor = calculation.roi > 8 ? '#2e7d32' : calculation.roi > 5 ? '#f57c00' : '#d32f2f';
  
  let html = `
    <div class="results">
      <div class="roi-highlight" style="color: ${roiColor}">
        ${calculation.roi.toFixed(1)}% Annual ROI
      </div>
      <div class="details">
        <strong>Purchase:</strong> $${calculation.purchasePrice.toLocaleString()}`;
        
  // Show discount info if we have asking price and purchase price differs
  if (calculation.askingPrice && calculation.discountPercent !== undefined) {
    const discountColor = calculation.discountPercent > 0 ? '#2e7d32' : '#d32f2f';
    if (calculation.isTargetPrice) {
      html += ` <span style="color: ${discountColor}">(${calculation.discountPercent.toFixed(1)}% discount for 10% ROI)</span>`;
    } else {
      html += ` <span style="color: ${discountColor}">(${calculation.discountPercent.toFixed(1)}% vs asking $${calculation.askingPrice.toLocaleString()})</span>`;
    }
  }
  
  html += `<br><strong>Total Cash In:</strong> $${calculation.totalCashIn.toLocaleString()}`;
  
  if (isHeloc) {
    html += `<br><strong>Cash Out (Refinance):</strong> $${calculation.cashOut.toLocaleString()}
             <br><strong>Final Cash In:</strong> $${calculation.finalCashIn.toLocaleString()}
             <br><strong>ARV:</strong> $${calculation.arv.toLocaleString()}`;
  }
  
  html += `<br><strong>Holding Costs:</strong> $${calculation.holdingCosts.toLocaleString()}
           <br><strong>Payback Period:</strong> ${calculation.paybackPeriod.toFixed(1)} years</div>
    </div>
    
    <div class="details">
      <strong>Monthly Cash Flow:</strong><br>
      - Rent: $${calculation.details.rent}<br>
      - Mortgage: -$${Math.round(calculation.mortgagePayment)}<br>
      - Taxes: -$${Math.round(calculation.details.taxes)}<br>
      - Insurance: -$${calculation.details.insurance}<br>
      - Other: -$${calculation.details.other}
  `;
  
  if (isHeloc) {
    html += `<br>- HELOC: -$${Math.round(calculation.helocPayment)}
             <br><strong>Net:</strong> $${Math.round(calculation.monthlyCashFlowWithHeloc)} (with HELOC)
             <br><strong>Net:</strong> $${Math.round(calculation.monthlyCashFlowAfterHeloc)} (after HELOC paid off)`;
  } else {
    html += `<br><strong>Net:</strong> $${Math.round(calculation.monthlyCashFlow)}`;
  }
  
  html += `</div>`;
  return html;
}

document.addEventListener("DOMContentLoaded", () => {
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentStrategy = tab.dataset.strategy;
      
      // Show/hide HELOC specific fields
      const helocAdvanced = document.getElementById('heloc-advanced');
      if (currentStrategy === 'heloc') {
        helocAdvanced.classList.remove('hidden');
      } else {
        helocAdvanced.classList.add('hidden');
      }
      
      // Update form defaults for new strategy
      populateFormDefaults(currentStrategy);
      
      if (currentData) {
        updateResults();
      }
    });
  });
  
  // Advanced toggle
  document.getElementById('toggle-advanced').addEventListener('click', () => {
    const advancedSection = document.getElementById('advanced-section');
    const toggleButton = document.getElementById('toggle-advanced');
    
    if (advancedSection.classList.contains('hidden')) {
      advancedSection.classList.remove('hidden');
      toggleButton.textContent = 'Hide Advanced Parameters';
    } else {
      advancedSection.classList.add('hidden');
      toggleButton.textContent = 'Show Advanced Parameters';
    }
  });
  
  // Target purchase price handling
  document.getElementById('targetPurchasePrice').addEventListener('input', function() {
    if (currentData) {
      updateResults();
    }
  });
  
  // Clear placeholder styling when user starts typing
  document.getElementById('targetPurchasePrice').addEventListener('focus', function() {
    this.style.background = '#ffffff';
  });
  
  document.getElementById('targetPurchasePrice').addEventListener('blur', function() {
    if (!this.value) {
      this.style.background = '#f9f9f9';
      this.placeholder = 'Auto-calculated';
    }
  });
  
  // Calculate button
  document.getElementById('calculate-btn').addEventListener('click', () => {
    updateResults();
  });
  
  // Auto-calculate on key input changes with cross-tab sync
  ['rent', 'improvements', 'renovationPeriod'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      // Special handling for improvements - update HELOC amount automatically
      if (id === 'improvements') {
        const improvementsValue = parseFloat(document.getElementById('improvements').value) || 0;
        const helocAmountField = document.getElementById('helocAmount');
        if (improvementsValue > 0 && helocAmountField) {
          helocAmountField.value = improvementsValue;
        }
      }
      
      // Clear target purchase price so it recalculates for 10% ROI
      const targetPriceField = document.getElementById('targetPurchasePrice');
      targetPriceField.value = '';
      targetPriceField.style.background = '#f9f9f9';
      targetPriceField.placeholder = 'Auto-calculated';
      
      if (currentData) {
        updateResults();
      }
    });
  });
  
  // Add specific listener for HELOC amount field to maintain sync
  document.getElementById('helocAmount').addEventListener('focus', () => {
    // When user focuses on HELOC amount, suggest it matches improvements
    const improvementsValue = parseFloat(document.getElementById('improvements').value) || 0;
    const helocAmountField = document.getElementById('helocAmount');
    if (improvementsValue > 0 && (!helocAmountField.value || helocAmountField.value == 10000)) {
      helocAmountField.value = improvementsValue;
    }
  });
  
  // Main data extraction
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const output = document.getElementById("output");
    
    // Check if we're on a supported site
    if (!currentTab.url.includes('redfin.com') && !currentTab.url.includes('zillow.com')) {
      output.innerHTML = '<div class="error">Please navigate to a Redfin or Zillow property page.</div>';
      return;
    }

    // Show better loading message
    output.innerHTML = '<div class="loading">Extracting property data...</div>';
    
    // Try to send message to existing content script with timeout
    const tryExtractData = (attempt = 1, maxAttempts = 3) => {
      console.log(`🏠 Popup: Attempt ${attempt} to extract data...`);
      
      chrome.tabs.sendMessage(currentTab.id, { type: "getListingData" }, (data) => {
        if (chrome.runtime.lastError) {
          console.log(`🏠 Popup: Attempt ${attempt} - Content script not found`, chrome.runtime.lastError);
          
          if (attempt === 1) {
            // First attempt failed, inject content script
            output.innerHTML = '<div class="loading">Loading extension script...</div>';
            
            chrome.scripting.executeScript({
              target: { tabId: currentTab.id },
              files: ['content.js']
            }, () => {
              if (chrome.runtime.lastError) {
                const errorMsg = chrome.runtime.lastError.message || 'Unknown error';
                output.innerHTML = `<div class="error">Error: Could not inject script (${errorMsg}). <br><br><strong>Try these steps:</strong><br>1. Reload this property page<br>2. Open the extension again<br>3. Make sure you're on a Redfin or Zillow listing page</div>`;
                console.error('🏠 Popup: Script injection error:', chrome.runtime.lastError);
                return;
              }
              
              // Wait longer for script to initialize and try again
              output.innerHTML = '<div class="loading">Script loaded, extracting data...</div>';
              setTimeout(() => {
                tryExtractData(2, maxAttempts);
              }, 1500);
            });
          } else if (attempt < maxAttempts) {
            // Retry with longer timeout
            output.innerHTML = '<div class="loading">Retrying data extraction... (attempt ' + attempt + ')</div>';
            setTimeout(() => {
              tryExtractData(attempt + 1, maxAttempts);
            }, 2000);
          } else {
            // All attempts failed - provide detailed troubleshooting
            output.innerHTML = `<div class="error">
              <strong>Could not extract property data</strong><br><br>
              <strong>Troubleshooting steps:</strong><br>
              1. Make sure you're on a property listing page (not search results)<br>
              2. Reload the property page and try again<br>
              3. Check if the page has fully loaded (no loading spinners)<br>
              4. Try opening the extension on a different property<br><br>
              <small>Current URL: ${currentTab.url}</small><br>
              <small>If the issue persists, this property page may use a different layout.</small>
            </div>`;
            console.error('🏠 Popup: All extraction attempts failed');
          }
        } else if (data && data.error) {
          // Content script returned an error
          output.innerHTML = `<div class="error">Extraction error: ${data.error}<br><small>Try reloading the page and opening the extension again.</small></div>`;
          console.error('🏠 Popup: Content script error:', data.error);
        } else {
          // Success!
          console.log(`🏠 Popup: Attempt ${attempt} - Data extraction successful`, data);
          handleDataReceived(data);
        }
      });
    };
    
    // Start the extraction process
    tryExtractData();
  });
});

function handleDataReceived(data) {
  console.log('🏠 Popup: Received data:', data);
  currentData = data;
  
  // Check for extraction errors
  if (data && data.error) {
    document.getElementById("output").innerHTML = `<div class="error">Extraction error: ${data.error}</div>`;
    return;
  }
  
  // Validate extracted data
  if (!data || (!data.price && !data.annualTax)) {
    document.getElementById("output").innerHTML = `
      <div class="error">
        <strong>No property data found</strong><br><br>
        This could happen if:<br>
        • The page layout has changed<br>
        • The page hasn't fully loaded<br>
        • You're not on a property details page<br><br>
        <strong>Try:</strong><br>
        1. Reload the page and wait for it to fully load<br>
        2. Make sure you're on a specific property page (not search results)<br>
        3. Try a different property listing
      </div>`;
    return;
  }
  
  if (!data.price) {
    document.getElementById("output").innerHTML = `
      <div class="error">
        <strong>Property price not found</strong><br><br>
        The extension couldn't find the listing price on this page.<br>
        This might be a sold property or the page layout is different.<br><br>
        <small>Found tax data: ${data.annualTax ? '$' + data.annualTax.toLocaleString() : 'None'}</small>
      </div>`;
    return;
  }
  
  if (!data.annualTax) {
    // Show warning but allow calculation with estimated tax
    const estimatedTax = Math.round(data.price * 0.015); // 1.5% estimate
    currentData.annualTax = estimatedTax;
    
    document.getElementById("property-info").style.display = "block";
    document.getElementById("property-info").innerHTML = `
      <strong>Property:</strong> $${data.price.toLocaleString()} asking price<br>
      <strong>Annual Taxes:</strong> <span style="color: #f57c00;">~$${estimatedTax.toLocaleString()} (estimated - tax data not found)</span>
    `;
    
    document.getElementById("input-form").style.display = "block";
    populateFormDefaults(currentStrategy);
    updateResults();
    return;
  }
  
  // Show property info and form
  document.getElementById("property-info").style.display = "block";
  document.getElementById("property-info").innerHTML = `
    <strong>Property:</strong> $${data.price.toLocaleString()} asking price<br>
    <strong>Annual Taxes:</strong> $${data.annualTax.toLocaleString()}
  `;
  
  document.getElementById("input-form").style.display = "block";
  
  // Set initial form defaults
  populateFormDefaults(currentStrategy);
  
  // Calculate initial results
  updateResults();
}

function updateResults() {
  if (!currentData) return;
  
  const output = document.getElementById("output");
  const params = getFormParameters();
  
  console.log('🏠 Popup: updateResults called with params:', params);
  
  let calculation;
  if (currentStrategy === 'conventional') {
    calculation = calculateConventionalROI(currentData.price, currentData.annualTax, params);
    output.innerHTML = formatResults(calculation, false);
  } else {
    calculation = calculateHelocROI(currentData.price, currentData.annualTax, params);
    output.innerHTML = formatResults(calculation, true);
  }
  
  console.log('🏠 Popup: calculation result:', calculation);
  
  // Update the target purchase price field if it's auto-calculated
  if (calculation.isTargetPrice) {
    const targetPriceField = document.getElementById('targetPurchasePrice');
    const newValue = Math.round(calculation.purchasePrice);
    console.log('🏠 Popup: Updating target price field to:', newValue);
    targetPriceField.value = newValue;
  }
}
