export const FIXED_SERVICE_PRICES: Record<string, number> = {
  "Injection (IV / IM)": 300,
  "Blood Pressure Monitoring": 150,
  "Blood Sugar Check": 150,
  "Temperature Check": 100,
  "Oxygen Level Monitoring": 100,
  "Wound Dressing": 400,
  "Bandage Change": 250,
  "First Aid Care": 350,
  "IV Fluid Administration": 500,
  "Catheter Care": 600,
  "Enema Administration": 400,
  "Bedridden Patient Care": 1200,
  "Daily Hygiene": 800,
  "Feeding Assistance": 400,
  "Mobility Support": 500,
  "Fall Prevention": 400,
  "Dementia Support": 1500,
  "12-hour Nursing": 2500,
  "24-hour Nursing": 4500,
  "ICU Setup at Home": 5000,
  "Post Hospital Care": 3000,
  "Critical Monitoring": 3500,
};

export const getFixedPrice = (service: string): number => {
  return FIXED_SERVICE_PRICES[service] || 500;
};
