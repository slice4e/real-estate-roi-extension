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
    estimatedTaxRate: 0.015
  },
  colors: {
    good: '#2e7d32',
    warning: '#f57c00',
    danger: '#d32f2f'
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
    
    console.log(`🏠 Getting form parameters for ${this.strategy} strategy`);
    console.log(`🏠 Target price field: ${targetPriceFieldId} = ${targetPriceValue}`);
    
    const baseParams = {
      rent: Utils.getFloatValue(FIELD_IDS.rent, CONFIG.defaults[this.strategy].rent),
      improvements: Utils.getFloatValue(FIELD_IDS.improvements, CONFIG.defaults[this.strategy].improvements),
      renovationPeriod: Utils.getFloatValue(FIELD_IDS.renovationPeriod, CONFIG.defaults[this.strategy].renovationPeriod),
      targetROI: CONFIG.thresholds.targetROI,
      targetPurchasePrice: targetPriceValue,
      interestRate: Utils.getFloatValue(FIELD_IDS.interestRate, CONFIG.defaults[this.strategy].interestRate || 7.5),
      percentDown: Utils.getFloatValue(FIELD_IDS.percentDown, CONFIG.defaults.conventional.percentDown),
      loanTerm: Utils.getFloatValue(FIELD_IDS.loanTerm, 30),
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
    console.log(`🏠 Populating form defaults for ${strategy} strategy`);
    
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
        Utils.setElementValue(FIELD_IDS[key], value);
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
      console.log('🏠 ARV calculation skipped - not HELOC strategy');
      return;
    }
    
    const arvField = Utils.getElement(FIELD_IDS.arv);
    if (!arvField) {
      console.log('🏠 ARV field not found');
      return;
    }
    
    const purchasePrice = this.getPurchasePrice(overridePurchasePrice);
    if (!purchasePrice || purchasePrice <= 0) {
      console.log('🏠 No valid purchase price available for ARV calculation');
      return;
    }
    
    const calculatedARV = purchasePrice / CONFIG.thresholds.refinanceLTV;
    
    console.log('🏠 ARV Calculation Details:');
    console.log(`  - Purchase Price: ${Utils.formatCurrency(purchasePrice)}`);
    console.log(`  - Formula: Purchase Price / ${CONFIG.thresholds.refinanceLTV} (reverse of ${CONFIG.thresholds.refinanceLTV * 100}% LTV)`);
    console.log(`  - Calculated ARV: ${Utils.formatCurrency(calculatedARV)}`);
    
    if (this.shouldUpdateARV(arvField, calculatedARV, overridePurchasePrice, forceUpdate)) {
      arvField.value = Math.round(calculatedARV);
      console.log(`🏠 ✅ Updated ARV field to: ${Utils.formatCurrency(calculatedARV)}`);
    }
  }
  
  getPurchasePrice(overridePurchasePrice) {
    if (overridePurchasePrice && overridePurchasePrice > 0) {
      console.log('🏠 Using override purchase price for ARV calculation:', overridePurchasePrice);
      return overridePurchasePrice;
    }
    
    const targetPurchasePrice = Utils.getFloatValue(FIELD_IDS.targetPurchasePriceHeloc);
    if (targetPurchasePrice > 0) {
      console.log('🏠 Using HELOC target purchase price for ARV calculation:', targetPurchasePrice);
      return targetPurchasePrice;
    }
    
    if (this.currentData?.price) {
      console.log('🏠 Using asking price for ARV calculation:', this.currentData.price);
      return this.currentData.price;
    }
    
    return 0;
  }
  
  shouldUpdateARV(arvField, calculatedARV, overridePurchasePrice, forceUpdate) {
    const currentARV = Utils.getFloatValue(FIELD_IDS.arv);
    const isUserModified = Utils.isUserEntered(arvField);
    
    console.log(`🏠 ARV Update Check - Current: ${currentARV}, Calculated: ${Math.round(calculatedARV)}, User Modified: ${isUserModified}`);
    
    return !isUserModified && (
      currentARV === 0 || 
      currentARV === CONFIG.defaults.heloc.defaultARV || 
      overridePurchasePrice || 
      forceUpdate
    );
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
}

// Initialize global state
const appState = new AppState();

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
// TARGET PRICE CALCULATORS
// =====================================================

class TargetPriceCalculator {
  static calculateConventional(askingPrice, annualTax, params) {
    const targetROI = params.targetROI / 100;
    console.log(`🏠 Calculating conventional target price for ${targetROI * 100}% ROI`);
    
    return this.binarySearch(askingPrice, annualTax, params, targetROI, 'conventional');
  }
  
  static calculateHeloc(askingPrice, annualTax, params) {
    const targetROI = params.targetROI / 100;
    console.log(`🏠 Calculating HELOC target price for ${targetROI * 100}% ROI`);
    
    return this.binarySearch(askingPrice, annualTax, params, targetROI, 'heloc');
  }
  
  static binarySearch(askingPrice, annualTax, params, targetROI, strategy) {
    let low = askingPrice * (strategy === 'heloc' ? 0.3 : 0.5);
    let high = askingPrice * (strategy === 'heloc' ? 1.0 : 1.2);
    let bestPrice = askingPrice;
    let bestROI = 0;
    
    console.log(`🏠 ${strategy.toUpperCase()} binary search range: ${Utils.formatCurrency(low)} - ${Utils.formatCurrency(high)}`);
    
    for (let iterations = 0; iterations < 50; iterations++) {
      const testPrice = (low + high) / 2;
      const testParams = { ...params, targetPurchasePrice: testPrice };
      
      if (strategy === 'heloc') {
        testParams.arv = testPrice / CONFIG.thresholds.refinanceLTV;
      }
      
      const calculator = strategy === 'conventional' ? ConventionalROICalculator : HelocROICalculator;
      const result = calculator.calculate(askingPrice, annualTax, testParams);
      
      // Track best result
      if (Math.abs(result.roi / 100 - targetROI) < Math.abs(bestROI / 100 - targetROI)) {
        bestPrice = testPrice;
        bestROI = result.roi;
      }
      
      // Check convergence
      if (Math.abs(result.roi / 100 - targetROI) < 0.001) {
        bestPrice = testPrice;
        console.log(`🏠 ${strategy.toUpperCase()} target price converged: ${Utils.formatCurrency(bestPrice)}`);
        break;
      }
      
      // Adjust search range
      if (result.roi / 100 < targetROI) {
        high = testPrice; // Need lower purchase price
      } else {
        low = testPrice; // Can afford higher purchase price
      }
      
      // Check range convergence
      if ((high - low) < 1000) {
        console.log(`🏠 ${strategy.toUpperCase()} search range converged`);
        break;
      }
    }
    
    console.log(`🏠 ${strategy.toUpperCase()} target price result: ${Utils.formatCurrency(bestPrice)} (${bestROI.toFixed(2)}% ROI)`);
    return bestPrice;
  }
}

// Keep the existing calculation classes (ConventionalROICalculator, HelocROICalculator) 
// and UI classes (ResultsFormatter, UIManager) in the next part...

// =====================================================
// CONTINUE WITH EXISTING FUNCTIONALITY (placeholder)
// =====================================================

// Note: This is a partial refactor. The remaining classes would include:
// - ConventionalROICalculator
// - HelocROICalculator  
// - ResultsFormatter
// - UIManager
// - EventHandlers
// And the main initialization code

// For now, let's keep the existing calculation and UI code to maintain functionality
// while demonstrating the improved architecture above.

console.log('🏠 Popup script architecture improvements loaded');
