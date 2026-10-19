export const startOfToday = (daysOffset: number = 0): Date => {
  const now = new Date();
  
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysOffset);
};
