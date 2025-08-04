// Real Estate ROI Calculator - Popup Script
console.log('🏠 Real Estate ROI Extension: Popup script loaded');

// =====================================================
// CONFIGURATION & CONSTANTS
// =====================================================

const CONFIG = {
  strategies: {
    conventional: 'conventional',
    heloc: 'heloc'
  },
  defaults: {
    conventional: {
      rent: 1800,
      improvements: 10000,
      renovationPeriod: 4,
      interestRate: 7.5,
      percentDown: 20,
      loanTerm: 30,
      closingCosts: 5000,
      insurance: 120,
      otherMisc: 200
    },
    heloc: {
      rent: 1700,
      improvements: 10000,
      renovationPeriod: 4,
      closingCosts: 1000,
      insurance: 75,
      otherMisc: 200,
      helocRate: 9.25,
      helocTerm: 10,
      refinanceRate: 7.63,
      defaultARV: 220000
    }
  },
  thresholds: {
    targetROI: 10, // Hardcoded to 10%
    goodROI: 8,
    okROI: 5,
    seasoningMonths: 6,
    refinanceLTV: 0.70,
    refinanceClosingCosts: 5000,
    estimatedTaxRate: 0.015,
    binarySearchIterations: 50,
    convergenceThreshold: 0.001,
    rangeConvergenceThreshold: 1000
  },
  colors: {
    good: '#2e7d32',
    warning: '#f57c00',
    danger: '#d32f2f'
  },
  searchRanges: {
    conventional: { lowMultiplier: 0.5, highMultiplier: 1.2 },
    heloc: { lowMultiplier: 0.3, highMultiplier: 1.0 }
  }
};

const FIELD_IDS = {
  rent: 'rent',
  improvements: 'improvements',
  renovationPeriod: 'renovationPeriod',
  interestRate: 'interestRate',
  percentDown: 'percentDown',
  loanTerm: 'loanTerm',
  closingCosts: 'closingCosts',
  insurance: 'insurance',
  otherMisc: 'otherMisc',
  helocRate: 'helocRate',
  helocAmount: 'helocAmount',
  helocTerm: 'helocTerm',
  seasoningPeriod: 'seasoningPeriod',
  refinanceRate: 'refinanceRate',
  arv: 'arv',
  targetPurchasePriceConventional: 'targetPurchasePriceConventional',
  targetPurchasePriceHeloc: 'targetPurchasePriceHeloc'
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

class Utils {
  static getElement(id) {
    return document.getElementById(id);
  }

  static getFloatValue(id, defaultValue = 0) {
    const element = this.getElement(id);
    return parseFloat(element?.value) || defaultValue;
  }

  static setElementValue(id, value) {
    const element = this.getElement(id);
    if (element) element.value = value;
  }

  static formatCurrency(amount) {
    return Math.round(amount).toLocaleString();
  }

  static getROIColor(roi) {
    if (roi > CONFIG.thresholds.goodROI) return CONFIG.colors.good;
    if (roi > CONFIG.thresholds.okROI) return CONFIG.colors.warning;
    return CONFIG.colors.danger;
  }

  static isUserEntered(element) {
    return element?.getAttribute('data-user-entered') === 'true';
  }

  static markAsUserEntered(element) {
    if (element) {
      element.setAttribute('data-user-entered', 'true');
      element.style.background = '#ffffff';
    }
  }

  static markAsAutoCalculated(element) {
    if (element) {
      element.removeAttribute('data-user-entered');
      element.style.background = '#f9f9f9';
      element.placeholder = 'Auto-calculated';
    }
  }

  static logCalculation(context, data) {
    console.log(`🏠 ${context}:`, data);
  }
}

// =====================================================
// MORTGAGE CALCULATIONS
// =====================================================

class MortgageCalculator {
  static calculateMonthlyPayment(principal, annualRate, termYears) {
    const monthlyRate = (annualRate / 100) / 12;
    const numPayments = termYears * 12;
    
    if (monthlyRate === 0) return principal / numPayments;
    
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
           (Math.pow(1 + monthlyRate, numPayments) - 1);
  }
  
  static calculateHoldingCosts(monthlyPayment, months) {
    return monthlyPayment * months;
  }
}

// =====================================================
// FORM PARAMETER MANAGER
// =====================================================

class FormParameters {
  constructor(strategy) {
    this.strategy = strategy;
  }

  getAll() {
    const targetPriceFieldId = this.strategy === CONFIG.strategies.conventional 
      ? FIELD_IDS.targetPurchasePriceConventional 
      : FIELD_IDS.targetPurchasePriceHeloc;
    
    const targetPriceValue = Utils.getFloatValue(targetPriceFieldId);
    
    Utils.logCalculation('Getting form parameters', {
      strategy: this.strategy,
      targetPriceField: targetPriceFieldId,
      targetPriceValue
    });
    
    const baseParams = {
      rent: Utils.getFloatValue(FIELD_IDS.rent, CONFIG.defaults[this.strategy].rent),
      improvements: Utils.getFloatValue(FIELD_IDS.improvements, CONFIG.defaults[this.strategy].improvements),
      renovationPeriod: Utils.getFloatValue(FIELD_IDS.renovationPeriod, CONFIG.defaults[this.strategy].renovationPeriod),
      targetROI: CONFIG.thresholds.targetROI,
      targetPurchasePrice: targetPriceValue,
      interestRate: Utils.getFloatValue(FIELD_IDS.interestRate, CONFIG.defaults[this.strategy].interestRate || 7.5),
      percentDown: Utils.getFloatValue(FIELD_IDS.percentDown, CONFIG.defaults.conventional.percentDown),
      loanTerm: Utils.getFloatValue(FIELD_IDS.loanTerm, CONFIG.defaults.conventional.loanTerm),
      closingCosts: Utils.getFloatValue(FIELD_IDS.closingCosts, CONFIG.defaults[this.strategy].closingCosts),
      insurance: Utils.getFloatValue(FIELD_IDS.insurance, CONFIG.defaults[this.strategy].insurance),
      otherMisc: Utils.getFloatValue(FIELD_IDS.otherMisc, CONFIG.defaults[this.strategy].otherMisc)
    };

    // Add HELOC-specific parameters
    if (this.strategy === CONFIG.strategies.heloc) {
      Object.assign(baseParams, {
        helocRate: Utils.getFloatValue(FIELD_IDS.helocRate, CONFIG.defaults.heloc.helocRate),
        helocAmount: Utils.getFloatValue(FIELD_IDS.helocAmount, baseParams.improvements),
        helocTerm: Utils.getFloatValue(FIELD_IDS.helocTerm, CONFIG.defaults.heloc.helocTerm),
        seasoningPeriod: Utils.getFloatValue(FIELD_IDS.seasoningPeriod, baseParams.renovationPeriod),
        refinanceRate: Utils.getFloatValue(FIELD_IDS.refinanceRate, CONFIG.defaults.heloc.refinanceRate),
        arv: Utils.getFloatValue(FIELD_IDS.arv, CONFIG.defaults.heloc.defaultARV)
      });
    }

    return baseParams;
  }
}

// =====================================================
// FORM DEFAULTS MANAGER
// =====================================================

class FormDefaults {
  static populate(strategy) {
    Utils.logCalculation('Populating form defaults', { strategy });
    
    // Get current values for cross-tab sync
    const currentRent = Utils.getFloatValue(FIELD_IDS.rent);
    const currentImprovements = Utils.getFloatValue(FIELD_IDS.improvements);
    const currentRenovationPeriod = Utils.getFloatValue(FIELD_IDS.renovationPeriod);
    
    const defaults = CONFIG.defaults[strategy];
    
    // Set common defaults (preserve values when switching tabs)
    if (!currentRent) Utils.setElementValue(FIELD_IDS.rent, defaults.rent);
    if (!currentImprovements) Utils.setElementValue(FIELD_IDS.improvements, defaults.improvements);
    if (!currentRenovationPeriod) Utils.setElementValue(FIELD_IDS.renovationPeriod, defaults.renovationPeriod);
    
    // Set strategy-specific defaults
    Object.entries(defaults).forEach(([key, value]) => {
      if (['rent', 'improvements', 'renovationPeriod'].includes(key)) return;
      
      if (FIELD_IDS[key]) {
        // Use extracted insurance value if available
        if (key === 'insurance' && appState.currentData && appState.currentData.annualInsurance) {
          const monthlyInsurance = Math.round(appState.currentData.annualInsurance / 12);
          Utils.setElementValue(FIELD_IDS[key], monthlyInsurance);
          Utils.logCalculation('Using extracted insurance', { 
            annual: appState.currentData.annualInsurance, 
            monthly: monthlyInsurance 
          });
        } else {
          Utils.setElementValue(FIELD_IDS[key], value);
        }
      }
    });
    
    // HELOC-specific setup
    if (strategy === CONFIG.strategies.heloc) {
      this.setupHelocDefaults();
    }
  }
  
  static setupHelocDefaults() {
    // Sync HELOC amount with improvements
    const improvements = Utils.getFloatValue(FIELD_IDS.improvements);
    if (improvements > 0) {
      Utils.setElementValue(FIELD_IDS.helocAmount, improvements);
    }
    
    // Sync seasoning period with renovation period
    const renovationPeriod = Utils.getFloatValue(FIELD_IDS.renovationPeriod);
    if (renovationPeriod > 0) {
      Utils.setElementValue(FIELD_IDS.seasoningPeriod, renovationPeriod);
    }
  }
}

// =====================================================
// ARV CALCULATOR
// =====================================================

class ARVCalculator {
  constructor(currentStrategy, currentData) {
    this.currentStrategy = currentStrategy;
    this.currentData = currentData;
  }

  update(overridePurchasePrice = null, forceUpdate = false) {
    if (this.currentStrategy !== CONFIG.strategies.heloc) {
      Utils.logCalculation('ARV calculation skipped', { reason: 'not HELOC strategy' });
      return;
    }
    
    const arvField = Utils.getElement(FIELD_IDS.arv);
    if (!arvField) {
      Utils.logCalculation('ARV calculation failed', { reason: 'ARV field not found' });
      return;
    }
    
    const purchasePrice = this.getPurchasePrice(overridePurchasePrice);
    if (!purchasePrice || purchasePrice <= 0) {
      Utils.logCalculation('ARV calculation failed', { reason: 'no valid purchase price' });
      return;
    }
    
    const calculatedARV = purchasePrice / CONFIG.thresholds.refinanceLTV;
    
    Utils.logCalculation('ARV Calculation', {
      purchasePrice: Utils.formatCurrency(purchasePrice),
      formula: `Purchase Price / ${CONFIG.thresholds.refinanceLTV}`,
      calculatedARV: Utils.formatCurrency(calculatedARV)
    });
    
    if (this.shouldUpdateARV(arvField, calculatedARV, overridePurchasePrice, forceUpdate)) {
      arvField.value = Math.round(calculatedARV);
      Utils.logCalculation('ARV Updated', { newValue: Utils.formatCurrency(calculatedARV) });
    }
  }
  
  getPurchasePrice(overridePurchasePrice) {
    if (overridePurchasePrice && overridePurchasePrice > 0) {
      Utils.logCalculation('Using override purchase price for ARV', overridePurchasePrice);
      return overridePurchasePrice;
    }
    
    const targetPurchasePrice = Utils.getFloatValue(FIELD_IDS.targetPurchasePriceHeloc);
    if (targetPurchasePrice > 0) {
      Utils.logCalculation('Using HELOC target purchase price for ARV', targetPurchasePrice);
      return targetPurchasePrice;
    }
    
    if (this.currentData?.price) {
      Utils.logCalculation('Using asking price for ARV', this.currentData.price);
      return this.currentData.price;
    }
    
    return 0;
  }
  
  shouldUpdateARV(arvField, calculatedARV, overridePurchasePrice, forceUpdate) {
    const currentARV = Utils.getFloatValue(FIELD_IDS.arv);
    const isUserModified = Utils.isUserEntered(arvField);
    
    Utils.logCalculation('ARV Update Check', {
      current: currentARV,
      calculated: Math.round(calculatedARV),
      userModified: isUserModified,
      override: !!overridePurchasePrice,
      force: forceUpdate
    });
    
    return !isUserModified && (
      currentARV === 0 || 
      currentARV === CONFIG.defaults.heloc.defaultARV || 
      overridePurchasePrice || 
      forceUpdate
    );
  }
}

// =====================================================
// TARGET PRICE CALCULATORS
// =====================================================

class TargetPriceCalculator {
  static calculateConventional(askingPrice, annualTax, params) {
    const targetROI = params.targetROI / 100;
    Utils.logCalculation('Calculating conventional target price', { targetROI: targetROI * 100 });
    
    return this.binarySearch(askingPrice, annualTax, params, targetROI, CONFIG.strategies.conventional);
  }
  
  static calculateHeloc(askingPrice, annualTax, params) {
    const targetROI = params.targetROI / 100;
    Utils.logCalculation('Calculating HELOC target price', { 
      targetROI: targetROI * 100,
      initialParams: { 
        improvements: params.improvements, 
        helocAmount: params.helocAmount, 
        arv: params.arv 
      }
    });
    
    return this.binarySearch(askingPrice, annualTax, params, targetROI, CONFIG.strategies.heloc);
  }
  
  static binarySearch(askingPrice, annualTax, params, targetROI, strategy) {
    const range = CONFIG.searchRanges[strategy];
    let low = askingPrice * range.lowMultiplier;
    let high = askingPrice * range.highMultiplier;
    let bestPrice = askingPrice;
    let bestROI = 0;
    
    Utils.logCalculation(`${strategy.toUpperCase()} binary search`, {
      range: `${Utils.formatCurrency(low)} - ${Utils.formatCurrency(high)}`
    });
    
    for (let iterations = 0; iterations < CONFIG.thresholds.binarySearchIterations; iterations++) {
      const testPrice = (low + high) / 2;
      const testParams = { ...params, targetPurchasePrice: testPrice };
      
      if (strategy === CONFIG.strategies.heloc) {
        testParams.arv = testPrice / CONFIG.thresholds.refinanceLTV;
      }
      
      const calculator = strategy === CONFIG.strategies.conventional 
        ? ConventionalROICalculator 
        : HelocROICalculator;
      const result = calculator.calculate(askingPrice, annualTax, testParams);
      
      // Track best result
      if (Math.abs(result.roi / 100 - targetROI) < Math.abs(bestROI / 100 - targetROI)) {
        bestPrice = testPrice;
        bestROI = result.roi;
      }
      
      // Check convergence
      if (Math.abs(result.roi / 100 - targetROI) < CONFIG.thresholds.convergenceThreshold) {
        bestPrice = testPrice;
        Utils.logCalculation(`${strategy.toUpperCase()} target price converged`, {
          price: Utils.formatCurrency(bestPrice),
          iterations
        });
        break;
      }
      
      // Adjust search range
      if (result.roi / 100 < targetROI) {
        high = testPrice; // Need lower purchase price
      } else {
        low = testPrice; // Can afford higher purchase price
      }
      
      // Check range convergence
      if ((high - low) < CONFIG.thresholds.rangeConvergenceThreshold) {
        Utils.logCalculation(`${strategy.toUpperCase()} search range converged`, { iterations });
        break;
      }
    }
    
    Utils.logCalculation(`${strategy.toUpperCase()} target price result`, {
      price: Utils.formatCurrency(bestPrice),
      roi: `${bestROI.toFixed(2)}%`
    });
    return bestPrice;
  }
}

// =====================================================
// ROI CALCULATION ENGINES
// =====================================================

class ConventionalROICalculator {
  static calculate(askingPrice, annualTax, params) {
    // Determine purchase price
    let purchasePrice;
    let isTargetPrice = false;
    
    if (params.targetPurchasePrice && params.targetPurchasePrice > 0) {
      purchasePrice = params.targetPurchasePrice;
    } else {
      purchasePrice = TargetPriceCalculator.calculateConventional(askingPrice, annualTax, params);
      isTargetPrice = true;
    }
    
    const downPayment = purchasePrice * (params.percentDown / 100);
    const loanAmount = purchasePrice - downPayment;
    
    // Calculate mortgage payment (P&I only)
    const mortgagePayment = MortgageCalculator.calculateMonthlyPayment(
      loanAmount, 
      params.interestRate, 
      params.loanTerm
    );
    
    // Calculate holding costs during renovation
    const holdingCosts = MortgageCalculator.calculateHoldingCosts(mortgagePayment, params.renovationPeriod);
    
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
}

class HelocROICalculator {
  static calculate(askingPrice, annualTax, params) {
    // Determine purchase price
    let purchasePrice;
    
    if (params.targetPurchasePrice && params.targetPurchasePrice > 0) {
      purchasePrice = params.targetPurchasePrice;
    } else {
      purchasePrice = askingPrice;
    }
    
    // Total holding period: renovation + 1 month for refinancing (seasoning overlaps with renovation)
    const totalHoldingPeriod = params.renovationPeriod + 1;
    
    // Initial cash investment (all cash purchase)
    const initialCashIn = purchasePrice + params.closingCosts + params.improvements;
    
    // HELOC holding costs during renovation + seasoning + refinancing (1 extra month)
    const helocMonthlyPayment = MortgageCalculator.calculateMonthlyPayment(
      params.helocAmount,
      params.helocRate,
      params.helocTerm
    );
    const holdingCosts = MortgageCalculator.calculateHoldingCosts(helocMonthlyPayment, totalHoldingPeriod);
    const totalCashIn = initialCashIn + holdingCosts;
    
    // Refinance calculations - with time-based constraint
    const maxRefinanceByTime = params.renovationPeriod < CONFIG.thresholds.seasoningMonths 
      ? purchasePrice 
      : Infinity;
    const maxRefinanceByARV = params.arv * CONFIG.thresholds.refinanceLTV;
    const refinanceLoanAmount = Math.min(maxRefinanceByTime, maxRefinanceByARV);
    
    Utils.logCalculation('Refinance calculation', {
      renovationPeriod: `${params.renovationPeriod} months`,
      purchasePriceLimit: params.renovationPeriod < CONFIG.thresholds.seasoningMonths 
        ? `$${Utils.formatCurrency(purchasePrice)}` 
        : 'No limit',
      arvLimit: `$${Utils.formatCurrency(maxRefinanceByARV)}`,
      finalAmount: `$${Utils.formatCurrency(refinanceLoanAmount)}`
    });
    
    const cashOut = refinanceLoanAmount - CONFIG.thresholds.refinanceClosingCosts;
    const finalCashIn = totalCashIn - cashOut;
    
    // Calculate refinance mortgage payment
    const mortgagePayment = MortgageCalculator.calculateMonthlyPayment(
      refinanceLoanAmount,
      params.refinanceRate,
      30 // 30-year refinance
    );
    
    // Monthly breakdown (after refinance - HELOC is paid off)
    const monthlyTax = annualTax / 12;
    const monthlyCashFlowWithHeloc = params.rent - mortgagePayment - monthlyTax - 
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
      refinanceLoanAmount,
      mortgagePayment,
      helocPayment: helocMonthlyPayment,
      monthlyCashFlowWithHeloc,
      annualCashFlow,
      roi,
      paybackPeriod,
      holdingCosts,
      renovationPeriod: params.renovationPeriod,
      details: {
        rent: params.rent,
        taxes: monthlyTax,
        insurance: params.insurance,
        other: params.otherMisc
      }
    };
  }
}

// =====================================================
// RESULTS FORMATTING ENGINE
// =====================================================

class ResultsFormatter {
  static format(calculation, isHeloc) {
    const roiColor = Utils.getROIColor(calculation.roi);
    
    return `
      <div class="results">
        <div class="roi-highlight" style="color: ${roiColor}">
          ${calculation.roi.toFixed(1)}% Annual ROI
        </div>
        
        <!-- Side-by-side layout for summary and details -->
        <div style="display: flex; gap: 20px; margin-top: 15px;">
          
          <!-- Left side: Summary -->
          <div style="flex: 1; min-width: 250px;">
            ${this.formatSummary(calculation, isHeloc)}
            ${this.formatCashFlow(calculation, isHeloc)}
          </div>
          
          <!-- Right side: Detailed Calculations -->
          <div style="flex: 1; min-width: 250px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; padding: 10px; font-size: 11px;">
            <strong>Step-by-Step Calculations:</strong><br><br>
            ${isHeloc ? this.formatHelocDetails(calculation) : this.formatConventionalDetails(calculation)}
          </div>
        </div>
      </div>`;
  }
  
  static formatSummary(calculation, isHeloc) {
    let html = `
      <div class="details">
        <strong>Purchase:</strong> $${Utils.formatCurrency(calculation.purchasePrice)}`;
        
    // Show discount info if we have asking price and purchase price differs
    if (calculation.askingPrice && calculation.discountPercent !== undefined) {
      const discountColor = calculation.discountPercent > 0 ? CONFIG.colors.good : CONFIG.colors.danger;
      if (calculation.isTargetPrice) {
        html += ` <span style="color: ${discountColor}">(${calculation.discountPercent.toFixed(1)}% discount for 10% ROI)</span>`;
      } else {
        html += ` <span style="color: ${discountColor}">(${calculation.discountPercent.toFixed(1)}% vs asking $${Utils.formatCurrency(calculation.askingPrice)})</span>`;
      }
    }
    
    html += `<br><strong>Total Cash In:</strong> $${Utils.formatCurrency(calculation.totalCashIn)}`;
    
    if (isHeloc) {
      html += `<br><strong>Cash Out (Refinance):</strong> $${Utils.formatCurrency(calculation.cashOut)}
               <br><strong>Final Cash In:</strong> $${Utils.formatCurrency(calculation.finalCashIn)}
               <br><strong>ARV:</strong> $${Utils.formatCurrency(calculation.arv)}`;
    }
    
    html += `<br><strong>Holding Costs:</strong> $${Utils.formatCurrency(calculation.holdingCosts)}
             <br><strong>Payback Period:</strong> ${calculation.paybackPeriod.toFixed(1)} years
            </div>`;
            
    return html;
  }
  
  static formatCashFlow(calculation, isHeloc) {
    const cashFlowField = isHeloc ? 'monthlyCashFlowWithHeloc' : 'monthlyCashFlow';
    const cashFlow = calculation[cashFlowField];
    const cashFlowColor = cashFlow >= 0 ? CONFIG.colors.good : CONFIG.colors.danger;
    
    let html = `
      <div class="details" style="margin-top: 15px;">
        <strong>Monthly Cash Flow:</strong><br>
        
        <div class="cash-flow-income">
          <div style="font-weight: bold;">+ Income:</div>
          <div style="margin-left: 15px;">
            + Rent: $${calculation.details.rent}
          </div>
        </div>
        
        <div class="cash-flow-expenses">
          <div style="font-weight: bold;">- Expenses:</div>
          <div style="margin-left: 15px;">
            - Mortgage: $${Math.round(calculation.mortgagePayment)}<br>
            - Taxes: $${Math.round(calculation.details.taxes)}<br>
            - Insurance: $${calculation.details.insurance}<br>
            - Other: $${calculation.details.other}
          </div>
        </div>
        
        <div class="cash-flow-net ${cashFlow >= 0 ? 'cash-flow-positive' : 'cash-flow-negative'}">
          <div style="font-weight: bold;">= Net Cash Flow${isHeloc ? ' (post-refinance)' : ''}:</div>
          <div style="font-size: 16px; font-weight: bold; color: ${cashFlowColor};">
            $${Math.round(cashFlow)} per month
          </div>`;
          
    if (isHeloc) {
      html += `
          <div style="font-size: 10px; color: #666; margin-top: 2px;">
            (HELOC paid off at refinance)
          </div>`;
    }
    
    html += `
        </div>
      </div>`;
      
    return html;
  }
  
  static formatHelocDetails(calculation) {
    const totalHoldingPeriod = (calculation.holdingCosts / calculation.helocPayment);
    const renovationPeriod = Math.round(totalHoldingPeriod - 1);
    const hasTimeConstraint = renovationPeriod < CONFIG.thresholds.seasoningMonths;
    
    return `
      <strong>INITIAL INVESTMENT:</strong><br>
      - Purchase Price: $${Utils.formatCurrency(calculation.purchasePrice)}<br>
      - Closing Costs: $1,000<br>
      - Improvements: $${Utils.formatCurrency(calculation.totalCashIn - calculation.purchasePrice - 1000 - calculation.holdingCosts)}<br>
      - HELOC Payments (holding period only - ${Math.round(totalHoldingPeriod)} months): $${Utils.formatCurrency(calculation.holdingCosts)}<br>
      <small style="color: #666;">  * HELOC paid off at refinance completion</small><br>
      <strong>= Total Cash In: $${Utils.formatCurrency(calculation.totalCashIn)}</strong><br><br>
      
      <strong>REFINANCE RECOVERY:</strong><br>
      - ARV (After Repair Value): $${Utils.formatCurrency(calculation.arv)}<br>
      - Renovation Period: ${renovationPeriod} months ${hasTimeConstraint ? '(under 6 months)' : '(6+ months)'}<br>
      - Standard Refinance Limit: 70% of ARV = $${Utils.formatCurrency(Math.round(calculation.arv * CONFIG.thresholds.refinanceLTV))}<br>
      ${hasTimeConstraint ? `- Time Constraint: Cannot exceed purchase price = $${Utils.formatCurrency(calculation.purchasePrice)}<br>` : ''}
      - Actual Refinance Loan Amount: $${Utils.formatCurrency(Math.round(calculation.refinanceLoanAmount))}<br>
      - Refinance Closing Costs: -$${Utils.formatCurrency(CONFIG.thresholds.refinanceClosingCosts)}<br>
      <strong>= Cash Out: $${Utils.formatCurrency(calculation.cashOut)}</strong><br><br>
      
      <strong>FINAL INVESTMENT:</strong><br>
      - Total Cash In: $${Utils.formatCurrency(calculation.totalCashIn)}<br>
      - Cash Out: -$${Utils.formatCurrency(calculation.cashOut)}<br>
      <strong>= Final Cash In: $${Utils.formatCurrency(calculation.finalCashIn)}</strong><br><br>
      
      <strong>ROI CALCULATION:</strong><br>
      - Monthly Net Cash Flow (post-refinance): $${Math.round(calculation.monthlyCashFlowWithHeloc)}<br>
      - Annual Cash Flow: $${Utils.formatCurrency(Math.round(calculation.annualCashFlow))}<br>
      - Final Cash In: $${Utils.formatCurrency(calculation.finalCashIn)}<br>
      <strong>= ROI: $${Utils.formatCurrency(Math.round(calculation.annualCashFlow))} / $${Utils.formatCurrency(calculation.finalCashIn)} = ${calculation.roi.toFixed(1)}%</strong>`;
  }
  
  static formatConventionalDetails(calculation) {
    return `
      <strong>TOTAL INVESTMENT:</strong><br>
      - Down Payment: $${Utils.formatCurrency(calculation.downPayment)}<br>
      - Closing Costs: $5,000<br>
      - Improvements: $${Utils.formatCurrency(calculation.totalCashIn - calculation.downPayment - 5000 - calculation.holdingCosts)}<br>
      - Holding Costs (${Math.round(calculation.holdingCosts / calculation.mortgagePayment)} months): $${Utils.formatCurrency(calculation.holdingCosts)}<br>
      <strong>= Total Cash In: $${Utils.formatCurrency(calculation.totalCashIn)}</strong><br><br>
      
      <strong>LOAN DETAILS:</strong><br>
      - Purchase Price: $${Utils.formatCurrency(calculation.purchasePrice)}<br>
      - Down Payment: $${Utils.formatCurrency(calculation.downPayment)}<br>
      - Loan Amount: $${Utils.formatCurrency(calculation.loanAmount)}<br>
      - Monthly Mortgage: $${Math.round(calculation.mortgagePayment)}<br><br>
      
      <strong>ROI CALCULATION:</strong><br>
      - Monthly Net Cash Flow: $${Math.round(calculation.monthlyCashFlow)}<br>
      - Annual Cash Flow: $${Utils.formatCurrency(Math.round(calculation.annualCashFlow))}<br>
      - Total Cash In: $${Utils.formatCurrency(calculation.totalCashIn)}<br>
      <strong>= ROI: $${Utils.formatCurrency(Math.round(calculation.annualCashFlow))} / $${Utils.formatCurrency(calculation.totalCashIn)} = ${calculation.roi.toFixed(1)}%</strong>`;
  }
}

// =====================================================
// GLOBAL STATE MANAGER
// =====================================================

class AppState {
  constructor() {
    this.currentData = null;
    this.currentStrategy = CONFIG.strategies.conventional;
    this.formParameters = new FormParameters(this.currentStrategy);
    this.arvCalculator = null;
  }
  
  setData(data) {
    this.currentData = data;
    this.arvCalculator = new ARVCalculator(this.currentStrategy, this.currentData);
  }
  
  setStrategy(strategy) {
    this.currentStrategy = strategy;
    this.formParameters = new FormParameters(strategy);
    if (this.currentData) {
      this.arvCalculator = new ARVCalculator(strategy, this.currentData);
    }
  }
  
  getFormParams() {
    return this.formParameters.getAll();
  }
  
  updateARV(overridePurchasePrice = null, forceUpdate = false) {
    if (this.arvCalculator) {
      this.arvCalculator.update(overridePurchasePrice, forceUpdate);
    }
  }
  
  calculateResults() {
    if (!this.currentData) return null;
    
    const params = this.getFormParams();
    
    Utils.logCalculation('updateResults called', {
      strategy: this.currentStrategy,
      targetPurchasePrice: params.targetPurchasePrice
    });
    
    let calculation;
    if (this.currentStrategy === CONFIG.strategies.conventional) {
      calculation = ConventionalROICalculator.calculate(this.currentData.price, this.currentData.annualTax, params);
    } else {
      // For HELOC, check if we need to calculate target price
      if (!params.targetPurchasePrice || params.targetPurchasePrice <= 0) {
        Utils.logCalculation('HELOC auto-calculating target price', {});
        
        // Calculate target price for 10% ROI
        const targetPrice = TargetPriceCalculator.calculateHeloc(this.currentData.price, this.currentData.annualTax, params);
        
        // Update params with the target price AND calculated ARV for the ROI calculation
        const calculatedARV = targetPrice / CONFIG.thresholds.refinanceLTV;
        Utils.logCalculation('Final ARV calculation', {
          targetPrice: Math.round(targetPrice),
          calculatedARV: Math.round(calculatedARV)
        });
        
        const paramsWithTarget = { 
          ...params, 
          targetPurchasePrice: targetPrice,
          arv: calculatedARV
        };
        calculation = HelocROICalculator.calculate(this.currentData.price, this.currentData.annualTax, paramsWithTarget);
        calculation.isTargetPrice = true;
        calculation.purchasePrice = targetPrice;
      } else {
        Utils.logCalculation('HELOC using user-entered price', params.targetPurchasePrice);
        calculation = HelocROICalculator.calculate(this.currentData.price, this.currentData.annualTax, params);
        calculation.isTargetPrice = false;
        calculation.purchasePrice = params.targetPurchasePrice;
      }
    }
    
    Utils.logCalculation('calculation result', {
      roi: calculation.roi.toFixed(1),
      isTargetPrice: calculation.isTargetPrice
    });
    
    return calculation;
  }
}

// Initialize global state
const appState = new AppState();

// =====================================================
// UI MANAGER & EVENT HANDLERS
// =====================================================

class UIManager {
  static updateResults() {
    const calculation = appState.calculateResults();
    if (!calculation) return;
    
    const isHeloc = appState.currentStrategy === CONFIG.strategies.heloc;
    const output = Utils.getElement("output");
    output.innerHTML = ResultsFormatter.format(calculation, isHeloc);
    
    // Update the target purchase price field if it's auto-calculated
    this.updateTargetPriceField(calculation);
  }
  
  static updateTargetPriceField(calculation) {
    if (!calculation.isTargetPrice) return;
    
    const targetPriceFieldId = appState.currentStrategy === CONFIG.strategies.conventional 
      ? FIELD_IDS.targetPurchasePriceConventional 
      : FIELD_IDS.targetPurchasePriceHeloc;
    
    const targetPriceField = Utils.getElement(targetPriceFieldId);
    const newValue = Math.round(calculation.purchasePrice);
    
    Utils.logCalculation('Updating target price field', {
      fieldId: targetPriceFieldId,
      value: newValue
    });
    
    targetPriceField.value = newValue;
    Utils.markAsAutoCalculated(targetPriceField);
    
    // Update ARV after target purchase price is calculated (HELOC strategy only)
    if (appState.currentStrategy === CONFIG.strategies.heloc) {
      appState.updateARV(newValue, true);
    }
  }
  
  static showError(message) {
    const output = Utils.getElement("output");
    output.innerHTML = `<div class="error">${message}</div>`;
  }
  
  static showLoading(message) {
    const output = Utils.getElement("output");
    output.innerHTML = `<div class="loading">${message}</div>`;
  }
  
  static showPropertyInfo(data) {
    const propertyInfo = Utils.getElement("property-info");
    propertyInfo.style.display = "block";
    
    // Debug logging
    Utils.logCalculation('Property info display', { 
      price: data.price, 
      annualTax: data.annualTax, 
      annualInsurance: data.annualInsurance 
    });
    
    let html = `<strong>Property:</strong> $${Utils.formatCurrency(data.price)} asking price<br>`;
    
    // Add tax information
    if (data.annualTax) {
      html += `<strong>Annual Taxes:</strong> $${Utils.formatCurrency(data.annualTax)}<br>`;
    } else {
      const estimatedTax = Math.round(data.price * CONFIG.thresholds.estimatedTaxRate);
      html += `<strong>Annual Taxes:</strong> <span style="color: ${CONFIG.colors.warning};">~$${Utils.formatCurrency(estimatedTax)} (estimated - tax data not found)</span><br>`;
    }
    
    // Add insurance information
    if (data.annualInsurance && data.annualInsurance > CONFIG.defaults.conventional.insurance * 12) {
      const monthlyInsurance = Math.round(data.annualInsurance / 12);
      html += `<strong>Annual Insurance:</strong> $${Utils.formatCurrency(data.annualInsurance)} (~$${monthlyInsurance}/month - extracted)`;
    } else {
      const defaultAnnual = CONFIG.defaults.conventional.insurance * 12;
      html += `<strong>Annual Insurance:</strong> <span style="color: ${CONFIG.colors.warning};">~$${Utils.formatCurrency(defaultAnnual)} (default - not found on page)</span>`;
    }
    
    propertyInfo.innerHTML = html;
  }
}

class EventHandlers {
  static initializeAll() {
    this.initializeTabSwitching();
    this.initializeAdvancedToggle();
    this.initializeTargetPriceHandling();
    this.initializeCalculateButton();
    this.initializeRecalculateButton();
    this.initializeFormInputs();
    this.initializeSpecialFields();
    this.initializeDataExtraction();
  }
  
  static initializeTabSwitching() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const oldStrategy = appState.currentStrategy;
        appState.setStrategy(tab.dataset.strategy);
        
        Utils.logCalculation('Strategy changed', {
          from: oldStrategy,
          to: appState.currentStrategy
        });
        
        this.updateStrategyUI();
        FormDefaults.populate(appState.currentStrategy);
        
        if (appState.currentData) {
          UIManager.updateResults();
        }
      });
    });
  }
  
  static updateStrategyUI() {
    const helocAdvanced = Utils.getElement('heloc-advanced');
    const conventionalField = Utils.getElement(FIELD_IDS.targetPurchasePriceConventional);
    const helocField = Utils.getElement(FIELD_IDS.targetPurchasePriceHeloc);
    
    if (appState.currentStrategy === CONFIG.strategies.heloc) {
      helocAdvanced.classList.remove('hidden');
      conventionalField.classList.add('hidden');
      helocField.classList.remove('hidden');
    } else {
      helocAdvanced.classList.add('hidden');
      conventionalField.classList.remove('hidden');
      helocField.classList.add('hidden');
    }
  }
  
  static initializeAdvancedToggle() {
    Utils.getElement('toggle-advanced').addEventListener('click', () => {
      const advancedSection = Utils.getElement('advanced-section');
      const toggleButton = Utils.getElement('toggle-advanced');
      
      if (advancedSection.classList.contains('hidden')) {
        advancedSection.classList.remove('hidden');
        toggleButton.textContent = 'Hide Advanced Parameters';
      } else {
        advancedSection.classList.add('hidden');
        toggleButton.textContent = 'Show Advanced Parameters';
      }
    });
  }
  
  static initializeTargetPriceHandling() {
    [FIELD_IDS.targetPurchasePriceConventional, FIELD_IDS.targetPurchasePriceHeloc].forEach(fieldId => {
      const field = Utils.getElement(fieldId);
      
      field.addEventListener('input', function() {
        Utils.markAsUserEntered(this);
        
        // Update default ARV when target purchase price changes (HELOC strategy only)
        if (appState.currentStrategy === CONFIG.strategies.heloc && fieldId === FIELD_IDS.targetPurchasePriceHeloc) {
          const purchasePrice = parseFloat(this.value) || 0;
          if (purchasePrice > 0) {
            Utils.logCalculation('Purchase price manually changed', purchasePrice);
            appState.updateARV(purchasePrice, false);
          }
        }
        
        if (appState.currentData) {
          UIManager.updateResults();
        }
      });
      
      field.addEventListener('focus', function() {
        if (!Utils.isUserEntered(this)) {
          this.style.background = '#ffffff';
        }
      });
      
      field.addEventListener('blur', function() {
        if (!this.value && !Utils.isUserEntered(this)) {
          Utils.markAsAutoCalculated(this);
        }
      });
    });
  }
  
  static initializeCalculateButton() {
    Utils.getElement('calculate-btn').addEventListener('click', () => {
      UIManager.updateResults();
    });
  }
  
  static initializeRecalculateButton() {
    Utils.getElement('recalculate-target-price').addEventListener('click', () => {
      const targetPriceFieldId = appState.currentStrategy === CONFIG.strategies.conventional 
        ? FIELD_IDS.targetPurchasePriceConventional 
        : FIELD_IDS.targetPurchasePriceHeloc;
      
      const targetPriceField = Utils.getElement(targetPriceFieldId);
      if (targetPriceField) {
        targetPriceField.value = '';
        Utils.markAsAutoCalculated(targetPriceField);
        
        Utils.logCalculation('User requested target price recalculation', {
          strategy: appState.currentStrategy
        });
        
        if (appState.currentData) {
          UIManager.updateResults();
        }
      }
    });
  }
  
  static initializeFormInputs() {
    // Auto-calculate on key input changes with cross-tab sync
    [FIELD_IDS.rent, FIELD_IDS.improvements, FIELD_IDS.renovationPeriod].forEach(fieldId => {
      Utils.getElement(fieldId).addEventListener('input', () => {
        this.handleSpecialInputLogic(fieldId);
        this.clearAutoCalculatedTargetPrice();
        
        if (appState.currentData) {
          UIManager.updateResults();
        }
      });
    });
  }
  
  static handleSpecialInputLogic(fieldId) {
    if (fieldId === FIELD_IDS.improvements) {
      // Update HELOC amount automatically
      const improvementsValue = Utils.getFloatValue(FIELD_IDS.improvements);
      if (improvementsValue > 0) {
        Utils.setElementValue(FIELD_IDS.helocAmount, improvementsValue);
      }
      
      // Update default ARV when improvements change (HELOC strategy only)
      if (appState.currentStrategy === CONFIG.strategies.heloc) {
        appState.updateARV();
      }
    }
    
    if (fieldId === FIELD_IDS.renovationPeriod) {
      // Update seasoning period automatically
      const renovationPeriodValue = Utils.getFloatValue(FIELD_IDS.renovationPeriod);
      if (renovationPeriodValue > 0) {
        Utils.setElementValue(FIELD_IDS.seasoningPeriod, renovationPeriodValue);
      }
    }
  }
  
  static clearAutoCalculatedTargetPrice() {
    const targetPriceFieldId = appState.currentStrategy === CONFIG.strategies.conventional 
      ? FIELD_IDS.targetPurchasePriceConventional 
      : FIELD_IDS.targetPurchasePriceHeloc;
    
    const targetPriceField = Utils.getElement(targetPriceFieldId);
    if (targetPriceField && !Utils.isUserEntered(targetPriceField)) {
      targetPriceField.value = '';
      Utils.markAsAutoCalculated(targetPriceField);
      Utils.logCalculation('Clearing auto-calculated target price due to input change', {});
    }
  }
  
  static initializeSpecialFields() {
    // HELOC amount field sync
    Utils.getElement(FIELD_IDS.helocAmount).addEventListener('focus', () => {
      const improvementsValue = Utils.getFloatValue(FIELD_IDS.improvements);
      const helocAmountField = Utils.getElement(FIELD_IDS.helocAmount);
      
      if (improvementsValue > 0 && (!helocAmountField.value || helocAmountField.value == 10000)) {
        helocAmountField.value = improvementsValue;
      }
    });
    
    // ARV field tracking
    Utils.getElement(FIELD_IDS.arv).addEventListener('input', function() {
      Utils.markAsUserEntered(this);
      Utils.logCalculation('ARV field manually modified by user', {});
      
      if (appState.currentData) {
        UIManager.updateResults();
      }
    });
  }
  
  static initializeDataExtraction() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      
      // Check if we're on a supported site
      if (!currentTab.url.includes('redfin.com') && !currentTab.url.includes('zillow.com')) {
        UIManager.showError('Please navigate to a Redfin or Zillow property page.');
        return;
      }

      UIManager.showLoading('Extracting property data...');
      this.tryExtractData(currentTab.id);
    });
  }
  
  static tryExtractData(tabId, attempt = 1, maxAttempts = 3) {
    Utils.logCalculation(`Data extraction attempt ${attempt}`, {});
    
    chrome.tabs.sendMessage(tabId, { type: "getListingData" }, (data) => {
      if (chrome.runtime.lastError) {
        this.handleExtractionError(tabId, attempt, maxAttempts);
      } else if (data && data.error) {
        UIManager.showError(`Extraction error: ${data.error}<br><small>Try reloading the page and opening the extension again.</small>`);
      } else {
        Utils.logCalculation(`Data extraction successful on attempt ${attempt}`, data);
        this.handleDataReceived(data);
      }
    });
  }
  
  static handleExtractionError(tabId, attempt, maxAttempts) {
    Utils.logCalculation(`Extraction attempt ${attempt} failed`, chrome.runtime.lastError);
    
    if (attempt === 1) {
      UIManager.showLoading('Loading extension script...');
      
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      }, () => {
        if (chrome.runtime.lastError) {
          const errorMsg = chrome.runtime.lastError.message || 'Unknown error';
          UIManager.showError(`Error: Could not inject script (${errorMsg}). <br><br><strong>Try these steps:</strong><br>1. Reload this property page<br>2. Open the extension again<br>3. Make sure you're on a Redfin or Zillow listing page`);
          return;
        }
        
        UIManager.showLoading('Script loaded, extracting data...');
        setTimeout(() => {
          this.tryExtractData(tabId, 2, maxAttempts);
        }, 1500);
      });
    } else if (attempt < maxAttempts) {
      UIManager.showLoading(`Retrying data extraction... (attempt ${attempt})`);
      setTimeout(() => {
        this.tryExtractData(tabId, attempt + 1, maxAttempts);
      }, 2000);
    } else {
      UIManager.showError(`
        <strong>Could not extract property data</strong><br><br>
        <strong>Troubleshooting steps:</strong><br>
        1. Make sure you're on a property listing page (not search results)<br>
        2. Reload the property page and try again<br>
        3. Check if the page has fully loaded (no loading spinners)<br>
        4. Try opening the extension on a different property<br><br>
        <small>If the issue persists, this property page may use a different layout.</small>`);
    }
  }
  
  static handleDataReceived(data) {
    Utils.logCalculation('Property data received', data);
    
    // Validate extracted data
    if (!data || (!data.price && !data.annualTax)) {
      UIManager.showError(`
        <strong>No property data found</strong><br><br>
        This could happen if:<br>
        - The page layout has changed<br>
        - The page hasn't fully loaded<br>
        - You're not on a property details page<br><br>
        <strong>Try:</strong><br>
        1. Reload the page and wait for it to fully load<br>
        2. Make sure you're on a specific property page (not search results)<br>
        3. Try a different property listing`);
      return;
    }
    
    if (!data.price) {
      UIManager.showError(`
        <strong>Property price not found</strong><br><br>
        The extension couldn't find the listing price on this page.<br>
        This might be a sold property or the page layout is different.<br><br>
        <small>Found tax data: ${data.annualTax ? '$' + Utils.formatCurrency(data.annualTax) : 'None'}</small>`);
      return;
    }
    
    // Handle missing tax data
    if (!data.annualTax) {
      const estimatedTax = Math.round(data.price * CONFIG.thresholds.estimatedTaxRate);
      data.annualTax = estimatedTax;
    }

    // Handle missing insurance data
    if (!data.annualInsurance) {
      // Use default values if no insurance found
      data.annualInsurance = CONFIG.defaults.conventional.insurance * 12; // Convert monthly to annual
      Utils.logCalculation('Using default insurance value', { 
        defaultMonthly: CONFIG.defaults.conventional.insurance,
        annualInsurance: data.annualInsurance 
      });
    } else {
      Utils.logCalculation('Using extracted insurance value', { annualInsurance: data.annualInsurance });
    }
    
    // Set up the application state
    appState.setData(data);
    
    // Show property info and form
    UIManager.showPropertyInfo(data);
    Utils.getElement("input-form").style.display = "block";
    
    // Set initial form defaults and calculate results
    FormDefaults.populate(appState.currentStrategy);
    UIManager.updateResults();
  }
}

// =====================================================
// APPLICATION INITIALIZATION
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  Utils.logCalculation('Application initializing', {});
  EventHandlers.initializeAll();
});
