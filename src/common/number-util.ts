
const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,      
  maximumFractionDigits: 2,
});

export const checkNum = (num: number): string => {
  if(num == undefined || isNaN(num)) {
      num = 0;
  }
  return numberFormatter.format(num);
}
