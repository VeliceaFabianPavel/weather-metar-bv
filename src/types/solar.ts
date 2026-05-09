export interface SolarPosition {
  azimuth: number;
  elevation: number;
  zenith: number;
  declination: number;
  hourAngle: number;
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
  dayLength: number;
  equationOfTime: number;
}

export interface SunPathPoint {
  time: Date;
  azimuth: number;
  elevation: number;
}
