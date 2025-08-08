# Privacy Policy for Real Estate ROI Calculator

**Last updated: August 7, 2025**

## Overview

Real Estate ROI Calculator ("we", "our", or "the extension") is committed to protecting your privacy. This privacy policy explains how our Chrome extension collects, uses, and protects your information.

## Information We Collect

### Automatically Collected Information
- **Property listing data**: When you visit supported real estate websites (Redfin.com and Zillow.com), our extension automatically extracts publicly available property information such as:
  - Property price
  - Property address
  - Basic property details (bedrooms, bathrooms, square footage)
  - Property taxes (when available)
  - Insurance estimates (when available)

### User-Provided Information
- **Calculation inputs**: Data you manually enter into the ROI calculator including:
  - Expected rental income
  - Renovation budgets
  - Interest rates
  - Down payment percentages
  - Other financial parameters

### Stored Settings
- **User preferences**: Your customized default settings for:
  - Interest rates
  - Insurance rates
  - Property tax amounts
  - Other calculation defaults

## How We Use Your Information

We use the collected information solely to:
1. **Perform ROI calculations** based on property data and your inputs
2. **Store your preferences** locally on your device for convenience
3. **Provide calculator functionality** for real estate investment analysis

## Data Storage and Security

### Local Storage Only
- All data is stored locally on your device using Chrome's secure storage API
- No data is transmitted to external servers
- No data is shared with third parties
- Settings and preferences remain on your device

### Data Access
- The extension only accesses data from real estate websites when you actively visit those pages
- No background data collection occurs
- Data extraction only happens on supported websites (Redfin.com and Zillow.com)

## Permissions Explanation

Our extension requests the following permissions:

### activeTab
- **Purpose**: Allows the extension to interact with the currently active tab
- **Usage**: Required to extract property data from real estate listings you're viewing
- **Scope**: Only works on the tab you're currently viewing, only when you click the extension

### scripting
- **Purpose**: Enables the extension to run content scripts on web pages
- **Usage**: Required to extract property information from supported real estate websites
- **Scope**: Limited to Redfin.com and Zillow.com domains only

### storage
- **Purpose**: Allows the extension to save your settings and preferences
- **Usage**: Stores your customized default values (interest rates, insurance rates, etc.)
- **Scope**: Data stored locally on your device only

### Host Permissions (Redfin.com and Zillow.com)
- **Purpose**: Enables data extraction from real estate listing pages
- **Usage**: Automatically reads publicly available property information to populate the calculator
- **Scope**: Limited to these specific real estate domains only

## Third-Party Services

This extension does not:
- Send data to external services
- Use analytics or tracking tools
- Connect to remote databases
- Share information with third parties

## Your Rights and Choices

You have the right to:
- **View your data**: All stored data is accessible through the extension's settings
- **Delete your data**: Reset settings to clear all stored preferences
- **Control data collection**: Disable the extension or uninstall it at any time

## Data Retention

- Settings are retained until you manually reset them or uninstall the extension
- No historical calculation data is stored
- Property data is not permanently stored (only temporarily used for calculations)

## Changes to This Policy

We may update this privacy policy from time to time. Any changes will be reflected in the "Last updated" date at the top of this policy. Continued use of the extension after changes constitutes acceptance of the updated policy.

## Contact Information

If you have questions about this privacy policy or the extension's data practices, please contact us through our GitHub repository:

**GitHub Repository**: https://github.com/slice4e/real-estate-roi-extension

## Compliance

This extension is designed to comply with:
- Google Chrome Web Store policies
- General data protection best practices
- Chrome extension security requirements

## Technical Implementation

Our privacy-focused design includes:
- **No external network requests**: All processing happens locally
- **Minimal data collection**: Only collects data necessary for ROI calculations
- **Secure storage**: Uses Chrome's built-in secure storage mechanisms
- **Permission minimization**: Requests only necessary permissions for functionality
