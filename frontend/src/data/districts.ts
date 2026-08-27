/**
 * Tumanlar ma'lumotnomasi — jeńil versiya.
 *
 * Ilgari bul faylda SVG xarita yollari (`d`, `bbox`, `labelX`, `labelY`)
 * hám boladı edi (`tools/gen_districts.py` arqalı `map.txt`den generatsiya
 * qılınǵan, 17 rayon ushın 100K+ token). Xarita alıp taslanǵannan keyin bul
 * maydanlar hesh jerde kerek emes — sonlıqtan tek adminlik ma'lumotları
 * qaldı. Geografiyalıq forma kerek bolsa, `tools/gen_districts.py` hám
 * `map.txt` dizbe-dizbe qaladı (frontend olardan endi ǵárezsiz).
 */

export interface District {
  id: string;
  name: string;
  center: string;
  areaKm2: number;
  population: number;
}

export const DISTRICTS: District[] = [
  { id: "amudaryo", name: "Ámiwdárya", center: "Mańǵıt", areaKm2: 2300, population: 200.3 },
  { id: "beruniy", name: "Beruniy", center: "Beruniy", areaKm2: 4000, population: 205.1 },
  { id: "bozatov", name: "Bozataw", center: "Bozataw", areaKm2: 3000, population: 20.4 },
  { id: "chimboy", name: "Shımbay", center: "Shımbay", areaKm2: 3000, population: 120.9 },
  { id: "ellikqala", name: "Ellikqala", center: "Bostan", areaKm2: 4900, population: 155.8 },
  { id: "kegeyli", name: "Kegeyli", center: "Kegeyli", areaKm2: 2200, population: 90.5 },
  { id: "moynoq", name: "Moynaq", center: "Moynaq", areaKm2: 37600, population: 30.2 },
  { id: "nukus-shahri", name: "Nókis qalası", center: "Nókis", areaKm2: 220, population: 335.8 },
  { id: "nukus-tumani", name: "Nókis rayonı", center: "Aqmańǵıt", areaKm2: 2000, population: 55.7 },
  { id: "qanlikol", name: "Qanlıkól", center: "Qanlıkól", areaKm2: 900, population: 45.6 },
  { id: "qongirot", name: "Qońırat", center: "Qońırat", areaKm2: 78700, population: 130.4 },
  { id: "karaozak", name: "Qaraózek", center: "Qaraózek", areaKm2: 5800, population: 60.3 },
  { id: "shumanay", name: "Shomanay", center: "Shomanay", areaKm2: 800, population: 55.1 },
  { id: "taxiatosh", name: "Taqıyatas", center: "Taqıyatas", areaKm2: 200, population: 45.9 },
  { id: "taxtakopir", name: "Taxtakópir", center: "Taxtakópir", areaKm2: 20100, population: 40.7 },
  { id: "tortkol", name: "Tórtkúl", center: "Tórtkúl", areaKm2: 7900, population: 220.6 },
  { id: "xojayli", name: "Xojeli", center: "Xojeli", areaKm2: 1300, population: 165.2 },
];

export const DISTRICT_BY_ID = Object.fromEntries(
  DISTRICTS.map((d) => [d.id, d]),
) as Record<string, District>;
