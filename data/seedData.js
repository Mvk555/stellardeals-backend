const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');
const User = require('../models/User');
const Alert = require('../models/Alert');
const Click = require('../models/Click');
const Notification = require('../models/Notification');
const Review = require('../models/Review');
const Wishlist = require('../models/Wishlist');

dotenv.config();

const links = (q, amazon, flipkart) => [
  { retailer: 'Amazon', url: `https://www.amazon.in/s?k=${encodeURIComponent(q)}`, price: amazon },
  { retailer: 'Flipkart', url: `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`, price: flipkart }
];

const TILES = {
  Smartphones: ['📱', 215], Laptops: ['💻', 230], Tablets: ['📲', 255], Audio: ['🎧', 280], Wearables: ['⌚', 170],
  Cameras: ['📷', 20], Televisions: ['📺', 200], 'Home Appliances': ['🏠', 150], Kitchen: ['🍳', 35],
  'Mens Fashion': ['👕', 10], 'Womens Fashion': ['👗', 330], Footwear: ['👟', 25], 'Bags & Luggage': ['🎒', 45],
  Books: ['📚', 15], Grocery: ['🛒', 100], 'Beauty & Care': ['💄', 320], 'Sports & Fitness': ['🏋️', 140],
  Gaming: ['🎮', 265], 'Toys & Games': ['🧸', 55], 'Furniture & Decor': ['🛋️', 30]
};

const tile = (category, name) => {
  const [emoji, hue] = TILES[category];
  const label = name.length > 26 ? `${name.slice(0, 25)}…` : name;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,92%)"/><stop offset="1" stop-color="hsl(${hue},65%,78%)"/></linearGradient></defs><rect width="600" height="600" fill="url(#g)"/><text x="300" y="320" font-size="210" text-anchor="middle">${emoji}</text><text x="300" y="500" font-size="30" font-family="Arial, sans-serif" font-weight="bold" fill="hsl(${hue},45%,28%)" text-anchor="middle">${label.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const makeHistory = (current, original, seed, hot) => {
  let s = seed * 9301 + 49297;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const weeks = 26;
  const start = Math.min(Math.max(original || current, current) * 1.02, current * 1.35);
  const round = (n) => (n < 1000 ? Math.round(n) : Math.round(n / 10) * 10);
  const hotFactor = 1.08 + rnd() * 0.2;
  const points = [];
  for (let i = 0; i <= weeks; i++) {
    const base = start + (current - start) * (i / weeks);
    const noise = (rnd() - 0.5) * 0.06 * current;
    const dip = rnd() < 0.08 ? -0.07 * current : 0;
    let price = i === weeks ? current : round(base + noise + dip);
    if (hot && i >= weeks - 4 && i < weeks) price = round(current * hotFactor * (0.97 + rnd() * 0.06));
    points.push({ date: new Date(Date.now() - (weeks - i) * 7 * 24 * 3600 * 1000), price });
  }
  return points;
};

const P = (category, brand, name, description, mrp, amazon, flipkart, rating, numReviews, specs, opts = {}) => ({
  name, description, price: Math.min(amazon, flipkart), originalPrice: mrp, category, brand,
  image: opts.image || tile(category, name), rating, numReviews, specs, featured: !!opts.featured,
  retailerLinks: links(name, amazon, flipkart)
});

const u = (id) => `https://images.unsplash.com/${id}?w=600`;

const products = [
  P('Smartphones', 'Apple', 'iPhone 15 Pro Max', 'Titanium design, A17 Pro chip, best iPhone camera.', 179900, 159900, 157999, 4.9, 512, { processor: 'A17 Pro', ram: '8GB', storage: '256GB', display: '6.7" XDR', battery: '4441 mAh' }, { featured: true, image: u('photo-1592750475338-74b7b21085ab') }),
  P('Smartphones', 'Samsung', 'Samsung Galaxy S24 Ultra', '200MP camera with S Pen.', 149999, 129999, 127999, 4.7, 298, { processor: 'Snapdragon 8 Gen 3', ram: '12GB', storage: '256GB', display: '6.8" AMOLED', battery: '5000 mAh' }, { featured: true, image: u('photo-1610945265064-0e34e5519bbf') }),
  P('Smartphones', 'OnePlus', 'OnePlus 12', 'Snapdragon 8 Gen 3, 100W charging.', 69999, 64999, 63999, 4.6, 234, { processor: 'Snapdragon 8 Gen 3', ram: '12GB', storage: '256GB', display: '6.82" LTPO AMOLED', battery: '5400 mAh' }, { image: u('photo-1511707171634-5f897ff02aa9') }),
  P('Smartphones', 'Redmi', 'Redmi Note 13 Pro+ 5G', '200MP camera, curved AMOLED, 120W fast charging.', 34999, 30999, 29999, 4.3, 1840, { processor: 'Dimensity 7200 Ultra', ram: '8GB', storage: '256GB', display: '6.67" AMOLED', battery: '5000 mAh' }),
  P('Smartphones', 'Nothing', 'Nothing Phone (2a)', 'Glyph interface, clean software, 50MP dual camera.', 25999, 23999, 23499, 4.4, 960, { processor: 'Dimensity 7200 Pro', ram: '8GB', storage: '128GB', display: '6.7" AMOLED', battery: '5000 mAh' }),
  P('Smartphones', 'Google', 'Google Pixel 8a', 'Google Tensor G3, 7 years of updates, great camera.', 52999, 49999, 48999, 4.4, 410, { processor: 'Tensor G3', ram: '8GB', storage: '128GB', display: '6.1" OLED', battery: '4492 mAh' }),

  P('Laptops', 'Apple', 'MacBook Pro 16"', 'Powerful laptop with M3 Pro chip, perfect for developers.', 269900, 249900, 252900, 4.8, 245, { processor: 'Apple M3 Pro', ram: '18GB', storage: '512GB SSD', display: '16.2" Liquid Retina XDR', weight: '2.15 kg' }, { featured: true, image: u('photo-1517336714731-489689fd1ca8') }),
  P('Laptops', 'Dell', 'Dell XPS 15', 'Premium laptop with OLED display.', 209900, 189900, 192900, 4.5, 145, { processor: 'Intel Core i9', ram: '32GB', storage: '1TB SSD', display: '15.6" OLED', weight: '1.86 kg' }, { image: u('photo-1496181133206-80ce9b88a853') }),
  P('Laptops', 'Apple', 'MacBook Air M2 13"', 'Thin, light and fanless with all-day battery.', 114900, 94990, 92990, 4.7, 870, { processor: 'Apple M2', ram: '8GB', storage: '256GB SSD', display: '13.6" Liquid Retina', weight: '1.24 kg' }),
  P('Laptops', 'HP', 'HP Pavilion 15', '13th Gen Intel Core i5 with 16GB RAM for work and study.', 79999, 62990, 61490, 4.2, 530, { processor: 'Intel Core i5-1335U', ram: '16GB', storage: '512GB SSD', display: '15.6" FHD', weight: '1.75 kg' }),
  P('Laptops', 'Lenovo', 'Lenovo IdeaPad Slim 3', 'Ryzen 5 thin and light laptop for everyday use.', 62990, 44990, 43990, 4.1, 1260, { processor: 'AMD Ryzen 5 7520U', ram: '16GB', storage: '512GB SSD', display: '15.6" FHD', weight: '1.62 kg' }),
  P('Laptops', 'ASUS', 'ASUS Vivobook 15', 'Budget friendly laptop with a fast SSD.', 52990, 33990, 32990, 4.0, 2140, { processor: 'Intel Core i3-1215U', ram: '8GB', storage: '512GB SSD', display: '15.6" FHD', weight: '1.7 kg' }),

  P('Tablets', 'Apple', 'iPad Pro 12.9"', 'M2 chip, Liquid Retina XDR display.', 122900, 112900, 114900, 4.8, 178, { processor: 'Apple M2', ram: '8GB', storage: '128GB', display: '12.9" Liquid Retina XDR' }, { image: u('photo-1544244015-0df4b3ffc6b0') }),
  P('Tablets', 'Samsung', 'Samsung Galaxy Tab S9', 'AMOLED display, S Pen included.', 89999, 78999, 79999, 4.5, 134, { processor: 'Snapdragon 8 Gen 2', ram: '8GB', storage: '128GB', display: '11" Dynamic AMOLED' }, { image: u('photo-1561154464-82e9adf32764') }),
  P('Tablets', 'Xiaomi', 'Xiaomi Pad 6', '144Hz 2.8K display, Snapdragon 870.', 28999, 25999, 24999, 4.3, 3120, { processor: 'Snapdragon 870', ram: '6GB', storage: '128GB', display: '11" 2.8K 144Hz' }),

  P('Audio', 'Sony', 'Sony WH-1000XM5', 'Industry-leading noise cancellation.', 34990, 29990, 28990, 4.7, 389, { type: 'Over-ear', battery: '30 hours', noiseCancelling: 'Yes', connectivity: 'Bluetooth 5.2' }, { featured: true, image: u('photo-1505740420928-5e560c06d30e') }),
  P('Audio', 'Apple', 'AirPods Pro 2', 'Adaptive audio, USB-C charging.', 26900, 24900, 25490, 4.8, 623, { type: 'In-ear', battery: '30 hours', noiseCancelling: 'Yes', connectivity: 'Bluetooth 5.3' }, { image: u('photo-1600294037681-c80b4cb5b434') }),
  P('Audio', 'Bose', 'Bose QC Ultra', 'Immersive spatial audio.', 39900, 35900, 36900, 4.7, 267, { type: 'Over-ear', battery: '24 hours', noiseCancelling: 'Yes', connectivity: 'Bluetooth 5.3' }, { image: u('photo-1546435770-a3e426bf472b') }),
  P('Audio', 'boAt', 'boAt Rockerz 450', 'Wireless on-ear headphones with 15 hours playback.', 3990, 1299, 1199, 4.1, 98400, { type: 'On-ear', battery: '15 hours', noiseCancelling: 'No', connectivity: 'Bluetooth 5.0' }),
  P('Audio', 'JBL', 'JBL Flip 6', 'Portable waterproof speaker with powerful sound.', 11999, 8999, 9499, 4.5, 15300, { type: 'Portable speaker', battery: '12 hours', waterproof: 'IP67' }),
  P('Audio', 'OnePlus', 'OnePlus Buds Pro 2', 'Dual driver earbuds with adaptive noise cancellation.', 11999, 9999, 9499, 4.3, 5200, { type: 'In-ear', battery: '39 hours', noiseCancelling: 'Yes', connectivity: 'Bluetooth 5.3' }),

  P('Wearables', 'Apple', 'Apple Watch Ultra 2', 'Rugged titanium design, brightest display.', 99900, 89900, 89900, 4.6, 156, { display: '49mm OLED', battery: '36 hours', waterResistance: '100 m' }, { image: u('photo-1434493789847-2f02dc6ca35d') }),
  P('Wearables', 'Noise', 'Noise ColorFit Pro 4', 'Bluetooth calling smartwatch with AMOLED display.', 5999, 1999, 1799, 4.0, 22100, { display: '1.46" AMOLED', battery: '7 days', calling: 'Yes' }),
  P('Wearables', 'Fire-Boltt', 'Fire-Boltt Ninja Call Pro Plus', 'Large display smartwatch with calling and voice assistant.', 8999, 1299, 1199, 3.9, 61200, { display: '1.83" HD', battery: '5 days', calling: 'Yes' }),

  P('Cameras', 'GoPro', 'GoPro HERO 12', '5.3K video, HyperSmooth stabilization.', 44990, 39990, 40990, 4.6, 198, { video: '5.3K60', photo: '27MP', waterproof: '10 m' }, { image: u('photo-1526170375885-4d8ecf77b99f') }),
  P('Cameras', 'Canon', 'Canon EOS R50 Mirrorless Camera', 'Compact mirrorless camera with 18-45mm kit lens.', 79995, 66995, 65990, 4.5, 740, { sensor: '24.2MP APS-C', video: '4K30', lens: '18-45mm kit' }),
  P('Cameras', 'Fujifilm', 'Fujifilm Instax Mini 12', 'Instant camera with auto exposure, prints credit-card photos.', 7999, 6499, 6299, 4.6, 9100, { type: 'Instant', film: 'Instax Mini', flash: 'Yes' }),

  P('Televisions', 'Sony', 'Sony Bravia 55" 4K X75L', '55 inch 4K Ultra HD Google TV with Dolby Audio.', 99900, 59990, 57990, 4.5, 4300, { size: '55"', resolution: '4K UHD', os: 'Google TV', refreshRate: '60Hz' }, { featured: true }),
  P('Televisions', 'Samsung', 'Samsung 43" Crystal 4K Vision Pro', '43 inch Crystal 4K smart TV with Alexa built in.', 52900, 29990, 28990, 4.3, 18700, { size: '43"', resolution: '4K UHD', os: 'Tizen', refreshRate: '50Hz' }),
  P('Televisions', 'LG', 'LG 55" 4K UHD UQ7500', '55 inch 4K UHD smart TV with webOS and α5 AI processor.', 79990, 44990, 43990, 4.4, 8900, { size: '55"', resolution: '4K UHD', os: 'webOS', refreshRate: '60Hz' }),
  P('Televisions', 'Xiaomi', 'Mi 43" 5X 4K Smart TV', '43 inch 4K Dolby Vision Android TV.', 44999, 26999, 25999, 4.2, 22500, { size: '43"', resolution: '4K UHD', os: 'Google TV', refreshRate: '60Hz' }),

  P('Home Appliances', 'Voltas', 'Voltas 1.5 Ton 3 Star Split AC', 'Inverter split AC with copper condenser and anti-dust filter.', 60990, 33990, 32990, 4.1, 16400, { capacity: '1.5 Ton', rating: '3 Star', type: 'Inverter Split', warranty: '1 year + 5 years compressor' }, { featured: true }),
  P('Home Appliances', 'LG', 'LG 8 kg Front Load Washing Machine', 'AI Direct Drive with 6 Motion technology and steam wash.', 53990, 34990, 33990, 4.4, 6100, { capacity: '8 kg', type: 'Front Load', rpm: '1200', rating: '5 Star' }),
  P('Home Appliances', 'Philips', 'Philips Air Fryer HD9252', 'Rapid Air technology, 4.1L capacity, cook with little oil.', 11995, 7499, 7299, 4.4, 28400, { capacity: '4.1 L', power: '1400 W', presets: '7' }),
  P('Home Appliances', 'Dyson', 'Dyson V8 Absolute Cordless Vacuum', 'Cordless vacuum cleaner with up to 40 minutes runtime.', 38900, 34900, 35500, 4.3, 1900, { runtime: '40 min', type: 'Cordless stick', bin: '0.54 L' }),
  P('Home Appliances', 'Crompton', 'Crompton Arno Neo 15L Water Heater', '5 star rated storage water heater with anti-rust coating.', 11500, 6499, 5990, 4.2, 21800, { capacity: '15 L', rating: '5 Star', warranty: '2 years' }),

  P('Kitchen', 'Prestige', 'Prestige Iris 750W Mixer Grinder', '3 stainless steel jars, powerful 750 watt motor.', 7295, 3649, 3449, 4.2, 42100, { power: '750 W', jars: '3', warranty: '2 years' }),
  P('Kitchen', 'Pigeon', 'Pigeon Favourite Electric Kettle 1.5L', 'Stainless steel body with auto shut-off.', 1795, 699, 649, 4.1, 77500, { capacity: '1.5 L', power: '1500 W', material: 'Stainless steel' }),
  P('Kitchen', 'Prestige', 'Prestige PIC 20 Induction Cooktop', '1200 watt induction cooktop with push button controls.', 4995, 2599, 2399, 4.2, 91000, { power: '1200 W', controls: 'Push button', warranty: '1 year' }),
  P('Kitchen', 'Milton', 'Milton Thermosteel Flip Lid Flask 1000 ml', 'Double wall vacuum insulated, keeps hot and cold for 24 hours.', 1199, 699, 659, 4.3, 38200, { capacity: '1000 ml', material: 'Stainless steel', insulation: '24 hours' }),

  P('Mens Fashion', "Levi's", "Levi's 511 Slim Fit Jeans", 'Slim fit stretch jeans in classic blue.', 3999, 2399, 2249, 4.2, 12800, { fit: 'Slim', fabric: 'Cotton stretch', closure: 'Zip fly' }),
  P('Mens Fashion', 'Allen Solly', 'Allen Solly Men Formal Shirt', 'Regular fit cotton formal shirt.', 2199, 1099, 999, 4.1, 9400, { fit: 'Regular', fabric: 'Cotton', sleeve: 'Full' }),
  P('Mens Fashion', 'Puma', 'Puma Men Regular Fit T-Shirt', 'Soft cotton T-shirt with printed logo.', 1499, 599, 549, 4.2, 34000, { fit: 'Regular', fabric: 'Cotton', neck: 'Round' }),
  P('Mens Fashion', 'Jack & Jones', 'Jack & Jones Hooded Sweatshirt', 'Cotton blend hoodie with kangaroo pocket.', 3999, 1899, 1799, 4.1, 5200, { fit: 'Regular', fabric: 'Cotton blend', sleeve: 'Full' }),

  P('Womens Fashion', 'Biba', 'Biba Women Straight Kurta', 'Printed cotton straight kurta for daily wear.', 2499, 1199, 1099, 4.1, 6700, { fabric: 'Cotton', fit: 'Straight', sleeve: '3/4' }),
  P('Womens Fashion', 'Libas', 'Libas Kurta with Palazzo Set', 'Printed kurta and palazzo set in rayon.', 3299, 1399, 1299, 4.0, 14300, { fabric: 'Rayon', pieces: '2', sleeve: '3/4' }),
  P('Womens Fashion', 'Tokyo Talkies', 'Tokyo Talkies Printed Maxi Dress', 'Flowy floral maxi dress for casual outings.', 1999, 799, 749, 3.9, 8800, { fabric: 'Georgette', fit: 'A-line', length: 'Maxi' }),
  P('Womens Fashion', 'Soch', 'Soch Silk Blend Saree', 'Woven silk blend saree with blouse piece.', 4999, 2499, 2299, 4.2, 3900, { fabric: 'Silk blend', length: '5.5 m', blouse: 'Included' }),

  P('Footwear', 'Nike', 'Nike Revolution 7 Running Shoes', 'Lightweight running shoes with soft foam cushioning.', 4995, 3495, 3395, 4.3, 7600, { type: 'Running', upper: 'Mesh', sole: 'Foam' }),
  P('Footwear', 'Adidas', 'Adidas Ultraboost Light', 'Responsive Light Boost cushioning for long runs.', 17999, 10999, 11499, 4.5, 2300, { type: 'Running', upper: 'Primeknit', sole: 'Boost' }),
  P('Footwear', 'Puma', 'Puma Softride Pro Running Shoes', 'Soft cushioned everyday running shoes.', 3999, 1999, 1799, 4.1, 19800, { type: 'Running', upper: 'Mesh', sole: 'Softfoam' }),
  P('Footwear', 'Crocs', 'Crocs Classic Clog', 'Iconic lightweight clogs, easy to clean.', 3495, 2799, 2699, 4.4, 24500, { type: 'Clog', material: 'Croslite', closure: 'Slip-on' }),
  P('Footwear', 'Skechers', 'Skechers Go Walk Slip-ons', 'Comfortable slip-on walking shoes.', 5999, 3999, 3799, 4.3, 6900, { type: 'Walking', upper: 'Knit', closure: 'Slip-on' }),

  P('Bags & Luggage', 'Wildcraft', 'Wildcraft 35L Backpack', 'Durable backpack with laptop compartment and rain cover.', 2499, 1399, 1299, 4.2, 18700, { capacity: '35 L', material: 'Polyester', laptop: 'Up to 15.6"' }),
  P('Bags & Luggage', 'American Tourister', 'American Tourister Cabin Trolley 55 cm', 'Hard shell cabin luggage with 8 wheels.', 7600, 3499, 3299, 4.3, 13500, { size: '55 cm', material: 'Polypropylene', wheels: '8' }),
  P('Bags & Luggage', 'Skybags', 'Skybags Laptop Backpack 30L', 'Padded laptop backpack for office and college.', 2199, 1099, 999, 4.1, 27800, { capacity: '30 L', material: 'Polyester', laptop: 'Up to 15.6"' }),

  P('Books', 'Penguin', 'Atomic Habits', 'An easy and proven way to build good habits, by James Clear.', 799, 419, 399, 4.8, 94100, { author: 'James Clear', pages: '320', format: 'Paperback', language: 'English' }, { featured: true }),
  P('Books', 'Manjul', 'Rich Dad Poor Dad', 'What the rich teach their kids about money, by Robert Kiyosaki.', 599, 289, 276, 4.6, 71800, { author: 'Robert T. Kiyosaki', pages: '336', format: 'Paperback', language: 'English' }),
  P('Books', 'Jaico', 'The Psychology of Money', 'Timeless lessons on wealth, greed and happiness, by Morgan Housel.', 399, 289, 299, 4.6, 48200, { author: 'Morgan Housel', pages: '252', format: 'Paperback', language: 'English' }),
  P('Books', 'Penguin', 'Ikigai', 'The Japanese secret to a long and happy life.', 399, 249, 239, 4.4, 56300, { author: 'Hector Garcia and Francesc Miralles', pages: '208', format: 'Paperback', language: 'English' }),
  P('Books', 'HarperCollins', 'The Alchemist', 'A fable about following your dream, by Paulo Coelho.', 399, 269, 259, 4.6, 61500, { author: 'Paulo Coelho', pages: '208', format: 'Paperback', language: 'English' }),

  P('Grocery', 'Aashirvaad', 'Aashirvaad Select Atta 10 kg', 'Premium sharbati whole wheat atta.', 649, 569, 559, 4.5, 38900, { weight: '10 kg', type: 'Whole wheat flour', shelfLife: '3 months' }),
  P('Grocery', 'Fortune', 'Fortune Sunlite Refined Sunflower Oil 5 L', 'Light and healthy refined sunflower oil.', 925, 739, 749, 4.4, 27400, { volume: '5 L', type: 'Refined sunflower oil', pack: 'Pouch' }),
  P('Grocery', 'Tata Tea', 'Tata Tea Gold 1 kg', 'Rich blend of Assam tea leaves with long leaves.', 745, 589, 579, 4.5, 31200, { weight: '1 kg', type: 'Tea leaves', pack: 'Pouch' }),
  P('Grocery', 'Nescafe', 'Nescafe Classic Instant Coffee 200 g Jar', 'Pure instant coffee with rich aroma.', 790, 619, 629, 4.5, 52600, { weight: '200 g', type: 'Instant coffee', pack: 'Jar' }),

  P('Beauty & Care', 'Philips', 'Philips Beard Trimmer BT1232', 'Cordless trimmer with 10 length settings.', 1695, 1049, 999, 4.2, 45600, { runtime: '60 min', settings: '10', waterproof: 'No' }),
  P('Beauty & Care', "L'Oreal Paris", "L'Oreal Paris Hyaluronic Acid Serum 30 ml", 'Hydrating face serum for plump skin.', 1999, 1099, 1049, 4.3, 22400, { volume: '30 ml', skinType: 'All', key: 'Hyaluronic acid' }),
  P('Beauty & Care', 'Cetaphil', 'Cetaphil Gentle Skin Cleanser 250 ml', 'Soap free cleanser for sensitive and dry skin.', 1099, 899, 879, 4.5, 29700, { volume: '250 ml', skinType: 'Sensitive', form: 'Liquid' }),
  P('Beauty & Care', 'Maybelline', 'Maybelline Fit Me Matte Foundation', 'Matte finish liquid foundation with natural coverage.', 599, 479, 449, 4.2, 38800, { volume: '30 ml', finish: 'Matte', spf: 'No' }),

  P('Sports & Fitness', 'Boldfit', 'Boldfit Yoga Mat 6 mm', 'Anti-skid extra thick yoga mat with carry strap.', 1499, 399, 359, 4.2, 56800, { thickness: '6 mm', material: 'EVA', size: '183 x 61 cm' }),
  P('Sports & Fitness', 'Nivia', 'Nivia Storm Football Size 5', 'Machine stitched football for training and matches.', 650, 389, 369, 4.2, 14600, { size: '5', material: 'Rubber', use: 'Training' }),
  P('Sports & Fitness', 'Kore', 'Kore PVC 20 kg Dumbbell Set', 'Adjustable dumbbell set with rods and plates.', 4499, 1899, 1799, 4.1, 8600, { weight: '20 kg', material: 'PVC', type: 'Adjustable' }),
  P('Sports & Fitness', 'Yonex', 'Yonex Astrox 2 Badminton Racquet', 'Isometric head racquet for power and control.', 3300, 2399, 2299, 4.3, 3100, { weight: '3U', material: 'Graphite', balance: 'Head heavy' }),

  P('Gaming', 'Sony', 'Sony PlayStation 5 Slim', 'Disc edition console with 1TB SSD and DualSense controller.', 54990, 49990, 49490, 4.8, 8600, { storage: '1 TB SSD', resolution: 'Up to 4K 120Hz', drive: 'Disc' }, { featured: true }),
  P('Gaming', 'Microsoft', 'Xbox Series S 512 GB', 'Next-gen all digital console for gamers.', 34990, 29990, 29490, 4.6, 4200, { storage: '512 GB SSD', resolution: 'Up to 1440p', drive: 'Digital' }),
  P('Gaming', 'Logitech', 'Logitech G102 Lightsync Gaming Mouse', 'RGB gaming mouse with 8000 DPI sensor.', 2495, 1395, 1295, 4.5, 67200, { dpi: '8000', buttons: '6', connectivity: 'Wired' }),

  P('Toys & Games', 'LEGO', 'LEGO Classic Large Creative Brick Box', '790 colourful bricks to build anything.', 6999, 5499, 5299, 4.8, 3400, { pieces: '790', age: '4+', theme: 'Classic' }),
  P('Toys & Games', 'Hot Wheels', 'Hot Wheels 20 Car Gift Pack', 'Pack of 20 die-cast cars in assorted designs.', 2999, 1799, 1699, 4.5, 11800, { pieces: '20', age: '3+', scale: '1:64' }),
  P('Toys & Games', 'Funskool', 'Funskool Monopoly Classic Board Game', 'Family board game of buying and trading properties.', 1299, 799, 749, 4.5, 21600, { players: '2-6', age: '8+', type: 'Board game' }),

  P('Furniture & Decor', 'Wakefit', 'Wakefit Orthopedic Memory Foam Mattress Queen', 'Memory foam mattress with orthopedic support.', 24999, 13999, 13499, 4.4, 41200, { size: 'Queen', thickness: '6 inch', type: 'Memory foam', warranty: '10 years' }),
  P('Furniture & Decor', 'Green Soul', 'Green Soul Beast Ergonomic Office Chair', 'High back mesh chair with lumbar support and headrest.', 32999, 14999, 15499, 4.2, 12900, { type: 'Ergonomic', back: 'Mesh', adjustable: 'Headrest, lumbar, armrest' }),
  P('Furniture & Decor', 'Wipro', 'Wipro Garnet 9W LED Bulb Pack of 4', 'Energy efficient cool day light LED bulbs.', 799, 349, 329, 4.3, 63800, { power: '9 W', pack: '4', colour: 'Cool day light' })
];

products.forEach((p, i) => {
  const best = Math.min(...p.retailerLinks.map(r => r.price));
  p.priceHistory = makeHistory(best, p.originalPrice, i + 7, i % 4 === 0);
});

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');

    await Promise.all([
      Product.deleteMany(), User.deleteMany(), Alert.deleteMany(), Click.deleteMany(),
      Notification.deleteMany(), Review.deleteMany(), Wishlist.deleteMany()
    ]);
    try { await mongoose.connection.collection('orders').drop(); } catch (e) {}
    console.log('🗑️ Cleared existing data');

    const created = await Product.insertMany(products);
    console.log(`✅ ${created.length} products added (with retailerLinks + priceHistory)`);

    const admin = await User.create({ name: 'Admin', email: 'admin@stellardeals.com', password: 'admin123', isAdmin: true });
    console.log(`✅ Admin user: ${admin.email} / admin123`);

    const user = await User.create({ name: 'Venkat Koushik', email: 'venkat@test.com', password: 'venkat123', isAdmin: false });
    console.log(`✅ Test user: ${user.email} / venkat123`);

    const byName = (n) => created.find(p => p.name === n);
    const sony = byName('Sony WH-1000XM5');
    const air = byName('MacBook Air M2 13"');
    await Alert.create({ user: user._id, product: sony._id, targetPrice: 32000, notified: true });
    await Alert.create({ user: user._id, product: air._id, targetPrice: 85000 });
    await Notification.create({
      user: user._id, product: sony._id, type: 'price_alert',
      message: `${sony.name} is now ₹${sony.bestPrice.toLocaleString('en-IN')}, at or below your target of ₹32,000`
    });
    console.log('✅ Demo alerts and 1 notification added for the test user');

    const weights = created.map((p, i) => (p.featured ? 6 : 1) + (i % 5 === 0 ? 3 : 0));
    const total = weights.reduce((a, b) => a + b, 0);
    const pickProduct = () => {
      let r = Math.random() * total;
      for (let i = 0; i < created.length; i++) { r -= weights[i]; if (r <= 0) return created[i]; }
      return created[0];
    };
    const clicks = [];
    for (let i = 0; i < 240; i++) {
      const p = pickProduct();
      const retailer = Math.random() < 0.55 ? 'Amazon' : 'Flipkart';
      const link = p.retailerLinks.find(l => l.retailer === retailer);
      clicks.push({
        product: p._id, retailer, price: link.price,
        user: Math.random() < 0.15 ? user._id : undefined,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 14 * 24 * 3600 * 1000))
      });
    }
    await Click.insertMany(clicks);
    console.log(`✅ ${clicks.length} demo clicks added`);

    console.log('🎉 Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();
