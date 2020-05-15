// Default control values
var values = {
  Temp: {
    min: -40,
    max: 125,
    name: "AirTemp",
    scale: [0, 33, 38, 47, 52, 80],
    unit: "&#8451;",
    wanted: 42.5,
  },
  WaterTemp: {
    min: 0,
    max: 60,
    name: "WaterTemp",
    scale: [0, 20, 25, 35, 40, 60],
    unit: "&#8451;",
    wanted: 30,
  },
  Humidity: {
    decimals: 0,
    min: 30,
    max: 80,
    name: "Humidity",
    scale: [30, 45, 50, 60, 65, 80],
    unit: "%",
    wanted: 55,
  },
  CO2: {
    decimals: 0,
    min: 0,
    max: 5000,
    name: "CO2",
    scale: [0, 1500, 2100, 2900, 3500, 5000],
    unit: "ppm",
    wanted: 2500,
  },
  O2: {
    min: 0,
    max: 36,
    name: "Dissolved O2",
    scale: [0, 12, 15, 21, 23, 36],
    unit: "mg/l",
    wanted: 18,
  },
  EC: {
    min: 0,
    max: 5000,
    name: "Conductivity",
    scale: [0, 1500, 2100, 2900, 3500, 5000],
    unit: "&micro;S/cm",
    wanted: 2500,
  },
  PH: {
    min: 0,
    max: 14,
    name: "pH",
    scale: [0, 5, 6.6, 7.4, 9, 14],
    unit: "/10",
    wanted: 7,
  },
  Light: {
    decimals: 0,
    min: 0,
    max: 2500,
    name: "Light PAR",
    scale: [0, 800, 1100, 1400, 1700, 2500],
    unit: "&micro;mol m<sup>-2</sup>s<sup>-1</sup>",
    wanted: 1250,
  },
  SAL: {
    decimals: 2,
    min: 0,
    max: 100,
    name: "SAR",
    scale: [0, 40, 45, 55, 60, 100],
    unit: "g/kg",
    wanted: 50,
  },
};