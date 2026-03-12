export const servicePriceRanges: Record<string, { min: number; max: number }> = {
  // Mobile
  screen_broken: { min: 9500, max: 14000 },
  battery_replacement: { min: 3500, max: 7000 },
  charging_problem: { min: 3000, max: 6000 },
  water_damage: { min: 4000, max: 12000 },
  software_issue: { min: 2000, max: 4500 },
  camera_issue: { min: 3500, max: 8000 },
  speaker_mic_issue: { min: 2500, max: 5500 },
  not_turning_on: { min: 3000, max: 10000 },

  // AC
  ac_not_cooling: { min: 2500, max: 8000 },
  ac_service_clean: { min: 4500, max: 6500 },
  gas_refill: { min: 3500, max: 7500 },
  ac_noise: { min: 3000, max: 7000 },
  ac_leak: { min: 3000, max: 8000 },
  ac_install: { min: 15000, max: 35000 },
  ac_uninstall: { min: 5000, max: 10000 },

  // Electrical
  wiring_issue: { min: 3000, max: 12000 },
  switch_socket: { min: 1500, max: 4000 },

  // Plumbing
  pipe_leak: { min: 2000, max: 8000 },
  tap_repair: { min: 1500, max: 4000 },
};
