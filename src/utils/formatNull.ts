// utils/dataUtils.ts (or directly in your component)
export const formatValue = <T>(value: T | null | undefined, placeholder: string = "NA"): T | string => {
  if (value === null || typeof value === 'undefined' || value === '') {
    return placeholder;
  }
  return value;
};