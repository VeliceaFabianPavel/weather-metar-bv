export interface DailyRecord {
  date: Date;
  tMax: number;
  tMin: number;
  tMean: number;
  precipitation: number;
  rain: number;
  snowfall: number;
  windMax: number;
  gustMax: number;
  windDirection: number;
  radiation: number;
  et0: number;
}

export interface MonthlyAggregate {
  year: number;
  month: number;
  tMax: number;
  tMin: number;
  tMean: number;
  tMaxAvg: number;
  tMinAvg: number;
  precipitation: number;
  rain: number;
  snowfall: number;
  windAvg: number;
  windMax: number;
  radiation: number;
  hdd: number;
  cdd: number;
  daysWithRain: number;
  daysWithSnow: number;
  daysWithFrost: number;
}

export interface AnnualAggregate {
  year: number;
  tMean: number;
  tMax: number;
  tMin: number;
  precipitation: number;
  windMax: number;
  radiation: number;
  hdd: number;
  cdd: number;
  daysWithRain: number;
  daysWithSnow: number;
  daysWithFrost: number;
  hottestDay: { date: Date; temp: number };
  coldestDay: { date: Date; temp: number };
  wettestDay: { date: Date; mm: number };
  windiestDay: { date: Date; speed: number };
  longestDryStreak: number;
  firstFrost: Date | null;
  lastFrost: Date | null;
  sunshineHours: number;
}

export interface ClimateNormal {
  month: number;
  tMean: number;
  tMax: number;
  tMin: number;
  precipitation: number;
  windAvg: number;
  radiation: number;
  hdd: number;
  cdd: number;
}

export interface ClimateDataset {
  station: string;
  daily: DailyRecord[];
  monthly: MonthlyAggregate[];
  annual: AnnualAggregate[];
  normals: ClimateNormal[];
  startYear: number;
  endYear: number;
}

export interface ClimateBundle {
  brasov: ClimateDataset;
  poiana: ClimateDataset;
  fetchedAt: Date;
}
