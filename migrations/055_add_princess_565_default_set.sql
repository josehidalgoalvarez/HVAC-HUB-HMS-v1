-- Migration 055: 565 Princess St Dedicated Midea Default Appliance Set
-- Seeds set-princess-565-standard with Midea models and specs from Nov 6, 2026 rating plates.
-- Reassigns 565 Princess units from set-princess-apt to set-princess-565-standard.
-- Zero serial numbers; dates in notes only.

INSERT INTO `default_sets` (
  `id`, `complex_slug`, `complex_id`, `name`, `unit_type`, `is_default`,
  `bedrooms`, `bathrooms`, `stories`, `has_unit_water_heater`,
  `appliances_json`, `notes`, `created_at`, `updated_at`
) VALUES (
  'set-princess-565-standard',
  'frontenac-alfred',
  9,
  '565 Princess St (Standard)',
  'apartment',
  1,
  2,
  1,
  1,
  0,
  '[{"category":"Kitchen","label":"Fridge (default)","name":"Fridge (default)","type":"Refrigerator","isDefault":true,"brand":"Midea","model":"MRT18D3BST","specs":{"brand":"Midea","model":"MRT18D3BST","type":"top freezer","capacity":"18 cu ft","volts":"115","amps":"1.2","defrostPower":"215W","refrigerant":"R600a 2.29 oz (65 g)","notes":"Date code 26W14, made in Thailand"}},{"category":"Kitchen","label":"Dishwasher (default)","name":"Dishwasher (default)","type":"Dishwasher","isDefault":true,"brand":"Midea","model":"MDF24P2BST","specs":{"brand":"Midea","model":"MDF24P2BST","volts":"120","amps":"7.84","motorAmps":"0.84","heaterAmps":"7","notes":"Manufacture date 0626 (June 2026), made in China"}},{"category":"Kitchen","label":"Microwave (default)","name":"Microwave (default)","type":"Microwave","isDefault":true,"brand":"Midea","model":"MMO17S12ASTC","specs":{"brand":"Midea","model":"MMO17S12ASTC","volts":"120","inputPower":"1500W","outputPower":"1000W","frequency":"2450 MHz","notes":"Manufacture date May 2026, made in Shunde, China"}},{"category":"Kitchen","label":"Range (electric coil)","name":"Range (electric coil) (default)","type":"Range","isDefault":true,"brand":"Midea","model":"MER30B1A4STC","specs":{"brand":"Midea","model":"MER30B1A4STC","volts":"120/240","power":"9.64 kW","power208":"7.24 kW","frequency":"60Hz","notes":"Manufacture date May 2026, made in Vietnam, Factory ID 67"}}]',
  '565 Princess St building default specification. Midea rating plate verified Nov 6, 2026.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Point 565 Princess unit(s) at the new dedicated default set
UPDATE `unit`
  SET `default_set_id` = 'set-princess-565-standard'
  WHERE `building_id` = (SELECT `id` FROM `building` WHERE `name` LIKE '%565 Princess%' LIMIT 1);
