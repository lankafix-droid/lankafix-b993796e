export function getArrivalEstimate(): string {
  const min = 20 + Math.floor(Math.random() * 10);
  const max = min + 15;
  return `${min} – ${max} minutes`;
}
